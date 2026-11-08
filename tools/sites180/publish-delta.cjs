'use strict';
// Prepare only changed public allowlisted files. No network write is performed.
const {root,dir}=require('./inventory.cjs'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
cp.execFileSync(process.execPath,[path.join(__dirname,'publish-plan.cjs')],{stdio:'ignore'});
const repo='enesk4yh4n-lab/TizenTV-Film-Merkezi',api=p=>JSON.parse(cp.execFileSync('gh',['api','repos/'+repo+'/'+p],{encoding:'utf8',maxBuffer:16e6})),head=api('git/ref/heads/main').object.sha,base=api('git/commits/'+head).tree.sha,tree=api('git/trees/'+base+'?recursive=1');
if(tree.truncated)throw Error('Remote tree truncated');
const hashes=new Map(tree.tree.map(v=>[v.path,v.sha])),plan=JSON.parse(fs.readFileSync(path.join(dir,'publish-plan.json'))),all=Array.from({length:plan.chunks},(_,i)=>JSON.parse(fs.readFileSync(path.join(dir,'publish-'+i+'.json')))).flat(),blob=b=>crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex'),entries=all.filter(v=>hashes.get(v.path)!==(v.sha||blob(Buffer.from(v.content))));
fs.writeFileSync(path.join(dir,'patch-tree.json'),JSON.stringify(entries));fs.writeFileSync(path.join(dir,'patch-plan.json'),JSON.stringify({head,tree:base,files:entries.length,paths:entries.map(v=>v.path)},null,2));console.log(JSON.stringify({head,tree:base,files:entries.length,bytes:Buffer.byteLength(JSON.stringify(entries))}));
