"""Make an unsigned WGT from the public source; no SDK keys required."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json, hashlib, xml.etree.ElementTree as ET
root=Path(__file__).resolve().parents[2]; app=root/'uygulama'
assert app.is_dir(), 'Public application source is missing'
names=json.loads((Path(__file__).parent/'package-files.json').read_text())
version=ET.parse(app/'config.xml').getroot().get('version')
assert version and all(p.isdigit() for p in version.split('.')) and len(version.split('.'))==3
target=root/('Film-Merkezi-TV-'+version+'-public.wgt')
with ZipFile(target,'w',ZIP_DEFLATED) as z:
 for n in names:
  assert not n.startswith(('tools/','siteler/','saglayicilar/','bundled/sites/')) and '/packages/' not in n
  assert n not in ('author-signature.xml','signature1.xml')
  assert not n.startswith('compat-media/') and n!='ortak/player/compatibility-trials.js'
  z.write(app/n,n)
print(json.dumps({'file':str(target),'files':len(names),'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}))
