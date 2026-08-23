import {createReadStream, statSync} from 'node:fs';

const uploadEndpoint =
  'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';
const retriable = new Set([500, 502, 503, 504]);
const chunkSize = 8 * 1024 * 1024;

const responseError = async (response, context) => {
  const body = await response.text();
  throw new Error(
    `${context} failed: HTTP ${response.status}${body ? ` ${body.slice(0, 500)}` : ''}`,
  );
};

const uploadedOffset = (response) => {
  const range = response.headers.get('range');
  if (!range) return 0;
  const match = range.match(/bytes=0-(\d+)/);
  return match ? Number(match[1]) + 1 : 0;
};

const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export const publishYouTube = async ({
  accessToken,
  videoPath,
  title,
  description,
  tags,
  privacy,
  categoryId,
  onProgress = () => {},
}) => {
  const size = statSync(videoPath).size;
  const metadata = {
    snippet: {
      title,
      description,
      tags,
      categoryId,
    },
    status: {
      privacyStatus: privacy,
      embeddable: true,
      license: 'youtube',
    },
  };

  const session = await fetch(uploadEndpoint, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json; charset=UTF-8',
      'x-upload-content-length': String(size),
      'x-upload-content-type': 'video/mp4',
    },
    body: JSON.stringify(metadata),
  });
  if (!session.ok) await responseError(session, 'YouTube session creation');
  const uploadUrl = session.headers.get('location');
  if (!uploadUrl) throw new Error('YouTube did not return a resumable upload URL');

  let offset = 0;
  let retries = 0;
  while (offset < size) {
    const end = Math.min(size - 1, offset + chunkSize - 1);
    const length = end - offset + 1;
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'video/mp4',
        'content-length': String(length),
        'content-range': `bytes ${offset}-${end}/${size}`,
      },
      body: createReadStream(videoPath, {start: offset, end}),
      duplex: 'half',
    });

    if (response.ok) {
      const video = await response.json();
      if (!video.id) throw new Error('YouTube upload completed without a video ID');
      onProgress(1);
      return {
        id: video.id,
        url: `https://www.youtube.com/watch?v=${video.id}`,
        privacy,
      };
    }
    if (response.status === 308) {
      const nextOffset = uploadedOffset(response);
      if (nextOffset <= offset) {
        retries++;
        if (retries > 5) {
          throw new Error('YouTube did not acknowledge the uploaded chunk');
        }
        await wait(1000 * 2 ** (retries - 1));
      } else {
        retries = 0;
      }
      offset = nextOffset;
      onProgress(offset / size);
      continue;
    }
    if (!retriable.has(response.status) || retries >= 5) {
      await responseError(response, 'YouTube video upload');
    }

    retries++;
    await wait(1000 * 2 ** (retries - 1));
    const status = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-length': '0',
        'content-range': `bytes */${size}`,
      },
    });
    if (status.ok) {
      const video = await status.json();
      if (!video.id) throw new Error('YouTube upload completed without a video ID');
      return {
        id: video.id,
        url: `https://www.youtube.com/watch?v=${video.id}`,
        privacy,
      };
    }
    if (status.status !== 308) {
      await responseError(status, 'YouTube upload status check');
    }
    offset = uploadedOffset(status);
  }

  throw new Error('YouTube upload ended without a video resource');
};
