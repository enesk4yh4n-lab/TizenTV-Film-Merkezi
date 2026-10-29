"""Build narrow HTTPS helpers with the official Samsung Pepper 47 SDK in WSL."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import shutil
import tempfile

parser = argparse.ArgumentParser()
parser.add_argument('--sdk', required=True)
parser.add_argument('--out', required=True)
parser.add_argument('--qa', action='store_true')
args = parser.parse_args()
sdk = Path(args.sdk).resolve()
root = Path(__file__).resolve().parent.parent
source = root / 'kaynak/ortak/ag/native/secure-http.cpp'
working = tempfile.TemporaryDirectory(prefix='film-http-build-')
build_root = Path(working.name)
shutil.copy2(source, build_root / source.name)
for header in source.parent.glob('*.h'):
    shutil.copy2(header, build_root / header.name)
out = Path(args.out).resolve()
out.mkdir(parents=True, exist_ok=True)
manifest = {'program': {}}
hashes = {}
inputs = {p.name: hashlib.sha256(p.read_bytes()).hexdigest()
          for p in [source] + sorted(source.parent.glob('*.h')) + [source.parent / 'ca-bundle.pem']}
targets = [
    ('arm', 'linux_arm_newlib', 'arm-nacl-g++', 'newlib_arm'),
    ('x86-32', 'linux_x86_newlib', 'i686-nacl-g++', 'newlib_x86_32'),
    ('x86-64', 'linux_x86_newlib', 'x86_64-nacl-g++', 'newlib_x86_64'),
]
for arch, toolchain, compiler, library in targets:
    output = out / ('https-' + arch + '.nexe')
    temporary_output = build_root / output.name
    tls = sdk.parent / 'deps' / ('tls-build-' + arch)
    command = [str(sdk / 'toolchain' / toolchain / 'bin' / compiler), '-std=gnu++98', '-O2', '-DNDEBUG',
               '-DMBEDTLS_CONFIG_FILE="film-tls-config.h"',
               '-ffunction-sections', '-fdata-sections', '-Wl,--gc-sections', '-Wall', '-Wextra',
               '-I' + str(build_root), '-I' + str(sdk / 'include'), '-L' + str(sdk / 'lib' / library / 'Release'),
               '-I' + str(sdk.parent / 'deps/mbedtls-3.6.7/include'),
               '-L' + str(tls / 'library'), '-L' + str(tls / '3rdparty/everest'), '-L' + str(tls / '3rdparty/p256-m'),
               str(build_root / source.name), '-o', str(temporary_output), '-lmbedtls', '-lmbedx509', '-lmbedcrypto', '-leverest', '-lp256m',
               '-lppapi_cpp_private', '-lppapi_cpp', '-lppapi', '-pthread']
    if args.qa:
        command.insert(1, '-DFILM_HTTP_QA')
    subprocess.run(command, check=True, cwd=build_root)
    shutil.copy2(temporary_output, output)
    manifest['program'][arch] = {'url': output.name}
    hashes[output.name] = {'sha256': hashlib.sha256(output.read_bytes()).hexdigest(), 'size': output.stat().st_size}
    print(arch + ' built', flush=True)
(out / 'secure-http.nmf').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
hash_dir = source.parent if out == root / 'deneme/ortak/ag/native' else out
(hash_dir / 'build-hashes.json').write_text(json.dumps({'qa': args.qa, 'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'inputs': inputs, 'tlsVersion': '3.6.7', 'tlsArchiveSha256': 'a7e8bcbec0e6f761b4af24f25677626b35f762f68eef79c08677a363212d11f6', 'files': hashes}, indent=2), encoding='utf-8')
print('Built ' + str(out), flush=True)
working.cleanup()
