/* One metadata check and one opt-in update flow for the core and all enabled repositories. */
(function (root) {
  'use strict';
  var NOTICE_KEY='filmmerkezi.update.dismissed.v1';
  function t(tr, en) { return root.FilmI18n && root.FilmI18n.language() === 'en' ? en : tr; }
  function Coordinator(app) { this.app = app; this.core = root.FilmUpdate; this.plugins = root.FilmPlugins; this.sites = app.siteManagement; this.task = null; this.last = null; this.generation = 0; this.timer = null; this.host = null; this.downloading = false; this.opening = false; if(root.FilmUpdateWorkflow)app.updateWorkflow=new root.FilmUpdateWorkflow(app); }
  Coordinator.prototype.check = function () {
    if (this.task) return this.task;
    var self = this, token = this.generation, result = { core: null, coreChecked: false, updates: [], newSites: [], errors: [], checkedAt: Date.now() };
    if (this.app.controller.content || this.core.busy || this.plugins && this.plugins.busy) return Promise.reject(new Error(t('Önce mevcut işlemi veya oynatıcıyı kapatın.', 'Close the current operation or player first.')));
    function current() { if (token !== self.generation) { var e = new Error('Update check cancelled'); e.cancelled = true; throw e; } }
    var task = Promise.resolve().then(function () { current(); return self.core.check(); }).then(function (s) { current(); result.coreChecked = true; if (s.available && root.FilmPluginSchema.compare(s.available, s.current) > 0 && s.pending !== s.available) result.core = { version: s.available }; }, function (e) { current(); result.errors.push({ scope: 'core', message: e.message, report: self.core.errorReport }); }).then(function () {
      current(); return self.sites && self.plugins ? self.sites.checkSites() : { checked: [], failed: [] };
    }).then(function (r) {
      current(); result.errors = result.errors.concat(r.failed || []);
      (r.checked || []).forEach(function (repoId) {
        var repo = self.plugins.state.repositories[repoId], catalog = self.sites.catalogs[repoId];
        if (!repo || !repo.enabled || !catalog) return;
        catalog.plugins.forEach(function (p) {
          var installed = self.plugins.state.plugins[repoId + '/' + p.id], row = { repoId: repoId, repo: repo.displayName || repo.name, id: p.id, name: p.name, version: p.version, packageType:p.type };
          if ((!installed || !installed.active) && !(installed && installed.pending && installed.pending.version === p.version)) { if(p.type==='site')result.newSites.push(row); }
          else if (installed && installed.active && (installed.needsDownload || root.FilmPluginSchema.compare(p.version, installed.active.version) > 0) && !(installed.pending && installed.pending.version === p.version)) result.updates.push(row);
        });
      });
      self.last = result; return result;
    });
    this.task = task.then(function (r) { self.task = null; return r; }, function (e) { self.task = null; throw e; });
    return this.task;
  };
  Coordinator.prototype.summary = function () { var r = this.last; if (!r) return ''; return t('Çekirdek: ', 'Core: ') + (r.core ? r.core.version : r.coreChecked ? t('güncel / hazır', 'current / ready') : t('denetlenemedi', 'not checked')) + t(' · Site güncellemesi: ', ' · Site updates: ') + r.updates.length + t(' · Yeni site: ', ' · New sites: ') + r.newSites.length + (r.errors.length ? t(' · Denetlenemeyen: ', ' · Unchecked: ') + r.errors.length : ''); };
  Coordinator.prototype.hasUpdates = function () { return !!(this.last && (this.last.core || this.last.updates.length || this.last.newSites.length)); };
  Coordinator.prototype.noticeItems=function(){var r=this.last,items=[],seen={},repos=this.plugins&&this.plugins.state.repositories||{};if(!r)return items;if(r.core)items.push('core|'+r.core.version);(r.updates||[]).concat(r.newSites||[]).forEach(function(row){var repo=repos[row.repoId],key='package|'+(repo&&repo.fingerprint||row.repoId)+'|'+row.id+'|'+row.version;if(!seen[key]){seen[key]=true;items.push(key);}});return items.sort();};
  Coordinator.prototype.readNoticePreference=function(){try{var storage=this.app.catalog.storage||root.localStorage,raw=storage&&storage.getItem(NOTICE_KEY);if(!raw)return [];var value=JSON.parse(raw);if(raw.length>65536||!value||value.version!==1||!Array.isArray(value.items)||value.items.length>4096||!value.items.every(function(item){return typeof item==='string'&&item.length>0&&item.length<=300;}))throw Error('Invalid notice preference');return value.items;}catch(ignore){this.noticePreferenceBlocked=true;return [];}};
  Coordinator.prototype.noticeMuted=function(items){var muted=this.readNoticePreference();return items.length>0&&items.every(function(item){return muted.indexOf(item)>=0;});};
  Coordinator.prototype.muteNotice=function(items){this.readNoticePreference();if(this.noticePreferenceBlocked)throw Error(t('Bildirim tercihi okunamadı; mevcut kayıt değiştirilmedi. Daha sonra ile kapatabilirsiniz.','The notification preference could not be read; the existing record was preserved. You can choose Later.'));var storage=this.app.catalog.storage||root.localStorage,text=JSON.stringify({version:1,items:items});if(!storage||text.length>65536)throw Error(t('Bildirim tercihi kaydedilemedi. Daha sonra ile kapatabilirsiniz.','The notification preference could not be saved. You can choose Later.'));storage.setItem(NOTICE_KEY,text);};
  Coordinator.prototype.cancel = function () { this.generation++; clearTimeout(this.timer); this.timer = null; this.dismissNotice(false); if(this.openingTask&&this.openingTask.cancel)this.openingTask.cancel();if(this.opening&&this.app.updateWorkflow&&this.app.updateWorkflow.running)this.app.updateWorkflow.cancel(); if (this.task || this.downloading || this.opening) { this.core.cancel(); if (this.sites) this.sites.cancel(); if (this.plugins) this.plugins.cancel(); } };
  Coordinator.prototype.dismissNotice = function (restore) {
    var host = this.noticeHost, back = this.noticeReturn;
    if (!host) return;
    var focused = host.contains(document.activeElement);
    if (this.noticeCleanup) this.noticeCleanup();
    if (host.parentNode) host.parentNode.removeChild(host);
    this.noticeHost = null; this.noticeCleanup = null;
    if (restore && focused) {if(back && back.getClientRects().length)back.focus();else if(this.app.catalog.focus)this.app.catalog.focus(this.noticeReturnKey||'search-activate');}
  };
  Coordinator.prototype.notify = function () {
    if (this.host || this.noticeHost || !this.hasUpdates() || this.app.controller.content || document.hidden || this.app.catalog.panel || this.app.catalog.editing || root.FilmRepositorySetup&&root.FilmRepositorySetup.pending()) return;
    var items=this.noticeItems();if(this.noticeMuted(items))return;
    this.dismissNotice(false);
    var self = this, r = this.last, shell = document.getElementById('shell'), host = document.createElement('section'), active = true, held = {};
    if (!shell) return;
    this.noticeReturn = document.activeElement;
    this.noticeReturnKey=this.noticeReturn&&this.noticeReturn.getAttribute('data-focus');
    this.noticeHost = host; host.id = 'update-notification';
    host.setAttribute('role', 'dialog');host.setAttribute('aria-modal','true');host.setAttribute('aria-labelledby','update-notification-title');
    var card=document.createElement('section');card.className='fm-update-notice-card';host.appendChild(card);var title=document.createElement('h2');title.id='update-notification-title';title.textContent=t('Güncellemeler hazır','Updates are available');card.appendChild(title);
    function line(text, secondary) { var p = document.createElement('p'); p.textContent = text;p.className=secondary?'fm-update-notice-summary':'fm-update-notice-heading';card.appendChild(p); }
    if (r.core) line(t('Yeni çekirdek güncellemesi var', 'A new core update is available'));
    if (r.updates.length) line(t('Yeni site güncellemesi var', 'Site updates are available'));
    if (r.newSites.length) line(t('Yeni site eklentileri var', 'New site plugins are available'));
    var parts = [];
    if (r.core) parts.push(t('Çekirdek ', 'Core ') + r.core.version);
    if (r.updates.length) parts.push(r.updates.length + t(' site güncellemesi', ' site updates'));
    if (r.newSites.length) parts.push(r.newSites.length + t(' yeni eklenti', ' new plugins'));
    line(parts.join(' · '), true);
    line(t('İndirme ve kurulum başlamadan önce seçiminizi inceleyebilirsiniz.','You can review your selection before download and installation.'),true);
    var actions=document.createElement('div');actions.className='fm-update-notice-actions';card.appendChild(actions);var status=document.createElement('p');status.className='fm-update-notice-status';status.setAttribute('role','alert');card.appendChild(status);
    function action(text, name, fn) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = text;
      b.setAttribute('data-update-notice', name); b.setAttribute('data-focus', 'update-notice-' + name);
      b.onclick = fn; actions.appendChild(b); return b;
    }
    var install = action(r.core||r.updates.length?t('Güncelle ve yükle','Update and install'):t('Yükle','Install'), 'install', function () { self.install({includeCore:true}); });
    var inspect = action(t('İncele', 'Review'), 'inspect', function () { self.offer(); });
    var later = action(t('Daha sonra', 'Later'), 'later', function () { self.dismissNotice(true); });
    var mute=action(t('Bir daha gösterme','Do not show again'),'mute',function(){try{self.muteNotice(items);self.dismissNotice(true);}catch(e){status.textContent=t('Tercih kaydedilemedi; bildirim kapatılmadı. Daha sonra ile devam edebilirsiniz.','The preference could not be saved; the notification remains open. Choose Later to continue.');}});
    line(t('Bir daha gösterme yalnız bu sürümler içindir. Yeni güncelleme geldiğinde yeniden bildirilir.','Do not show again applies to these versions only. You will be notified when a new update is available.'),true);
    function key(e) {
      var code = e.keyCode || e.which;
      if (!active) { if (held[code]) { e.preventDefault(); e.stopImmediatePropagation(); } return; }
      if (code === 27 || code === 10009 || code === 13 || code === 37 || code === 39 || code===38 || code===40 || code===9) {
        e.preventDefault(); e.stopImmediatePropagation();
        var repeated = held[code]; held[code] = true;
        if (e.repeat || repeated) return;
        if (code === 27 || code === 10009) self.dismissNotice(true);
        else if (code === 13) {if(host.contains(document.activeElement))document.activeElement.click();else install.focus();}
        else {var buttons=[install,inspect,later,mute],at=Math.max(0,buttons.indexOf(document.activeElement)),next=at;if(code===37&&at%2===1)next--;if(code===39&&at%2===0)next++;if(code===38&&at>=2)next-=2;if(code===40&&at<2)next+=2;if(code===9)next=Math.max(0,Math.min(3,at+(e.shiftKey?-1:1)));buttons[next].focus();}
      }
    }
    function cleanup() { if (active || Object.keys(held).length) return; root.removeEventListener('keydown', key, true); root.removeEventListener('keyup', release, true); root.removeEventListener('blur', blur);root.removeEventListener('focusin',containFocus,true); }
    function containFocus(e){if(active&&!host.contains(e.target))install.focus();}
    function release(e) { var code = e.keyCode || e.which; if (held[code]) { e.stopImmediatePropagation(); delete held[code]; } cleanup(); }
    function blur() { held = {}; cleanup(); }
    root.addEventListener('keydown', key, true);
    root.addEventListener('keyup', release, true); root.addEventListener('blur', blur);
    root.addEventListener('focusin',containFocus,true);
    this.noticeCleanup = function () { active = false; cleanup(); };
    shell.appendChild(host);
    install.focus();
  };

  Coordinator.prototype.offer = function () {
    if(this.app.controller.content||this.downloading)return;this.dismissNotice(false);var a=this.app.catalog;a.save();a.panel={kind:'tools',settingsCategory:'updates',returnKey:'catalog-tools'};a.renderPanel('settings-category-updates');
  };
  Coordinator.prototype.install = function (options) {
    options=options||{};var self=this,a=this.app.catalog,flow=this.app.updateWorkflow;
    if(this.opening||this.downloading||this.app.controller.content||flow.running)return Promise.resolve(false);
    if(options.setup){if(root.FilmRepositorySetup.pending())root.FilmRepositorySetup.complete(a);this.dismissNotice(false);a.save();a.panel={kind:'update-center',onboarding:true,returnKey:'catalog-tools'};a.renderPanel();}else this.offer();var panel=a.panel;if(!panel||panel.kind!=='update-center'&&panel.settingsCategory!=='updates')return Promise.resolve(false);
    this.opening=true;panel.working=true;panel.notice='';panel.preparing={phase:'repository',startedAt:Date.now(),done:0,total:0};var generation=this.generation;a.renderPanel('update-flow-cancel');
    function current(){if(a.panel!==panel||generation!==self.generation||self.app.controller.content){var e=Error('Selection cancelled');e.cancelled=true;throw e;}}
    function progress(value){current();panel.preparing.phase=value.phase;panel.preparing.done=value.done||0;panel.preparing.total=value.total||0;a.renderPanel('update-flow-cancel');}
    var setupAll=options.setup&&!options.includeCore&&!options.choose;
    function checkSelectedRepository(){return self.sites.checkSites(options.repoId).then(function(result){if(result.failed&&result.failed.length)throw Error(result.failed[0].message||'Repository check failed');});}
    var check;
    if(setupAll&&options.repoId){
      // Adding a repository already verifies and saves its index.
      check=Promise.resolve().then(function(){current();return self.plugins.catalog(options.repoId);}).then(function(index){
        current();self.sites.catalogs[options.repoId]=index;delete self.sites.failures[options.repoId];
      },function(){current();return checkSelectedRepository();});
    }else check=options.setup&&!options.includeCore?checkSelectedRepository():this.check();
    return check.then(function(){current();var groups=flow.groups(),rows=groups.updates.concat(groups.newSites).filter(function(r){return !options.repoId||r.repoId===options.repoId;}),repoIds=options.repoId?[options.repoId]:Object.keys(self.plugins.state.repositories);panel.expandedRepos=panel.expandedRepos||{};repoIds.forEach(function(id){panel.expandedRepos[id]=true;});
      if(options.choose){progress({phase:'dependencies',done:0,total:rows.length});self.openingTask=self.plugins.previewCapacity(rows,function(){return a.panel===panel&&generation===self.generation&&!self.app.controller.content;},progress);return self.openingTask.then(function(view){current();panel.capacity=view;panel.capacityEpoch=String(self.plugins.state.seq||0)+'|'+String(groups.checkedAt||0)+'|'+self.core.status().current;panel.capacityLoading=false;panel.centerView='new';panel.selectionRepo=options.repoId||'';panel.centerReturn='update-new-plugins';panel.notice=t('Yüklemek istediğiniz eklentileri seçin. Gerekli bileşenler birlikte yüklenir.','Choose plugins to install. Required components are included.');return false;});}
      var core=!!(options.includeCore&&self.last&&self.last.core);if(!rows.length&&!core){panel.notice=t('Yüklenecek yeni eklenti veya güncelleme bulunamadı.','No new plugins or updates found.');return false;}
      var keys=rows.map(function(row){return row.key;});
      if(setupAll)keys.sort();
      panel.notice='';flow.cancelled=false;
      if(!setupAll)progress({phase:'plan',done:0,total:0});
      return flow.prepare(keys,core,setupAll?'setup-all':'mixed').then(function(){current();panel.preparing=null;return flow.run();}).then(function(){return true;});
    }).then(function(result){self.opening=false;self.openingTask=null;panel.working=false;panel.preparing=null;if(a.panel===panel)a.renderPanel(options.choose?'update-repo-'+Math.max(0,Object.keys(self.plugins.state.repositories).indexOf(options.repoId))+'-item-0':result?'update-confirm-cancel':'update-add-repo');return result;},function(e){self.opening=false;self.openingTask=null;panel.working=false;panel.preparing=null;if(a.panel===panel){panel.notice=e.cancelled?t('Hazırlık iptal edildi.','Preparation cancelled.'):e.message;panel.errorReport=!e.cancelled&&root.FilmErrorReporter&&root.FilmErrorReporter.capture({scope:'update',stage:'install-selection',error:e});a.renderPanel('management-check-all');}return false;});
  };
  Coordinator.prototype.start = function () {
    var self = this, stopped = false;
    function attempt() {
      if (stopped || self.app.controller.content) return;
      var catalog = self.app.catalog;
      if(self.app.updateWorkflow && (self.app.updateWorkflow.running || self.app.updateWorkflow.job && self.app.updateWorkflow.job.phase==='core-restart')) return;
      if (root.FilmRepositorySetup && root.FilmRepositorySetup.pending() || document.hidden || catalog.screen.loading || catalog.panel || catalog.editing || self.core.busy || self.plugins && self.plugins.busy) { self.timer = setTimeout(attempt, 1000); return; }
      self.check().then(function () { function show() { if(stopped||self.app.controller.content)return;if(document.hidden||self.app.catalog.panel||self.app.catalog.editing){self.timer=setTimeout(show,1000);return;}self.notify(); }show(); }, function () {});
    }
    if(this.app.updateWorkflow){this.app.controller.on('open',function(){self.app.updateWorkflow.cancel();});setTimeout(function(){self.app.updateWorkflow.resume();},1500);}
    this.timer = setTimeout(attempt, 2000);
    this.app.controller.on('open', function () { stopped = true;self.cancel(); });
    root.addEventListener('beforeunload', function () { stopped = true;self.cancel(); });
  };
  root.FilmUpdateCoordinator = { create: function (app) { return new Coordinator(app); }, start: function (app) { var instance = new Coordinator(app);root.FilmUpdateCoordinator.current = instance;instance.start();return instance; } };
})(window);
