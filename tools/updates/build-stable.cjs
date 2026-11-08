'use strict';
// Promote the proven runtime to the normal update feed without altering old releases.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),os=require('node:os'),assert=require('node:assert/strict'),acorn=require('acorn');
const root=path.resolve(__dirname,'../..'),feed=path.join(root,'updates'),legacy=path.join(feed,'pilot'),canonical=path.join(__dirname,'stable'),out=path.join(root,'tools/test-results/stable150'),stage=path.join(out,'stage'),app='1.5.0',component='1.9.0';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),write=(f,b)=>{fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,b);};
// Reuse the existing signing identity. The directory name is historical, not a channel.
const key=crypto.createPrivateKey(fs.readFileSync(path.join(os.homedir(),'.film-merkezi-updates/pilot/signing-key.pem'))),sign=b=>crypto.sign('sha256',Buffer.from(b),key).toString('base64')+'\n';
for(const version of fs.readdirSync(path.join(legacy,'versions'))){const src=path.join(legacy,'versions',version),dest=path.join(feed,'versions',version);if(!fs.statSync(src).isDirectory())continue;fs.cpSync(src,dest,{recursive:true,errorOnExist:false,force:false});const m=JSON.parse(fs.readFileSync(path.join(src,'manifest.json')));for(const f of m.files)assert.equal(hash(fs.readFileSync(path.join(dest,'runtime',f.path))),f.sha256);assert.equal(hash(fs.readFileSync(path.join(src,'manifest.json'))),hash(fs.readFileSync(path.join(dest,'manifest.json'))));}
const previous=JSON.parse(fs.readFileSync(path.join(feed,'versions/1.8.0/manifest.json'))),files=new Map(previous.files.map(f=>[f.path,fs.readFileSync(path.join(feed,'versions/1.8.0/runtime',f.path))]));
const draft=process.argv.includes('--replace-draft');if(draft&&fs.existsSync(path.join(out,'published.json')))throw Error('Published component is immutable');
for(const name of files.keys())if(name.startsWith('siteler/')){
  files.delete(name);
  // Only known generated files of this unpublished draft are removed.
  for(const generated of [path.join(stage,name),path.join(feed,'versions',component,'runtime',name)])if(fs.existsSync(generated)&&draft)fs.unlinkSync(generated);
}
files.set(previous.sites,Buffer.from(JSON.stringify({schemaVersion:1,sites:[]},null,2)+'\n'));
const settings=files.get('ortak/katalog/catalog-settings.js').toString();files.set('ortak/katalog/catalog-settings.js',Buffer.from(settings.replace(/^.*if \(root\.SiteAddresses\) panel\('tools-addresses'.*\r?\n/m,'')));
for(const name of ['ortak/katalog/update-coordinator.js','ortak/katalog/management-panel.js','ortak/katalog/site-payload.js'])files.set(name,fs.readFileSync(path.join(root,'deneme',name)));
let network=files.get('ortak/ag/network.js').toString();assert(network.includes('error.byteLimitExceeded || error.cancelled ||'));
network=network.replace('error.byteLimitExceeded || error.cancelled ||','error.stage === \'http\' || error.stage === \'access\' || error.byteLimitExceeded || error.cancelled ||');files.set('ortak/ag/network.js',Buffer.from(network));
const scripts=previous.scripts.slice();scripts.splice(scripts.indexOf('main.js'),0,'ortak/katalog/update-coordinator.js');
let registry=files.get('site-listesi.js').toString();registry=registry.replace("        var panel = document.getElementById('site-selection');","        if (root.FilmSiteSetup) { root.FilmPlugins.registryFinished([]).then(function (restart) { if (restart) root.location.reload(); else root.FilmSiteSetup.open(root.FilmPlugins, root.FilmUpdate); }); return; }\n        var panel = document.getElementById('site-selection');");files.set('site-listesi.js',Buffer.from(registry));
files.set('app-info.js',Buffer.from(files.get('app-info.js').toString().replace("version: '1.4.1'","version: '1.5.0'")));
files.set('runtime-shell.html',Buffer.from(files.get('runtime-shell.html').toString().replace('v1.4.1','v1.5.0')));
files.set('main.js',Buffer.from(files.get('main.js').toString().replace('Site adresleri güncellendi. Seçenekler’den uygulayabilirsiniz.','Site adresleri güncellendi; sonraki açılışta uygulanacak.')));
files.set('THIRD_PARTY_NOTICES.md',Buffer.from(files.get('THIRD_PARTY_NOTICES.md').toString()+'\n\n## Film Merkezi 1.5.0 corresponding sources\n\nThe normal update loader, verified native TLS module, unchanged Mozilla CA input and decoder production sources are available at https://github.com/enesk4yh4n-lab/TizenTV-Film-Merkezi/raw/main/updates/sources/Film-Merkezi-Kaynak-1.5.0.zip . Native notices and all upstream license texts remain in this WGT. Site providers are separate signed online packages; their source is published alongside each site package. No private keys are included.\n'));
const manifest={...previous,scripts,version:component,minAppVersion:app,files:[...files].map(([n,b])=>({path:n,size:b.length,sha256:hash(b)}))},text=JSON.stringify(manifest,null,2)+'\n',versionDir=path.join(feed,'versions',component);
if(fs.existsSync(path.join(versionDir,'manifest.json'))&&!draft)assert.equal(fs.readFileSync(path.join(versionDir,'manifest.json'),'utf8'),text,'Published component versions are immutable');
for(const[n,b]of files){write(path.join(versionDir,'runtime',n),b);write(path.join(stage,n),b);}
write(path.join(versionDir,'manifest.json'),text);write(path.join(versionDir,'manifest.sig'),sign(text));
write(path.join(versionDir,'release-notes.json'),JSON.stringify({tr:'Film Merkezi normal uygulama adı ve updates güncelleme kanalı. WGT 1.5.0 gerekir; mevcut kimlik ve kayıt kapsamı korunur.',en:'Film Merkezi application name and normal updates channel. Requires WGT 1.5.0; existing application identity and storage scopes are preserved.'},null,2)+'\n');
const oldPointer=JSON.parse(fs.readFileSync(path.join(legacy,'update.json'))),existing=fs.existsSync(path.join(feed,'update.json'))?JSON.parse(fs.readFileSync(path.join(feed,'update.json'))):null;
const pointer={schemaVersion:1,channel:'stable',revision:existing&&existing.updateVersion===component?existing.revision:Math.max(oldPointer.revision,existing&&existing.revision||0)+1,updateVersion:component,minAppVersion:app,manifest:'versions/'+component+'/manifest.json',manifestSha256:hash(text)},pointerText=JSON.stringify(pointer,null,2)+'\n';
if(existing&&existing.updateVersion===component&&!draft)assert.equal(fs.readFileSync(path.join(feed,'update.json'),'utf8'),pointerText,'Same pointer revision cannot change');
write(path.join(feed,'update.json'),pointerText);write(path.join(feed,'update.sig'),sign(pointerText));
const names=[...files.keys(),'config.xml','index.html','bundled/manifest.json','bundled/manifest.sig'];
for(const n of fs.readdirSync(canonical).filter(n=>n.endsWith('.js')||n==='SOURCE_NOTICE.txt')){const dest='bootstrap/'+n;write(path.join(stage,dest),fs.readFileSync(path.join(canonical,n)));names.push(dest);}
for(const n of ['config.xml','index.html'])write(path.join(stage,n),fs.readFileSync(path.join(canonical,n)));
for(const n of JSON.parse(fs.readFileSync(path.join(canonical,'asset-files.json')))){const binary=/^ortak\/ag\/native\/(https-.*\.nexe|secure-http\.nmf)$/.test(n),src=binary?path.join(out,'native',path.basename(n)):path.join(root,'deneme',n);write(path.join(stage,n),fs.readFileSync(src));names.push(n);}
write(path.join(stage,'bundled/manifest.json'),text);write(path.join(stage,'bundled/manifest.sig'),sign(text));
// Ship the latest signed site packages as the offline baseline. They remain
// normal removable/updatable plugins, not hard-coded registry providers.
const siteRoot=path.join(root,'addons/sites'),repoText=fs.readFileSync(path.join(siteRoot,'repository.json')),repo=JSON.parse(repoText);
for(const n of ['repository.json','repository.sig']){const dest='bundled/sites/'+n;write(path.join(stage,dest),fs.readFileSync(path.join(siteRoot,n)));names.push(dest);}
for(const p of repo.plugins){const m=JSON.parse(fs.readFileSync(path.join(siteRoot,p.manifest)));for(const n of [p.manifest,p.manifest.replace(/manifest\.json$/,'manifest.sig'),...m.files.map(f=>p.manifest.replace(/manifest\.json$/,'runtime/')+f.path)]){const dest='bundled/sites/'+n;write(path.join(stage,dest),fs.readFileSync(path.join(siteRoot,n)));names.push(dest);}}
const list=[...new Set(names)].sort();write(path.join(out,'package-files.json'),JSON.stringify(list,null,2)+'\n');
// SDK project metadata is derived from the existing generated project.
let yaml=fs.readFileSync(path.join(canonical,'tizen_web_project.yaml'),'utf8');yaml=yaml.replace(/^files:\n[\s\S]*?(?=^excludes:)/m,'files:\n'+list.map(n=>'  - '+n).join('\n')+'\n');write(path.join(stage,'tizen_web_project.yaml'),yaml);
for(const n of list.filter(n=>n.endsWith('.js')&&!n.startsWith('vendor/')&&!n.endsWith('youtube-extractor.js')))acorn.parse(fs.readFileSync(path.join(stage,n),'utf8'),{ecmaVersion:5});
const config=JSON.parse(fs.readFileSync(path.join(canonical,'config.js'),'utf8').replace(/^window.FilmUpdateConfig = /,'').replace(/;\s*$/,''));assert.equal(config.publicKey,crypto.createPublicKey(key).export({type:'spki',format:'der'}).toString('base64'));
const report={application:app,component,stage,channel:config.channel,identity:'FMUpTest01.FilmMerkezi',displayName:'Film Merkezi',files:list.length,previousChannelUnchanged:true,native:JSON.parse(fs.readFileSync(path.join(out,'native/build-hashes.json'))),manifestSha256:hash(text)};write(path.join(out,'build.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({application:app,component,stage,files:list.length,channel:config.channel}));
