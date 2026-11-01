/* Isolated first-launch UI only; this fixture server is never used by the TV app. */
'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict'),{chromium}=require('playwright');
(async()=>{
 const app=path.resolve(__dirname,'../app'),errors=[];
 const server=http.createServer((req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname;
  if(name.includes('$WEBAPIS')){res.setHeader('Content-Type','application/javascript');return res.end('/* TV API unavailable on desktop. */');}
  if(name==='/favicon.ico'){res.writeHead(204);return res.end();}
  const file=path.resolve(app,name==='/'?'index.html':name.slice(1));
  if(!file.startsWith(app+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1920,height:1080}});
 page.on('pageerror',e=>errors.push(e.message));await page.route('https://**/*',r=>r.abort());
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 try{
  await page.goto(url);await page.locator('[data-legal=setup-next]').waitFor();
  assert.match(await page.locator('.catalog-brand').innerText(),/Film Merkezi.*v1\.1\.7/);
  await page.locator('[data-legal=setup-language-en]').focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('#legal-title').innerText(),'Welcome to Film Merkezi');
  await page.locator('[data-legal=setup-merge-off]').focus();await page.keyboard.press('Enter');
  await page.locator('[data-legal=setup-next]').focus();await page.keyboard.press('Enter');
  await page.locator('[data-legal=accept]').waitFor();
  assert.equal(await page.evaluate(()=>!!window.ChainApp),false);
  assert.equal(await page.locator(':focus').getAttribute('data-legal'),'accept');
  await page.keyboard.press('ArrowRight');assert.equal(await page.locator(':focus').getAttribute('data-legal'),'exit');
  await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>localStorage.getItem(FilmLegal.key)),null);
  await page.evaluate(()=>{FilmLegal.showCredits();});await page.locator('[data-legal=credit-0]').waitFor();
  assert.match(await page.locator('#legal-card').innerText(),/Apache-2.0/);
  await page.close();assert.equal(errors.length,0,errors.join('\n'));
  console.log('PASS public first-launch gate, remote focus, declined consent and local credits; no live TV playback test');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
