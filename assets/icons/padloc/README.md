# Padloc Icons

Original SVG geometry authored for Padloc, without importing or tracing a
third-party icon library. No separate asset license is introduced here; the
repository's existing licensing terms apply.

Each icon uses a `0 0 24 24` view box, a default stroke width of `1.75`, round
caps and joins, and `currentColor`. Rectangular outlines use a 1.5-unit corner
radius, reduced proportionally for small details. Keep artwork inside the view
box, including its stroke. Use consistent optical weight rather than filling
every available pixel. Check new shapes at 16px and 24px in light and dark
themes.

Individual SVG files are the editable sources. `usage.json` lists the icon names
referenced by the UI and one source location per name, including dynamic file
types, themes, and audit outcomes. Update this inventory when UI usage changes.
Aliases have identical geometry in separate files to preserve names. The
`concepts/` directory contains alternative icon designs for reference.

The app bundles these sources as inline Lit SVG templates; rendering does not
fetch image files or require an icon font. After editing artwork, run:

```sh
python3 assets/icons/padloc/build-icons.py
python3 assets/icons/padloc/build-preview.py
npx prettier --write packages/app/src/lib/icons.ts assets/icons/padloc/weights.html
npx prettier --write assets/icons/padloc/contact-sheet.svg --parser html
```

Commit the generated `packages/app/src/lib/icons.ts` alongside the SVG sources.
Only names in `usage.json` are included in the application bundle. Open
`weights.html` for a searchable preview with adjustable sizes and light and dark
themes, or view `contact-sheet.svg` for the complete inventory.

Use `<pl-icon icon="vault"></pl-icon>` in app templates. Existing icon names and
size classes (`inline`, `large`, `big`, `huge`) are supported. Empty names
reserve space without drawing; unknown names show the generic custom-item icon.

Stroke widths are light (1.25), regular (1.75), and bold (2.25). The app's text
weight styles set an inherited `--icon-stroke-width` CSS property, including
button and menu states. When adding a text weight style that contains icons, set
the corresponding stroke width too. An explicit `weight="light"`,
`weight="regular"`, or `weight="bold"` on `pl-icon` overrides inheritance. Inner
strokes scale proportionally; filled details retain their geometry.

The rendered SVG is decorative and hidden from assistive technology. Icon-only
controls need an accessible name on the control.
