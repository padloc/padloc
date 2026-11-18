"""Rebuild the icon review pages from SVG sources and the UI usage inventory."""
from pathlib import Path
from html import escape
import json
import re

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
usage = json.loads((HERE / "usage.json").read_text())
# A complete, self-contained SVG contact sheet for offline review.
width=960; rows=(len(usage)+5)//6; height=100+rows*110
sheet=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',f'<rect width="{width}" height="{height}" fill="#f3f5f7"/>','<text x="24" y="42" font-family="sans-serif" font-size="24" fill="#253a49">Padloc Icons · UI inventory</text>']
for i,name in enumerate(usage):
    svg=(HERE/f'{name}.svg').read_text()
    body=re.sub(r'^.*?<svg[^>]*>|</svg>.*$', '', svg, flags=re.S)
    x=12+(i%6)*158;y=68+(i//6)*110
    sheet.extend([f'<rect x="{x}" y="{y}" width="148" height="100" rx="8" fill="white"/>',f'<g transform="translate({x+56} {y+16}) scale(1.5)" fill="none" stroke="#253a49" color="#253a49" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">{body}</g>',f'<text x="{x+74}" y="{y+80}" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#253a49">{escape(name)}</text>'])
sheet.append('</svg>')
(HERE/'contact-sheet.svg').write_text('\n'.join(sheet)+'\n')
print(f'Built contact sheet for {len(usage)} UI icon names.')

# Stroke-only weight exploration; filled details retain their source geometry.
weight_rows = []
for name in usage:
    original = (HERE / f'{name}.svg').read_text()
    body = re.sub(r'^.*?<svg[^>]*>|</svg>.*$', '', original, flags=re.S)
    cells = []
    for width in (1.25, 1.75, 2.25):
        art = re.sub(
            r'stroke-width="([\d.]+)"',
            lambda match: f'stroke-width="{float(match[1]) * width / 1.75:.4f}"',
            body,
        )
        svg = (
            '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" '
            f'stroke="currentColor" stroke-width="{width}" '
            f'stroke-linecap="round" stroke-linejoin="round">{art}</svg>'
        )
        cells.append(f'<div class="samples"><span class="large">{svg}</span><span class="small">{svg}</span></div>')
    weight_rows.append(
        f'<section class="row" data-name="{name}" aria-label="{name}: light, regular, bold">'
        f'<h2>{name}</h2>{"".join(cells)}</section>'
    )
weight_header = '''<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Padloc · all icon weights</title>
<style>
*{box-sizing:border-box}
body{--ink:#253a49;--panel:#fff;--bg:#f3f5f7;--size:40px;margin:0;background:var(--bg);color:var(--ink);font:14px system-ui,sans-serif}
body.dark{--ink:#e1e9f1;--panel:#263746;--bg:#18232d}
main{max-width:1120px;margin:auto;padding:0 24px 24px}
header{position:sticky;top:0;z-index:1;background:var(--bg);padding-top:24px}
h1{margin:0 0 8px;font-size:28px}p{margin:0 0 18px;line-height:1.5;opacity:.8}
.controls{display:flex;flex-wrap:wrap;gap:16px;align-items:center;margin-bottom:16px}
label{display:flex;align-items:center;gap:8px}input,select,button{font:inherit;color:var(--ink);background:var(--panel);border:1px solid #8b99a6;border-radius:6px;padding:8px}
input{width:210px}button{cursor:pointer}.columns,.row{display:grid;grid-template-columns:minmax(130px,1fr) repeat(3,minmax(120px,1.5fr));align-items:center;gap:8px}
.columns{padding:12px 16px 16px;text-align:center}.columns span:first-child{text-align:left}.columns small{display:block;font-size:12px;opacity:.7;margin-top:4px}
.row{padding:16px;margin-bottom:8px;min-height:96px;border-radius:9px;background:var(--panel)}.row[hidden]{display:none}
h2{font-size:14px;font-weight:500;margin:0;overflow-wrap:anywhere}
.samples{display:flex;gap:28px;justify-content:center;align-items:center}.samples span{display:inline-flex}.large svg{width:var(--size);height:var(--size)}.small svg{width:20px;height:20px}
footer{padding:16px 0;font-size:12px;opacity:.8}
@media(max-width:660px){main{padding:0 12px 12px}.columns,.row{grid-template-columns:minmax(100px,1fr) repeat(3,minmax(65px,1fr));gap:4px}.samples{gap:8px;flex-wrap:wrap}.row{padding:12px 8px}.columns{padding-left:8px;padding-right:8px}}
</style>
<main><header><h1>Padloc · all icon weights</h1>
<p>Same geometry at three stroke widths. Large samples adjustable; small samples fixed at 20px. Filled details unchanged.</p>
<div class="controls"><label>Find <input id="search" type="search" placeholder="Icon name"></label><label>Sample size <select id="size"><option>16</option><option>20</option><option>24</option><option>32</option><option selected>40</option><option>48</option></select></label><button id="theme" aria-pressed="false">Dark theme</button><span id="count" aria-live="polite"></span></div>
<div class="columns"><span>Icon</span><span>Light<small>1.25</small></span><span>Regular<small>1.75 · current</small></span><span>Bold<small>2.25</small></span></div></header>
'''
weight_footer = '''<footer>Inner strokes scale proportionally, matching the application renderer.</footer></main>
<script>
const rows=[...document.querySelectorAll('.row')];
const search=document.getElementById('search');
function filter(){let count=0;for(const row of rows){row.hidden=!row.dataset.name.includes(search.value.trim().toLowerCase());if(!row.hidden)count++;}document.getElementById('count').textContent=`${count} / ${rows.length} icons`;}
search.addEventListener('input',filter);filter();
document.getElementById('size').addEventListener('change',e=>document.body.style.setProperty('--size',`${e.target.value}px`));
document.getElementById('theme').addEventListener('click',e=>{const dark=document.body.classList.toggle('dark');e.target.setAttribute('aria-pressed',String(dark));e.target.textContent=dark?'Light theme':'Dark theme';});
</script></html>
'''
(HERE / 'weights.html').write_text(weight_header + '\n'.join(weight_rows) + weight_footer)
print(f'Built stroke-weight preview for {len(usage)} UI icon names.')
