# Licensing and release packaging

The root `LICENSE.txt` maps the community and enterprise licenses.
`THIRD-PARTY-NOTICES.txt` preserves notices for vendored code, fonts, and
wordlists. Their terms apply independently of Padloc's code licenses.

## Browser builds

The PWA, admin portal, extension UI, and Tauri/Cordova web builds emit a
`licenses.html` page, the applicable Padloc license texts, third-party notices,
and `SOURCE.json`. The support page links to the matching GitHub source revision
as “Source & Licenses”; `PL_SOURCE_URL` overrides that destination for modified
distributions. The notices include licenses from the npm packages found in the
webpack module graph. For JSZip's prebuilt browser bundle, they also include its
declared runtime dependency closure. New prebuilt bundles need review for
embedded dependencies. Missing dependency license texts fail the build. Any
manually restored notice must identify the exact package version and code
checksum in `tools/licensing/notice-overrides.json`.

Build releases from a clean, committed source tree with `PL_RELEASE_BUILD=true`.
`PL_SOURCE_REVISION` identifies the full Git commit when `.git` is unavailable,
including in Docker builds. The default source download points to that commit in
the public Padloc repository. Forks and modified distributions must set
`PL_SOURCE_URL` to their own corresponding source download, including assets,
lockfiles, build scripts, and installation instructions. A base-revision link
does not cover unpublished modifications.

For example:

```sh
docker build -f Dockerfile-pwa \
    --build-arg PL_SOURCE_REVISION="$(git rev-parse HEAD)" \
    --build-arg PL_SOURCE_URL=https://example.com/releases/padloc-source.tar.gz .
```

The release workflow publishes a complete source archive alongside the release
artifacts. Preserve existing release tags and their original license texts. The
Docker publishing workflows pass the source commit into the images. Container
dependencies and native desktop/mobile dependencies require their own notice and
source review in addition to webpack's bundled npm notices; the browser notice
generator does not inventory operating-system or Rust packages.

## Workspace archives

`npm pack --workspace <name>` stages copies of the root license texts and
vendored notices through `prepack`, then removes them through `postpack`. The
root files remain canonical. If packing is interrupted, run
`node ../../tools/licensing/pack.cjs clean` from the affected workspace before
retrying. Cleanup refuses to delete altered notices.

Workspace archives are source components of the monorepo, not standalone
installers. Use the complete source archive to build the applications.
`npm run license:check -- packages/pwa/dist enterprise/admin/dist` checks packed
license contents and browser output. Run it after building both applications.

## Wordlist provenance

`tools/licensing/wordlist-sources.json` records source URLs, upstream checksums,
and local checksums for the passphrase wordlists. The English list is EFF's long
wordlist with dice indices removed. The other lists are selections from
FrequencyWords' 2018 OpenSubtitles frequency data. They retain their data
licenses when bundled into either edition. Preserve the attribution and record
adaptations when updating a list.
