"""Make an unsigned WGT from the public source; no SDK keys required."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json, hashlib
root=Path(__file__).resolve().parents[2]; app=root/'uygulama'
if not app.is_dir(): app=root/'tools/test-results/neutral160/stage'
names=json.loads((Path(__file__).parent/'package-files.json').read_text())
target=root/'Film-Merkezi-TV-1.6.0-public.wgt'
with ZipFile(target,'w',ZIP_DEFLATED) as z:
 for n in names:
  assert not n.startswith(('tools/','siteler/','saglayicilar/','bundled/sites/')) and '/packages/' not in n
  assert n not in ('author-signature.xml','signature1.xml')
  z.write(app/n,n)
print(json.dumps({'file':str(target),'files':len(names),'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}))
