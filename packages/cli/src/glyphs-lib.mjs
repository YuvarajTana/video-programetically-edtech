import {brotliDecompressSync} from 'node:zlib';

/**
 * Just enough WOFF2 parsing to answer one question: which codepoints does
 * this font actually cover? The handoff shipped tofu for ₹ and ✓ before
 * anyone noticed — cmap coverage is checkable in CI, so check it there.
 */

const KNOWN_TAGS = [
  'cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ',
  'fpgm', 'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp',
  'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF',
  'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL',
  'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc',
  'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx',
  'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill',
];

const readUIntBase128 = (buffer, state) => {
  let value = 0;
  for (let i = 0; i < 5; i++) {
    const byte = buffer[state.offset++];
    value = (value * 128) + (byte & 0x7f);
    if ((byte & 0x80) === 0) return value;
  }
  throw new Error('bad UIntBase128');
};

/** Returns a function `covers(codepoint)` for a .woff2 buffer. */
export const woff2Coverage = (buffer) => {
  if (buffer.toString('ascii', 0, 4) !== 'wOF2') throw new Error('not woff2');
  const numTables = buffer.readUInt16BE(12);
  const state = {offset: 48};
  const tables = [];
  for (let i = 0; i < numTables; i++) {
    const flags = buffer[state.offset++];
    const tagIndex = flags & 0x3f;
    const tag =
      tagIndex === 63
        ? buffer.toString('ascii', state.offset, (state.offset += 4))
        : KNOWN_TAGS[tagIndex];
    const transformVersion = (flags >> 6) & 0x03;
    const origLength = readUIntBase128(buffer, state);
    const isGlyfLoca = tag === 'glyf' || tag === 'loca';
    const transformed = isGlyfLoca ? transformVersion === 0 : transformVersion !== 0;
    const transformLength = transformed ? readUIntBase128(buffer, state) : null;
    tables.push({tag, length: transformLength ?? origLength});
  }
  const decompressed = brotliDecompressSync(buffer.subarray(state.offset));

  let at = 0;
  let cmap = null;
  for (const table of tables) {
    if (table.tag === 'cmap') {
      cmap = decompressed.subarray(at, at + table.length);
      break;
    }
    at += table.length;
  }
  if (!cmap) throw new Error('no cmap table');

  // Pick the best unicode subtable: format 12 if present, else format 4.
  const subtables = [];
  const encodingCount = cmap.readUInt16BE(2);
  for (let i = 0; i < encodingCount; i++) {
    const platform = cmap.readUInt16BE(4 + i * 8);
    const encoding = cmap.readUInt16BE(6 + i * 8);
    const offset = cmap.readUInt32BE(8 + i * 8);
    if (platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10))) {
      subtables.push(cmap.subarray(offset));
    }
  }
  const parsed = subtables
    .map((subtable) => {
      const format = subtable.readUInt16BE(0);
      if (format === 12) {
        const groups = subtable.readUInt32BE(12);
        const ranges = [];
        for (let i = 0; i < groups; i++) {
          ranges.push([
            subtable.readUInt32BE(16 + i * 12),
            subtable.readUInt32BE(20 + i * 12),
          ]);
        }
        return ranges;
      }
      if (format === 4) {
        const segCount = subtable.readUInt16BE(6) / 2;
        const ranges = [];
        for (let i = 0; i < segCount; i++) {
          const end = subtable.readUInt16BE(14 + i * 2);
          const start = subtable.readUInt16BE(16 + segCount * 2 + i * 2);
          if (start !== 0xffff) ranges.push([start, end]);
        }
        return ranges;
      }
      return null;
    })
    .filter(Boolean);
  if (!parsed.length) throw new Error('no unicode cmap subtable');
  const ranges = parsed.flat();
  return (codepoint) =>
    ranges.some(([start, end]) => codepoint >= start && codepoint <= end);
};
