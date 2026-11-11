# Third-party notices

Historical attribution retained from earlier distributions: decoder arithmetic and site-format behavior were adapted from the HDFilmCehennemi Stremio Addon by enXov and its maintained Batuhan4 fork:

- https://github.com/enXov/hdfilmcehennemi-stremio
- https://github.com/Batuhan4/hdfilmcehennemi-stremio

The original MIT license follows. Other parts of this package are covered by LICENSE.
These host-specific decoder modules are not included in this WGT or its generic core. The original attribution and license text are retained below.

```text
MIT License

Copyright (c) 2024 enXov

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## hls.js 1.7.3

The unmodified bundled browser distribution is `hls-1.7.3.min.js` from:

- https://github.com/video-dev/hls.js/releases/tag/v1.7.3
- https://cdn.jsdelivr.net/npm/hls.js@1.7.3/dist/hls.min.js

SHA-256: `A12E7EE1CD64A69DCDB314157E45DAFCBA705BFB0B1440B7935CB265D374423E`.

Copyright (c) 2017 Dailymotion. Portions derived from video.js HLS are
Copyright (c) 2013-2015 Brightcove. Distributed under Apache License 2.0.
The upstream notice is preserved in `vendor/HLS_LICENSE.txt`; the full license
is in `vendor/HLS_APACHE_2_LICENSE.txt`.

`native-media.js`, `media-network.js`, and `native-hls-loader.js` are local transport adapters,
separate from the unmodified hls.js distribution. `compat.js` supplies missing
ES built-ins for the legacy Tizen browser.
# CryptoJS

Hotstream oynatıcı ayarlarının AES veri çözümlemesi için CryptoJS 4.2.0 AES alt kümesi kullanılır.
Kaynak: https://github.com/brix/crypto-js · MIT.
Telif ve lisansın tam metni: `vendor/CRYPTO_JS_LICENSE.txt`. Site betikleri çalıştırılmaz.



## YouTube kaynak çözümleyici

YouTube.js 18.3.0 ve ES5 yardımcıları yalnız YouTube kaynağı açılırken yüklenir. Kullanılan kütüphanelerin sürüm, telif ve lisans metinleri `cozumleyiciler/youtube/YOUTUBE_THIRD_PARTY_NOTICES.md` içinde korunur. YouTube.js ve yardımcılarının geliştiricilerine teşekkürler.

## Shared verified native TLS transport

Signed core and plugin requests can use the locally packaged Native Client transport on supported Samsung TVs. Site origins are supplied by signed plugin policies. The bridge and HTTP adapter are local application code. Samsung's Pepper 47 SDK supplies the TCP and Native Client interfaces; Chromium's BSD license and the SDK's transitive notices are preserved in `ortak/ag/native/notices/Chromium-LICENSE.txt` and `NaCl-SDK-NOTICE.txt`.

Mbed TLS **3.6.7** is statically linked with certificate and hostname verification enabled. The application selects **Apache-2.0** from upstream's Apache-2.0 OR GPL-2.0-or-later alternatives. The full upstream license and the notices for Project Everest/HACL*/KreMLin and p256-m are in `ortak/ag/native/notices/MbedTLS-LICENSE.txt` and `MbedTLS-COMPONENT-NOTICES.txt`. Copyright The Mbed TLS Contributors; Project Everest components: Copyright INRIA and Microsoft Corporation; p256-m author: Manuel Pégourié-Gonnard.

Sources: https://github.com/Mbed-TLS/mbedtls/releases/tag/mbedtls-3.6.7 and https://developer.samsung.com/smarttv/develop/extension-libraries/nacl/download.html . Local configuration changes and the module's source are supplied in the separate source tree at `kaynak/ortak/ag/native/film-tls-config.h` and `secure-http.cpp`, outside the WGT. The companion `Film-Merkezi-Kaynak-<application-version>.zip`, provided alongside the WGT, contains these files and their build-input hashes. Runtime executables, their `secure-http.nmf` and all native license/notice texts remain in `ortak/ag/native/` inside the WGT.

The Mozilla CA certificate data converted by curl (2026-10-20), under **MPL-2.0**, is embedded in the executables. Its complete, unmodified source is supplied separately at `kaynak/ortak/ag/native/ca-bundle.pem`, including in the companion source ZIP; `ca-bundle.h` in the same source folder is the generated string representation. These build inputs are not fetched by the TV. The full license stays in the WGT at `ortak/ag/native/notices/Mozilla-MPL-2.0.txt`. Source and conversion information: https://curl.se/docs/caextract.html . SHA-256: `796f1389bfea13c0ed78f663b765baaff54a508e5483786bd6ece73c5e3e3cbe`.

Thanks to the Samsung, Chromium, Native Client, Mbed TLS, Project Everest, Mozilla and curl contributors. No certificate checks are disabled and the helper requires no server.


## Native adapter and development tools

The Samsung AVPlay adapter uses the existing TV SDK; no paid player SDK or new runtime service is included. Package-local codec reference clips and their trial module are not distributed in this WGT. FFmpeg/ffprobe are development tools only; their executables are not distributed in the WGT and are not required on the TV.

## In-application acknowledgements and usage notice (v0.23.2)

Catalog Options → About and Player → More → About provide the same bundled
acknowledgements, short component-specific license identifiers and an optional
reader for the full, unmodified local license/notice files. Historical credits are retained; YouTube-specific code is not included in this distribution. Components are not assigned one blanket license.
Mbed TLS and p256-m use their Apache-2.0 option, not their alternative GPL option.
The SDK's additional third-party notices remain intact.

Thanks also to Apps2Samsung for the installation tool and to the Tizen SDK,
Playwright and FFmpeg/ffprobe communities for development tools. Those tools are
not bundled in the WGT; this acknowledgement does not assert affiliation,
endorsement or a new license for their software.

The first-launch usage acknowledgement is a separate application notice. It
does not replace any component license, grant rights to third-party media,
override third-party license permissions or exclude mandatory legal liability.
Its revision is independent of the application version; a changed notice needs
a new acknowledgement. This application change does not relicense existing code.

## Public distribution

This public WGT intentionally has no developer signatures. Apps2Samsung signs it with the installer's own TV-authorized certificates. No private keys are included.

## Native TLS module and ca-bundle — MPL-2.0 source availability

- Native TLS modülü: `ortak/ag/native`. ca-bundle, Mozilla CA verisidir ve MPL-2.0 lisanslıdır; paketle birlikte değiştirilmemiş haliyle derlenmiştir.
- Corresponding source: `Film-Merkezi-Kaynak-2.0.0.zip`, supplied alongside this WGT. It includes the complete native C++/headers, unchanged Mozilla CA data and native build tools. Sources are supplied in the accompanying archive and the public source repository.


## Film Merkezi 2.0.0 corresponding sources

For the 2.0.0 distribution, matching application, SDK and native build sources are supplied in `Film-Merkezi-Kaynak-2.0.0.zip`. Native binaries were rebuilt for the repository filename and bounded GitHub discovery endpoints; the Mozilla CA input is unchanged. Signing keys are not included.

The application and update loader are in `uygulama/`; native build inputs and production tools are in `kaynak/` in the companion source archive. Native notices and all upstream license texts remain in this WGT. Site providers are separate signed online packages; their readable source accompanies each site package. No private keys are included.


This WGT includes no site providers. The signed provider repository is optional and initially empty. Site-specific helpers and permissions belong to the corresponding plugin rather than the WGT.
