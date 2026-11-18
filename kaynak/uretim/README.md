# Build and package

From this source tree's root, run `python3 kaynak/uretim/package.py` to create an unsigned WGT from the explicit file list. Bundled component signatures are already supplied. If you change core files, use a new component version and sign it with your own distribution key.

- [Native HTTPS build](../ortak/ag/native/README.md) uses Samsung Pepper 47 and the pinned Mbed TLS 3.6.7 source.
- [WebAssembly HTTPS build](wasm/README.md) uses Samsung Emscripten 1.39.4.7 and the same Mbed TLS source.
