# 1.1.7 verification

Publication checks: 2 November 2026. Actual device tests below were recorded on 1 November 2026.

## Focused publication checks

- 34 checks passed: 18 existing FixFull unit checks, five current tab/panel checks, eight existing source/transport checks, three header/filter browser checks.
- Header tested across all 14 individual sites and the unified catalog, in Turkish and English. Version is taken from `AppInfo.version`; the label did not overlap search at 1920×1080.
- Existing filter checks retained category/title/address rejection and general-movie access. No additional filter implementation was introduced for publication.
- All 170 runtime files match the public source allowlist. Project JavaScript parses as ES5; all packaged JavaScript is checked with `node --check`.
- Package checks cover local references, XML/application identity/version, YouTube inline CSP hash, native source/output hashes, decoder/source reproduction and exclusion of developer signatures/private keys/tests.
- The three unchanged native executables retain historical Linux SDK compiler paths. Readable source instructions use neutral paths; no private credentials are included. Native binaries were preserved rather than rebuilt or stripped for publication.
- The old standalone TurkceFilmler browser runner stopped at an obsolete startup-picker assertion (the application now opens the shared home). It was not counted as passing. Its relevant filter/detail cases were rerun in the focused publication checks without changing application behavior.

Final machine-readable publication results are supplied in `docs/DOGRULAMA_1.1.7.json`. Artifact hashes are in the release's `SHA256SUMS.txt`.

## Prior real TV evidence

Device: Samsung UE55MU7500, Tizen 3.0, firmware 1410. The playback code was installed on the TV and used its own network/resolvers; media URLs were not supplied from a PC.

Passed automated coverage included catalog menus, search/filter/order/pagination, final results for seven search queries, Loki season/episode detail, recommendations, player keys, refresh without replacing the current playing/paused connection, DDizi playback, YouTube startup, AVPlay reference-clip preparation/timing and 50 AVPlay open/close cycles.

A bounded 20-screen-cycle comparison returned to 434 nodes and 33 listeners after garbage collection, matching its warm baseline. This is not a native RAM/CPU measurement or proof of leak-free long use.

## Remaining issues and evidence limits

- Some FixFull streams underflowed: one 30-second observation advanced only 13.671 seconds of media. Another selected approximately 2.726 Mbit/s video while measured delivery was approximately 1.31 Mbit/s. This points to a delivery/bitrate mismatch in those samples; CDN/Internet and transport-stack contributions have not been separated.
- Two remote testing sessions were interrupted. The user reported no remote/Home interaction. A crash, OOM or single root cause was not established.
- The current screensaver policy may allow the saver during seek/buffering/recovery; this was not changed by the FixFull/publication work.
- Not every provider/source opened. One Filmifullizle sample timed out; some candidates returned HTTP errors or remained unverified. A fallback source succeeding was not counted as the failed source succeeding.
- Human audio/sync/HDR, passthrough, physical remote/IME, three-hour playback and full newer-TV acceptance were not confirmed by these automatic checks. The final application-header and source-notice edits were checked on desktop, not reinstalled on TV.
- User-record preservation was not separately tested, as requested by the user. No broad user-data reset or backup/restore was performed for publication.

Full test logs, TV identifiers, signed CDN addresses and personal paths are deliberately excluded from the public repository.
