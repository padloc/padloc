importScripts("node_modules/workbox-sw/build/workbox-sw.js");
workbox.precaching.precacheAndRoute([
  {
    "url": "index.html",
    "revision": "331d048aaae64aa3b4edea45f143104b"
  },
  {
    "url": "dist/ajax.js",
    "revision": "baa410375bc0b9074ad735d96acde2e5"
  },
  {
    "url": "dist/animation.js",
    "revision": "6675376e067c83d56a8f9848b7fc321e"
  },
  {
    "url": "dist/clipboard.js",
    "revision": "cb47e0eeb4cb91a97e8031fd7f3b7d0b"
  },
  {
    "url": "dist/crypto.js",
    "revision": "d13e12b0dc317bea611292d7d1fb9daa"
  },
  {
    "url": "dist/dialog.js",
    "revision": "6494ed1ecd13a38b0f0dcfa06cb3aa63"
  },
  {
    "url": "dist/elements/alert-dialog.js",
    "revision": "0c50d03061ce9fbc87a7eb6fe1540830"
  },
  {
    "url": "dist/elements/app.js",
    "revision": "b0b140f6831fca52e2f7da68eb146797"
  },
  {
    "url": "dist/elements/attachment-dialog.js",
    "revision": "ddcc544bfa5ac27fd385bd3e45f991c6"
  },
  {
    "url": "dist/elements/attachment.js",
    "revision": "2060b26089b8bcb75b74c676d55aab20"
  },
  {
    "url": "dist/elements/base.js",
    "revision": "3427a0de0bb81ef7ea684985a2b5538c"
  },
  {
    "url": "dist/elements/billing-dialog.js",
    "revision": "5f3f1efc80e8e53dc13e0e73ba68c360"
  },
  {
    "url": "dist/elements/billing-info.js",
    "revision": "dfcc74f975ac162ebb504028be25432d"
  },
  {
    "url": "dist/elements/card-input.js",
    "revision": "c9c304fe007161b8bd598fe95c645a82"
  },
  {
    "url": "dist/elements/choose-plan-dialog.js",
    "revision": "7b44b4355595ad9d0b06ad91d1dfc673"
  },
  {
    "url": "dist/elements/clipboard.js",
    "revision": "d0ddfcc979db8394d3c3a8482301a3e4"
  },
  {
    "url": "dist/elements/create-invites-dialog.js",
    "revision": "73234a947c0d98bc0a6258d727cf10c5"
  },
  {
    "url": "dist/elements/create-item-dialog.js",
    "revision": "520e65fb04aa24c3bfeb96391a309d01"
  },
  {
    "url": "dist/elements/create-org-dialog.js",
    "revision": "25ff020d50e452ce116fa6236036e381"
  },
  {
    "url": "dist/elements/dialog.js",
    "revision": "4e045d2f6c1872e7f1ce5cfe4d3a8054"
  },
  {
    "url": "dist/elements/export-dialog.js",
    "revision": "ce58016a8c6018c4ee819a9028641f06"
  },
  {
    "url": "dist/elements/field.js",
    "revision": "b07bbe1e0a79430e8b35546760dc759e"
  },
  {
    "url": "dist/elements/generator.js",
    "revision": "4f8de1a54d830743ec7caa55ae1e40d1"
  },
  {
    "url": "dist/elements/group-dialog.js",
    "revision": "e6719421767b32eba0653fa32117c4f3"
  },
  {
    "url": "dist/elements/group-item.js",
    "revision": "491a8349f9ed3ee96764a8c2ee82e009"
  },
  {
    "url": "dist/elements/icon.js",
    "revision": "9de4c8952b8333e517531eebeaeaf5b5"
  },
  {
    "url": "dist/elements/import-dialog.js",
    "revision": "83cf36c06e9b3354945c8c4390677618"
  },
  {
    "url": "dist/elements/input.js",
    "revision": "00d263d6723ef8d059df5a4c7455cf63"
  },
  {
    "url": "dist/elements/invite-dialog.js",
    "revision": "380ff2630f0bed88dc61c25ce76d0c7f"
  },
  {
    "url": "dist/elements/invite-item.js",
    "revision": "613361d0b959c922292fe48f5e93fcde"
  },
  {
    "url": "dist/elements/item-dialog.js",
    "revision": "252e74324ab738a7c9dbc19934109ca8"
  },
  {
    "url": "dist/elements/items-filter.js",
    "revision": "c1419bed5dd908d525c4ed29ce625711"
  },
  {
    "url": "dist/elements/items-list.js",
    "revision": "e59b83cbe91509dcdef5e594d341b06d"
  },
  {
    "url": "dist/elements/loading-button.js",
    "revision": "53c421e31fc252277c17f3f2a581abdd"
  },
  {
    "url": "dist/elements/login.js",
    "revision": "d20e678ef7f94cf3b46aebbe2796050d"
  },
  {
    "url": "dist/elements/logo.js",
    "revision": "e240e991168faf12b21c4f5e211b2765"
  },
  {
    "url": "dist/elements/member-dialog.js",
    "revision": "e92ad0f198b26ad1eae9826bc3b7d7f2"
  },
  {
    "url": "dist/elements/member-item.js",
    "revision": "1e857abfd1765f67792ca4da88a06964"
  },
  {
    "url": "dist/elements/menu.js",
    "revision": "845b7bce061a55c2e053930857fcaffa"
  },
  {
    "url": "dist/elements/move-items-dialog.js",
    "revision": "4bb377b1b3734c7e3edb6926cc294466"
  },
  {
    "url": "dist/elements/notification.js",
    "revision": "b34e32b3e5ad273d696d532fd274cf7b"
  },
  {
    "url": "dist/elements/org-view.js",
    "revision": "df640007a8ab06fb88c65160f3fd2821"
  },
  {
    "url": "dist/elements/password-input.js",
    "revision": "654de4d7b62a61495badd2d6378cae05"
  },
  {
    "url": "dist/elements/premium-dialog.js",
    "revision": "e007b987669e696e30d6656c2bf18f33"
  },
  {
    "url": "dist/elements/prompt-dialog.js",
    "revision": "59b8e9f72f1245dec1fad0768f63b518"
  },
  {
    "url": "dist/elements/qr-dialog.js",
    "revision": "ec8e1f91253400f7d39d8763fcab4200"
  },
  {
    "url": "dist/elements/randomart.js",
    "revision": "42ddc1d2d8503abb5639606191151f80"
  },
  {
    "url": "dist/elements/recover.js",
    "revision": "c17d77fc7032eb5ced45d0184fc240cf"
  },
  {
    "url": "dist/elements/select.js",
    "revision": "e51208001784df735c866fa36495bc0d"
  },
  {
    "url": "dist/elements/settings.js",
    "revision": "e69b9466a0e160aa2e612601531507a2"
  },
  {
    "url": "dist/elements/signup.js",
    "revision": "d3ac396d06d41c97daa4e9673f88c32c"
  },
  {
    "url": "dist/elements/slider.js",
    "revision": "0ba16af1be9d52b0904c316f6da64a1a"
  },
  {
    "url": "dist/elements/spinner.js",
    "revision": "94063ec82094cab000fba207f7fa0eff"
  },
  {
    "url": "dist/elements/start-form.js",
    "revision": "4253bf6867bf7d5f9aa8bbb53694a6f9"
  },
  {
    "url": "dist/elements/start.js",
    "revision": "8556ab3914e47c4956e39fcc2e1224c0"
  },
  {
    "url": "dist/elements/subscription.js",
    "revision": "b674cf2298915bd864fae3e0abbbcfe9"
  },
  {
    "url": "dist/elements/tags-input.js",
    "revision": "9be9096f987b4ddc8a4b618a155c7351"
  },
  {
    "url": "dist/elements/title-bar.js",
    "revision": "55b1e07ced2d363ca3db4e94d765826b"
  },
  {
    "url": "dist/elements/toggle-button.js",
    "revision": "007e63302d4b41566c77c11e66116e9f"
  },
  {
    "url": "dist/elements/toggle.js",
    "revision": "72cc83db24de030714668ddae66461cd"
  },
  {
    "url": "dist/elements/unlock.js",
    "revision": "0820e6cb278432ddd867c14302296912"
  },
  {
    "url": "dist/elements/update-subscription-dialog.js",
    "revision": "c2f49a909bc043bcd1c68f005f658864"
  },
  {
    "url": "dist/elements/upload-dialog.js",
    "revision": "da268a7bde7898a9cb6af60835fd2d89"
  },
  {
    "url": "dist/elements/vault-dialog.js",
    "revision": "15faf0dd2b49f0f36d2d5de21a1396ca"
  },
  {
    "url": "dist/elements/vault-item.js",
    "revision": "e9e312aab88fb00ff465626bd244bdaf"
  },
  {
    "url": "dist/elements/view.js",
    "revision": "6270432b0c3c2549ab9d1d2566158ff1"
  },
  {
    "url": "dist/elements/virtual-list.js",
    "revision": "4519a20910504b601384558b837d4c16"
  },
  {
    "url": "dist/export.js",
    "revision": "edd0b33da57cbe3c0c2504c3e6ed96fc"
  },
  {
    "url": "dist/import.js",
    "revision": "4f1f25fc7cfb433a06f088e2f2f83cc4"
  },
  {
    "url": "dist/init.js",
    "revision": "f5b9df8b29f2bcba9207140fcbc9d3a9"
  },
  {
    "url": "dist/messages.js",
    "revision": "e08a8c24723767b19ff01298f995a02b"
  },
  {
    "url": "dist/mixins/auto-lock.js",
    "revision": "988578ff99457ec76cb76e017cb656d8"
  },
  {
    "url": "dist/mixins/auto-sync.js",
    "revision": "35242e8a008af33cefe4ccc5379b9883"
  },
  {
    "url": "dist/mixins/error-handling.js",
    "revision": "215c02d88afa0c4fd58bc434ceff93f5"
  },
  {
    "url": "dist/mixins/state.js",
    "revision": "e5e4f157a254304bc0d562aac21c7da3"
  },
  {
    "url": "dist/platform.js",
    "revision": "a0fd918cbc93d7b5a77380944cd69e83"
  },
  {
    "url": "dist/route.js",
    "revision": "8aacfcf2c03ca1dc6eaf68882e2a3c13"
  },
  {
    "url": "dist/singleton.js",
    "revision": "8e24364e31682f8f94210364e40bc94e"
  },
  {
    "url": "dist/storage.js",
    "revision": "b7fb4e1338180afb5be3d55a4a62b9e6"
  },
  {
    "url": "dist/styles/config.js",
    "revision": "7daf5ab4433113801d278755ac5b98bb"
  },
  {
    "url": "dist/styles/index.js",
    "revision": "e7615eac6d35442fea95a1f113720f6f"
  },
  {
    "url": "dist/styles/mixins.js",
    "revision": "f7763da99fd7bae44d753f9a159a6a38"
  },
  {
    "url": "dist/styles/shared.js",
    "revision": "a7c064b97b1be3b36a73b2bd55b55830"
  },
  {
    "url": "dist/util.js",
    "revision": "933b6f81de8a3d263c90b0c363341d71"
  },
  {
    "url": "package.json",
    "revision": "e9f4d973a2b1033c676a832a09994a61"
  },
  {
    "url": "manifest.json",
    "revision": "6daad0b90c73ae8236e2f54272a6506e"
  },
  {
    "url": "env.js",
    "revision": "a610b8ea130850e375579aa96baf5e86"
  },
  {
    "url": "node_modules/@webcomponents/webcomponentsjs/bundles/webcomponents-ce.js",
    "revision": "9e95e23948274478e2186797758dcce6"
  },
  {
    "url": "node_modules/@webcomponents/webcomponentsjs/bundles/webcomponents-ce.js.map",
    "revision": "57e2e2d9d4cfee2dd26c17864e62e585"
  },
  {
    "url": "node_modules/@webcomponents/webcomponentsjs/bundles/webcomponents-sd-ce-pf.js",
    "revision": "fe3db09ab074c92473a533eade37c36a"
  },
  {
    "url": "node_modules/@webcomponents/webcomponentsjs/bundles/webcomponents-sd-ce-pf.js.map",
    "revision": "d94881397093d971008ade8a0b7c251a"
  },
  {
    "url": "node_modules/@webcomponents/webcomponentsjs/bundles/webcomponents-sd-ce.js",
    "revision": "2478d5f05a0fc3b8bbbc0561a9ae3a9a"
  },
  {
    "url": "node_modules/@webcomponents/webcomponentsjs/bundles/webcomponents-sd-ce.js.map",
    "revision": "4c29d1c38b2a61ed467261f6f28e795c"
  },
  {
    "url": "node_modules/@webcomponents/webcomponentsjs/bundles/webcomponents-sd.js",
    "revision": "0f94d1d1fa6eb56e54ceba65a10d5cab"
  },
  {
    "url": "node_modules/@webcomponents/webcomponentsjs/bundles/webcomponents-sd.js.map",
    "revision": "74e903148d4a71e8b5375fb12132bd42"
  },
  {
    "url": "node_modules/@webcomponents/webcomponentsjs/custom-elements-es5-adapter.js",
    "revision": "e1fd2666c41624563d5f54b012c56acd"
  },
  {
    "url": "node_modules/@webcomponents/webcomponentsjs/entrypoints/custom-elements-es5-adapter-index.js",
    "revision": "5652c8f83533d62943792a7fe7a2e581"
  },
  {
    "url": "node_modules/@webcomponents/webcomponentsjs/entrypoints/webcomponents-bundle-index.js",
    "revision": "8dd62a28e52d133ef1ecf044bc51f109"
  },
  {
    "url": "node_modules/@webcomponents/webcomponentsjs/entrypoints/webcomponents-ce-index.js",
    "revision": "0867f0cb4caf5081f1e85da13c24528a"
  },
  {
    "url": "node_modules/@webcomponents/webcomponentsjs/entrypoints/webcomponents-sd-ce-index.js",
    "revision": "5d9cd4fb5d341a0e2890edaa2cc8e226"
  },
  {
    "url": "node_modules/@webcomponents/webcomponentsjs/entrypoints/webcomponents-sd-ce-pf-index.js",
    "revision": "4fa20d933ca980ef122fbad7528e56ca"
  },
  {
    "url": "node_modules/@webcomponents/webcomponentsjs/entrypoints/webcomponents-sd-index.js",
    "revision": "d4e3a4413d567733a71057462763e36f"
  },
  {
    "url": "node_modules/@webcomponents/webcomponentsjs/LICENSE.md",
    "revision": "df7f9abb99c82dfefc6f600bd14341a3"
  },
  {
    "url": "node_modules/@webcomponents/webcomponentsjs/package.json",
    "revision": "970074da0d6fa3db09fbea07241db6db"
  },
  {
    "url": "node_modules/@webcomponents/webcomponentsjs/README.md",
    "revision": "d5c1d8a2f33274b303281e22501c96b0"
  },
  {
    "url": "node_modules/@webcomponents/webcomponentsjs/webcomponents-bundle.js",
    "revision": "c4833d90bd9f590314812448591880f8"
  },
  {
    "url": "node_modules/@webcomponents/webcomponentsjs/webcomponents-bundle.js.map",
    "revision": "93cb3463d4de2d8e9897acc72b45a8e8"
  },
  {
    "url": "node_modules/@webcomponents/webcomponentsjs/webcomponents-loader.js",
    "revision": "e044a63e034bf10304dad73138b8c74b"
  },
  {
    "url": "node_modules/@padloc/core/lib/account.js",
    "revision": "d5c178338ebdd8996803c3edc63f666c"
  },
  {
    "url": "node_modules/@padloc/core/lib/api.js",
    "revision": "064517852e383dff36c72b4680f67443"
  },
  {
    "url": "node_modules/@padloc/core/lib/app.js",
    "revision": "b263110fa6e3f98aa8ca302e9b7dc62e"
  },
  {
    "url": "node_modules/@padloc/core/lib/attachment.js",
    "revision": "2e7390ddb7b76636fbdf226ca3e256a4"
  },
  {
    "url": "node_modules/@padloc/core/lib/auth.js",
    "revision": "61456e9857491960daaf7d9ba2a84d59"
  },
  {
    "url": "node_modules/@padloc/core/lib/base32.js",
    "revision": "375bca0fbd61775ad05b4adfb4cef166"
  },
  {
    "url": "node_modules/@padloc/core/lib/base64.js",
    "revision": "9450377a72704cb6c8ffd9085c62561f"
  },
  {
    "url": "node_modules/@padloc/core/lib/billing.js",
    "revision": "30cfd640008f2b0cff7a86c05fc1a65a"
  },
  {
    "url": "node_modules/@padloc/core/lib/client.js",
    "revision": "ff3347198a4f91703f8acf8f4e1f6465"
  },
  {
    "url": "node_modules/@padloc/core/lib/collection.js",
    "revision": "1a680af78b1a9bc4ac921c5374bbce84"
  },
  {
    "url": "node_modules/@padloc/core/lib/container.js",
    "revision": "7a3f445d4395f2e23036193ce00cdc84"
  },
  {
    "url": "node_modules/@padloc/core/lib/crypto.js",
    "revision": "41f88b04a942e255a533d7ed5e72c9d4"
  },
  {
    "url": "node_modules/@padloc/core/lib/diceware.js",
    "revision": "aa1de544bfe75790a4768cead5b7bf98"
  },
  {
    "url": "node_modules/@padloc/core/lib/email-verification.js",
    "revision": "fdee92c7afee8ec2434e6d7bb8b04914"
  },
  {
    "url": "node_modules/@padloc/core/lib/encoding.js",
    "revision": "b728574cfee156ba457ec80785500da5"
  },
  {
    "url": "node_modules/@padloc/core/lib/error.js",
    "revision": "712214666a86289296ec0bd92bbd31d8"
  },
  {
    "url": "node_modules/@padloc/core/lib/event-target.js",
    "revision": "505ab8cf2f9d9f66ae6fbca3e06b04a3"
  },
  {
    "url": "node_modules/@padloc/core/lib/invite.js",
    "revision": "388098ec575d4cb4bab82738691756fd"
  },
  {
    "url": "node_modules/@padloc/core/lib/item.js",
    "revision": "f18139448727526df7300f0a08fdb4ef"
  },
  {
    "url": "node_modules/@padloc/core/lib/legacy.js",
    "revision": "718a1d833f586f40fddc7a3246d31cb3"
  },
  {
    "url": "node_modules/@padloc/core/lib/locale.js",
    "revision": "184039ade80354a59e06b33e66fc434e"
  },
  {
    "url": "node_modules/@padloc/core/lib/messages/base-html.js",
    "revision": "63be57616f53a51d7b0e42f039d3be22"
  },
  {
    "url": "node_modules/@padloc/core/lib/messages/index.js",
    "revision": "325e53cc9d8022ab1da88f547cb282bc"
  },
  {
    "url": "node_modules/@padloc/core/lib/messages/invite-accepted.js",
    "revision": "cf28cf212e1d919af67e86ac454edb87"
  },
  {
    "url": "node_modules/@padloc/core/lib/messages/invite-created.js",
    "revision": "84a92927e783dcb6b436005e8966f97e"
  },
  {
    "url": "node_modules/@padloc/core/lib/messages/member-added.js",
    "revision": "f4dac8ec034c02fa0ef2e66e499a2fe0"
  },
  {
    "url": "node_modules/@padloc/core/lib/messages/verify.js",
    "revision": "0a162515bdf4f5faba3c6fc6d9431159"
  },
  {
    "url": "node_modules/@padloc/core/lib/messenger.js",
    "revision": "7cf0c02af5e0bd1472e032da30bcb54a"
  },
  {
    "url": "node_modules/@padloc/core/lib/org.js",
    "revision": "8d5d271e063c93e68e556ecf9337f2ec"
  },
  {
    "url": "node_modules/@padloc/core/lib/otp.js",
    "revision": "5d998b27a2b10be21dc26d8fe990fc06"
  },
  {
    "url": "node_modules/@padloc/core/lib/platform.js",
    "revision": "6a98d21b929796dbdec55713c807381e"
  },
  {
    "url": "node_modules/@padloc/core/lib/quota.js",
    "revision": "f44d83e7069c081f83eb609d770a1d91"
  },
  {
    "url": "node_modules/@padloc/core/lib/randomart.js",
    "revision": "c3bde287865158f97fccefe735ed248c"
  },
  {
    "url": "node_modules/@padloc/core/lib/server.js",
    "revision": "d2884cab8d8e8c8fc1cc2cfb8e0e6057"
  },
  {
    "url": "node_modules/@padloc/core/lib/session.js",
    "revision": "2aa687b769f25d955ffca9c058ebd768"
  },
  {
    "url": "node_modules/@padloc/core/lib/sjcl.js",
    "revision": "741e26150bd43eb06db39e4e43fe1ccb"
  },
  {
    "url": "node_modules/@padloc/core/lib/spec/app.js",
    "revision": "b2bd3d84296e1dc8af304bfedcf0d9b1"
  },
  {
    "url": "node_modules/@padloc/core/lib/spec/crypto.js",
    "revision": "430c30d86b80a8f5b765519cd5b56134"
  },
  {
    "url": "node_modules/@padloc/core/lib/spec/spec.js",
    "revision": "b626beda254bc106a739e7721c64eec3"
  },
  {
    "url": "node_modules/@padloc/core/lib/srp.js",
    "revision": "e4242eac3dd40e8582187c0a652f128b"
  },
  {
    "url": "node_modules/@padloc/core/lib/storage.js",
    "revision": "43fea1ad4b1be81b35c98ee916cefeb1"
  },
  {
    "url": "node_modules/@padloc/core/lib/stub-crypto-provider.js",
    "revision": "15c88ef59ec4dff017079f178c153c47"
  },
  {
    "url": "node_modules/@padloc/core/lib/transport.js",
    "revision": "66267bbaaab3b33af8618cc91af24b41"
  },
  {
    "url": "node_modules/@padloc/core/lib/util.js",
    "revision": "807458a3f9b57380262c0cf119f99ea8"
  },
  {
    "url": "node_modules/@padloc/core/lib/vault.js",
    "revision": "4658f0dae4ec3920ce026e4c2b4510af"
  },
  {
    "url": "node_modules/@padloc/core/lib/wordlists/en.js",
    "revision": "e48cb9f210d889a2cf9c3c1fa1d1dc01"
  },
  {
    "url": "node_modules/@padloc/core/lib/wordlists/index.js",
    "revision": "777c3592215fedc68e090f0087a54176"
  },
  {
    "url": "node_modules/@padloc/core/vendor/jsbn.js",
    "revision": "85f03dd33675f5cf96404c4bb639bbe8"
  },
  {
    "url": "node_modules/@padloc/core/vendor/papaparse.js",
    "revision": "cd832202012a78053461371a13fd7fd4"
  },
  {
    "url": "node_modules/@padloc/core/vendor/semver.js",
    "revision": "9f393abd37be4d08ea95eb758975093d"
  },
  {
    "url": "node_modules/@padloc/core/vendor/sjcl.js",
    "revision": "244865e5831b330e9f0dc4db28319e33"
  },
  {
    "url": "node_modules/@padloc/core/vendor/zxcvbn.js",
    "revision": "9cf6916dc0dcbb18a637d11f575d17ed"
  },
  {
    "url": "node_modules/jsqr/dist/jsQR.js",
    "revision": "1322b5cc5c9461a60830a61d8b78aa77"
  },
  {
    "url": "node_modules/reflect-metadata/Reflect.js",
    "revision": "52dc5306daebb0d649eaf9532980c8dc"
  },
  {
    "url": "node_modules/lit-element/lib/css-tag.js",
    "revision": "88a7776dc45a2f5f5a2a99b144d49075"
  },
  {
    "url": "node_modules/lit-element/lib/decorators.js",
    "revision": "aa875a7b763b574cfce40b684b733eb3"
  },
  {
    "url": "node_modules/lit-element/lib/updating-element.js",
    "revision": "2276cf333bd0a08bd8ae34783f36aa4c"
  },
  {
    "url": "node_modules/lit-element/lit-element.js",
    "revision": "72433c8e2d5d81583b7af68bad4822d6"
  },
  {
    "url": "node_modules/lit-html/directives/async-append.js",
    "revision": "20e3f940ebfcbf1fd1c3ff930140478c"
  },
  {
    "url": "node_modules/lit-html/directives/async-replace.js",
    "revision": "7732ef7434ee0095decce950f416bff8"
  },
  {
    "url": "node_modules/lit-html/directives/cache.js",
    "revision": "8aa0c9b2096899239e163a0727362c6f"
  },
  {
    "url": "node_modules/lit-html/directives/class-map.js",
    "revision": "13fd443f5b030395790886e21fa7ef6b"
  },
  {
    "url": "node_modules/lit-html/directives/guard.js",
    "revision": "ad09d68d2035c335d3be91e78a390ec7"
  },
  {
    "url": "node_modules/lit-html/directives/if-defined.js",
    "revision": "0b45cc46b88bc39118f14369e7f9141e"
  },
  {
    "url": "node_modules/lit-html/directives/repeat.js",
    "revision": "a3ed38e564c97093741ed7fe6ab53d1d"
  },
  {
    "url": "node_modules/lit-html/directives/style-map.js",
    "revision": "52f71857303971de342219f86e1be27c"
  },
  {
    "url": "node_modules/lit-html/directives/unsafe-html.js",
    "revision": "ff818bc767837badf6765e48c3903154"
  },
  {
    "url": "node_modules/lit-html/directives/until.js",
    "revision": "ee1eb6e410fa9920673890aece12b517"
  },
  {
    "url": "node_modules/lit-html/lib/async-append.js",
    "revision": "e72ae444630172678a2ce51dbf52beb6"
  },
  {
    "url": "node_modules/lit-html/lib/async-replace.js",
    "revision": "08d3c1a2322c52e2689758fb0bd6c912"
  },
  {
    "url": "node_modules/lit-html/lib/default-template-processor.js",
    "revision": "e96dc25c4a6ab961d383723b243bacb1"
  },
  {
    "url": "node_modules/lit-html/lib/directive.js",
    "revision": "1d0d4dd4117349ba63339aee90963f44"
  },
  {
    "url": "node_modules/lit-html/lib/dom.js",
    "revision": "45322140ad6ad2789e8ebeb95eec59f3"
  },
  {
    "url": "node_modules/lit-html/lib/lit-extended.js",
    "revision": "d24daec20065370d69db1eea3ca14252"
  },
  {
    "url": "node_modules/lit-html/lib/modify-template.js",
    "revision": "19cd46629fac6601423169f538f5b5ba"
  },
  {
    "url": "node_modules/lit-html/lib/part.js",
    "revision": "ffd11b35ced31f865d8381f3585892df"
  },
  {
    "url": "node_modules/lit-html/lib/parts.js",
    "revision": "ffdc54cd7f09acb476c53d96c99b0a99"
  },
  {
    "url": "node_modules/lit-html/lib/render-options.js",
    "revision": "b135ca8c29cdf7d1e3d0761b692e1663"
  },
  {
    "url": "node_modules/lit-html/lib/render.js",
    "revision": "e22a39942d0d752076163c996cf8fc56"
  },
  {
    "url": "node_modules/lit-html/lib/repeat.js",
    "revision": "8472ee5fdd935aa72259321a05f9471f"
  },
  {
    "url": "node_modules/lit-html/lib/shady-render.js",
    "revision": "6f7e199cd1cf7c2ae9bf6eba7a8c12c7"
  },
  {
    "url": "node_modules/lit-html/lib/template-factory.js",
    "revision": "dcdc52b73ba1f464ece3387ab1ce1b8d"
  },
  {
    "url": "node_modules/lit-html/lib/template-instance.js",
    "revision": "6c9495fce172762a92590b384bb4d3c3"
  },
  {
    "url": "node_modules/lit-html/lib/template-processor.js",
    "revision": "da7fb57119a10d43468d581552ceee39"
  },
  {
    "url": "node_modules/lit-html/lib/template-result.js",
    "revision": "692e28fbf475a700fcb68ebecfe37741"
  },
  {
    "url": "node_modules/lit-html/lib/template.js",
    "revision": "aa4ec6a7762d526e15f7c34b4e06c9c4"
  },
  {
    "url": "node_modules/lit-html/lib/unsafe-html.js",
    "revision": "68d76f033adbaf4fea06ad13cf0980ce"
  },
  {
    "url": "node_modules/lit-html/lib/until.js",
    "revision": "5c149fcee4354ebda36af2e9bb63a79a"
  },
  {
    "url": "node_modules/lit-html/lit-html.js",
    "revision": "b0f1b842794a5026a27829356f2a26ce"
  },
  {
    "url": "node_modules/lit-html/polyfills/template_polyfill.js",
    "revision": "0f0860f25b55c688dd6f1bd5685a824c"
  },
  {
    "url": "node_modules/autosize/src/autosize.js",
    "revision": "558781b839da6043df1a25d701ad59ac"
  },
  {
    "url": "node_modules/workbox-sw/build/workbox-sw.js",
    "revision": "6e1e47d706556eac8524f396e785d4bb"
  },
  {
    "url": "node_modules/localforage/src/drivers/indexeddb.js",
    "revision": "0182e5535da4dd40cdcbdf0b16c3b339"
  },
  {
    "url": "node_modules/localforage/src/drivers/localstorage.js",
    "revision": "9320adba3805c9d5781cde646dcaa8b4"
  },
  {
    "url": "node_modules/localforage/src/drivers/websql.js",
    "revision": "906f88769c82d9dfe7c4f55841b29796"
  },
  {
    "url": "node_modules/localforage/src/localforage.js",
    "revision": "bd5860761a10f0d6311e10410570cefb"
  },
  {
    "url": "node_modules/localforage/src/utils/createBlob.js",
    "revision": "0887a1aa853f0c866715e9322a31f3c6"
  },
  {
    "url": "node_modules/localforage/src/utils/executeCallback.js",
    "revision": "ac4c6faff4c6f401f7d4cb3c7c77234d"
  },
  {
    "url": "node_modules/localforage/src/utils/executeTwoCallbacks.js",
    "revision": "234313e72fefb0db0ccd3962120aed53"
  },
  {
    "url": "node_modules/localforage/src/utils/getCallback.js",
    "revision": "3d4aae7b76c19e4588dde9b0eab785c6"
  },
  {
    "url": "node_modules/localforage/src/utils/idb.js",
    "revision": "211b62b263621ce52c5e372bd062379b"
  },
  {
    "url": "node_modules/localforage/src/utils/includes.js",
    "revision": "9963610d5d1f4836336cf80ac3935fa1"
  },
  {
    "url": "node_modules/localforage/src/utils/isArray.js",
    "revision": "04fcf5f9c7cd1d71dfbc4db2af4f8193"
  },
  {
    "url": "node_modules/localforage/src/utils/isIndexedDBValid.js",
    "revision": "f9270df3e4d197a5ca5a3a6f337ae524"
  },
  {
    "url": "node_modules/localforage/src/utils/isLocalStorageValid.js",
    "revision": "540fbb6d514f1fe06456b5d450092dc9"
  },
  {
    "url": "node_modules/localforage/src/utils/isWebSQLValid.js",
    "revision": "4f2c0e351f829a6edff976f3c493a132"
  },
  {
    "url": "node_modules/localforage/src/utils/normalizeKey.js",
    "revision": "2e24b6f82f6ae25a35b69cfb4151ae63"
  },
  {
    "url": "node_modules/localforage/src/utils/promise.js",
    "revision": "5cc3d770165eef94ddac0730d42d49fc"
  },
  {
    "url": "node_modules/localforage/src/utils/serializer.js",
    "revision": "44a9afe5fbf446bfa82adb1881a74df8"
  },
  {
    "url": "assets/fonts/fontawesome-webfont.eot",
    "revision": "0b93480e003507618e8e1198126a2d37"
  },
  {
    "url": "assets/fonts/fontawesome-webfont.svg",
    "revision": "666a82cb3e9f8591bef4049aea26c4c6"
  },
  {
    "url": "assets/fonts/fontawesome-webfont.ttf",
    "revision": "a7a790d499af8d37b9f742a666ab849c"
  },
  {
    "url": "assets/fonts/fontawesome-webfont.woff",
    "revision": "dfc040d53fa343d2ba7ccb8217f34346"
  },
  {
    "url": "assets/fonts/fontawesome-webfont.woff2",
    "revision": "e8a92a29978352517c450b9a800b06cb"
  },
  {
    "url": "assets/fonts/FontAwesome.otf",
    "revision": "0d2717cd5d853e5c765ca032dfd41a4d"
  },
  {
    "url": "assets/fonts/fonts.css",
    "revision": "14062b0cee7743c3372e87fedb468528"
  },
  {
    "url": "assets/fonts/Inconsolata-Regular.ttf",
    "revision": "29b00ebcf93fda46ac9957fa4816eafd"
  },
  {
    "url": "assets/fonts/Nunito-Bold.ttf",
    "revision": "974bca2bf26dc2fae8d67248d9df5e34"
  },
  {
    "url": "assets/fonts/Nunito-Light.ttf",
    "revision": "18a81d43652c0f91aa924ed6f33d5989"
  },
  {
    "url": "assets/fonts/Nunito-Regular.ttf",
    "revision": "dba92cb9dc60f9f35cbf62428afd3ac1"
  },
  {
    "url": "assets/fonts/Nunito-SemiBold.ttf",
    "revision": "82c3a6e2c1edc45f4f7bb9a8f05d26a7"
  },
  {
    "url": "assets/fonts/Padlock.eot",
    "revision": "d4f4a40f680c8ca4626ccbe9fd078ff8"
  },
  {
    "url": "assets/fonts/Padlock.svg",
    "revision": "df682eed23533401877cd66fc1e625db"
  },
  {
    "url": "assets/fonts/Padlock.ttf",
    "revision": "47d1583f334ab50ded1bc3e922f38e6f"
  },
  {
    "url": "assets/fonts/Padlock.woff",
    "revision": "5457b171f880f0673888cadc16802d12"
  },
  {
    "url": "assets/icons/192.png",
    "revision": "cbdf406a039d3c9e4df544d19b7a52a0"
  },
  {
    "url": "assets/icons/512.png",
    "revision": "f07496352c79de571fc208c04904b835"
  },
  {
    "url": "assets/icons/apple-touch-180.png",
    "revision": "715ab44c411f8d5fea0da578769bf629"
  },
  {
    "url": "assets/img/padloc.svg",
    "revision": "e18c9e77a19a863c30663f5d33d49bf2"
  },
  {
    "url": "assets/img/powered_by_stripe.svg",
    "revision": "787bedcfd705f140fbc8a239af62c760"
  },
  {
    "url": "vendor/date-fns.js",
    "revision": "776ed24b4617febeef850ce59bab6988"
  },
  {
    "url": "vendor/papaparse.js",
    "revision": "cd832202012a78053461371a13fd7fd4"
  },
  {
    "url": "vendor/semver.js",
    "revision": "9f393abd37be4d08ea95eb758975093d"
  },
  {
    "url": "vendor/sjcl.d.ts",
    "revision": "44beab1b8abe7c9ce784f2598351a11c"
  },
  {
    "url": "vendor/sjcl.js",
    "revision": "ee3ac484b9c409cd09d1c76d8ebc22be"
  },
  {
    "url": "vendor/ua-parser.js",
    "revision": "b3ea2ff92dd94f2295af9baf6e61e606"
  },
  {
    "url": "vendor/zxcvbn.js",
    "revision": "9cf6916dc0dcbb18a637d11f575d17ed"
  },
  {
    "url": "shim/event-target.js",
    "revision": "8daecdb1119803cafa86560290216048"
  }
]);
workbox.routing.registerNavigationRoute(workbox.precaching.getCacheKeyForURL("index.html"));
addEventListener("message", event => {
    const action = event.data && event.data.type;
    let response = undefined;
    switch (action) {
        case "INSTALL_UPDATE":
            console.log("installing update");
            // @ts-ignore
            skipWaiting();
            break;
        case "GET_VERSION":
            response = "3.0.0-beta.1";
            break;
    }
    event.ports[0].postMessage(response);
});
