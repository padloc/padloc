# Checksums

We use file checksums (SHA-256) to verify the source code you see matches the code served by our app. These are instructions for you to verify that too, so you don't have to trust us.

// TODO: Generate checksums of cloned github repo/source (automatically in GH action, and show how to locally, as well)
// find . -type f ! -name "sha256sums.txt" -exec sha256sum {} > sha256sums.txt \;

// TODO: Show how to download website (to check what's served is the same):
// wget -r -p -U Mozilla https://beta.padloc.app/
// cd beta.padloc.app && wget [list-of-files-from-CSP]

// TODO: Verify checksums (local and remote should match)
// sha256sum -c sha256sums.txt

// TODO: Account for hostname changing something in the code? Other variables?
