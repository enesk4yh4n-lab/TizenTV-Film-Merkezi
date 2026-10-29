# Legacy Samsung HTTPS module

The module is local to the WGT and handles GET requests to `https://www.ddizi.tel/izle/` and `/player/` only. It preserves the episode Referer. It is loaded lazily by `../secure-http.js`; `siteler/ddizi/ddizi-network.js` owns resolver cancellation. Other providers and media playback retain their existing transports.

Pepper 47 supplies asynchronous TCP and IPv4 name resolution. Mbed TLS 3.6.7 supplies TLS 1.2 with required valid certificate chain, hostname and dates, using the bundled Mozilla CA source. Randomness comes from Native Client's secure random interface. The helper does not change the television's certificate store/network settings.

Limits: two active requests, 16-second native timeout, 2 MiB body, bounded headers, identity/chunked HTTP framing. JS adds a shared deadline and cancellation before/after module loading. DNS, connection, TLS, HTTP, parsing and cancellation errors remain distinguishable. Unsupported Native Client platforms retain the legacy resolver client.

Build with the official Samsung Pepper 47 SDK on the development PC:

```text
wsl -d Ubuntu-22.04 -u root -- python3 <project-root>/tools/build-native-tls.py
wsl -d Ubuntu-22.04 -u root -- python3 <project-root>/tools/build-native-http.py --out <project-root>/deneme/ortak/ag/native
```

Build tools pin the TLS archive and CA data. `build-hashes.json` records source/header/CA and all three executable hashes. ARM is compiled for physical Samsung TVs; x86 targets support development emulators. Compilation is separate from actual device validation.

`--qa` adds explicit certificate-test hosts in a separate QA output directory. Release executables are built without `FILM_HTTP_QA`; the package verifier rejects QA hosts in release binaries. QA scripts and their separate app identity are excluded from the release.

Third-party license texts and transitive SDK notices are in `notices/`. `ca-bundle.pem` is the complete source of the generated `ca-bundle.h`, under MPL-2.0. The selected Mbed TLS license is Apache-2.0. See the application's `THIRD_PARTY_NOTICES.md` for origins and acknowledgments.
