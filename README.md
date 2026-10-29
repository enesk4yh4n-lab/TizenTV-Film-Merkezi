# Film Merkezi · Samsung Tizen TV

Remote-controlled film and series catalog for Samsung Tizen TVs, targeting **Tizen 3.0+**. Turkish and English interface, 14 site providers, shared search, watchlist, continue watching, episode navigation, subtitles and HTML5/hls.js–AVPlay playback. The installed WGT runs on the TV: **no PC, proxy or additional server is needed during use**.

This repository previously distributed **HDfilmCehennemi TV v0.4.6**. That release and its history remain available. Film Merkezi v1.0.0 is the current multi-provider application.

## Download and install

Download **[Film-Merkezi-TV-1.0.0-public.wgt](https://github.com/enesk4yh4n-lab/TizenTV-Film-Merkezi/releases/download/v1.0.0/Film-Merkezi-TV-1.0.0-public.wgt)** from [v1.0.0](https://github.com/enesk4yh4n-lab/TizenTV-Film-Merkezi/releases/tag/v1.0.0).

Use **[Apps2Samsung](https://github.com/Apps2Samsung/Apps2Samsung)** → Custom WGT/TPK to install it. Enable Developer Mode on the TV, set the installer computer/phone's local IP and connect on the same network. Apps2Samsung obtains a TV-authorized signing profile through the user's Samsung login when needed, reuses a valid profile, and re-signs the package before installation. **This public WGT has no personal signatures or private keys; direct unsigned installation is not expected to work.** Do not share certificate passwords or account tokens in issues.

The community catalog submission is subject to Apps2Samsung maintainer approval. A published release alone does not mean the catalog entry is live. [Installation](docs/KURULUM.md) · [Catalog/signing details](docs/APPS2SAMSUNG.md).

## Compatibility and current limitations

- Earlier builds were used successfully on a **Samsung UE55MU7500, Tizen 3.0, firmware 1410**, with user-confirmed picture, TV-speaker audio, synchronization and remote controls. This is one model's experience, not a guarantee for all devices or streams.
- The v1.0.0 application code passed **566 unit tests, 97 browser scenario groups and eight catalog/player cycles** in development. The public overlay only removes personal manifest/signature information and adds distribution/license/source notices. Public-package checks are reported separately.
- Earlier Samsung emulator installation/automatic checks passed on **8/9/10**, but **8/9 have an unresolved audio-without-picture/resource-allocation issue**. Tizen 10 automatic clock/control checks are not full visual/audio acceptance. Versions 4–7 have not been tested.
- **v1.0.0 has no fresh real-TV acceptance.** A brief UI freeze during seek/buffering on a real TV has been reported and is not claimed fixed by this release.
- Source availability, codecs, region, TLS/CDN behavior and TV hardware affect playback. No all-version or all-source compatibility guarantee is made. [Support matrix](docs/UYUMLULUK.md).

## Content and privacy

The application accesses third-party sites and is not affiliated with them or Samsung. **Some providers may expose adult content.** The catalog submission discloses this and uses `adult: true`; Apps2Samsung may hide the entry until the user enables its 18+ option. Users must have the right to access content and comply with applicable law. The software does not grant media rights. No films, commercial media files or site scripts are redistributed in the package. Small color-bar/tone clips are original synthetic playback references.

First launch presents a local usage acknowledgement. Watch history, preferences and consent stay on the TV. Network requests go to the selected sites/CDNs; their privacy practices apply. The app has no project-owned account, telemetry service or runtime server. Preserve your existing Apps2Samsung author certificate when updating: changing author identity may cause an update conflict. Removing an app can erase its local data.

## Build the public package

The repository is now **TizenTV-Film-Merkezi**. Existing release artifacts and checksums are preserved; GitHub redirects their older source links. To reproduce the published v1.0.0 exactly, check out **tag `v1.0.0`** or use its full source ZIP. The main branch's documentation/URLs may advance. [Rename details](docs/REPOSITORY_RENAME.md).

Python 3 and Node.js are build/test tools, not TV runtime requirements:

```sh
npm ci
npm test
python scripts/build.py
```

`dist/` receives the deterministic unsigned WGT, the native/decoder source ZIP, a complete source ZIP and SHA256SUMS.txt. The build verifies the decoder against its supplied sources, native binary/source hashes, the exact file allowlist and the YouTube inline CSP hash. It does not access a signing profile. Optional isolated browser check: install Chrome, run `npx playwright install chromium` if needed, then `npm run browser`.

The three native HTTPS executables are provided with their C++/configuration sources, the pinned Mozilla CA data and license notices. Rebuilding them requires Samsung Pepper 47 and a compatible Linux toolchain; normal WGT packaging uses the verified supplied executables. Use `python scripts/build-native-tls.py --sdk <pepper_47>` then `python scripts/build-native-http.py --sdk <pepper_47> --out <output>`; see [native build notes](kaynak/ortak/ag/native/README.md). The CA input is pinned; use the supplied unmodified CA source rather than silently accepting a newer bundle.

## Licenses, sources and acknowledgements

Original contributions are **[MIT](LICENSE)**. Upstream licenses remain applicable: hls.js **Apache-2.0**, CryptoJS and decoder adaptations **MIT**, YouTube.js and helpers **MIT/Apache-2.0/ISC/BSD**, Mbed TLS and selected supporting components **Apache-2.0**, Chromium/Native Client **BSD and SDK notices**, Mozilla CA data **MPL-2.0**.

Full notices are retained in [app/THIRD_PARTY_NOTICES.md](app/THIRD_PARTY_NOTICES.md), the vendor license files, YouTube notices and [native notices](app/ortak/ag/native/notices). They can also be opened under **About → Acknowledgements and licenses** on the TV. Native/decoder source, including the MPL-covered CA data, is supplied in **[Film-Merkezi-Kaynak-1.0.0.zip](https://github.com/enesk4yh4n-lab/TizenTV-Film-Merkezi/releases/download/v1.0.0/Film-Merkezi-Kaynak-1.0.0.zip)** alongside the WGT; a full source snapshot is also attached.

Thank you to **enXov**, **Batuhan4**, the **Nuvio provider contributors**, **video-dev/Dailymotion/Brightcove**, **CryptoJS**, **LuanRT/YouTube.js** and its helper projects, **Samsung/Chromium**, **Mbed TLS**, **Project Everest**, **Mozilla/curl**, and all contributors whose work is credited in the notices. Special thanks to **Apps2Samsung** for simplifying real-TV installation, and to **Playwright**, **Acorn** and **FFmpeg/ffprobe** for development tools. Those installation/development tools are not bundled into the WGT.
