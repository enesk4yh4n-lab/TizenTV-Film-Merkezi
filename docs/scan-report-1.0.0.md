# Package security scan

1 package(s) scanned on 2026-10-29 11:38 UTC. ClamAV: **not run**.

This is an automated, mechanical scan: it shows what each app *asks for* (privileges), what it *references* (hosts), and whether anything known-bad or obfuscated turned up. It is not a code review. Details for each package are below the table.

| Package | Result | App id | Version | Privileges | Hosts referenced | Signed by |
|---|---|---|---|---|---|---|
| `Film-Merkezi-TV-1.0.0-public.wgt` | ✅ ok | `FilmMerkez.FilmMerkezi` | 1.0.0 | 5 | 57 | — |

<details><summary><b>Film-Merkezi-TV-1.0.0-public.wgt</b> — ✅ ok</summary>

- **sha256** `dcd03a46d282bf5307860bc7d948ce7d2b24844f75ec15369243ca84c42c0da3` · 4,221,003 bytes · 170 files
- **config.xml**: Film Merkezi · id `FilmMerkez.FilmMerkezi` · version 1.0.0 · required Tizen 3.0
- **ClamAV**: not-run (clamscan not installed)
- **Notes:**
  - may load content from any origin (`<access origin="*">`); normal for apps that wrap a website
  - requests `http://tizen.org/privilege/filesystem.write` (write to TV storage)
  - contains WebAssembly / NaCl modules (compiled code, not inspectable as text)
  - uses runtime <script> injection in cozumleyiciler/youtube/youtube-polyfills.js, cozumleyiciler/youtube/youtube-source.js, site-listesi.js
  - uses tizen.filesystem in ortak/ag/native-media.js, ortak/ag/network.js, ortak/player/avplay-player.js
  - 3 minified/bundled file(s): cozumleyiciler/youtube/youtube-extractor.js, cozumleyiciler/youtube/youtube-polyfills.js, vendor/hls-1.7.3.min.js
- **Privileges (5):** `download`, `filesystem.read`, `filesystem.write`, `internet`, `tv.inputdevice`
- **Hosts referenced (57):** `tc39.es`, `url.spec.whatwg.org`, `www.youtube.com`, `www.ddizi.tel`, `www.filmizlebabam.com`, `matrudas.com`, `fsf.org`, `www.dizibox.live`, `invalid.local`, `youtubei.googleapis.com`, `spdx.org`, `filmizle.ink`, `www.filmifullizle.news`, `filmizlehell.net`, `filmmakinesi.to`, `myplayersvideo.xyz`, `www.fullhdfilmizlesene.now`, `www.hdfilmcehennemi.nl`, `hdfilmdelisi.one`, `lovefilmizle.net`, `player.filmizle.in`, `turkcefilmler.to`, `music.youtube.com`, `suggestqueries-clients6.youtube.com`, `upload.youtube.com`, `green-youtubei.sandbox.googleapis.com`, `release-youtubei.sandbox.googleapis.com`, `test-youtubei.sandbox.googleapis.com`, `cami-youtubei.sandbox.googleapis.com`, `uytfe.sandbox.google.com`, `esm.sh`, `standards.iso.org`, `dashif.org`, `ytjs.googlevideo.com`, `ytjs.dev`, `oauth.net`, `gdata.youtube.com`, `www.googleapis.com`, `ytx.invalid`, `project-everest.github.io` …

</details>
