/* One opt-in update intent. No report history; only resumable in-flight work. */
(function(root){
 'use strict';
 var KEY='filmmerkezi.update.intent.v1',S=root.FilmPluginSchema,MAX_PACKAGES=S.maxPackages||64;
 function copy(v){return JSON.parse(JSON.stringify(v));}
 function validPins(pins){return Array.isArray(pins)&&pins.length<=MAX_PACKAGES&&pins.every(function(p){return p&&typeof p.repoId==='string'&&p.key===p.repoId+'/'+p.id&&/^[pr]\d{3}$/.test(p.id)&&/^[a-f0-9]{64}$/.test(p.publisher)&&/^[a-f0-9]{64}$/.test(p.hash)&&/^\d+\.\d+\.\d+$/.test(p.version);});}
 function validJob(v){
  if(!v||v.version!==1||!Array.isArray(v.items)||v.items.length>MAX_PACKAGES||!validPins(v.pins)||['core','core-restart','items','interrupted','failed','site-restart'].indexOf(v.phase)<0)return false;
  if(v.setupAll!==undefined&&typeof v.setupAll!=='boolean')return false;
  if(v.capacitySkipped&&(!Array.isArray(v.capacitySkipped)||v.capacitySkipped.length>MAX_PACKAGES||!v.capacitySkipped.every(function(key){return typeof key==='string'&&key.length<512;})))return false;
  if(typeof v.core!=='string'||typeof v.coreHash!=='string'||(v.core&&!/^\d+\.\d+\.\d+$/.test(v.core))||(v.core&&!/^[a-f0-9]{64}$/.test(v.coreHash)))return false;
  var seen={};return v.items.every(function(i){if(!i||typeof i.repoId!=='string'||!i.repoId||!/^([pr])\d{3}$/.test(i.id)||i.key!==i.repoId+'/'+i.id||seen[i.key]||['queued','running','ready','failed'].indexOf(i.status)<0||i.pins!==undefined&&(!v.setupAll||!validPins(i.pins)))return false;seen[i.key]=true;return true;});
 }
 function t(a,b){return root.FilmI18n&&root.FilmI18n.language()==='en'?b:a;}
 function limitNotice(error){
  if(error&&error.cancelled)return null;var message=String(error&&error.message||error||''),kind=error&&error.budgetKind||'';
  if(/Network origin budget exceeded|Ağ izin sınırı aşılıyor/i.test(message))kind='origins';
  else if(/\d+ package limit/i.test(message))kind='packages';
  else if(/\d+(?:\.\d+)?\s*MiB.*(?:eklenti|plugin)|(?:eklenti|plugin).*\d+\s*MiB|Not enough free space to install/i.test(message))kind='storage';
  if(!kind)return null;
  var titles={origins:t('Yeni eklenti için ağ izin sınırına ulaşıldı.','The network permission limit for new plugins has been reached.'),packages:t('Kurulabilecek paket sayısı sınırına ulaşıldı.','The installed package count limit has been reached.'),storage:t('Eklenti depolama alanı dolu.','Plugin storage is full.')};
  return {kind:kind,title:titles[kind],message:t('Bu eklentiyi yüklemek için kullanmadığınız eklentileri kaldırın. Yeterli yer açtıktan sonra tekrar deneyin. Mevcut kurulum korunuyor; hiçbir eklenti kendiliğinden silinmez.','Remove unused plugins to install this plugin, then try again once enough capacity is available. Your current installation is preserved; no plugins are removed automatically.')};
 }
 function Workflow(app){this.app=app;this.manager=app.siteManagement;this.plugins=root.FilmPlugins;this.core=root.FilmUpdate;this.running=false;this.cancelled=false;this.job=null;this.notify=function(){};this.storage=app.catalog.storage;this.readOnly=false;try{var raw=this.storage.getItem(KEY);if(raw){var v=JSON.parse(raw);if(!validJob(v))throw Error('Invalid update intent');this.job=v;}}catch(e){this.readOnly=true;this.notice=t('Önceki toplu işlem kaydı okunamadı; otomatik devam kapalı.','Previous batch record could not be read; automatic resume is disabled.');}}
 Workflow.prototype.save=function(){if(this.readOnly)throw Error(t('Toplu işlem kaydı kullanılamıyor.','Batch storage is unavailable.'));if(this.job)this.storage.setItem(KEY,JSON.stringify(this.job));else this.storage.removeItem(KEY);};
 Workflow.prototype.dismiss=function(){
  var self=this,old=this.job;
  this.job=null;
  try{this.save();}catch(error){this.job=old;return Promise.reject(error);}
  return self.plugins.discardDownload?self.plugins.discardDownload():Promise.resolve();
 };
 Workflow.prototype.draw=function(){try{this.notify(this);}catch(ignore){}};
 Workflow.prototype.loadCoreNotes=function(){
  var self=this,job=this.job,hash=job&&job.coreHash;if(!job||job.phase!=='core-restart'||!root.FilmCoreReleaseNotes)return Promise.resolve(null);
  if(this.coreNotesHash===hash)return Promise.resolve(this.coreNotes);if(this.coreNotesTask&&this.coreNotesTaskHash===hash)return this.coreNotesTask;
  this.coreNotesTaskHash=hash;
  this.coreNotesTask=root.FilmCoreReleaseNotes.read(this.core,hash).then(function(value){if(self.job===job&&job.coreHash===hash){self.coreNotes=value;self.coreNotesHash=hash;self.draw();}return value;},function(error){if(self.job===job){self.coreNotes=root.FilmCoreReleaseNotes.parse(null);self.coreNotesHash=hash;self.notice=error.message;self.draw();}return null;});return this.coreNotesTask;
 };
 Workflow.prototype.check=function(){if(this.cancelled||this.app.controller.content){var e=Error(t('Güncelleme iptal edildi.','Update cancelled.'));e.cancelled=true;throw e;}};
 Workflow.prototype.groups=function(){
  var m=this.manager,groups=m.packageGroups(),all=m.rows().filter(function(r){return !r.builtin;}),records=this.plugins.state.plugins,repos=this.plugins.state.repositories,updates={},attached={},self=this;
  groups.updates.forEach(function(r){updates[r.key]=r;});
  var installed=all.filter(function(r){return r.packageType==='site';}).map(function(row){var members=[row.key],p=records[row.key];(p.dependencies||[]).forEach(function(d){all.forEach(function(r){var repo=repos[r.repoId];if(r.packageType==='resolver'&&r.pluginId===d.id&&repo&&repo.fingerprint===d.publisher){members.push(r.key);attached[r.key]=true;}});});var changed=members.filter(function(k){return !!updates[k];});return {key:row.key,name:row.name,repoId:row.repoId,pluginId:row.pluginId,version:row.version,pending:row.pending,enabled:row.enabled,members:members,updateKeys:changed,row:row};});
  var loose=all.filter(function(r){return r.packageType==='resolver'&&!attached[r.key];});if(loose.length)installed.push({key:'components',name:t('Ortak bileşenler','Shared components'),members:loose.map(function(r){return r.key;}),updateKeys:loose.filter(function(r){return updates[r.key];}).map(function(r){return r.key;})});
  var known={},fresh=[];groups.newSites.forEach(function(r){var repo=repos[r.repoId],id=repo.fingerprint+'/'+r.pluginId;if(known[id]||all.some(function(p){return p.pluginId===r.pluginId&&repos[p.repoId]&&repos[p.repoId].fingerprint===repo.fingerprint;}))return;known[id]=true;fresh.push({key:r.key,name:r.name,repoId:r.repoId,pluginId:r.pluginId,version:r.available,members:[r.key],updateKeys:[r.key],row:r});});
  return {installed:installed,requirements:groups.requirements||[],updates:installed.filter(function(r){return r.updateKeys.length;}),newSites:fresh,checkedAt:groups.checkedAt};
 };
 Workflow.prototype.pins=function(plan){var records=this.plugins.state.plugins;return plan.map(function(c){var record=records[c.key];return {key:c.key,publisher:c.publisher,repoId:c.repo.id,id:c.manifest.id,version:c.manifest.version,hash:c.item?c.item.manifestSha256:(record.pending||record.active).hash};});};
 Workflow.prototype.prepare=function(keys,includeCore,install){
  var self=this;if(this.running||this.plugins.busy||this.core.busy||this.app.controller.content)return Promise.reject(Error(t('Önce mevcut işlemi tamamlayın.','Finish the current operation first.')));
  if(this.readOnly)return Promise.reject(Error(t('Toplu işlem kaydı kullanılamıyor.','Batch storage unavailable.')));
  var setupAll=install==='setup-all',groups=this.groups(),rows=setupAll||install==='mixed'?groups.updates.concat(groups.newSites):install?groups.newSites:groups.updates,requested=[],seen={},repos=this.plugins.state.repositories;
  keys.forEach(function(key){var group=rows.filter(function(r){return r.key===key;})[0];if(!group)throw Error('Package selection changed');group.updateKeys.forEach(function(k){if(seen[k])return;seen[k]=true;var slash=k.lastIndexOf('/'),repoId=k.slice(0,slash),id=k.slice(slash+1),repo=repos[repoId];if(!repo||!repo.enabled)throw Error('Repository disabled');requested.push({key:k,repoId:repoId,id:id,name:group.name});});});
  var found=includeCore&&this.core.found,target=found&&found.updateVersion||'',old=this.job,unplanned={};
  if(!requested.length&&!target)return Promise.reject(Error(t('Güncelleme bulunmadı.','No updates available.')));
  this.progress=null;this.running=true;this.cancelled=false;this.draw();
  return Promise.resolve().then(function(){self.check();return requested.length&&!setupAll?self.plugins.installationPlan(requested[0].repoId,requested[0].id,function(){self.check();},{requests:requested,coreVersion:target||self.core.status().current}):[];}).catch(function(error){self.check();if(self.plugins.selectInstallation)throw error;var chain=Promise.resolve(),plans=[];requested.forEach(function(item){chain=chain.then(function(){return self.plugins.installationPlan(item.repoId,item.id,function(){self.check();},{coreVersion:target||self.core.status().current}).then(function(rows){rows.forEach(function(c){if(!plans.some(function(v){return v.key===c.key&&v.manifest.version===c.manifest.version;}))plans.push(c);});},function(e){self.check();unplanned[item.key]=e.message;});});});return chain.then(function(){return plans;});}).then(function(plan){
   self.check();var panel=self.app.catalog.panel;if(!setupAll){if(panel&&panel.capacity&&panel.capacity.evaluate(keys).remaining<0)throw Error('Network origin budget exceeded');if(self.plugins.checkPackageLimit)self.plugins.checkPackageLimit(plan);}var pins=self.pins(plan);
   // Connected roots share one transaction so a shared dependency cannot be half-updated.
   var items=requested.map(function(r){return {key:r.key,repoId:r.repoId,id:r.id,name:r.name,status:unplanned[r.key]?'failed':'queued',unplanned:!!unplanned[r.key],message:unplanned[r.key]||''};});
   self.job={version:1,phase:target?'core':'items',core:target,coreHash:found&&found.manifestSha256||'',channel:self.core.config.channel,createdAt:Date.now(),pins:pins,items:items,modal:!!(self.app.catalog.panel&&self.app.catalog.panel.kind==='update-center')};if(setupAll)self.job.setupAll=true;self.save();self.running=false;self.draw();return self.job;
  }).catch(function(e){self.job=old;self.running=false;self.draw();throw e;});
 };
 Workflow.prototype.cancel=function(){this.cancelled=true;if(this.running){this.core.cancel();this.plugins.cancel();}if(this.job){this.job.phase='interrupted';this.job.items.forEach(function(i){if(i.status==='running')i.status='queued';});try{this.save();}catch(e){this.notice=e.message;}}this.draw();};
 Workflow.prototype.run=function(){
  var self=this,job=this.job;if(!job||this.running)return Promise.resolve();if(job.core&&S.compare(this.core.status().current,job.core)<0)job.phase='core';var packageProgress={},downloaded=0,reused=0,lastDownloaded=0,lastReused=0;this.progress=null;this.notice='';this.running=true;this.cancelled=false;this.draw();
  function changed(){self.save();self.draw();}
  function items(){
   self.check();job.phase='items';changed();var pending=job.items.filter(function(i){return i.status!=='ready'&&!i.unplanned;});
   if(!pending.length)return Promise.resolve();
   function progress(id,detail){job.current=id;if(detail){if(detail.stage==='planning'&&!detail.packages.length){lastDownloaded=0;lastReused=0;}downloaded+=Math.max(0,(detail.downloaded||0)-lastDownloaded);reused+=Math.max(0,(detail.reused||0)-lastReused);lastDownloaded=detail.downloaded||0;lastReused=detail.reused||0;(detail.packages||[]).forEach(function(row){var key=row.key||row.id;if(!packageProgress[key]||row.stage!=='waiting'){var prior=packageProgress[key],next=copy(row);if(prior){next.bytes=Math.max(prior.bytes||0,next.bytes||0);next.installed=Math.max(prior.installed||0,next.installed||0);if(prior.stage==='ready')next.stage='ready';}packageProgress[key]=next;}});var all=Object.keys(packageProgress).map(function(key){return packageProgress[key];});self.progress=copy(detail);self.progress.packages=all;self.progress.downloaded=downloaded;self.progress.reused=reused;self.progress.total=0;self.progress.processed=0;self.progress.installed=0;self.progress.installTotal=0;all.forEach(function(row){self.progress.total+=row.total||0;self.progress.processed+=row.bytes||0;self.progress.installed+=row.installed||0;self.progress.installTotal+=row.installTotal||0;});}var now=Date.now();if(!self.progressDrawAt||now-self.progressDrawAt>=150||!detail||detail.stage!=='downloading'){self.progressDrawAt=now;self.draw();}}
   if(job.setupAll){
    // Plan each site inside the real download. Installed dependencies keep their normal constraints.
    return pending.reduce(function(chain,item){return chain.then(function(){
     self.check();item.status='running';item.message='';if(self.progress)self.progress.setupFraction=0;changed();
     return self.plugins.download(item.repoId,item.id,{approved:item.pins||null,onPlan:function(rows){
      self.check();item.pins=self.pins(rows);self.save();
     },onProgress:function(id,detail){
      if(detail)detail.setupFraction=((detail.total?detail.processed/detail.total:0)+(detail.installTotal?detail.installed/detail.installTotal:0))/2;
      progress(id,detail);
     }}).then(function(){
      item.pins.forEach(function(pin){job.pins=job.pins.filter(function(prior){return prior.key!==pin.key;});job.pins.push(pin);});
      delete item.pins;item.status='ready';
     },function(error){if(error.cancelled||self.cancelled)throw error;item.status='failed';item.message=String(error.message||error).slice(0,240);}).then(changed);
    });},Promise.resolve());
   }
   // All requested roots are planned together; retrying uses immutable approved pins.
   pending.forEach(function(i){i.status='running';});changed();
   return self.plugins.download(pending[0].repoId,pending[0].id,{requests:pending,approved:job.pins,onProgress:progress}).then(function(){pending.forEach(function(i){i.status='ready';});changed();},function(error){
    if(error.cancelled||self.cancelled)throw error;
    // A dependency conflict cannot be bypassed. Independent roots can still succeed.
    if(self.plugins.selectInstallation)throw error;
    var sequence=Promise.resolve();pending.forEach(function(item){sequence=sequence.then(function(){self.check();item.status='running';changed();return self.plugins.download(item.repoId,item.id,{approved:job.pins,onProgress:progress}).then(function(){item.status='ready';},function(e){if(self.cancelled||e.cancelled)throw e;item.status='failed';item.message=String(e.message||e).slice(0,240);}).then(changed);});});return sequence;
   });
  }
  var task=Promise.resolve().then(function(){self.check();if(job.phase!=='core')return;if(!self.core.found||self.core.found.updateVersion!==job.core||self.core.found.manifestSha256!==job.coreHash)throw Error(t('Çekirdek seçimi değişti; yeniden kontrol edin.','Core selection changed; check again.'));return self.core.download().then(function(){self.check();if(!self.core.state.pending||JSON.parse(self.core.state.pending.text).version!==job.core)throw Error('Core version mismatch');job.phase='core-restart';changed();});}).then(function(){if(job.phase==='core-restart')return;return items().then(function(){self.check();if(job.items.some(function(i){return i.status==='failed';})){job.phase='failed';self.running=false;changed();return;}job.phase='site-restart';changed();});});
  return task.then(function(){self.running=false;self.draw();},function(e){self.running=false;if(self.cancelled){job.phase='interrupted';job.items.forEach(function(i){if(i.status==='running')i.status='queued';});}else{job.phase='failed';self.notice=e.message;}try{changed();}catch(storageError){self.notice=storageError.message;}self.draw();});
 };
 Workflow.prototype.restart=function(){
  var self=this,job=this.job;if(!job||this.running||this.restarting||this.plugins.busy||this.core.busy||this.app.controller.content||['core-restart','site-restart'].indexOf(job.phase)<0)return Promise.resolve(false);
  this.restarting=true;this.notice='';this.draw();
  return Promise.resolve().then(function(){if(job.phase!=='core-restart'||self.core.status().current===job.core)return;var pending=self.core.state.pending;if(!pending||JSON.parse(pending.text).version!==job.core)throw Error('Core pending version changed');return root.FilmUpdateVerify.sha(pending.text).then(function(hash){if(hash!==job.coreHash)throw Error('Core digest changed');return self.core.apply();});}).then(function(){if(self.app.controller.content)throw Error(t('Önce oynatıcıdan çıkın.','Close the player first.'));self.save();if(self.app.catalog.hub)self.app.catalog.hub.flush();root.location.reload();return true;}).catch(function(e){self.notice=e.message;self.restarting=false;self.draw();return false;});
 };
 Workflow.prototype.resume=function(){
  var self=this,job=this.job;if(!job)return false;
  if(job.phase==='site-restart'){var pending=job.pins.some(function(pin){var p=self.plugins.state.plugins[pin.key];return p&&p.enabled&&p.pending&&p.pending.hash===pin.hash;});if(pending)return false;var ok=job.pins.every(function(pin){var p=self.plugins.state.plugins[pin.key],v=p&&(p.enabled?p.active:p.pending||p.active);return p&&v&&v.hash===pin.hash&&v.version===pin.version&&!p.error;});if(!ok){job.phase='failed';this.notice=t('Paketlerin etkinleşmesi tamamlanamadı; ayrıntıları kontrol edin.','Packages did not activate successfully; check details.');this.save();return false;}this.coreCompleted=!!job.core;this.job=null;try{this.save();this.notice=t('Güncellemeler tamamlandı.','Updates completed.');}catch(e){this.notice=e.message;}return false;}
  if(job.phase!=='core-restart')return false;
  if(this.core.status().current!==job.core&&this.core.state.pending&&JSON.parse(this.core.state.pending.text).version===job.core)return false;
  if(this.core.status().current!==job.core||!this.core.state.active||!this.core.healthy){this.notice=t('Çekirdek geçişi doğrulanamadı; site güncellemeleri başlatılmadı.','Core transition was not verified; site updates were not started.');job.phase='failed';this.save();return false;}
  return root.FilmUpdateVerify.sha(this.core.state.active.text).then(function(hash){if(hash!==job.coreHash)throw Error('Core digest changed');if(!job.items.length){self.job=null;self.coreCompleted=true;self.save();return false;}job.phase='items';self.save();if(!self.app.catalog.panel&&!self.app.controller.content&&root.FilmUpdateCoordinator&&root.FilmUpdateCoordinator.current){if(job.modal){self.app.catalog.panel={kind:'update-center',onboarding:true,returnKey:'catalog-tools'};self.app.catalog.renderPanel();}else root.FilmUpdateCoordinator.current.offer();}return self.run();}).catch(function(e){job.phase='failed';self.notice=e.message;self.save();self.draw();});
 };
 root.FilmUpdateWorkflow=Workflow;
 root.FilmUpdateWorkflow.limitNotice=limitNotice;
})(window);
