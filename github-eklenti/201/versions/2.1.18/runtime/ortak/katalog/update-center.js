(function(root){
 'use strict';
 function t(a,b){return root.FilmI18n&&root.FilmI18n.language()==='en'?b:a;}
 function embedded(p){return p&&p.kind==='tools'&&p.settingsCategory==='updates';}
 function clear(host){if(!host)return;var nodes=host.querySelectorAll('*'),i,n;for(i=nodes.length-1;i>=0;i--){n=nodes[i];n.onclick=null;n.onfocus=null;n.onblur=null;n.oninput=null;n.onchange=null;n.onkeydown=null;n.onkeyup=null;if(n.tagName==='IMG')n.removeAttribute('src');while(n.firstChild)n.removeChild(n.firstChild);}while(host.firstChild)host.removeChild(host.firstChild);}
 function dispose(p){if(!p)return;if(p.preparationClock){clearInterval(p.preparationClock);p.preparationClock=null;}if(p.preparing&&root.FilmUpdateCoordinator.current&&root.FilmUpdateCoordinator.current.opening)root.FilmUpdateCoordinator.current.cancel();}
 function open(a,view,key){var parent=a.panel;if(root.FilmRepositoryDiscovery)root.FilmRepositoryDiscovery.cancel(parent);dispose(parent);a.panel={kind:'update-center',centerView:view||'home',centerReturn:key||'update-my-repositories',returnKey:'catalog-tools'};a.renderPanel();}
 function route(a){var p=a.panel,v=p&&p.pluginView||'repositories';if(p&&p.kind==='updates'){open(a,'home');return true;}if(p&&p.kind==='site-management'&&p.view==='available'){open(a,'new');return true;}if(!p||p.kind!=='plugins'||['repositories','repository','catalog','installed','plugin','find'].indexOf(v)<0)return false;
  var home={kind:'update-center',returnKey:'catalog-tools'};dispose(p);
  if(v==='installed'||v==='plugin'&&p.pluginKey){dispose(p);a.panel={kind:'site-management',view:v==='plugin'?'site':'list',siteKey:p.pluginKey,settingsParent:home,settingsReturnKey:'update-my-plugins',returnKey:'catalog-tools'};a.renderPanel();return true;}
  open(a,v==='catalog'?'new':'repositories');if(v==='find'&&root.FilmRepositoryDiscovery)root.FilmRepositoryDiscovery.open(a,a.panel,function(key){render(a,key);});return true;
 }
 function render(a,focus){
  var p=a.panel,inline=embedded(p);if(!p||p.kind!=='update-center'&&!inline)return false;
  var flow=a.app.updateWorkflow,m=a.app.siteManagement,co=root.FilmUpdateCoordinator.current,box=document.getElementById(inline?'settings-options':'catalog-modal-card'),host=document.getElementById('catalog-modal');if(!box)return false;if(inline){box.classList.add('fm-update-center');box.classList.add('fm-update-embedded');}else{host.style.display='block';host.classList.remove('fm-settings');host.classList.add('fm-update-center');}flow.notify=function(){draw();};if(p.preparing)return root.FilmInstallProgress.preparing(a,box,p);if(p.preparationClock){clearInterval(p.preparationClock);p.preparationClock=null;}if(flow.running||flow.job&&/^(site|core)-restart$/.test(flow.job.phase))return root.FilmInstallProgress.render(a,box,p);clear(box);
  function line(text,tag){var n=document.createElement(tag||'p');n.textContent=text;box.appendChild(n);return n;}
  function button(text,key,fn,parent,enabled){var b=document.createElement('button');b.type='button';b.className='filter-field';b.textContent=text;b.setAttribute('data-focus',key);b.disabled=enabled===false;b.onclick=function(){if(!b.disabled&&(!p.working||key==='update-flow-cancel'))fn();};(parent||box).appendChild(b);return b;}
  function draw(key){if(!key&&p.repositoryDiscovery&&p.repositoryDiscovery.editing)return;if(a.panel===p&&!a.app.controller.content)render(a,key||document.activeElement&&document.activeElement.getAttribute('data-focus'));}
  function work(fn){if(p.working)return;p.working=true;p.notice='';draw();Promise.resolve().then(fn).then(function(){p.working=false;draw();},function(e){p.working=false;p.notice=e.message;p.errorReport=root.FilmErrorReporter&&root.FilmErrorReporter.capture({scope:'update',stage:'package-operation',error:e});draw();});}
  function selection(keys,core,install){
   work(function(){
    var view=p.centerView,setupInstall=p.onboarding&&install==='mixed';
    var current=function(){return a.panel===p&&p.centerView===view&&(!inline||embedded(p))&&!a.app.controller.content;};
    if(!current())return;
    return flow.prepare(keys,core,setupInstall?'setup-all':install).then(function(){if(current())return flow.run();});
   });
  }

  flow.notify=function(){draw();};
  line(t('Güncelleme Merkezi','Update Center'),'h2');
  function continueSetup(){var old=flow.job;try{if(old&&old.items.some(function(i){return i.status==='ready';})){flow.job=JSON.parse(JSON.stringify(old));flow.job.items=flow.job.items.filter(function(i){return i.status==='ready';});flow.job.pins=flow.job.pins.filter(function(pin){var record=m.plugins.state.plugins[pin.key],v=record&&(record.pending||record.active);return v&&v.hash===pin.hash;});flow.job.phase='site-restart';flow.notice='';flow.save();draw();}else{flow.job=null;flow.save();flow.notice='';a.closePanel(true);}}catch(e){flow.job=old;p.notice=e.message;draw();}}
  if(flow.job&&flow.job.setupAll&&!flow.running&&/^(failed|interrupted)$/.test(flow.job.phase)){
   var completed=flow.job.items.filter(function(i){return i.status==='ready';}).length;
   box.querySelector('h2').textContent=t('Eklenti yükleme sonucu','Plugin installation result');
   line(completed+' / '+flow.job.items.length+t(' eklenti hazır',' plugins ready'));
   flow.job.items.filter(function(i){return i.status==='failed';}).forEach(function(i){line(i.name+' · '+i.message);});
   if(flow.notice)line(flow.notice);
   button(t('Yalnız kalanları tekrar dene','Retry remaining'), 'update-flow-retry',function(){flow.run();});
   button(t('Devam et','Continue'),'update-result-continue',continueSetup).focus();return true;
  }
  if(p.notice||flow.notice)line(p.notice||flow.notice);
  if(p.errorReport&&root.FilmErrorReporter)box.appendChild(root.FilmErrorReporter.button(p.errorReport,'management-report-error'));

  if(flow.job&&p.centerView==='technical'){
   var failures=flow.job.items.filter(function(i){return i.status==='failed';});
   if(failures.length)line(t('Yüklenemeyen paketler: ','Packages not installed: ')+failures.map(function(i){return i.name+': '+i.message;}).join(' · '));
   button(t('Yalnız kalanları tekrar dene','Retry remaining updates'),'update-flow-retry',function(){flow.run();draw();});
   button(t('İşlem kaydını kapat','Dismiss batch'),'update-flow-dismiss',function(){work(function(){return flow.dismiss();});});
  }
  var groups=flow.groups(),core=root.FilmUpdate.status(),coreAvailable=!!(root.FilmUpdate.found&&Scompare(root.FilmUpdate.found.updateVersion,core.current)>0),busy=p.working||m.busy()||!!co.task,repos=m.plugins.state.repositories;
  function updateAll(){selection(groups.updates.map(function(row){return row.key;}),coreAvailable,false);}
  var view=p.centerView||'home';
  function showRequirements(parent) {
   var rows=groups.requirements||[], notices={}, needsGuide=false;
   if(core.requirement) rows=[{name:t('Uygulama çekirdeği','Application core'),requirement:core.requirement}].concat(rows);
   rows.forEach(function(row){var r=row.requirement,key=r.kind+'|'+r.version;if(!notices[key])notices[key]={requirement:r,names:[]};notices[key].names.push(row.name);});
   Object.keys(notices).forEach(function(key){var notice=notices[key],r=notice.requirement;needsGuide=needsGuide||r.kind==='app';text(parent,t(r.message,r.kind==='core'?'Update the core to '+r.version+' or newer first.':r.version?'This update requires Film Merkezi '+r.version+' or newer.':'This update requires a newer Film Merkezi installation.')+' · '+notice.names.join(', '));});
   if(needsGuide){var link=document.createElement('a');link.className='filter-field';link.href='https://github.com/enesk4yh4n-lab/TizenTV-Film-Merkezi/blob/main/docs/KURULUM.md';link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('data-focus','update-install-guide');link.textContent=t('Kurulum kılavuzu','Installation guide');parent.appendChild(link);}
  }
  function openView(name,key){dispose(p);p.selectionRepo='';p.centerView=name;p.centerReturn=key;p.centerAction='';p.repoOptions='';draw('update-view-back');}
  function finishFocus(){if(inline&&(!focus||/^settings-(category-|back$)/.test(focus)))return;var n=focus&&box.querySelector('[data-focus="'+focus+'"]');if(!n||n.disabled)n=box.querySelector('button:not([disabled])');if(n)n.focus();}
  if(view==='home'){
   var count=groups.updates.length+(coreAvailable?1:0),summary=line(busy?t('Kontrol ediliyor…','Checking…'):count?count+t(' güncelleme hazır',' updates available'):groups.checkedAt?t('Kurulabilir güncelleme yok','No compatible update available'):t('Güncellemeleri kontrol edin','Check for updates'),'h3');summary.className='fm-compact-status';
   showRequirements(box);
   var primary=block(box,'fm-inline-controls fm-compact-primary');
   button(t('Güncelle','Update'),'update-header-install',updateAll,primary,!busy&&count>0);
   button(t('Kontrol et','Check for updates'),'management-check-all',function(){work(function(){return co.check();});},primary,!busy);
   var menu=block(box,'fm-compact-menu');
   button(t('Eklentilerim','My plugins')+' · '+groups.installed.filter(function(r){return r.key!=='components';}).length,'update-my-plugins',function(){dispose(p);a.panel={kind:'site-management',view:'list',settingsParent:p,settingsReturnKey:'update-my-plugins',returnKey:'catalog-tools'};a.renderPanel();},menu,!busy);
   button(t('Yeni eklenti ekle','Add plugins')+(groups.newSites.length?' · '+groups.newSites.length:''),'update-new-plugins',function(){openView('new','update-new-plugins');},menu,!busy);
   button(t('Depolarım','My repositories')+' · '+Object.keys(repos).length,'update-my-repositories',function(){openView('repositories','update-my-repositories');},menu,!busy);
   if(m.hasChanges?m.hasChanges():m.plugins.restartNeeded||Object.keys(m.plugins.state.plugins||{}).some(function(k){return !!m.plugins.state.plugins[k].pending;}))button(t('Hazır · Yeniden başlat','Ready · Restart'),'update-restart',function(){if(a.hub)a.hub.flush();root.location.reload();},menu,!busy);
   if((co.last&&co.last.errors&&co.last.errors.length)||Object.keys(m.failures).length)line(t('Bazı güncellemeler kontrol edilemedi. Tekrar deneyebilir veya ayrıntılara bakabilirsiniz.','Some updates could not be checked. Try again or see details.'));
   if(flow.job)button(t('\u00d6nceki kurulum sonucu','Previous installation result'),'update-previous-result',function(){openView('technical','update-previous-result');},menu,!busy);
   var foot=block(box,'fm-inline-controls fm-center-footer');button(t('Teknik ayrıntılar','Technical details'),'update-technical',function(){openView('technical','update-technical');},foot,!busy);if(!inline)button(t('Geri','Back'),'panel-cancel',function(){a.closePanel(true);},foot);finishFocus();return true;
  }
  button(t('← Geri','← Back'),'update-view-back',function(){dispose(p);var key=p.centerReturn;p.centerView='home';p.centerAction='';p.repoOptions='';draw(key);});
  box.querySelector('h2').textContent=view==='new'?t('Yeni eklenti ekle','Add plugins'):view==='repositories'?t('Depolarım','My repositories'):t('Teknik ayrıntılar','Technical details');
  p.expandedRepos=p.expandedRepos||{};p.bulkSelection=p.bulkSelection||{};p.repoPages=p.repoPages||{};
  function block(parent,cls){var n=document.createElement('div');n.className=cls;parent.appendChild(n);return n;}
  function text(parent,value,tag){var n=document.createElement(tag||'p');n.textContent=value;parent.appendChild(n);return n;}
  function child(view,id,key,extra){if(root.FilmRepositoryDiscovery)root.FilmRepositoryDiscovery.cancel(p);var panel={kind:'plugins',pluginView:view,centerEntry:view,repoId:id,settingsParent:p,settingsReturnKey:key,returnKey:'catalog-tools'};Object.keys(extra||{}).forEach(function(k){panel[k]=extra[k];});a.panel=panel;a.renderPanel();}
  var heading=box.querySelector('h2'),header=block(box,'fm-center-header');header.appendChild(heading);var headerActions=block(header,'fm-inline-controls fm-center-header-actions');button(t('Kontrol et','Check for updates'),'management-check-all',function(){work(function(){return co.check();});},headerActions,!busy);button(t('Güncelle','Update'),'update-header-install',updateAll,headerActions,!busy&&(coreAvailable||groups.updates.length>0));
  if(view==='technical')text(box,(coreAvailable?'1':'0')+t(' çekirdek ve ',' core and ')+groups.updates.length+t(' site güncellemesi hazır',' site updates available'));
  var scroll=block(box,'fm-center-scroll');
  var repoHeading=block(scroll,'fm-inline-controls');text(repoHeading,t('Depolarım','My repositories'),'h3');button(t('+ Depo ekle','+ Add repository'),'update-add-repo',function(){if(p.centerAction==='add'){root.FilmRepositoryDiscovery.cancel(p);p.centerAction='';draw('update-add-repo');}else root.FilmRepositoryDiscovery.open(a,p,draw);},repoHeading,!busy);
  if(p.centerAction==='add'&&root.FilmRepositoryDiscovery)root.FilmRepositoryDiscovery.render(a,p,scroll,{block:block,text:text,button:button,draw:draw,child:child,busy:busy});
  if(!Object.keys(repos).length)text(scroll,t('Henüz depo eklenmedi. Depo ekle seçeneğini kullanın.','No repositories yet. Choose Add repository.'));
  if(view==='new'&&Object.keys(repos).length)repoHeading.style.display='none';
  Object.keys(repos).forEach(function(id,ri){if(view==='new'&&p.selectionRepo&&p.selectionRepo!==id)return;
   var repo=repos[id],installed=groups.installed.filter(function(r){return r.repoId===id;}),updates=groups.updates.filter(function(r){return r.repoId===id;}),fresh=groups.newSites.filter(function(r){return r.repoId===id;}),available=updates.concat(fresh),all=installed.concat(fresh),prefix='update-repo-'+ri,card=block(scroll,'fm-center-card');
   if(view==='new'){available=fresh;all=fresh;p.expandedRepos[id]=true;if(!fresh.length){card.parentNode.removeChild(card);return;}}
   text(card,(repo.displayName||repo.name)+(repo.enabled?t(' · Açık',' · Enabled'):t(' · Kapalı',' · Disabled')),'h3');
   text(card,installed.length+t(' kurulu · ',' installed · ')+updates.length+t(' güncelleme · ',' updates · ')+fresh.length+t(' yeni',' new'));
   var actions=block(card,'fm-inline-controls');
   button(t('Tümünü yükle / güncelle','Install / update all'),prefix+'-all',function(){selection(available.map(function(r){return r.key;}),false,'mixed');},actions,!busy&&repo.enabled&&available.length>0);
   button(p.expandedRepos[id]?t('İçeriğini gizle','Hide contents'):t('İçeriğini göster','Show contents'),prefix+'-expand',function(){p.expandedRepos[id]=!p.expandedRepos[id];draw(prefix+'-expand');},actions,!busy);
   button('···',prefix+'-options',function(){if(root.FilmRepositoryDiscovery)root.FilmRepositoryDiscovery.cancel(p);p.repoOptions=p.repoOptions===id?'':id;p.centerAction='';draw(prefix+'-options');},actions,!busy).setAttribute('aria-label',t('Depo seçenekleri','Repository options'));
   if(p.repoOptions===id){var options=block(card,'fm-inline-controls');if(m.plugins.keyChanged===id)button(t('Yay\u0131nc\u0131 de\u011fi\u015fikli\u011fini incele','Review publisher change'),prefix+'-publisher',function(){work(function(){return m.plugins.probe(repo.url).then(function(){child('trust',id,prefix+'-options',{replaceId:id});});});},options,!busy);button(t('Adını değiştir','Rename'),prefix+'-rename',function(){child('rename',id,prefix+'-options');},options,!busy);button(t('Adresini değiştir','Change address'),prefix+'-address',function(){child('address',id,prefix+'-options',{url:repo.url,replaceId:id});},options,!busy);button(repo.enabled?t('Pasifleştir','Disable'):t('Etkinleştir','Enable'),prefix+'-toggle',function(){work(function(){return m.plugins.setRepositoryEnabled(id,!repo.enabled).then(function(){if(m.changed)m.changed();else m.plugins.restartNeeded=true;});});},options,!busy);button(t('Kaldır','Remove'),prefix+'-remove',function(){child('confirm',id,prefix+'-options',{confirmAction:'repository'});},options,!busy);}
   if(view==='repositories')return;
   if(view==='new'){actions.style.display='none';}
   if(!p.expandedRepos[id])return;
   var controls=block(card,'fm-inline-controls'),chosen=available.filter(function(r){return p.bulkSelection[r.key];});
   button(t('Tümünü seç','Select all'),prefix+'-select',function(){available.forEach(function(r){p.bulkSelection[r.key]=true;});draw(prefix+'-select');},controls,!busy&&repo.enabled&&available.length>0);
   button(t('Seçimi kaldır','Clear selection'),prefix+'-clear',function(){all.forEach(function(r){delete p.bulkSelection[r.key];});draw(prefix+'-clear');},controls,!busy);
   button(t('Seçilenleri yükle','Install selected')+' ('+chosen.length+')',prefix+'-selected',function(){selection(chosen.map(function(r){return r.key;}),false,'mixed');},controls,!busy&&repo.enabled&&chosen.length>0);
   if(!all.length)text(card,groups.checkedAt?t('Bu depoda site bulunamadı.','No sites found in this repository.'):t('Liste için Kontrol et seçeneğini kullanın.','Choose Check for updates to load contents.'));
   var page=Math.max(0,Math.min(p.repoPages[id]||0,Math.max(0,Math.ceil(all.length/24)-1)));p.repoPages[id]=page;
   all.slice(page*24,page*24+24).forEach(function(r,i){var key=prefix+'-item-'+(page*24+i),update=updates.some(function(v){return v.key===r.key;}),isNew=fresh.some(function(v){return v.key===r.key;}),selectable=update||isNew,row=block(card,'fm-center-package fm-inline-controls');var itemButton=button(r.name+(view==='technical'?' · '+r.version:'')+' · '+(isNew?t('Kurulu değil','Not installed'):update?t('Güncelleme var','Update available'):t('Kurulu · Güncel','Installed · Up to date')),key,function(){if(selectable){p.bulkSelection[r.key]=!p.bulkSelection[r.key];draw(key);}else{dispose(p);a.panel={kind:'site-management',view:'site',siteKey:r.key,settingsParent:p,settingsReturnKey:key,returnKey:'catalog-tools'};a.renderPanel();}},row,!busy&&(!selectable||repo.enabled));if(selectable){var check=document.createElement('span');check.className='fm-plugin-check'+(p.bulkSelection[r.key]?' selected':'');check.textContent=p.bulkSelection[r.key]?'\u2713':'';check.setAttribute('aria-hidden','true');itemButton.insertBefore(check,itemButton.firstChild);itemButton.setAttribute('role','checkbox');itemButton.setAttribute('aria-checked',p.bulkSelection[r.key]?'true':'false');}if(!isNew&&selectable)button(t('Ayrıntılar','Details'),key+'-manage',function(){dispose(p);a.panel={kind:'site-management',view:'site',siteKey:r.key,settingsParent:p,settingsReturnKey:key,returnKey:'catalog-tools'};a.renderPanel();},row,!busy);});
   var pages=block(card,'fm-inline-controls');if(page>0)button(t('Önceki sayfa','Previous page'),prefix+'-prev',function(){p.repoPages[id]--;draw(prefix+'-expand');},pages);if((page+1)*24<all.length)button(t('Sonraki sayfa','Next page'),prefix+'-next',function(){p.repoPages[id]++;draw(prefix+'-expand');},pages);
  });
  if(view==='new'&&!groups.newSites.length)text(scroll,t('Yeni eklenti bulunamad\u0131. Depo ekleyebilir veya Kontrol et se\u00e7ene\u011fini kullanabilirsiniz.','No new plugins found. Add a repository or check for updates.'));
  var coreCard=block(scroll,'fm-center-card fm-center-core'),coreRow=block(coreCard,'fm-inline-controls');text(coreRow,t('Uygulama çekirdeği','Application core'),'h3');text(coreCard,core.current+(coreAvailable?' → '+root.FilmUpdate.found.updateVersion:t(' · Güncel',' · Up to date')));
  button(t('Güncelle','Update'),'update-core-install',function(){selection([],true,false);},coreRow,!busy&&coreAvailable);
  button(t('Ayrıntılar','Details'),'update-core-details',function(){p.coreDetails=!p.coreDetails;draw('update-core-details');},coreRow);
  if(view!=='technical')coreCard.style.display='none';
  if(p.coreDetails&&root.FilmUpdatePanel)root.FilmUpdatePanel.draw(a,coreCard,p);
  if(co.last)(co.last.errors||[]).forEach(function(e,i){var notice=block(scroll,'fm-center-card');text(notice,e.message||e.error&&e.error.message||t('Güncelleme denetimi tamamlanamadı.','Update check could not be completed.'));if(e.report&&root.FilmErrorReporter)notice.appendChild(root.FilmErrorReporter.button(e.report,'update-check-report-'+i));});
  Object.keys(m.failures).forEach(function(k){text(scroll,t('Depo kontrolü eksik: ','Repository check incomplete: ')+m.failures[k]);});
  if(m.hasChanges?m.hasChanges():m.plugins.restartNeeded||Object.keys(m.plugins.state.plugins||{}).some(function(k){return !!m.plugins.state.plugins[k].pending;})){text(scroll,t('Değişiklikler yeniden açılınca uygulanır.','Changes take effect after restart.'));button(t('Uygula ve yeniden aç','Apply and restart'),'update-restart',function(){if(busy||a.app.controller.content)return;if(a.hub)a.hub.flush();root.location.reload();},scroll,!busy);}
  var footer=block(box,'fm-center-footer fm-inline-controls');if(!inline)button(t('Geri','Back'),'panel-cancel',function(){a.closePanel(true);},footer);text(footer,t('Toplu güncelleme yeni eklenti kurmaz.','Update all does not install new plugins.'));button(t('Tüm güncellemeleri yükle','Install all updates'),'update-install-all',updateAll,footer,!busy&&(coreAvailable||groups.updates.length>0));
  if(view!=='technical'){headerActions.style.display='none';footer.style.display='none';}
  if(inline&&(!focus||/^settings-(category-|back$)/.test(focus)))return true;
  var target=focus&&Array.prototype.filter.call(box.querySelectorAll('[data-focus]'),function(n){return n.getAttribute('data-focus')===focus&&!n.disabled&&n.offsetWidth;})[0];(target||box.querySelector('[data-focus=update-view-back]')||box.querySelector('button:not([disabled])')).focus();return true;

 }
 function Scompare(a,b){return root.FilmPluginSchema.compare(a,b);}
 function key(a,e){var p=a.panel,inline=embedded(p);if(!p||p.kind!=='update-center'&&!inline)return false;if(inline){var options=document.getElementById('settings-options');if(!options||!options.contains(document.activeElement))return false;}var c=e.keyCode,flow=a.app.updateWorkflow;if(root.FilmRepositoryDiscovery&&root.FilmRepositoryDiscovery.key(a,e))return true;
  if((c===27||c===10009)&&p.preparing){e.preventDefault();root.FilmUpdateCoordinator.current.cancel();return true;}
  if((c===27||c===10009)&&flow.running){e.preventDefault();flow.cancel();return true;}
  if((c===27||c===10009)&&(p.centerAction||p.repoOptions)){e.preventDefault();var backKey=p.centerAction?'update-add-repo':'update-repo-'+Object.keys(a.app.siteManagement.plugins.state.repositories).indexOf(p.repoOptions)+'-options';p.centerAction='';p.repoOptions='';render(a,backKey);return true;}
  if((c===27||c===10009)&&p.centerView&&p.centerView!=='home'){e.preventDefault();dispose(p);var returnKey=p.centerReturn;p.centerView='home';render(a,returnKey);return true;}
  if(inline&&(c===27||c===10009)){e.preventDefault();a.experience.settings.focus('settings-category-updates');return true;}
  if([37,38,39,40].indexOf(c)>=0){
   e.preventDefault();var box=document.getElementById(inline?'settings-options':'catalog-modal-card'),visible=function(n){return !n.disabled&&n.offsetWidth&&n.offsetHeight&&root.getComputedStyle(n).visibility!=='hidden';},nodes=Array.prototype.filter.call(box.querySelectorAll('button,a[data-focus]'),visible),active=document.activeElement,bar=active&&active.parentNode,peers=bar&&bar.classList.contains('fm-inline-controls')?Array.prototype.filter.call(bar.querySelectorAll('button,a[data-focus]'),visible):null,target;
   if(inline&&c===37&&(!peers||peers.indexOf(active)<=0)){a.experience.settings.focus('settings-category-updates');return true;}
   if((c===37||c===39)&&peers)target=peers[Math.max(0,Math.min(peers.length-1,peers.indexOf(active)+(c===39?1:-1)))];
   else if(c===38||c===40){
    var rect=active&&active.getBoundingClientRect(),rows=[],rowIndex=-1,bestX=Infinity;
    nodes.forEach(function(n){var r=n.getBoundingClientRect(),last=rows[rows.length-1],parent=n.parentNode;if(!last||last.parent!==parent||!parent.classList.contains('fm-inline-controls')||Math.abs(last.y-r.top-r.height/2)>=Math.min(last.height,r.height)/2){last={parent:parent,y:r.top+r.height/2,height:r.height,buttons:[]};rows.push(last);}last.buttons.push(n);if(n===active)rowIndex=rows.length-1;});
    var nextRow=rows[rowIndex+(c===38?-1:1)];if(rect&&nextRow)nextRow.buttons.forEach(function(n){var r=n.getBoundingClientRect(),dx=Math.abs((r.left+r.width/2)-(rect.left+rect.width/2));if(dx<bestX){bestX=dx;target=n;}});
    if(!target&&inline&&c===38){a.experience.settings.focus('settings-back');return true;}
   }
   if(target){target.focus();target.scrollIntoView(false);}return true;
  }
  if(c===13&&document.activeElement&&document.activeElement.classList.contains('fm-core-github')){e.preventDefault();if(!e.repeat)document.activeElement.click();return true;}
  if(c===13&&e.repeat){e.preventDefault();return true;}return false;
 }
 root.FilmUpdateCenter={render:render,key:key,clear:clear,dispose:dispose,open:open,route:route};
})(window);
