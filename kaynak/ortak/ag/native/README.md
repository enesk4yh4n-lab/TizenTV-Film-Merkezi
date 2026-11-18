# Signed native HTTPS transport — WGT 2.0.3

This is the canonical C++/header/CA input directory. Runtime executables, NMF and complete third-party notices are under uygulama/ortak/ag/native/.

Samsung Pepper 47 supplies asynchronous TCP/DNS; Mbed TLS 3.6.7 supplies TLS with required certificate chain, hostname and date verification. Website/referrer permission comes from signed policies. There is no hardcoded website exception. Repository trust controls are separate from HTTP jobs.

The JS bridge limits concurrent HTTP requests to two and propagates cancellation, deadlines, range and size errors. The HLS player requests 16 MiB per fragment by default and can request up to 32 MiB. Existing explicit source limits are honored, and raw binary calls without a specified limit retain the 8 MiB transport default. Text, playlist and key consumers retain their smaller limits. Certificate and origin validation are never disabled. New repository discovery uses filmmerkezi-repository.json; saved legacy addresses require an existing publisher key.

The matching source ZIP on the WGT 2.0.3 Release includes the production build scripts. Inside WSL from that archive's root, with the official Samsung Pepper 47 SDK installed:

~~~text
python3 kaynak/uretim/build-native-tls.py --sdk /path/to/pepper_47
python3 kaynak/uretim/build-native-http.py --sdk /path/to/pepper_47 --out uygulama/ortak/ag/native
~~~

ARM, x86-32 and x86-64 outputs are produced together. build-hashes.json records all source/header/CA, pinned TLS archive and executable digests. SDK/compiler installations are outside this archive. Compilation does not demonstrate TV playback. --qa is only for isolated outputs; production builds do not enable it.

ca-bundle.pem is the complete unchanged Mozilla CA input converted by curl (2026-10-20), under MPL-2.0. ca-bundle.h is its generated representation. Mbed TLS uses Apache-2.0. Full license texts and transitive SDK notices remain in the runtime notices/ directory and companion source archive. See uygulama/THIRD_PARTY_NOTICES.md.
