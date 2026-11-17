"""Rebuild the icon review pages from SVG sources and the UI usage inventory."""
from pathlib import Path
from html import escape
import json
import re

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
usage = json.loads((HERE / "usage.json").read_text())
source = (ROOT / "packages/app/src/elements/icon.ts").read_text()
codes = {}
for name, body in re.findall(r':host\(\[icon="([^"]+)"\]\) > div::before \{(.*?)\}', source, re.S):
    body = re.sub(r'/\*.*?\*/', '', body, flags=re.S)
    values = re.findall(r'\\+([0-9a-f]+)', body)
    if values:
        codes[name] = int(values[-1], 16)
header = '''<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Padloc icon comparison</title>
<style>
@font-face{font-family:FA;src:url('../../fonts/FontAwesome/fa-light-300.woff2');font-weight:300}
@font-face{font-family:FA;src:url('../../fonts/FontAwesome/fa-regular-400.woff2');font-weight:400}
@font-face{font-family:FA;src:url('../../fonts/FontAwesome/fa-thin-100.woff2');font-weight:100}
*{box-sizing:border-box}body{--ink:#253a49;--panel:white;--bg:#f3f5f7;--size:36px;margin:0;background:var(--bg);color:var(--ink);font:14px system-ui,sans-serif}body.dark{--ink:#e1e9f1;--panel:#263746;--bg:#18232d}main{max-width:1140px;padding:28px;margin:auto}h1{margin:0 0 8px;font-size:28px}p{line-height:1.5;margin:8px 0 18px}header{position:sticky;top:0;background:var(--bg);padding:18px 0;z-index:1}.controls{display:flex;flex-wrap:wrap;gap:16px;align-items:center}input,select,button{font:inherit;padding:8px;border:1px solid #8b99a6;border-radius:6px;background:var(--panel);color:var(--ink)}input[type=search]{width:210px}label{display:flex;align-items:center;gap:8px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}.card{padding:16px 12px;border-radius:12px;background:var(--panel);text-align:center}.card[hidden]{display:none}.name{margin:0 0 14px;font-weight:500}.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}.sample{height:56px;display:flex;align-items:center;justify-content:center}.sample svg{width:var(--size);height:var(--size)}.fa{font-family:FA;font-weight:300;font-size:var(--size)}.label{font-size:10px;letter-spacing:.06em;opacity:.7;margin:6px 0}.small .sample{height:28px}.small svg{width:20px;height:20px}.small .fa{font-size:20px}.missing{font:11px system-ui;opacity:.65}footer{padding:24px 0;opacity:.75;font-size:12px}
</style><main><header><h1>Padloc · icon comparison</h1><p>Custom SVG left · bundled Font Awesome right · small samples at 20px</p><div class="controls"><label>Find <input id="search" type="search" placeholder="Icon name"></label><label>Size <select id="size"><option>16</option><option>24</option><option selected>36</option><option>48</option></select></label><label>FA weight <select id="weight"><option value="100">Thin</option><option value="300" selected>Light (app default)</option><option value="400">Regular</option></select></label><button id="theme" aria-pressed="false">Dark theme</button><span id="count" aria-live="polite"></span></div></header><div class="grid">'''
cards = []
for name in usage:
    svg = (HERE / f'{name}.svg').read_text().replace('<svg', '<svg aria-hidden="true"', 1)
    fa = f'<span aria-hidden="true">&#x{codes[name]:x};</span>' if name in codes else '<span class="missing">No mapping</span>'
    cards.append(f'<section class="card" data-name="{name}"><h2 class="name" style="font-size:14px">{name}</h2><div class="pair"><div><div class="sample">{svg}</div><div class="label">CUSTOM</div></div><div><div class="sample fa">{fa}</div><div class="label">FONT AWESOME</div></div></div><div class="pair small"><div class="sample">{svg}</div><div class="sample fa">{fa}</div></div></section>')
footer = '''</div><footer>Only names referenced by the UI are listed. The app maps normal font weight to Font Awesome Light. Vault artwork intentionally uses a safe instead of a cube. “chevron-right” is used in the UI but has no current pl-icon mapping. This is an artwork preview; the app renderer has not been migrated.</footer></main>
<script>
const cards = [...document.querySelectorAll('.card')];
const search = document.getElementById('search');
function filter(){let count=0;for(const card of cards){card.hidden=!card.dataset.name.includes(search.value.trim().toLowerCase());if(!card.hidden)count++;}document.getElementById('count').textContent=`${count} / ${cards.length} icons`;}
search.addEventListener('input',filter);filter();
document.getElementById('size').addEventListener('change',e=>document.body.style.setProperty('--size',`${e.target.value}px`));
document.getElementById('weight').addEventListener('change',e=>document.querySelectorAll('.fa').forEach(el=>el.style.fontWeight=e.target.value));
document.getElementById('theme').addEventListener('click',e=>{const dark=document.body.classList.toggle('dark');e.target.setAttribute('aria-pressed',String(dark));e.target.textContent=dark?'Light theme':'Dark theme';});
</script></html>'''
(HERE / 'comparison.html').write_text(header + '\n'.join(cards) + footer)
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
print(f'Built comparison and contact sheet for {len(usage)} UI icon names.')

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
weight_footer = '''<footer>Stroke preview only. Inner strokes scale proportionally; no optical corrections or application weight support have been applied.</footer></main>
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
