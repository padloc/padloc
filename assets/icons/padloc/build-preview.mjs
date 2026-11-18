import { readFileSync, writeFileSync } from "node:fs";

const read = (file) => readFileSync(new URL(file, import.meta.url), "utf8");
const write = (file, content) => writeFileSync(new URL(file, import.meta.url), content);
const icons = Object.keys(JSON.parse(read("usage.json"))).map((name) => ({
    name: name.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"),
    body: read(`${name}.svg`).replace(/^.*?<svg[^>]*>|<\/svg>.*$/gs, ""),
}));

const columns = 6;
const width = 960;
const height = 100 + Math.ceil(icons.length / columns) * 110;
const tiles = icons.map(({ name, body }, index) => {
    const x = 12 + (index % columns) * 158;
    const y = 68 + Math.floor(index / columns) * 110;
    return `
        <rect x="${x}" y="${y}" width="148" height="100" rx="8" fill="white" />
        <g transform="translate(${x + 56} ${y + 16}) scale(1.5)" fill="none" stroke="#253a49" color="#253a49"
           stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${body}</g>
        <text x="${x + 74}" y="${
        y + 80
    }" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#253a49">${name}</text>
    `.trim();
});
write(
    "contact-sheet.svg",
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <rect width="${width}" height="${height}" fill="#f3f5f7" />
        <text x="24" y="42" font-family="sans-serif" font-size="24" fill="#253a49">Padloc Icons · UI inventory</text>
        ${tiles.join("\n")}
    </svg>\n`
);

const rows = icons.map(({ name, body }) => {
    const cells = [1.25, 1.75, 2.25].map((width) => {
        const art = body.replace(/stroke-width="([\d.]+)"/g, (_, originalWidth) => {
            return `stroke-width="${((Number(originalWidth) * width) / 1.75).toFixed(4)}"`;
        });
        const svg = `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${art}</svg>`;
        return `<div class="samples"><span class="large">${svg}</span><span class="small">${svg}</span></div>`;
    });

    return `<section class="row" data-name="${name}" aria-label="${name}: light, regular, bold">
        <h2>${name}</h2>${cells.join("")}
    </section>`;
});

write(
    "weights.html",
    read("weights-template.html").replace("<!-- icon rows -->", () => rows.join("\n"))
);
console.log(`Built the contact sheet and stroke weight preview for ${icons.length} UI icons.`);
