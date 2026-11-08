'use strict';
const {fs,path,root,feed,hash,key,sign,write,crypto}=require('./shared.cjs'),assert=require('node:assert/strict'),acorn=require('acorn');
const version='1.9.4',baseline=path.join(feed,'versions/1.9.3'),base=JSON.parse(fs.readFileSync(path.join(baseline,'manifest.json'))),dest=path.join(feed,'versions',version),changed=['ortak/player/player-controller.js','ortak/dil/en.js'];
const files=new Map(base.files.map(f=>[f.path,fs.readFileSync(path.join(baseline,'runtime',f.path))]));
for(const n of changed){const b=fs.readFileSync(path.join(root,'deneme',n));acorn.parse(b.toString(),{ecmaVersion:5});files.set(n,b);}
const m={...base,version,files:[...files].map(([p,b])=>({path:p,size:b.length,sha256:hash(b)}))},text=JSON.stringify(m,null,2)+'\n',k=key();
assert.deepEqual(m.files.filter(f=>!base.files.some(b=>b.path===f.path&&b.sha256===f.sha256)).map(f=>f.path).sort(),changed.slice().sort());
if(fs.existsSync(path.join(dest,'manifest.json')))assert.equal(fs.readFileSync(path.join(dest,'manifest.json'),'utf8'),text,'Published component is immutable');
for(const[n,b]of files)write(path.join(dest,'runtime',n),b);write(path.join(dest,'manifest.json'),text);write(path.join(dest,'manifest.sig'),sign(text,k));
write(path.join(dest,'release-notes.json'),JSON.stringify({tr:'Aynı kaynak seçili motorda iki kez başarısız olursa motor değişimi için onay istenir. Ret veya Geri mevcut motorda devam eder. Kullanıcı kararı beklenirken toparlama saati durur; otomatik deneme sınırları korunur.',en:'Ask before switching engines after two failed openings of the same source. Decline or Back keeps the current engine. Waiting for consent pauses the recovery clock without increasing its attempt limit.'},null,2)+'\n');
assert(crypto.verify('sha256',Buffer.from(text),crypto.createPublicKey(k),Buffer.from(fs.readFileSync(path.join(dest,'manifest.sig'),'utf8'),'base64')));
assert.equal(hash(fs.readFileSync(path.join(root,'Film-Merkezi-TV-1.5.0.wgt'))),'3d2fd810f6b39c43065b7a5c4ae74a750c16457642ff53450feeb7b22e6963f7');console.log(JSON.stringify({version,changed,signatureVerified:true,es5:true,wgtUnchanged:true}));
