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

Run `python3 assets/icons/padloc/build-preview.py` from the repository root to
rebuild `contact-sheet.svg`, `comparison.html`, and `weights.html` from these
sources. Then format the generated files with the installed Prettier
(`--parser html` for SVG). Open `comparison.html` in a browser for searchable,
side-by-side comparisons with the bundled Font Awesome fonts, adjustable sizes
and weights, and light and dark themes. Font Awesome artwork is referenced only
by this preview and is not included in the custom SVG sources.

Names match existing `pl-icon` identifiers where applicable. This directory
contains artwork; the application renderer must explicitly map names to these
assets before they appear in the app. Decorative icons should be hidden from
assistive technology, and icon-only controls need accessible names on the
control.

Open `weights.html` for all UI icons at light (1.25), regular (1.75), and bold
(2.25) stroke widths. This preview scales inner strokes proportionally and
leaves filled details unchanged; it does not implement weights in the app.
