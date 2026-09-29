"""
Builds a small, self-hosted subset of the "Material Symbols Rounded" icon font.

The full variable font (node_modules/material-symbols) is ~5 MB. This script keeps only the
icons whose names appear as string literals / template text in `src/`, pins the axes the app
does not vary (wght 400, GRAD 0, opsz 24; FILL stays variable for `.filled-icon`) and writes
`src/fonts/material-symbols-rounded.woff2`.

Run after adding new icons:  npm run icons   (requires: pip install fonttools brotli)
"""

import re
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'node_modules/material-symbols/material-symbols-rounded.woff2'
TARGET = ROOT / 'src/fonts/material-symbols-rounded.woff2'

font = TTFont(SOURCE)
glyph_order = set(font.getGlyphOrder())

# Every word-like token in the sources that is also an icon name. Over-including a few icons
# (e.g. "close", "title") costs little; missing one would render its name as text.
tokens: set[str] = set()
for path in (ROOT / 'src').rglob('*'):
    if path.suffix in {'.ts', '.html'} and 'fonts' not in path.parts:
        tokens.update(re.findall(r'[a-z0-9][a-z0-9_]*', path.read_text(encoding='utf-8')))
icons = sorted(t for t in tokens if t in glyph_order and len(t) > 1)
if not icons:
    sys.exit('no icons found')

glyphs = {'.notdef', 'space'}
glyphs.update(icons)
glyphs.update(f'{name}.fill' for name in icons if f'{name}.fill' in glyph_order)
# Letters, digits and "_" are the ligature components.
cmap = font.getBestCmap()
text = 'abcdefghijklmnopqrstuvwxyz0123456789_ '
glyphs.update(cmap[ord(c)] for c in text if ord(c) in cmap)

options = subset.Options()
options.layout_closure = False  # keep only ligatures whose icon glyph is retained
options.layout_features = ['*']
options.flavor = 'woff2'
options.name_IDs = ['*']
options.notdef_outline = True
subsetter = subset.Subsetter(options)
subsetter.populate(glyphs=sorted(glyphs))
subsetter.subset(font)

font = instancer.instantiateVariableFont(font, {'wght': 400, 'GRAD': 0, 'opsz': 24})
font.flavor = 'woff2'
TARGET.parent.mkdir(parents=True, exist_ok=True)
font.save(TARGET)
print(f'{len(icons)} icons -> {TARGET.relative_to(ROOT)} ({TARGET.stat().st_size / 1024:.1f} KiB)')
