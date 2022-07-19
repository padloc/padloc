# Checksums (Chrome)

We use file checksums (SHA-256) to verify the source code you see matches the
code served by our app. These are instructions for you to verify that too, so
you don't have to trust us.

**NOTE:** These commands are meant for Linux and should also work on macOS. For
Windows systems, we suggest you run them via WSL2.

## Verify checksums against source code

Unfortunately, because we sign our Chrome builds, it's not really possible to
locally build the exact same file unless you had access to our certificates and
keys. You can still
[see how we build them here](https://github.com/padloc/padloc/blob/ea05def083df89823d7c15c7bbeb6ef1a1b40383/.github/workflows/publish-release.yml#L54),
and
[see how to build unsigned ones yourself](https://github.com/padloc/padloc/blob/ea05def083df89823d7c15c7bbeb6ef1a1b40383/.github/workflows/build-web-extension.yml),
though.

## Verify what you're using has the same source code

1. Download the crx file.

    You can do that from
    [our releases page](https://github.com/padloc/padloc/releases) or from the
    store you've downloaded it from, to make sure that wasn't tampered with in
    the process of uploading there.

2. Download the latest `sha256sum-crx.txt` checksum file:

    ```bash
    wget https://github.com/padloc/padloc/releases/latest/download/sha256sum-crx.txt
    ```

3. Verify checksum matches:

    ```bash
    sha256sum -c sha256sum-crx.txt
    ```

    You should see the `.crx` filename with an `OK` next to it for matching
    checksums. You'll get a warning at the end of the script if something didn't
    match.

    > **NOTE:** If there's a warning about failing to find a file, your `.crx`
    > file probably doesn't match what `sha256sum-crx.txt` expects, so you can
    > change your `.crx` file's name to `padloc-signed.crx` (or whatever's in
    > the file) for it to be found.

    Here's an illustrative example of success:

    ```txt
    ./padloc-signed.crx: OK
    ```

    And one with a tampered file:

    ```txt
    ./padloc-signed.crx: FAILED
    sha256sum: WARNING: 1 computed checksum did NOT match
    ```
