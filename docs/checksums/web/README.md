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
    git pull origin/main && \
    npm install
    ```

2. Build code (replace `web.padloc.app` with whatever domain you're trying to
   check, if not padloc's production):

    ```bash
    PL_PWA_URL=https://web.padloc.app \
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

    You should see all filenames with an `OK` next to them for matching
    checksums. You'll get a warning at the end of the script if something didn't
    match.

    Here's an illustrative example of success:

    ```txt
    ./main.js: OK
    ./9c5a939648cf4e10869c369c7262c0b2.woff2: OK
    ./0ce7bb41cbc2ad09a21b7b5222628111.svg: OK
    ./zxcvbn.chunk.js: OK
    ./manifest.623e2268f17398ec7f19225e281e4056.json: OK
    ./ua-parser.chunk.js: OK
    ./locale_res_wordlists_pt_json.chunk.js: OK
    ./locale_res_wordlists_en_json.chunk.js: OK
    ./sw.js.map: OK
    ./app_src_elements_app_ts.chunk.js.map: OK
    ./index.html: OK
    ./ua-parser.chunk.js.map: OK
    ./6d964ac2439b4e11afd25d1d47df88b6.woff2: OK
    ./56435da2448caaff95b05759954ec6ee.woff2: OK
    ./icon_192x192.8dfb7236c7e6b6591567173b18eaa144.png: OK
    ./vendors-app_node_modules_autosize_src_autosize_js-app_node_modules_dompurify_dist_purify_js-a-10f8da.chunk.js.map: OK
    ./app_src_elements_app_ts.chunk.js: OK
    ./sw.js: OK
    ./main.js.map: OK
    ./icon_384x384.971e45062e4d601a3014dc16ee3ed27b.png: OK
    ./locale_res_translations_fr_json.chunk.js: OK
    ./c94db5f3862667362c6815c9b1ec8acf.woff2: OK
    ./icon_256x256.9a47fba2857d94939047064f37cd075f.png: OK
    ./locale_res_translations_pl_json.chunk.js: OK
    ./locale_res_translations_es_json.chunk.js: OK
    ./locale_res_translations_de_json.chunk.js: OK
    ./zxcvbn.chunk.js.map: OK
    ./locale_res_translations_ru_json.chunk.js: OK
    ./papaparse.chunk.js.map: OK
    ./5d40dd64e2278fe436ba68ac7f1195a4.woff2: OK
    ./jsqr.chunk.js.map: OK
    ./1bbee3bd1bc00c4dce2a7c7046930ae6.woff2: OK
    ./app_src_lib_1pux-parser_ts.chunk.js.map: OK
    ./vendors-app_node_modules_date-fns_esm_sub_index_js.chunk.js: OK
    ./locale_res_wordlists_de_json.chunk.js: OK
    ./favicon.png: OK
    ./icon_128x128.f620784d1682c9fbb033d3b018e7d998.png: OK
    ./vendors-app_node_modules_autosize_src_autosize_js-app_node_modules_dompurify_dist_purify_js-a-10f8da.chunk.js: OK
    ./app_src_lib_1pux-parser_ts.chunk.js: OK
    ./papaparse.chunk.js: OK
    ./icon_512x512.e3175643e8fe0d95175a493da5201480.png: OK
    ./4a9ab29a10089191088de2b7c02c78e7.woff2: OK
    ./locale_res_wordlists_es_json.chunk.js: OK
    ./locale_res_translations__template_json.chunk.js: OK
    ./vendors-app_node_modules_date-fns_esm_sub_index_js.chunk.js.map: OK
    ./locale_res_wordlists_fr_json.chunk.js: OK
    ./icon_96x96.eda9f98be1c35dabab77f9d2ab7be538.png: OK
    ./5ce2631c76a09ec2ab1d619e3b1eda91.woff2: OK
    ./jsqr.chunk.js: OK
    ./b1fac335d3804d9dadf795e093048b40.woff2: OK
    ./03e3c10d4a52fe7b56918f851766d886.woff2: OK
    ./date-fns.chunk.js.map: OK
    ./date-fns.chunk.js: OK
    ```

    And one with a tampered `main.js` file:

    ```txt
    ./main.js: FAILED
    ./9c5a939648cf4e10869c369c7262c0b2.woff2: OK
    ./0ce7bb41cbc2ad09a21b7b5222628111.svg: OK
    ./zxcvbn.chunk.js: OK
    ./manifest.623e2268f17398ec7f19225e281e4056.json: OK
    ./ua-parser.chunk.js: OK
    ./locale_res_wordlists_pt_json.chunk.js: OK
    ./locale_res_wordlists_en_json.chunk.js: OK
    ./sw.js.map: OK
    ./app_src_elements_app_ts.chunk.js.map: OK
    ./index.html: OK
    ./ua-parser.chunk.js.map: OK
    ./6d964ac2439b4e11afd25d1d47df88b6.woff2: OK
    ./56435da2448caaff95b05759954ec6ee.woff2: OK
    ./icon_192x192.8dfb7236c7e6b6591567173b18eaa144.png: OK
    ./vendors-app_node_modules_autosize_src_autosize_js-app_node_modules_dompurify_dist_purify_js-a-10f8da.chunk.js.map: OK
    ./app_src_elements_app_ts.chunk.js: OK
    ./sw.js: OK
    ./main.js.map: OK
    ./icon_384x384.971e45062e4d601a3014dc16ee3ed27b.png: OK
    ./locale_res_translations_fr_json.chunk.js: OK
    ./c94db5f3862667362c6815c9b1ec8acf.woff2: OK
    ./icon_256x256.9a47fba2857d94939047064f37cd075f.png: OK
    ./locale_res_translations_pl_json.chunk.js: OK
    ./locale_res_translations_es_json.chunk.js: OK
    ./locale_res_translations_de_json.chunk.js: OK
    ./zxcvbn.chunk.js.map: OK
    ./locale_res_translations_ru_json.chunk.js: OK
    ./papaparse.chunk.js.map: OK
    ./5d40dd64e2278fe436ba68ac7f1195a4.woff2: OK
    ./jsqr.chunk.js.map: OK
    ./1bbee3bd1bc00c4dce2a7c7046930ae6.woff2: OK
    ./app_src_lib_1pux-parser_ts.chunk.js.map: OK
    ./vendors-app_node_modules_date-fns_esm_sub_index_js.chunk.js: OK
    ./locale_res_wordlists_de_json.chunk.js: OK
    ./favicon.png: OK
    ./icon_128x128.f620784d1682c9fbb033d3b018e7d998.png: OK
    ./vendors-app_node_modules_autosize_src_autosize_js-app_node_modules_dompurify_dist_purify_js-a-10f8da.chunk.js: OK
    ./app_src_lib_1pux-parser_ts.chunk.js: OK
    ./papaparse.chunk.js: OK
    ./icon_512x512.e3175643e8fe0d95175a493da5201480.png: OK
    ./4a9ab29a10089191088de2b7c02c78e7.woff2: OK
    ./locale_res_wordlists_es_json.chunk.js: OK
    ./locale_res_translations__template_json.chunk.js: OK
    ./vendors-app_node_modules_date-fns_esm_sub_index_js.chunk.js.map: OK
    ./locale_res_wordlists_fr_json.chunk.js: OK
    ./icon_96x96.eda9f98be1c35dabab77f9d2ab7be538.png: OK
    ./5ce2631c76a09ec2ab1d619e3b1eda91.woff2: OK
    ./jsqr.chunk.js: OK
    ./b1fac335d3804d9dadf795e093048b40.woff2: OK
    ./03e3c10d4a52fe7b56918f851766d886.woff2: OK
    ./date-fns.chunk.js.map: OK
    ./date-fns.chunk.js: OK
    sha256sum: WARNING: 1 computed checksum did NOT match
    ```

## Verify what you're using has the same source code

1. Download a website (replace `web.padloc.app` with whatever domain you're
   trying to check), and all the relevant files:

    ```bash
    HOST_TO_CHECK=web.padloc.app && \
    wget -r -p -U Mozilla https://$HOST_TO_CHECK && \
    cd $HOST_TO_CHECK && \
    wget https://github.com/padloc/padloc/releases/latest/download/parse-csp.ts && \
    deno run --allow-read=index.html --allow-net=$HOST_TO_CHECK --allow-write=. parse-csp.ts
    ```

    The bash script above downloads a full website into a directory with its
    hostname, then parses the `Content-Security-Policy` meta tag to get the list
    of all the used/necessary files (using [`Deno`](https://deno.land), after
    downloading the [`parse-csp.ts`](parse-csp.ts) file from this repo). This
    will change with each build of Padloc, so the script needs to be dynamic.

2. Download the latest `sha256sums-web.txt` checksum file:

    ```bash
    wget https://github.com/padloc/padloc/releases/latest/download/sha256sums-web.txt
    ```

3. Verify checksums match:

    ```bash
    sha256sum -c sha256sums-web.txt
    ```

    You can see step 4 from the `Verify checksums against source code` section
    above, for expected outputs.
