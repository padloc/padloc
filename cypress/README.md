# Compatibility fixture

`fixtures/v3-client` is a prebuilt Padloc v3 browser client used by the v3
compatibility tests. Its `pl-icon` component embeds original Padloc SVG artwork
from `assets/icons/padloc` and preserves the legacy icon names and click
targets. The service worker's precache list must match the files in the fixture.

The modified application chunk has no source map. Debug it directly in the
browser's Sources panel; a map from the original bundle would point to stale
source and line numbers.
