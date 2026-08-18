import assert from 'node:assert/strict';
import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {test} from 'node:test';
import {woff2Coverage} from '../scripts/glyphs-lib.mjs';

/**
 * The kit renders ✓ (rail, rows), ✕, →, and ₹ (house cast money). The latin
 * brand subsets cover none of them, so coverage must come from the baked
 * fallback faces — otherwise those glyphs depend on the render machine's
 * system fonts and can ship as tofu.
 */
const REQUIRED = {
  '₹ (U+20B9)': 0x20b9,
  '✓ (U+2713)': 0x2713,
  '✕ (U+2715)': 0x2715,
  '→ (U+2192)': 0x2192,
};

test('baked fonts cover every required glyph', () => {
  const fontsDir = 'public/fonts';
  const coverages = readdirSync(fontsDir)
    .filter((name) => name.endsWith('.woff2'))
    .map((name) => woff2Coverage(readFileSync(join(fontsDir, name))));
  for (const [label, codepoint] of Object.entries(REQUIRED)) {
    assert.ok(
      coverages.some((covers) => covers(codepoint)),
      `no baked font covers ${label}`,
    );
  }
});

test('every theme font stack lists the fallback faces', () => {
  for (const theme of ['tech', 'learn', 'fun']) {
    const source = readFileSync(`packages/core/src/themes/${theme}.ts`, 'utf8');
    for (const family of ['Noto Sans Symbols 2', 'Noto Sans Symbols', 'Noto Sans Devanagari']) {
      assert.ok(source.includes(family), `${theme} theme is missing ${family}`);
    }
  }
});
