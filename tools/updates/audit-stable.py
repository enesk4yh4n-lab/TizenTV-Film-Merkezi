"""Explicit package assembly/audit. Reads public certificates, never private keys."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from urllib.parse import unquote
import base64, hashlib, json, re, xml.etree.ElementTree as ET
from cryptography import x509
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
root=Path(__file__).resolve().parents[2]; out=root/'tools/test-results/stable150'; stage=out/'stage'
names=set(json.loads((out/'package-files.json').read_text())); sha=lambda b:hashlib.sha256(b).hexdigest()
ns={'ds':'http://www.w3.org/2000/09/xmldsig#'}; signatures={'author-signature.xml','signature1.xml'}
signed=root/'Film-Merkezi-TV-1.5.0.wgt'
with ZipFile(signed,'w',ZIP_DEFLATED) as z:
 for n in sorted(names|signatures): z.write(out/'local-sign'/n,n)
report={'passed':True,'packages':[]}
for suffix in ['','-public']:
 p=root/('Film-Merkezi-TV-1.5.0'+suffix+'.wgt'); expected=names|(signatures if not suffix else set())
 with ZipFile(p) as z:
  assert set(z.namelist())==expected and len(z.namelist())==len(expected)
  for n in names: assert z.read(n)==(stage/n).read_bytes(),n
  assert not any(n.startswith(('tools/','siteler/')) or n.endswith(('.pem','.p12','.cpp','.h')) for n in expected)
  xml=ET.fromstring(z.read('config.xml')); assert xml.get('version')=='1.5.0' and b'@' not in z.read('config.xml')
  assert xml.find('{http://www.w3.org/ns/widgets}name').text=='Film Merkezi'
  assert xml.find('{http://tizen.org/ns/widgets}application').get('id')=='FMUpTest01.FilmMerkezi'
  csp=xml.find('{http://tizen.org/ns/widgets}content-security-policy').text
  frame=re.search(rb'<script>([\s\S]*?)</script>',z.read('cozumleyiciler/youtube/api-frame.html'))[1]
  assert 'sha256-'+base64.b64encode(hashlib.sha256(frame).digest()).decode() in csp
  for n in re.findall(r'(?:src|href)="([^"]+)"',z.read('index.html').decode()): assert n.startswith('$WEBAPIS') or n in names,n
  verified=0; author=''
  if not suffix:
   for n in signatures:
    raw=z.read(n).decode(); doc=ET.fromstring(raw); info=doc.find('ds:SignedInfo',ns)
    cert=x509.load_der_x509_certificate(base64.b64decode(doc.find('.//ds:X509Certificate',ns).text))
    if n=='author-signature.xml': author=sha(cert.public_bytes(__import__('cryptography.hazmat.primitives.serialization',fromlist=['Encoding']).Encoding.DER))
    method=info.find('ds:CanonicalizationMethod',ns).get('Algorithm'); assert method=='http://www.w3.org/2001/10/xml-exc-c14n#'
    # This signer emits only the default ds namespace in SignedInfo, without
    # inherited prefixed namespaces: inclusive and exclusive output coincide.
    fragment=re.search(r'<SignedInfo>[\s\S]*?</SignedInfo>',raw)[0].replace('<SignedInfo>','<SignedInfo xmlns="'+ns['ds']+'">',1)
    canonical=ET.canonicalize(xml_data=fragment).encode()
    sigalg=info.find('ds:SignatureMethod',ns).get('Algorithm'); assert sigalg.endswith('#rsa-sha512')
    cert.public_key().verify(base64.b64decode(doc.findtext('ds:SignatureValue',namespaces=ns)),canonical,padding.PKCS1v15(),hashes.SHA512())
    for ref in info.findall('ds:Reference',ns):
     uri=unquote(ref.get('URI','')); alg=ref.find('ds:DigestMethod',ns).get('Algorithm').split('#')[-1]
     if uri.startswith('#'):
      fragment=re.search(r'<Object\b[^>]*\bId="'+re.escape(uri[1:])+r'"[^>]*>[\s\S]*?</Object>',raw)[0]
      # The fixed Tizen signer writes this properties Object in inclusive 1.1
      # order already. Retain its xmlns:dsp declaration on SignatureProperties
      # (ElementTree's 2.0 canonicalizer would move that declaration).
      assert '\n' not in fragment and '/>' not in fragment and fragment.startswith('<Object Id="prop">')
      fragment=fragment.replace('<Object','<Object xmlns="'+ns['ds']+'"',1); value=fragment.encode()
     else: value=z.read(uri)
     assert base64.b64encode(hashlib.new(alg,value).digest()).decode()==''.join(ref.findtext('ds:DigestValue',namespaces=ns).split()),uri
     verified+=1
   with ZipFile(root/'Film-Merkezi-Update-Test-1.4.1.wgt') as previous:
    old=ET.fromstring(previous.read('author-signature.xml')).find('.//ds:X509Certificate',ns).text
    assert sha(base64.b64decode(old))==author,'Author identity changed'
  report['packages'].append({'file':p.name,'bytes':p.stat().st_size,'files':len(expected),'sha256':sha(p.read_bytes()),'verifiedSignatureReferences':verified,'authorFingerprint':author})
inputs=json.loads((out/'native/build-hashes.json').read_text()); assert inputs['qa'] is False
for n,h in inputs['inputs'].items(): assert sha((root/'tools/plugins/native'/n).read_bytes())==h,n
for n,r in inputs['files'].items(): assert sha((stage/'ortak/ag/native'/n).read_bytes())==r['sha256'],n
with ZipFile(root/'updates/sources/Film-Merkezi-Kaynak-1.5.0.zip') as z:
 for n in inputs['inputs']: assert sha(z.read('kaynak/ortak/ag/native/'+n))==inputs['inputs'][n],n
assert sha((root/'Film-Merkezi-Update-Test-1.4.1.wgt').read_bytes())=='2c06ea44e4e4dc3d3c62416324eebbb5a080a3318066d76070a5b4e35310fac9'
report['nativeInputs']=inputs['inputs']; (out/'audit.json').write_text(json.dumps(report,indent=2)); print(json.dumps(report))
