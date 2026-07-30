const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const requestJson = async (url, options, context) => {
  const response = await fetch(url, options);
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = {raw: text.slice(0, 500)};
  }
  if (!response.ok) {
    throw new Error(
      `${context} failed: HTTP ${response.status} ${JSON.stringify(body).slice(0, 500)}`,
    );
  }
  return body;
};

export const publishInstagramReel = async ({
  accessToken,
  accountId,
  graphVersion,
  videoUrl,
  coverUrl,
  caption,
  shareToFeed,
  onStatus = () => {},
}) => {
  const base = `https://graph.facebook.com/${graphVersion}`;
  const createBody = new URLSearchParams({
    media_type: 'REELS',
    video_url: videoUrl,
    caption,
    share_to_feed: String(shareToFeed),
  });
  if (coverUrl) createBody.set('cover_url', coverUrl);

  const container = await requestJson(
    `${base}/${accountId}/media`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: createBody,
    },
    'Instagram container creation',
  );
  if (!container.id) throw new Error('Instagram did not return a container ID');

  let finished = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    const status = await requestJson(
      `${base}/${container.id}?fields=status_code,status`,
      {
        headers: {authorization: `Bearer ${accessToken}`},
      },
      'Instagram container status',
    );
    onStatus(status.status_code ?? 'UNKNOWN');
    if (status.status_code === 'FINISHED') {
      finished = true;
      break;
    }
    if (['ERROR', 'EXPIRED'].includes(status.status_code)) {
      throw new Error(
        `Instagram container ${status.status_code}: ${status.status ?? ''}`,
      );
    }
    await wait(5000);
  }
  if (!finished) {
    throw new Error('Instagram container did not finish processing within 5 minutes');
  }

  const published = await requestJson(
    `${base}/${accountId}/media_publish`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({creation_id: container.id}),
    },
    'Instagram Reel publishing',
  );
  if (!published.id) throw new Error('Instagram did not return a media ID');

  const details = await requestJson(
    `${base}/${published.id}?fields=permalink`,
    {
      headers: {authorization: `Bearer ${accessToken}`},
    },
    'Instagram permalink lookup',
  );
  return {
    id: published.id,
    containerId: container.id,
    url: details.permalink ?? null,
  };
};
