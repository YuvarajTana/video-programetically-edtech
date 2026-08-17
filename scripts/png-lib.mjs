import {inflateSync} from 'node:zlib';

/**
 * Minimal PNG reader: 8-bit RGB/RGBA, no interlacing — exactly what Remotion
 * stills produce. Returns {width, height, channels, pixels} with pixels as a
 * flat Buffer of unfiltered scanline data.
 */
export const decodePng = (buffer) => {
  if (buffer.readUInt32BE(0) !== 0x89504e47) {
    throw new Error('not a PNG');
  }
  let offset = 8;
  let width = 0;
  let height = 0;
  let channels = 0;
  const idat = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const kind = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (kind === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const bitDepth = data[8];
      const colorType = data[9];
      if (bitDepth !== 8 || data[12] !== 0) {
        throw new Error('only 8-bit non-interlaced PNGs are supported');
      }
      channels = {0: 1, 2: 3, 4: 2, 6: 4}[colorType];
      if (!channels) throw new Error(`unsupported color type ${colorType}`);
    } else if (kind === 'IDAT') {
      idat.push(data);
    } else if (kind === 'IEND') {
      break;
    }
    offset += 12 + length;
  }

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const pixels = Buffer.alloc(height * stride);
  const paeth = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const rowIn = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const row = pixels.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? row[x - channels] : 0;
      const up = prev ? prev[x] : 0;
      const upLeft = prev && x >= channels ? prev[x - channels] : 0;
      let value = rowIn[x];
      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += (left + up) >> 1;
      else if (filter === 4) value += paeth(left, up, upLeft);
      row[x] = value & 0xff;
    }
  }
  return {width, height, channels, pixels};
};

/** Perceptually-weighted distance between two RGB samples, 0–255 scale. */
export const rgbDistance = (a, b) =>
  Math.sqrt(
    0.3 * (a[0] - b[0]) ** 2 + 0.59 * (a[1] - b[1]) ** 2 + 0.11 * (a[2] - b[2]) ** 2,
  );
