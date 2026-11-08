'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async c=>{
  for(const language of ['tr','en']){
    await c.boot({language});
    await c.check(language==='tr'?'two failures show confirmation; Back keeps the engine and focus is safe':'English confirmation requires explicit OK on Switch engine',async()=>{
      await c.openPlayer({id:'test:engine-consent:'+language,sources:[{id:'one',label:'One',type:'mp4',url:c.server.url+'/__fixture/video.mp4',engineSupport:{html5:'verified',avplay:'unknown'}}]});
      await c.key(19);
      // Only the next engine-open is stubbed: this UI fixture tests the real
      // controller/dialog/key flow without pretending mock bytes are a movie.
      await c.page.evaluate(()=>{window.__engineAttempts=[];ChainApp.controller.load=function(index,position){__engineAttempts.push({index,position,engine:this.forcedEngine,desired:this.desiredPlay});this.forcedEngine=null;this.loadToken++;this.setPhase('loading');};ChainApp.controller.recover({type:'media',details:'nativePrepareFailed',message:'Fixture decoder error'});});
      await c.page.waitForFunction(()=>__engineAttempts.length===1);
      assert.equal(await c.page.evaluate(()=>__engineAttempts[0].engine),'avplay');
      assert.equal(await c.page.evaluate(()=>ChainApp.controller.dialog),null);
      await c.page.evaluate(()=>ChainApp.controller.recover({type:'media',details:'nativePrepareFailed',message:'Fixture decoder error'}));
      await c.page.waitForFunction(()=>ChainApp.controller.dialog&&ChainApp.controller.dialog.kind==='engine-switch');
      const focused=await c.focused();assert(focused.visible);assert.equal(focused.command,'answer:0');
      const message=await c.page.locator('#dialog-message').innerText();
      assert(message.includes(language==='tr'?'iki kez':'failed twice'));
      const dir=path.resolve(__dirname,'../results/engine-consent');fs.mkdirSync(dir,{recursive:true});await c.page.screenshot({path:path.join(dir,language+'.png')});
      if(language==='tr')await c.key(10009);
      else{await c.key(40);assert.equal((await c.focused()).command,'answer:1');await c.key(13);}
      await c.page.waitForFunction(()=>__engineAttempts.length===2);
      const proof=await c.page.evaluate(()=>({dialog:ChainApp.controller.dialog,attempts:__engineAttempts,switched:ChainApp.controller.engineSwitched.one}));
      assert.equal(proof.dialog,null);assert.equal(proof.attempts[1].engine,language==='tr'?'avplay':'html5');assert.equal(proof.attempts[1].desired,false);
      assert.equal(!!proof.switched,language==='en');
      await c.page.evaluate(()=>ChainApp.controller.stop('discard'));
      return {language,message,focused,proof};
    });
  }
};
if(require.main===module)require('../run').cli(['area','engine-consent',...process.argv.slice(2)]);
