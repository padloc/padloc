# Checksums (Web)

We use file checksums (SHA-256) to verify the source code you see matches the
code served by our app. These are instructions for you to verify that too, so
you don't have to trust us.

**NOTE:** These commands are meant for Linux and should also work on macOS. For
Windows systems, we suggest you run them via WSL2.

## Verify checksums against source code

1. Clone repo and install dependencies:

    ```bash
    git clone git@github.com:padloc/padloc.git && \
    cd padloc && \
    git pull origin/v4 && \
    npm install
    ```

2. Build code (replace `beta.padloc.app` with whatever domain you're trying to
   check, if not padloc's production):

    ```bash
    PL_PWA_URL=https://beta.padloc.app \
    PL_SERVER_URL=$PL_PWA_URL/server/ \
    npm run pwa:build
    ```

3. Download the latest `sha256sums-web.txt` checksum file:

    ```bash
    cd packages/pwa/dist && \
    wget https://github.com/padloc/padloc/releases/latest/download/sha256sums-web.txt
    ```

4. Verify checksums match:

    ```bash
    sha256sum -c sha256sums-web.txt
    ```

    You should see all `.js` filenames (and `index.html`) with an `OK` next to
    them for matching checksums. You'll get a warning at the end of the script
    if something didn't match.

    Here's an illustrative example of success:

    ```txt
    ./main.js: OK
    ./zxcvbn.chunk.js: OK
    ./ua-parser.chunk.js: OK
    ./locale_res_wordlists_pt_json.chunk.js: OK
    ./locale_res_wordlists_en_json.chunk.js: OK
    ./index.html: OK
    ./app_src_elements_app_ts.chunk.js: OK
    ./sw.js: OK
    ./locale_res_translations_fr_json.chunk.js: OK
    ./locale_res_translations_pl_json.chunk.js: OK
    ./locale_res_translations_es_json.chunk.js: OK
    ./locale_res_translations_de_json.chunk.js: OK
    ./locale_res_translations_ru_json.chunk.js: OK
    ./vendors-app_node_modules_date-fns_esm_sub_index_js.chunk.js: OK
    ./locale_res_wordlists_de_json.chunk.js: OK
    ./vendors-app_node_modules_autosize_src_autosize_js-app_node_modules_dompurify_dist_purify_js-a-10f8da.chunk.js: OK
    ./app_src_lib_1pux-parser_ts.chunk.js: OK
    ./papaparse.chunk.js: OK
    ./locale_res_wordlists_es_json.chunk.js: OK
    ./locale_res_translations__template_json.chunk.js: OK
    ./locale_res_wordlists_fr_json.chunk.js: OK
    ./jsqr.chunk.js: OK
    ./date-fns.chunk.js: OK
    ```

    And one with a tampered `main.js` file:

    ```txt
    ./main.js: FAILED
    ./zxcvbn.chunk.js: OK
    ./ua-parser.chunk.js: OK
    ./locale_res_wordlists_pt_json.chunk.js: OK
    ./locale_res_wordlists_en_json.chunk.js: OK
    ./index.html: OK
    ./app_src_elements_app_ts.chunk.js: OK
    ./sw.js: OK
    ./locale_res_translations_fr_json.chunk.js: OK
    ./locale_res_translations_pl_json.chunk.js: OK
    ./locale_res_translations_es_json.chunk.js: OK
    ./locale_res_translations_de_json.chunk.js: OK
    ./locale_res_translations_ru_json.chunk.js: OK
    ./vendors-app_node_modules_date-fns_esm_sub_index_js.chunk.js: OK
    ./locale_res_wordlists_de_json.chunk.js: OK
    ./vendors-app_node_modules_autosize_src_autosize_js-app_node_modules_dompurify_dist_purify_js-a-10f8da.chunk.js: OK
    ./app_src_lib_1pux-parser_ts.chunk.js: OK
    ./papaparse.chunk.js: OK
    ./locale_res_wordlists_es_json.chunk.js: OK
    ./locale_res_translations__template_json.chunk.js: OK
    ./locale_res_wordlists_fr_json.chunk.js: OK
    ./jsqr.chunk.js: OK
    ./date-fns.chunk.js: OK
    sha256sum: WARNING: 1 computed checksum did NOT match
    ```

## Verify what you're using has the same source code

1. Download a website (replace `beta.padloc.app` with whatever domain you're
   trying to check), and all the relevant files:

    ```bash
    HOST_TO_CHECK=beta.padloc.app && \
    wget -r -p -U Mozilla https://$HOST_TO_CHECK && \
    cd $HOST_TO_CHECK && \
    grep -o "script-src .* blob:; connect-src" index.html | sed "s/\(script-src \| blob:; connect-src\)//g" > files.txt && \
    (sed -i -e 's/ /\n/g' files.txt || sed -i '' 's/ /\n/g' files.txt) && \
    wget -i files.txt && \
    rm files.txt
    ```

    The bash script above downloads a full website into a directory with its
    hostname, then parses the `Content-Security-Policy` meta tag to get the list
    of the rest of the used/necessary files. This will change with each build of
    Padloc, so the script needs to be dynamic.

2. Follow steps 3 and 4 from the `Verify checksums against source code` section
   above.
