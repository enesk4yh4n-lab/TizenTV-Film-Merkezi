'use strict';
const fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto'),assert=require('assert/strict'),{execFileSync}=require('child_process');
const root=path.resolve(__dirname,'..'),work=fs.mkdtempSync(path.join(os.tmpdir(),'film-sdk200-')),out=work;
function cli(args){return JSON.parse(execFileSync(process.execPath,[path.join(__dirname,'cli.cjs'),...args],{env:{...process.env,FILM_MERKEZI_SDK_HOME:path.join(work,'identity')},encoding:'utf8'}));}
const checks=[];try{
 const keyOut=path.join(work,'identity'),repo=path.join(work,'repo'),r=path.join(work,'r101'),p=path.join(work,'p101');
 cli(['init','--project',r,'--id','r101','--name','R101','--type','resolver']);cli(['init','--project',p,'--id','p101','--name','P101']);
 const first=cli(['pack','--project',r,'--out',repo,'--publisher','Independent SDK Test']);
 const keyFile=path.join(keyOut,fs.readdirSync(keyOut)[0]),keyBefore=crypto.createHash('sha256').update(fs.readFileSync(keyFile)).digest('hex');
 const second=cli(['pack','--project',p,'--out',repo,'--publisher','Independent SDK Test']);assert.equal(first.fingerprint,second.fingerprint);
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(keyFile)).digest('hex'),keyBefore);checks.push('independent publisher key generated outside project and reused');
 const index=JSON.parse(fs.readFileSync(path.join(repo,'filmmerkezi-repository.json')));assert.equal(index.schemaVersion,2);assert.equal(index.plugins.length,2);
 const m=JSON.parse(fs.readFileSync(path.join(repo,index.plugins.find(x=>x.id==='p101').manifest)));assert.equal(m.dependencies[0].publisher,first.fingerprint);assert.equal(m.type,'site');checks.push('SDK generates separate site/resolver projects and publisher-qualified dependency');
 const pub=crypto.createPublicKey({key:Buffer.from(index.publicKey,'base64'),type:'spki',format:'der'}),raw=fs.readFileSync(path.join(repo,'filmmerkezi-repository.json')),sig=Buffer.from(fs.readFileSync(path.join(repo,'filmmerkezi-repository.sig'),'utf8'),'base64');assert(crypto.verify('sha256',raw,pub,sig));assert(!crypto.verify('sha256',Buffer.concat([raw,Buffer.from('x')]),pub,sig));checks.push('repository signature accepted and tampered bytes rejected');
 assert(!fs.readdirSync(repo,{recursive:true}).some(n=>/\.pem$/.test(n)));checks.push('private key excluded from generated repository');
 fs.writeFileSync(path.join(out,'sdk.json'),JSON.stringify({passed:true,checks},null,2));console.log(JSON.stringify({passed:true,checks}));
}finally{fs.rmSync(work,{recursive:true,force:true});}
