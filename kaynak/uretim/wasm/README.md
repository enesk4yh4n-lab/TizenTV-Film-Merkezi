# WebAssembly HTTPS Worker

Use the Samsung Emscripten 1.39.4.7 toolchain configured for your host. Set `EM_CONFIG` and `EM_CACHE` for that installation. Obtain Mbed TLS 3.6.7 using the version and archive SHA-256 in the adjacent [native inputs](../../ortak/ag/native/build-hashes.json).

From this source tree's root, build the pinned libraries and unwrapped Worker using the script below. Provide the configured Emscripten directory containing `fastcomp`, the unpacked Mbed TLS source, and a build output directory.

~~~sh
bash kaynak/uretim/wasm/build-worker.sh /path/to/emsdk /path/to/mbedtls-3.6.7 /path/to/build
npm --prefix kaynak/uretim/wasm ci
node kaynak/uretim/wasm/assemble-worker.cjs /path/to/build/owned-http.js /path/to/build/wasm-http-worker.js
~~~

The generated Worker is packaged as `uygulama/bootstrap/wasm-http-worker.js`. The build uses a fixed 64 MiB heap, single-file output, and the nonblocking socket path. The checked-in runtime and input notices accompany this source.
