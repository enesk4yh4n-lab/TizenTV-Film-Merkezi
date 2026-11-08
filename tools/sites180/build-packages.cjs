'use strict';
const {definitions,root,dir}=require('./inventory.cjs'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),os=require('node:os');
const projects=path.join(root,'kaynak/site-eklentileri'),out=path.join(root,'addons/sites'),key=path.join(os.homedir(),'.film-merkezi-updates/sites/author.pem'),draft=process.argv.includes('--rebuild-draft'),versionArg=process.argv.find(s=>s.startsWith('--version=')),version=versionArg?versionArg.slice(10):'1.0.0',selected=process.argv.slice(2).filter(s=>!s.startsWith('--')),only=selected.length?definitions.filter(s=>selected.includes(s.id)):definitions.filter(s=>!s.builtin);
if(!/^\d+\.\d+\.\d+$/.test(version))throw Error('Invalid plugin version');
const includeCore=process.argv.includes('--include-core-sites');
if(draft&&fs.existsSync(path.join(dir,'published.json')))throw Error('Published versions are immutable. Bump plugin version instead.');
if(!fs.existsSync(key))cp.execFileSync(process.execPath,[path.join(root,'tools/plugins/cli.cjs'),'keygen','--out',key],{stdio:'ignore'});
const extra={filmizlebabam:['https://pilavyerplay.top','https://*.pilavyerplay.top','https://vidara.to','https://gasobni.com','https://*.97bf1.com','https://ok.ru','https://*.okcdn.ru']};
for(const s of only){if(s.builtin&&!includeCore)continue;const project=path.join(projects,s.id),source=path.join(root,'deneme/siteler',s.folder);fs.mkdirSync(project,{recursive:true});const ordered=JSON.parse(fs.readFileSync(path.join(root,'tools/runtime-manifest.json'))).filter(n=>n.startsWith('siteler/'+s.folder+'/')&&n.endsWith('.js'));
 // The actual registration order is authoritative, not alphabetical directory order.
 const registry=fs.readFileSync(path.join(root,'deneme/site-listesi.js'),'utf8'),block=registry.match(new RegExp('\\[\\s*([\\s\\S]*?siteler/'+s.folder+'/site\\.js[\\s\\S]*?)\\]','g'))||[];let names=[];
 for(const b of block){const found=[...b.matchAll(/'([^']+\.js)'/g)].map(m=>m[1]).filter(n=>n.startsWith('siteler/'+s.folder+'/'));if(found.length)names=found;}
 if(!names.length)names=ordered;if(!names.length&&fs.existsSync(path.join(source,'site.js')))names=['siteler/'+s.folder+'/site.js'];if(!names.length)throw Error('No module sources: '+s.id);
 const needs190=['diziyou','diziboxum'].includes(s.id)&&version!=='1.0.0',coreVersion=needs190?'1.9.0':'1.8.0';
 let code="/* Generated from canonical site sources; edit deneme/siteler, then rebuild. */\n(function(shared){'use strict';if(!shared.SitePluginRuntime)throw Error('Update core component to "+coreVersion+" before installing this site.');var context=shared.FilmPlugins.context(),window=shared.SitePluginRuntime.scope(context,'"+coreVersion+"');\n";
 for(const n of names)code+='\n/* '+n+' */\n'+fs.readFileSync(path.join(root,'deneme',n),'utf8').replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n')+'\n';code+='\n})(window);\n';
 fs.writeFileSync(path.join(project,'site.js'),code);fs.copyFileSync(path.join(root,'deneme/LICENSE'),path.join(project,'LICENSE.txt'));
 const meta={id:s.id,name:s.name,description:s.name+' katalog ve kaynak eklentisi. Film Merkezi çekirdek '+coreVersion+' gerektirir.',version,minAppVersion:s.builtin||needs190?'1.5.0':'1.4.1',site:{id:s.id,prefix:s.id+':',name:s.name,base:s.base},modules:['site.js'],files:['site.js','LICENSE.txt'],origins:[s.base,...(extra[s.id]||[])]};
 if(s.id==='hdf')meta.origins.push('https://hdfilmcehennemi.mobi','https://*.cdnimages{n}.cyou');
 if(s.id==='filmizle')meta.origins=meta.origins.concat(fs.readFileSync(path.join(root,'updates/versions/1.8.0/runtime/network-policy.txt'),'utf8').trim().split(/\r?\n/).slice(1).filter(o=>!/hdfilmcehennemi|cdnimages/.test(o)));
 const originsFile=path.join(dir,'origins.json');if(fs.existsSync(originsFile)){const origins=JSON.parse(fs.readFileSync(originsFile));meta.origins=[...new Set(meta.origins.concat(origins[s.id]||[]))];}
 fs.writeFileSync(path.join(project,'addon.json'),JSON.stringify(meta,null,2)+'\n');if(draft){const m=path.join(out,'packages',s.id,version,'manifest.json');if(fs.existsSync(m))fs.unlinkSync(m);}cp.execFileSync(process.execPath,[path.join(root,'tools/plugins/cli.cjs'),'pack','--project',project,'--out',out,'--key',key,'--publisher','Film Merkezi Siteleri','--repository-id','film-merkezi-sites'],{stdio:'inherit'});
}
