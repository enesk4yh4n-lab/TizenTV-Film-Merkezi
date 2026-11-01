# Film Merkezi · Samsung Tizen TV

Remote-controlled film and series catalog for Samsung Tizen TVs, targeting **Tizen 3.0+**. Turkish/English interface, 14 providers, shared search, optional catalog merging, watchlist, continue watching, episode navigation, subtitles and HTML5/hls.js–AVPlay playback. The installed WGT runs on the TV; no PC, proxy or additional server is required during use.

## Download and install

Download **[Film-Merkezi-TV-1.1.7-public.wgt](https://github.com/enesk4yh4n-lab/TizenTV-Film-Merkezi/releases/download/v1.1.7/Film-Merkezi-TV-1.1.7-public.wgt)** from [v1.1.7](https://github.com/enesk4yh4n-lab/TizenTV-Film-Merkezi/releases/tag/v1.1.7).

Install through **[Apps2Samsung](https://github.com/Apps2Samsung/Apps2Samsung)**. Film Merkezi is already included in its community catalog; the catalog can lag behind this repository's latest release. To install this exact version, use Custom WGT/TPK. Apps2Samsung signs the public WGT for your TV with your own authorized profile. This download intentionally contains no developer signatures or private keys.

Keep the same Apps2Samsung author certificate when updating. Changing author identity may prevent an update; uninstalling can erase local data. [Installation instructions](docs/KURULUM.md) ? [Catalog and certificates](docs/APPS2SAMSUNG.md).

## What's new in 1.1.7

- Updated FixFull source detection for active/lazy player tabs, with legacy source links retained.
- Permanent **Film Merkezi v1.1.7** header when switching sites or interface language.
- First-launch language and catalog-merging choices, plus the current playback/catalog fixes since 1.0.0.
- Unsigned public package with exact runtime/source matching, source downloads and preserved third-party notices.

[Release notes](docs/SURUM_1.1.7.md) ? [Verification and known issues](docs/DOGRULAMA_1.1.7.md).

## Compatibility and known issues

**The 1.1.7 playback code was installed and exercised on a real Samsung UE55MU7500, Tizen 3.0, firmware 1410.** Automated checks covered catalog/search, series detail, player controls, source refresh, YouTube startup and AVPlay reference clips. The final header and source-notice changes received separate desktop checks; they were not a new TV acceptance run. Earlier builds had user-confirmed picture, TV-speaker audio/sync and physical remote operation on this model.

Some FixFull VIDMOLY/Matrudas streams still buffer when download throughput falls below the selected bitrate. Two remote test sessions were interrupted; an app crash or memory failure was not established. Current results do not establish human-confirmed audio/HDR or universal playback compatibility.

Earlier Tizen 8/9 emulator checks installed the application, but an unresolved audio-without-picture/resource-allocation issue remains. Tizen 10 emulator checks were not full picture/audio acceptance; Tizen 4?7 have not been tested. [Support matrix](docs/UYUMLULUK.md).

## Content and privacy

**Katalogda yetişkin içerikleri göstermemeye yönelik filtreleme kullanılır. Film Merkezi yetişkin içerik kataloğu sunmayı amaçlamaz.**

The application includes filtering intended to hide adult content and is not intended as an adult-content catalog. A request to revise the Apps2Samsung catalog classification accompanies this release; its current label is controlled by the community maintainers.

Film Merkezi accesses third-party sites and is not affiliated with them or Samsung. Users must have the right to access content; this software does not grant media rights. No commercial films or downloaded site scripts are redistributed. Small color-bar/tone clips are original synthetic playback references.

Usage acknowledgement, language, merging preferences and watch records stay on the TV. The app has no project-owned account, telemetry service or runtime server. Requests go to the selected sites/CDNs. Do not include passwords, TV identifiers or signed media URLs in issue reports.

## Build the unsigned public package

Python 3 and Node.js are development tools, not TV runtime dependencies:

```sh
npm ci
npm test
python scripts/build.py
```

`dist/` receives the deterministic unsigned WGT, native/decoder source ZIP, complete source ZIP and SHA256SUMS.txt. The build verifies the explicit file allowlist, generated decoder sources, native input/output hashes and YouTube inline CSP hash. Optional focused browser checks: `npx playwright install chromium`, then `npm run browser`.

The native HTTPS executables are distributed with their C++/configuration inputs, exact Mozilla CA source and notices. Rebuilding requires Samsung Pepper 47 and a compatible Linux toolchain; ordinary WGT packaging uses the verified supplied executables. [Native build instructions](kaynak/ortak/ag/native/README.md).

## Licenses and acknowledgements

Original contributions are [MIT](LICENSE). Component licenses remain applicable: hls.js Apache-2.0; CryptoJS and decoder adaptations MIT; YouTube.js and helpers MIT/Apache-2.0/ISC/BSD; Mbed TLS and selected supporting components Apache-2.0; Chromium/Native Client BSD and SDK notices; Mozilla CA data MPL-2.0.

Full texts remain in [third-party notices](app/THIRD_PARTY_NOTICES.md), vendor licenses, YouTube notices and native notices. They are also available under About on the TV. Exact native/decoder/MPL sources: [Film-Merkezi-Kaynak-1.1.7.zip](https://github.com/enesk4yh4n-lab/TizenTV-Film-Merkezi/releases/download/v1.1.7/Film-Merkezi-Kaynak-1.1.7.zip); the release also provides a complete source snapshot.

Thank you to enXov, Batuhan4, the Nuvio provider contributors, video-dev/Dailymotion/Brightcove, CryptoJS, LuanRT/YouTube.js and its helper projects, Samsung/Chromium, Mbed TLS, Project Everest, Mozilla/curl and all contributors credited in the notices. Special thanks to **Apps2Samsung** for real-TV installation and to Playwright, Acorn and FFmpeg/ffprobe for development tools; these tools are not bundled into the WGT.

Earlier v1.0.0 and HDfilmCehennemi v0.4.6 releases and repository history remain available. Check out the corresponding tag to reproduce an older release.
