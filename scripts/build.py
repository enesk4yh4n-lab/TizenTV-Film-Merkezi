"""Reproducible unsigned packages. No signing profile, key or Samsung account required."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import base64, hashlib, json, re, subprocess, xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / 'app'
files = json.loads((ROOT / 'scripts/runtime-files.json').read_text())
source_files = json.loads((ROOT / 'scripts/source-files.json').read_text())
version = ET.parse(APP / 'config.xml').getroot().get('version')
dist = ROOT / 'dist'
dist.mkdir(exist_ok=True)
sha = lambda b: hashlib.sha256(b).hexdigest()
read = lambda f: f.read_bytes().decode('utf-8')

# Keep the decoder's build inputs available and reproduce its original wrapper.
src = ROOT / 'kaynak/siteler/hdfilmcehennemi/decoder-kaynak/src'
parts = ['/* MIT decoder adaptations; see LICENSE and THIRD_PARTY_NOTICES.md. */', '(function(root){var modules={},cache={};']
for name in ['utils', 'catalog', 'player']:
    parts.append("modules['"+name+"']=function(module,exports,require){\n"+read(src/(name+'.js'))+"\n};")
parts.append("function load(n){n=n.replace('./','');if(cache[n])return cache[n].exports;var m={exports:{}};cache[n]=m;modules[n](m,m.exports,load);return m.exports;}root.ChainDecoder={catalog:load('catalog'),player:load('player')};})(window);")
assert (APP/'siteler/hdfilmcehennemi/decoder.js').read_bytes() == '\n'.join(parts).encode('utf-8'), 'Generated decoder differs from its source'
literal = "/* Generated data-only MIT media decoder; canonical source (outside WGT): kaynak/siteler/hdfilmcehennemi/decoder-kaynak/src/player.js. */\n(function(root){var module={exports:{}};\n"+read(src/'player.js')+"\nroot.LiteralMediaDecoder=module.exports;})(window);\n"
assert (APP/'cozumleyiciler/literal-media.js').read_bytes() == literal.encode('utf-8')
assert set(files) == {f.relative_to(APP).as_posix() for f in APP.rglob('*') if f.is_file()}
assert not any(n in files for n in ['author-signature.xml','signature1.xml'])
assert not re.search(r'<author[^>]*\bemail\s*=',read(APP/'config.xml'))
script = re.search(rb'<script>([\s\S]*?)</script>',(APP/'cozumleyiciler/youtube/api-frame.html').read_bytes())[1]
assert 'sha256-'+base64.b64encode(hashlib.sha256(script).digest()).decode() in read(APP/'config.xml')
inputs = json.loads((ROOT/'kaynak/ortak/ag/native/build-hashes.json').read_text(encoding='utf-8-sig'))
for name,digest in inputs['inputs'].items():
    assert sha((ROOT/'kaynak/ortak/ag/native'/name).read_bytes()) == digest,name
for name,row in inputs['files'].items():
    assert sha((APP/'ortak/ag/native'/name).read_bytes()) == row['sha256'],name
for name in files:
    assert not re.search(r'\.(p12|pfx|key|pwd|pem)$',name,re.I),name

def archive(target, payload):
    with ZipFile(target,'w',compression=ZIP_DEFLATED,compresslevel=9) as z:
        for name,file in sorted(payload.items()):
            zi=ZipInfo(name,(2026,1,1,0,0,0));zi.compress_type=ZIP_DEFLATED;zi.external_attr=0o100644<<16
            z.writestr(zi,file.read_bytes(),compresslevel=9)

package=dist/f'Film-Merkezi-TV-{version}-public.wgt'
archive(package,{n:APP/n for n in files})
companion=dist/f'Film-Merkezi-Kaynak-{version}.zip'
sources={'kaynak/'+n:ROOT/'kaynak'/n for n in source_files+['README.md']}
sources.update({n:APP/n for n in files if n.startswith('ortak/ag/native/notices/') or n in ['LICENSE','THIRD_PARTY_NOTICES.md']})
archive(companion,sources)
full=dist/f'Film-Merkezi-Kaynak-Tam-{version}.zip'
allowed_roots={'app','kaynak','scripts','docs'}
allowed_files={'README.md','LICENSE','SECURITY.md','.gitignore','.gitattributes','package.json','package-lock.json'}
full_files={}
for f in ROOT.rglob('*'):
    if not f.is_file():continue
    relative=f.relative_to(ROOT)
    if relative.parts[0] in allowed_roots or relative.as_posix() in allowed_files:
        if '__pycache__' not in relative.parts and f.suffix!='.pyc':full_files[relative.as_posix()]=f
archive(full,full_files)
artifacts=[package,companion,full]
(dist/'SHA256SUMS.txt').write_text(''.join(sha(f.read_bytes())+'  '+f.name+'\n' for f in artifacts),encoding='utf-8')
print(json.dumps({'version':version,'signed':False,'files':len(files),'artifacts':[{'file':f.name,'bytes':f.stat().st_size,'sha256':sha(f.read_bytes())} for f in artifacts]},indent=2))
