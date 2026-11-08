'use strict';
const {dir,root}=require('./inventory.cjs'),fs=require('node:fs'),path=require('node:path');
const inv=require(path.join(dir,'inventory.json')),origins={},evidence=[];
function add(site,origin,source){if(!origins[site]||!/^https:\/\//.test(origin))return;origins[site].add(origin);evidence.push({site,origin,source});}
for(const s of inv.sites){origins[s.id]=new Set();add(s.id,s.base,'site-base');}
for(const r of require(path.join(dir,'captures.json')).results){if(!r.file||!/^(?:home-|case-|live-|probe-|vidara-declared-mirror)/.test(r.id))continue;const u=new URL(r.url),owner=inv.sites.find(s=>new URL(s.base).hostname===u.hostname),site=owner?owner.id:r.site;if(r.id==='case-11-embed-1')continue;add(site,u.origin,r.id+':HTTP-'+r.status);if(r.final)add(site,new URL(r.final).origin,r.id+':redirect');}
for(const r of require(path.join(root,'tools/tests/fixtures/sources/manifest.json')).rows){if(r.site==='filmizlebabam'&&/filmizlebabam\.com/.test(r.url))continue;add(r.site,new URL(r.url).origin,'historical-real-fixture:'+r.file);}
for(const n of ['probe-all-private.json','probe-new-private.json'])for(const r of require(path.join(dir,n)))for(const s of r.sources||[]){if(s.url)add(r.site,new URL(s.url).origin,r.id+':decoded-source');}
for(const n of ['all-packages.json','catalog-check.json']){const f=path.join(dir,n);if(!fs.existsSync(f))continue;const data=require(f);for(const row of data.catalog||data.rows||[])for(const origin of row.posterOrigins||[])add(row.site||row.id,origin,n+':parsed-poster');}
const media=path.join(dir,'media-check.json');if(fs.existsSync(media))for(const e of require(media).evidence||[])if(e.site)for(const o of e.origins)add(e.site,o,e.case+':media-request');
const families={
 filmmakinesi:['https://*.playmix.uno','https://*.rapidrame.com'],
 fullhdfilmizlesene:['https://rapidvid.net','https://*.imgz.me'],
 lovefilmizle:['https://*.vmpx.online','https://*.okcdn.ru','https://*.vkuser.net'],
 filmifullizle:['https://*.vmpx.online','https://*.okcdn.ru','https://*.vkuser.net'],
 filmizlebabam:['https://*.97bf1.com','https://*.pilavyerplay.top','https://*.okcdn.ru','https://*.vkuser.net'],
 dizibox:['https://*.molystream.org','https://*.vmpx.online','https://*.okcdn.ru','https://*.vkuser.net'],
 ddizi:['https://video.twimg.com','https://streambox.xyz','https://eu1.tabii.com','https://puhu-p3.mncdn.com','https://*.googlevideo.com']
};
// These are bounded CDN families already used by the existing decoders and captured fixtures.
for(const [site,list] of Object.entries(families))for(const o of list)add(site,o,'existing-decoder/recorded-family');
const result=Object.fromEntries(Object.entries(origins).map(([k,v])=>[k,[...v].sort()])),core=fs.readFileSync(path.join(root,'updates/pilot/versions/1.7.0/runtime/network-policy.txt'),'utf8').trim().split(/\r?\n/).slice(1),union=[...new Set(core.concat(inv.sites.filter(s=>!s.builtin).flatMap(s=>result[s.id])))];
if(union.length>128)throw Error('Native origin limit exceeded: '+union.length);
fs.writeFileSync(path.join(dir,'origins.json'),JSON.stringify(result,null,2));fs.writeFileSync(path.join(dir,'origin-evidence.json'),JSON.stringify({at:new Date().toISOString(),nativeLimit:128,uniqueOrigins:union.length,origins:union,evidence},null,2));console.log(JSON.stringify({uniqueOrigins:union.length,limit:128,perSite:Object.fromEntries(Object.entries(result).map(([k,v])=>[k,v.length]))}));
