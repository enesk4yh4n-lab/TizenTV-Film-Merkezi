"""Rebuild decoder and create an unsigned, reproducible WGT for per-device signing."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import hashlib, json, re, shutil, subprocess
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / 'app'
VERSION = ET.parse(APP / 'config.xml').getroot().attrib['version']
parts = ['/* MIT decoder adaptations; see LICENSE and THIRD_PARTY_NOTICES.md. */',
         '(function(root){var modules={},cache={};']
for name in ['utils', 'catalog', 'player']:
    source = (ROOT / 'vendor/decoder' / (name + '.js')).read_text(encoding='utf-8')
    parts.append("modules['" + name + "']=function(module,exports,require){\n" + source + '\n};')
parts.append("function load(n){n=n.replace('./','');if(cache[n])return cache[n].exports;var m={exports:{}};cache[n]=m;modules[n](m,m.exports,load);return m.exports;}root.ChainDecoder={catalog:load('catalog'),player:load('player')};})(window);")
(APP / 'decoder.js').write_bytes('\n'.join(parts).encode('utf-8'))
if shutil.which('node'):
    for file in APP.glob('*.js'):
        subprocess.run(['node', '--check', str(file)], check=True, capture_output=True)
for file in APP.iterdir():
    assert not file.name.startswith('.'), 'Hidden file in application'
    assert file.suffix.lower() not in ['.p12', '.pfx', '.pem', '.key'], 'Private signing file'
    assert file.name not in ['author-signature.xml', 'signature1.xml'], 'Do not distribute personal signatures'
config = (APP / 'config.xml').read_text(encoding='utf-8')
assert not re.search(r'<author[^>]*\bemail\s*=', config)
dist = ROOT / 'dist'
dist.mkdir(exist_ok=True)
package = dist / ('HDfilmCehennemi-TV-' + VERSION + '-public.wgt')
with ZipFile(package, 'w', compression=ZIP_DEFLATED) as archive:
    for file in sorted(APP.iterdir()):
        assert file.is_file(), 'Application directory must be flat'
        info = ZipInfo(file.name, (2026, 1, 1, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        archive.writestr(info, file.read_bytes())
digest = hashlib.sha256(package.read_bytes()).hexdigest()
(dist / 'SHA256SUMS.txt').write_text(digest + '  ' + package.name + '\n', encoding='utf-8')
print(json.dumps({'package': 'dist/' + package.name, 'sha256': digest, 'signed': False}, indent=2))
