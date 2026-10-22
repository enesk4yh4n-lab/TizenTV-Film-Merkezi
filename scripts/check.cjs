const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),acorn=require('acorn'),crypto=require('node:crypto');
const root=path.join(__dirname,'..'),app=path.join(root,'app');
for(const name of fs.readdirSync(app)){
 assert(!/\.(p12|pfx|pem|key)$/i.test(name));assert(!/^(author-signature|signature1)\.xml$/.test(name));
 if(name.endsWith('.js')&&!/^(hls-|decoder)/.test(name))acorn.parse(fs.readFileSync(path.join(app,name),'utf8'),{ecmaVersion:5});
}
const html=fs.readFileSync(path.join(app,'index.html'),'utf8');
for(const m of html.matchAll(/(?:src|href)="([^"]+)"/g))if(!m[1].startsWith('$WEBAPIS'))assert(fs.existsSync(path.join(app,m[1])),m[1]);
assert(!/harness|qa-options|10\.0\.2\.2/.test(html));
const config=fs.readFileSync(path.join(app,'config.xml'),'utf8');assert(!/<author[^>]*\bemail\s*=/.test(config));assert(config.includes('HdfTVShare.App'));assert(config.includes('required_version="3.0"'));
assert(!fs.readFileSync(path.join(app,'app-info.js'),'utf8').includes('email:'));
for(const name of ['catalog-app.js','player-view.js'])assert(!fs.readFileSync(path.join(app,name),'utf8').includes('AppInfo.email'));
assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(app,'hls-1.7.3.min.js'))).digest('hex').toUpperCase(),'A12E7EE1CD64A69DCDB314157E45DAFCBA705BFB0B1440B7935CB265D374423E');
const decoder=fs.readFileSync(path.join(app,'decoder.js'),'utf8');for(const name of ['utils','catalog','player'])assert(decoder.includes(fs.readFileSync(path.join(root,'vendor/decoder',name+'.js'),'utf8')));
assert(fs.readFileSync(path.join(app,'THIRD_PARTY_NOTICES.md'),'utf8').includes('2024 enXov'));
console.log('PASS ES5, assets, public identity, licenses, decoder source identity and original hls.js digest');
