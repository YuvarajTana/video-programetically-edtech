/**
 * Minimal PDF assembly: one full-bleed JPEG per page. Enough for LinkedIn
 * document posts, with zero dependencies — JPEG embeds directly via
 * DCTDecode, so no image re-encoding is needed.
 */

const header = '%PDF-1.4\n';

/** Reads width/height from JPEG SOF markers. */
export const jpegSize = (buffer) => {
  let offset = 2;
  while (offset < buffer.length - 8) {
    if (buffer[offset] !== 0xff) {
      offset++;
      continue;
    }
    const marker = buffer[offset + 1];
    // SOF0–SOF15, excluding DHT/JPG/DAC (C4, C8, CC).
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + buffer.readUInt16BE(offset + 2);
  }
  throw new Error('could not find JPEG dimensions');
};

/** Builds a PDF where each JPEG buffer becomes one page at its pixel size. */
export const jpegsToPdf = (jpegs) => {
  const objects = [];
  const addObject = (body) => {
    objects.push(body);
    return objects.length; // 1-based object number
  };

  const pageRefs = [];
  const pagesNumber = 1 + jpegs.length * 3 + 1; // catalog + per-page triples + pages
  const catalog = addObject(`<< /Type /Catalog /Pages ${pagesNumber} 0 R >>`);

  for (const jpeg of jpegs) {
    const {width, height} = jpegSize(jpeg);
    const image = addObject(
      `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode ` +
        `/Length ${jpeg.length} >>\nstream\n`,
      // stream payload appended at serialization time via marker below
    );
    objects[image - 1] = {head: objects[image - 1], stream: jpeg, tail: '\nendstream'};
    const contentText = `q ${width} 0 0 ${height} 0 0 cm /Im0 Do Q`;
    const content = addObject(
      `<< /Length ${contentText.length} >>\nstream\n${contentText}\nendstream`,
    );
    const page = addObject(
      `<< /Type /Page /Parent ${pagesNumber} 0 R /MediaBox [0 0 ${width} ${height}] ` +
        `/Resources << /XObject << /Im0 ${image} 0 R >> >> /Contents ${content} 0 R >>`,
    );
    pageRefs.push(`${page} 0 R`);
  }

  const pages = addObject(
    `<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${pageRefs.length} >>`,
  );
  if (pages !== pagesNumber) throw new Error('pdf object numbering drifted');

  const chunks = [Buffer.from(header)];
  const offsets = [];
  let position = chunks[0].length;
  objects.forEach((object, index) => {
    offsets.push(position);
    const head = Buffer.from(`${index + 1} 0 obj\n`);
    const body =
      typeof object === 'string'
        ? [Buffer.from(object)]
        : [Buffer.from(object.head), object.stream, Buffer.from(object.tail)];
    const tail = Buffer.from('\nendobj\n');
    for (const part of [head, ...body, tail]) {
      chunks.push(part);
      position += part.length;
    }
  });

  const xrefAt = position;
  const xref = [
    `xref\n0 ${objects.length + 1}\n`,
    '0000000000 65535 f \n',
    ...offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`),
    `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\n`,
    `startxref\n${xrefAt}\n%%EOF\n`,
  ].join('');
  chunks.push(Buffer.from(xref));
  return Buffer.concat(chunks);
};
