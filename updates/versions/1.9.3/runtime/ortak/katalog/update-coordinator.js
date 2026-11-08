/* One metadata check and one opt-in update flow for the core and all enabled repositories. */
(function (root) {
  'use strict';
  function t(tr, en) { return root.FilmI18n && root.FilmI18n.language() === 'en' ? en : tr; }
  function Coordinator(app) { this.app = app; this.core = root.FilmUpdate; this.plugins = root.FilmPlugins; this.sites = app.siteManagement; this.task = null; this.last = null; this.generation = 0; this.timer = null; this.host = null; this.downloading = false; this.opening = false; }
  Coordinator.prototype.check = function () {
    if (this.task) return this.task;
    var self = this, token = this.generation, result = { core: null, coreChecked: false, updates: [], newSites: [], errors: [], checkedAt: Date.now() };
    if (this.app.controller.content || this.core.busy || this.plugins && this.plugins.busy) return Promise.reject(new Error(t('Önce mevcut işlemi veya oynatıcıyı kapatın.', 'Close the current operation or player first.')));
    function current() { if (token !== self.generation) { var e = new Error('Update check cancelled'); e.cancelled = true; throw e; } }
    var task = Promise.resolve().then(function () { current(); return self.core.check(); }).then(function (s) { current(); result.coreChecked = true; if (s.available && root.FilmPluginSchema.compare(s.available, s.current) > 0 && s.pending !== s.available) result.core = { version: s.available }; }, function (e) { current(); result.errors.push({ scope: 'core', message: e.message }); }).then(function () {
      current(); return self.sites && self.plugins ? self.sites.checkSites() : { checked: [], failed: [] };
    }).then(function (r) {
      current(); result.errors = result.errors.concat(r.failed || []);
      (r.checked || []).forEach(function (repoId) {
        var repo = self.plugins.state.repositories[repoId], catalog = self.sites.catalogs[repoId];
        if (!repo || !repo.enabled || !catalog) return;
        catalog.plugins.forEach(function (p) {
          var installed = self.plugins.state.plugins[repoId + '/' + p.id], row = { repoId: repoId, repo: repo.name, id: p.id, name: p.name, version: p.version };
          if ((!installed || !installed.active) && !(installed && installed.pending && installed.pending.version === p.version)) result.newSites.push(row);
          else if (installed && installed.active && root.FilmPluginSchema.compare(p.version, installed.active.version) > 0 && !(installed.pending && installed.pending.version === p.version)) result.updates.push(row);
        });
      });
      self.last = result; return result;
    });
    this.task = task.then(function (r) { self.task = null; return r; }, function (e) { self.task = null; throw e; });
    return this.task;
  };
  Coordinator.prototype.summary = function () { var r = this.last; if (!r) return ''; return t('Çekirdek: ', 'Core: ') + (r.core ? r.core.version : r.coreChecked ? t('güncel / hazır', 'current / ready') : t('denetlenemedi', 'not checked')) + t(' · Site güncellemesi: ', ' · Site updates: ') + r.updates.length + t(' · Yeni site: ', ' · New sites: ') + r.newSites.length + (r.errors.length ? t(' · Denetlenemeyen: ', ' · Unchecked: ') + r.errors.length : ''); };
  Coordinator.prototype.hasUpdates = function () { return !!(this.last && (this.last.core || this.last.updates.length || this.last.newSites.length)); };
  Coordinator.prototype.cancel = function () { this.generation++; clearTimeout(this.timer); this.timer = null; if (this.task || this.downloading) { this.core.cancel(); if (this.sites) this.sites.cancel(); if (this.plugins) this.plugins.cancel(); } };
  Coordinator.prototype.offer = function () {
    if (this.host || !this.hasUpdates() || this.app.controller.content || document.hidden) return;
    var self = this, r = this.last, selected = {}, previous = document.activeElement, host = document.createElement('section'), card = document.createElement('div'), status = document.createElement('p'), list = document.createElement('div'), actions = document.createElement('div'), lastFocus = null, cancelAndClose = false;
    this.host = host; host.id = 'combined-update-offer'; host.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:12000;background:rgba(6,12,23,.96);color:white;padding:40px;overflow:auto;font:25px Arial;box-sizing:border-box';card.style.cssText = 'max-width:1600px;margin:auto';host.appendChild(card);
    var title = document.createElement('h1'); title.textContent = t('Güncelleme bulundu. Yapılsın mı?', 'Updates available. Install them?'); card.appendChild(title);status.textContent = this.summary();card.appendChild(status);card.appendChild(list);card.appendChild(actions);document.body.appendChild(host);
    var choices = (r.core ? [{ key: 'core', name: t('Uygulama / çekirdek ', 'Application / core ') + r.core.version, checked: true }] : []);
    r.updates.forEach(function (p) { choices.push({ key: p.repoId + '/' + p.id, name: p.name + ' · ' + p.version + ' · ' + p.repo, checked: true, site: p }); });
    r.newSites.forEach(function (p) { choices.push({ key: p.repoId + '/' + p.id, name: t('Yeni site: ', 'New site: ') + p.name + ' · ' + p.repo, checked: false, site: p }); });
    choices.forEach(function (c) { selected[c.key] = c.checked; });
    function close() { if (self.downloading) { cancelAndClose = true;self.cancel(); status.textContent = t('İptal ediliyor…', 'Cancelling…'); return; } root.removeEventListener('keydown', key, true);root.removeEventListener('keyup', release, true);document.removeEventListener('focusin', keepFocus, true);if (host.parentNode) host.parentNode.removeChild(host); self.host = null; if (previous && previous.getClientRects().length) previous.focus(); }
    function buttons() { return Array.prototype.filter.call(host.querySelectorAll('button'), function (b) { return !b.disabled; }); }
    function button(label, key, fn, parent) { var b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.setAttribute('data-update-choice', key); b.style.cssText = 'display:block;width:96%;margin:7px;padding:15px;font:24px Arial;color:white;background:#203249;border:3px solid transparent;text-align:left;box-sizing:border-box';b.onfocus = function () { b.style.borderColor = '#ffc43d'; };b.onblur = function () { b.style.borderColor = 'transparent'; };b.onclick = fn;(parent || actions).appendChild(b);return b; }
    function draw(focus) {
      list.textContent = '';actions.textContent = '';
      choices.forEach(function (c) { var b = button((selected[c.key] ? '☑ ' : '☐ ') + c.name, c.key, function () { selected[c.key] = !selected[c.key];draw(c.key); }, list);b.disabled = self.downloading;b.setAttribute('aria-pressed', selected[c.key] ? 'true' : 'false'); });
      var install = button(t('Seçilenleri güncelle ve yeniden aç', 'Update selected and restart'), 'install', installSelected);install.disabled = self.downloading || !choices.some(function (c) { return selected[c.key]; });
      button(self.downloading ? t('İptal', 'Cancel') : t('Daha sonra', 'Later'), 'later', close);
      var target = host.querySelector('[data-update-choice="' + (focus || 'later') + '"]'); lastFocus = target && !target.disabled ? target : buttons()[buttons().length - 1];lastFocus.focus();
    }
    function installSelected() {
      if (self.downloading) return;self.downloading = true;var token = self.generation;draw('later');
      function check() { if (token !== self.generation || self.app.controller.content) throw new Error(t('Güncelleme iptal edildi.', 'Update cancelled.')); }
      var task = Promise.resolve();
      if (selected.core && r.core) task = task.then(function () { check();status.textContent = t('Çekirdek indiriliyor…', 'Downloading core…');return self.core.download(); });
      choices.forEach(function (c) { if (c.site && selected[c.key]) task = task.then(function () { check();status.textContent = t('Site paketi indiriliyor: ', 'Downloading site package: ') + c.site.name;return self.plugins.download(c.site.repoId,c.site.id); }); });
      task.then(function () { check();return selected.core && r.core ? self.core.apply() : null; }).then(function () { check();if (self.app.catalog.hub) self.app.catalog.hub.flush();root.location.reload(); }, function (e) { self.downloading = false;if (cancelAndClose) return close();status.textContent = e.message + t(' Doğrulanan hazır paketleri Güncelleme Merkezi’nden yönetebilirsiniz.', ' Manage verified pending packages in the Update Center.');draw('later'); });
    }
    function keepFocus(e) { if (host.contains(e.target)) { lastFocus = e.target;return; }e.stopImmediatePropagation();var target = lastFocus && host.contains(lastFocus) && !lastFocus.disabled ? lastFocus : buttons()[buttons().length-1];if (target) target.focus(); }
    function release(e) { e.stopImmediatePropagation(); }
    function key(e) { var code=e.keyCode||e.which;e.stopImmediatePropagation();e.preventDefault();if([13,27,10009,37,38,39,40].indexOf(code)<0||e.repeat)return;if(code===27||code===10009)return close();var a=buttons(),i=a.indexOf(document.activeElement);if(i<0){keepFocus(e);i=a.indexOf(document.activeElement);}if(code===13){if(i>=0)a[i].click();}else {var b=a[Math.max(0,Math.min(a.length-1,i+(code===37||code===38?-1:1)))];if(b){b.focus();b.scrollIntoView(false);}} }
    root.addEventListener('keydown',key,true);root.addEventListener('keyup',release,true);document.addEventListener('focusin',keepFocus,true);
    draw('later');
  };
  Coordinator.prototype.start = function () {
    var self = this, stopped = false;
    function attempt() {
      if (stopped || self.app.controller.content) return;
      var catalog = self.app.catalog;
      if (document.hidden || catalog.screen.loading || catalog.panel || catalog.editing || self.core.busy || self.plugins && self.plugins.busy) { self.timer = setTimeout(attempt, 1000); return; }
      self.check().then(function () { function show() { if(stopped||self.app.controller.content)return;if(document.hidden||self.app.catalog.panel||self.app.catalog.editing){self.timer=setTimeout(show,1000);return;}self.offer(); }show(); }, function () {});
    }
    this.timer = setTimeout(attempt, 2000);
    this.app.controller.on('open', function () { stopped = true;self.cancel(); });
    root.addEventListener('beforeunload', function () { stopped = true;self.cancel(); });
  };
  root.FilmUpdateCoordinator = { create: function (app) { return new Coordinator(app); }, start: function (app) { var instance = new Coordinator(app);root.FilmUpdateCoordinator.current = instance;instance.start();return instance; } };
})(window);
