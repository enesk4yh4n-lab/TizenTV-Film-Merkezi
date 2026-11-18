#!/usr/bin/env bash
set -euo pipefail
if [ "$#" -ne 3 ]; then
  echo "Usage: build-worker.sh <configured-emsdk> <mbedtls-3.6.7> <output>" >&2
  exit 1
fi
project="$(cd "$(dirname "$0")/../../.." && pwd)"
sdk="$(cd "$1" && pwd)"
mbedtls="$(cd "$2" && pwd)"
mkdir -p "$3"
out="$(cd "$3" && pwd)"
headers="$project/kaynak/ortak/ag/native"
export PATH="$sdk/fastcomp/emscripten:$sdk/fastcomp/fastcomp/bin:$PATH"
cflags="-O2 -I\"$headers\" -DMBEDTLS_CONFIG_FILE=\\\"film-tls-config.h\\\""
cmake -S "$mbedtls" -B "$out/lib" \
  -DCMAKE_TOOLCHAIN_FILE="$sdk/fastcomp/emscripten/cmake/Modules/Platform/Emscripten.cmake" \
  -DCMAKE_BUILD_TYPE=Release -DENABLE_TESTING=OFF -DENABLE_PROGRAMS=OFF \
  -DMBEDTLS_FATAL_WARNINGS=OFF -DUSE_SHARED_MBEDTLS_LIBRARY=OFF \
  "-DCMAKE_C_FLAGS=$cflags"
cmake --build "$out/lib"
python3 "$sdk/fastcomp/emscripten/em++.py" "$project/kaynak/ortak/ag/wasm/secure-http.cpp" \
  -std=c++98 -O2 -Wall -Wextra -Wno-unused-parameter -I"$headers" -I"$mbedtls/include" \
  '-DMBEDTLS_CONFIG_FILE="film-tls-config.h"' -L"$out/lib/library" \
  -L"$out/lib/3rdparty/everest" -L"$out/lib/3rdparty/p256-m" \
  -lmbedtls -lmbedx509 -lmbedcrypto -leverest -lp256m \
  -s ENVIRONMENT_MAY_BE_TIZEN=1 -s SOCKET_HOST_BINDINGS=0 -s 'ENVIRONMENT="worker"' \
  -s SINGLE_FILE=1 -s EXIT_RUNTIME=0 -s TOTAL_MEMORY=67108864 -s ABORTING_MALLOC=0 \
  -s 'EXTRA_EXPORTED_RUNTIME_METHODS=["ccall"]' -o "$out/owned-http.js"
