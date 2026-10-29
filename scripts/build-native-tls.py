"""Pinned Mbed TLS 3.6 LTS builds for Samsung Pepper 47; no device access."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tarfile
import urllib.request

parser = argparse.ArgumentParser()
parser.add_argument('--sdk', required=True)
args = parser.parse_args()
sdk = Path(args.sdk).resolve()
deps = sdk.parent / 'deps'
deps.mkdir(exist_ok=True)
root = Path(__file__).resolve().parent.parent
source_dir = root / 'kaynak/ortak/ag/native'
release_hash = 'a7e8bcbec0e6f761b4af24f25677626b35f762f68eef79c08677a363212d11f6'
ca_hash = '796f1389bfea13c0ed78f663b765baaff54a508e5483786bd6ece73c5e3e3cbe'
archive = deps / 'mbedtls-3.6.7.tar.bz2'
if not archive.exists():
    urllib.request.urlretrieve('https://github.com/Mbed-TLS/mbedtls/releases/download/mbedtls-3.6.7/mbedtls-3.6.7.tar.bz2', archive)
if hashlib.sha256(archive.read_bytes()).hexdigest() != release_hash:
    raise RuntimeError('Mbed TLS release digest mismatch')
mbed = deps / 'mbedtls-3.6.7'
if not mbed.exists():
    with tarfile.open(archive) as package:
        for entry in package.getmembers():
            if not (deps / entry.name).resolve().is_relative_to(deps):
                raise RuntimeError('Mbed TLS archive path escapes destination')
        package.extractall(deps)
# Use the exact MPL-covered CA source distributed with this version.
cert = source_dir / 'ca-bundle.pem'
if hashlib.sha256(cert.read_bytes()).hexdigest() != ca_hash:
    raise RuntimeError('CA bundle changed; review and explicitly update the pinned digest')
config = deps / 'config'
config.mkdir(exist_ok=True)
shutil.copy2(source_dir / 'film-tls-config.h', config)
targets = [('arm', 'linux_arm_newlib', 'arm-nacl'), ('x86-32', 'linux_x86_newlib', 'i686-nacl'), ('x86-64', 'linux_x86_newlib', 'x86_64-nacl')]
for arch, toolchain, prefix in targets:
    binary = sdk / 'toolchain' / toolchain / 'bin'
    build = deps / ('tls-build-' + arch)
    build.mkdir(exist_ok=True)
    configure = ['cmake', '-S', str(mbed), '-B', str(build), '-DCMAKE_SYSTEM_NAME=Generic', '-DCMAKE_TRY_COMPILE_TARGET_TYPE=STATIC_LIBRARY',
                 '-DCMAKE_C_COMPILER=' + str(binary / (prefix + '-gcc')), '-DCMAKE_AR=' + str(binary / (prefix + '-ar')), '-DCMAKE_RANLIB=' + str(binary / (prefix + '-ranlib')),
                 '-DCMAKE_BUILD_TYPE=Release', '-DENABLE_TESTING=OFF', '-DENABLE_PROGRAMS=OFF', '-DMBEDTLS_FATAL_WARNINGS=OFF', '-DUSE_SHARED_MBEDTLS_LIBRARY=OFF',
                 '-DCMAKE_C_FLAGS=-O2 -ffunction-sections -fdata-sections -I' + str(config) + ' -DMBEDTLS_CONFIG_FILE=\\\"film-tls-config.h\\\"']
    log = build / 'build.log'
    with log.open('w') as handle:
        result = subprocess.run(configure, stdout=handle, stderr=subprocess.STDOUT)
        if not result.returncode:
            result = subprocess.run(['cmake', '--build', str(build), '--parallel', '4'], stdout=handle, stderr=subprocess.STDOUT)
    if result.returncode:
        print(log.read_text()[-6500:], flush=True)
        raise RuntimeError('Mbed TLS build failed: ' + arch)
    print('Mbed TLS ' + arch + ' built', flush=True)
vendor = root / 'app/ortak/ag/native/notices'
vendor.mkdir(exist_ok=True)
shutil.copy2(mbed / 'LICENSE', vendor / 'MbedTLS-LICENSE.txt')
shutil.copy2(sdk / 'LICENSE', vendor / 'Chromium-LICENSE.txt')
shutil.copy2(sdk / 'NOTICE', vendor / 'NaCl-SDK-NOTICE.txt')
components = []
for name in ['3rdparty/everest/README.md', '3rdparty/p256-m/README.md']:
    components.append(name + '\n\n' + (mbed / name).read_text())
components.append('Project Everest / HACL* / KreMLin: Copyright (c) INRIA and Microsoft Corporation. All rights reserved. Licensed under the Apache License, Version 2.0.\n')
components.append('p256-m: Copyright The Mbed TLS Contributors. Author: Manuel Pégourié-Gonnard. SPDX-License-Identifier: Apache-2.0 OR GPL-2.0-or-later. This application selects Apache-2.0.\n')
(vendor / 'MbedTLS-COMPONENT-NOTICES.txt').write_text('\n\n'.join(components), encoding='utf-8')
if cert.resolve() != (source_dir / 'ca-bundle.pem').resolve():
    shutil.copy2(cert, source_dir / 'ca-bundle.pem')
literal = '\n'.join(json.dumps(line + '\n') for line in cert.read_text().splitlines())
(source_dir / 'ca-bundle.h').write_text('// Generated from ca-bundle.pem; SHA256 ' + ca_hash + '\nstatic const unsigned char kCaBundle[] =\n' + literal + ';\n', encoding='utf-8')
print('Pinned TLS libraries, CA bundle and notices ready', flush=True)
