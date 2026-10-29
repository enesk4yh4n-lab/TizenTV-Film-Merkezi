'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),acorn=require('acorn'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),app=path.join(root,'app'),files=JSON.parse(fs.readFileSync(path.join(__dirname,'runtime-files.json'),'utf8'));
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
assert.deepEqual(walk(app).map(f=>path.relative(app,f).replaceAll('\\','/')).sort(),[...files].sort());
let parsed=0;
for(const name of files){
 const file=path.join(app,name),data=fs.readFileSync(file);
 assert(!/author-signature\.xml|signature1\.xml|\.(p12|pfx|pem|pwd|key)$/i.test(name),name);
 assert(!data.includes(Buffer.from('enesk4yh4n@gmail.com'))&&!data.includes(Buffer.from('Enes Kayhan')),name);
 // TLS parsers contain the PEM header as a constant. Reject a key body, not that label alone.
 assert(!/-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----[ \t]*\r?\n[A-Za-z0-9+/=\r\n ]{64,}/.test(data.toString('latin1')),name);
 if(name.endsWith('.js')&&!name.startsWith('vendor/')&&!name.endsWith('youtube-extractor.js')){acorn.parse(data.toString('utf8'),{ecmaVersion:5});parsed++;}
}
const html=fs.readFileSync(path.join(app,'index.html'),'utf8');
for(const m of html.matchAll(/(?:src|href)="([^"]+)"/g))if(!m[1].startsWith('$WEBAPIS'))assert(files.includes(m[1]),m[1]);
const config=fs.readFileSync(path.join(app,'config.xml'),'utf8');
assert(!/<author[^>]*\bemail\s*=/.test(config));assert(config.includes('FilmMerkez.FilmMerkezi'));assert(config.includes('required_version="3.0"'));assert(config.includes('version="1.0.0"'));
const native=JSON.parse(fs.readFileSync(path.join(root,'kaynak/ortak/ag/native/build-hashes.json'),'utf8'));
for(const [name,row]of Object.entries(native.files))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(app,'ortak/ag/native',name))).digest('hex'),row.sha256,name);
assert(!files.includes('ortak/tani/reliability.js'));assert(html.includes('ortak/arayuz/legal.js'));assert(!html.includes('legacy-lab'));
console.log(JSON.stringify({passed:true,files:files.length,es5FilesParsed:parsed,privateSignatures:false,nativeHashesVerified:true,realTvTest:false},null,2));
