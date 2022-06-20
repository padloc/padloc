# Checksums (Windows)

We use file checksums (SHA-256) to verify the source code you see matches the
code served by our app. These are instructions for you to verify that too, so
you don't have to trust us.

**NOTE:** These commands are meant for Linux and should also work on macOS. For
Windows systems, we suggest you run them via WSL2.

## Verify checksums against source code

Unfortunately, because we sign our Windows builds (both via Electron and Tauri),
it's not really possible to locally build the exact same file unless you had
access to our certificates and keys. You can still see how we build them here
([via Electron](https://github.com/padloc/padloc/blob/ea05def083df89823d7c15c7bbeb6ef1a1b40383/.github/workflows/publish-release.yml#L166)
and
[via Tauri](https://github.com/padloc/padloc/blob/ea05def083df89823d7c15c7bbeb6ef1a1b40383/.github/workflows/publish-release.yml#L116)),
and see how to build unsigned ones yourself
([via Electron](https://github.com/padloc/padloc/blob/ea05def083df89823d7c15c7bbeb6ef1a1b40383/.github/workflows/build-electron.yml)
and
[via Tauri](https://github.com/padloc/padloc/blob/ea05def083df89823d7c15c7bbeb6ef1a1b40383/.github/workflows/build-tauri.yml))
, though.

## Verify what you're using has the same source code

1. Download the Electron or Tauri exe or msi file.

    You can do that from
    [our releases page](https://github.com/padloc/padloc/releases) or from the
    store you've downloaded it from, to make sure that wasn't tampered with in
    the process of uploading there.

2. Download the latest `sha256sum-[tauri/electron]-[exe/msi].txt` checksum file:

    **NOTE**: Pick one of the options above, from `tauri` or `electron`, and
    from `exe` or `msi`, depending on what's available for that platform. You
    can see what's available in the releases page. For the examples below, we'll
    use `tauri` and `msi`.

    ```bash
    wget https://github.com/padloc/padloc/releases/latest/download/sha256sum-tauri-msi.txt
    ```

3. Verify checksum matches:

    ```bash
    # replaces windows line-endings with unix
    sed -i.bak 's/\r$//' sha256sum-tauri-msi.txt && \
    sha256sum -c sha256sum-tauri-msi.txt
    ```

    You should then see the `.msi` filename with an `OK` next to it for matching
    checksums. You'll get a warning at the end of the script if something didn't
    match.

    > **NOTE:** If there's a warning about failing to find a file, your `.msi`
    > file probably doesn't match what `sha256sum-tauri-msi.txt` expects, so you
    > can change your `.msi` file's name to `Padloc_4.0.0_x64_en-US.msi` (or
    > whatever's in the file) for it to be found.

    Here's an illustrative example of success:

    ```txt
    ./Padloc_4.0.0_x64_en-US.msi: OK
    ```

    And one with a tampered file:

    ```txt
    ./Padloc_4.0.0_x64_en-US.msi: FAILED
    sha256sum: WARNING: 1 computed checksum did NOT match
    ```
