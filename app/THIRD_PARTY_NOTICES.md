# Third-party notices

Player decoder arithmetic, legacy decoding variants, and site-format behavior were adapted from the HDFilmCehennemi Stremio Addon by enXov and its maintained Batuhan4 fork:

- https://github.com/enXov/hdfilmcehennemi-stremio
- https://github.com/Batuhan4/hdfilmcehennemi-stremio

The original MIT license follows. Other parts of this package are covered by LICENSE.

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
The upstream notice is preserved in `HLS_LICENSE.txt`; the full license
is in `HLS_APACHE_2_LICENSE.txt`.

`native-media.js`, `media-network.js`, and `native-hls-loader.js` are local transport adapters,
separate from the unmodified hls.js distribution. `compat.js` supplies missing
ES built-ins for the legacy Tizen browser.

## Installation acknowledgements

Real-TV installation used Apps2Samsung. Thank you to the Apps2Samsung developers
and community contributors for simplifying TV connection, certificates and installation:
https://github.com/Apps2Samsung/Apps2Samsung

Apps2Samsung is a separate installation tool; its executable or source code is not
bundled in this WGT. This acknowledgement does not imply endorsement.
