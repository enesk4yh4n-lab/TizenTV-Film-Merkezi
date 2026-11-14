/* One metadata check and one opt-in update flow for the core and all enabled repositories. */
(function (root) {
  'use strict';
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
  Coordinator.prototype.cancel = function () { this.generation++; clearTimeout(this.timer); this.timer = null; this.dismissNotice(false); if (this.task || this.downloading) { this.core.cancel(); if (this.sites) this.sites.cancel(); if (this.plugins) this.plugins.cancel(); } };
  Coordinator.prototype.dismissNotice = function (restore) {
    var host = this.noticeHost, back = this.noticeReturn;
    if (!host) return;
    var focused = host.contains(document.activeElement);
    if (this.noticeCleanup) this.noticeCleanup();
    if (host.parentNode) host.parentNode.removeChild(host);
    this.noticeHost = null; this.noticeCleanup = null;
    if (restore && focused && back && back.getClientRects().length) back.focus();
  };
  Coordinator.prototype.notify = function () {
    if (this.host || !this.hasUpdates() || this.app.controller.content || document.hidden) return;
    this.dismissNotice(false);
    var self = this, r = this.last, shell = document.getElementById('shell'), host = document.createElement('section'), active = true, held = {};
    if (!shell) return;
    this.noticeReturn = document.activeElement;
    this.noticeHost = host; host.id = 'update-notification';
    host.setAttribute('role', 'status'); host.setAttribute('aria-live', 'polite');
    host.style.cssText = 'position:absolute;right:72px;top:235px;width:620px;max-width:90%;z-index:20;padding:22px 26px;background:#203249;color:#fff;border:1px solid #65768b;border-radius:10px;box-shadow:0 8px 28px #070c15;font:24px Arial';
    function line(text, secondary) { var p = document.createElement('p'); p.textContent = text; p.style.cssText = secondary ? 'margin:12px 0;color:#c0cbd9;font-size:21px' : 'margin:0 0 8px;font-weight:bold'; host.appendChild(p); }
    if (r.core) line(t('Yeni çekirdek güncellemesi var', 'A new core update is available'));
    if (r.updates.length) line(t('Yeni site güncellemesi var', 'Site updates are available'));
    if (r.newSites.length) line(t('Yeni site eklentileri var', 'New site plugins are available'));
    var parts = [];
    if (r.core) parts.push(t('Çekirdek ', 'Core ') + r.core.version);
    if (r.updates.length) parts.push(r.updates.length + t(' site güncellemesi', ' site updates'));
    if (r.newSites.length) parts.push(r.newSites.length + t(' yeni eklenti', ' new plugins'));
    line(parts.join(' · '), true);
    function action(text, name, fn) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = text;
      b.setAttribute('data-update-notice', name); b.setAttribute('data-focus', 'update-notice-' + name);
      b.style.cssText = 'font:24px Arial;background:#30465f;color:#fff;border:3px solid transparent;border-radius:7px;padding:10px 18px;margin-right:14px';
      b.onfocus = function (e) { b.style.borderColor = '#ffc43d'; if (e.relatedTarget && !host.contains(e.relatedTarget)) self.noticeReturn = e.relatedTarget; };
      b.onblur = function () { b.style.borderColor = 'transparent'; };
      b.onclick = fn; host.appendChild(b); return b;
    }
    var inspect = action(t('İncele', 'Review'), 'inspect', function () { self.offer(); });
    var later = action(t('Daha sonra', 'Later'), 'later', function () { self.dismissNotice(true); });
    function key(e) {
      var code = e.keyCode || e.which;
      if (!active) { if (held[code]) { e.preventDefault(); e.stopImmediatePropagation(); } return; }
      if (!host.contains(document.activeElement)) return;
      if (code === 27 || code === 10009 || code === 13 || code === 37 || code === 39) {
        e.preventDefault(); e.stopImmediatePropagation();
        var repeated = held[code]; held[code] = true;
        if (e.repeat || repeated) return;
        if (code === 27 || code === 10009) self.dismissNotice(true);
        else if (code === 13) document.activeElement.click();
        else (code === 37 ? inspect : later).focus();
      }
    }
    function cleanup() { if (active || Object.keys(held).length) return; root.removeEventListener('keydown', key, true); root.removeEventListener('keyup', release, true); root.removeEventListener('blur', blur); }
    function release(e) { var code = e.keyCode || e.which; if (held[code]) { e.stopImmediatePropagation(); delete held[code]; } cleanup(); }
    function blur() { held = {}; cleanup(); }
    root.addEventListener('keydown', key, true);
    root.addEventListener('keyup', release, true); root.addEventListener('blur', blur);
    this.noticeCleanup = function () { active = false; cleanup(); };
    shell.appendChild(host);
  };

  Coordinator.prototype.offer = function () {
    if(this.app.controller.content||this.downloading)return;this.dismissNotice(false);var a=this.app.catalog;a.save();a.panel={kind:'update-center',returnKey:'catalog-tools',pluginTab:'updates'};a.renderPanel('update-install-all');
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
