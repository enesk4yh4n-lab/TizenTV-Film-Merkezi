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
    var task = Promise.resolve().then(function () { current(); return self.core.check(); }).then(function (s) { current(); result.coreChecked = true; if (s.available && root.FilmPluginSchema.compare(s.available, s.current) > 0 && s.pending !== s.available) result.core = { version: s.available }; }, function (e) { current(); result.errors.push({ scope: 'core', message: e.message, report: self.core.errorReport }); }).then(function () {
      current(); return self.sites && self.plugins ? self.sites.checkSites() : { checked: [], failed: [] };
    }).then(function (r) {
      current(); result.errors = result.errors.concat(r.failed || []);
      (r.checked || []).forEach(function (repoId) {
        var repo = self.plugins.state.repositories[repoId], catalog = self.sites.catalogs[repoId];
        if (!repo || !repo.enabled || !catalog) return;
        catalog.plugins.forEach(function (p) {
          var installed = self.plugins.state.plugins[repoId + '/' + p.id], row = { repoId: repoId, repo: repo.displayName || repo.name, id: p.id, name: p.name, version: p.version };
          if ((!installed || !installed.active) && !(installed && installed.pending && installed.pending.version === p.version)) result.newSites.push(row);
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
    if (this.host || !this.hasUpdates() || this.app.controller.content || document.hidden) return;
    var previous = this.noticeHost && this.noticeHost.contains(document.activeElement) ? this.noticeReturn : document.activeElement;
    this.dismissNotice(false);
    var self = this, r = this.last, selected = {}, host = document.createElement('section'), card = document.createElement('div'), status = document.createElement('p'), coreBox = document.createElement('div'), bulk = document.createElement('div'), list = document.createElement('div'), selection = document.createElement('p'), actions = document.createElement('div'), lastFocus = null, cancelAndClose = false, active = true, held = {};
    this.host = host; host.id = 'combined-update-offer';
    host.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:12000;background:rgba(6,12,23,.72);color:#fff;padding:4%;display:flex;align-items:center;justify-content:center;font:24px Arial;box-sizing:border-box';
    card.id = 'compact-update-card'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true'); card.setAttribute('aria-labelledby', 'compact-update-title');
    card.style.cssText = 'width:960px;max-width:100%;max-height:100%;display:flex;flex-direction:column;padding:26px 30px;background:#142134;border:1px solid #65768b;border-radius:12px;box-shadow:0 18px 55px #050a13;box-sizing:border-box'; host.appendChild(card);
    var title = document.createElement('h2'); title.id = 'compact-update-title'; title.textContent = t('Güncellemeler', 'Updates'); title.style.cssText = 'font: bold 34px Arial;margin:0 0 14px;flex-shrink:0'; card.appendChild(title);
    status.style.cssText = 'font:21px Arial;line-height:1.3;margin:0 0 12px;flex-shrink:0'; status.textContent = t('Paketler seçiminizle indirilir ve doğrulanır.', 'Selected packages will be downloaded and verified.'); card.appendChild(status);
    var transfer = document.createElement('div'), meter = document.createElement('progress'), count = document.createElement('p');
    transfer.id = 'update-transfer-progress'; transfer.style.cssText = 'display:none;padding:12px;border:1px solid #65768b;margin:8px 0;flex-shrink:0';
    meter.style.cssText = 'width:100%;height:16px'; meter.setAttribute('aria-label', t('Yükleme ilerlemesi', 'Installation progress')); count.style.cssText = 'font:21px Arial;margin:10px 0 0';
    transfer.appendChild(meter); transfer.appendChild(count); card.appendChild(transfer);
    coreBox.style.cssText = 'flex-shrink:0'; bulk.style.cssText = 'flex-shrink:0;border-top:1px solid #52647a;padding-top:12px;margin-top:6px'; list.style.cssText = 'overflow:auto;min-height:0;flex:1 1 auto'; selection.style.cssText = 'font:21px Arial;margin:12px 0;flex-shrink:0'; actions.style.cssText = 'flex-shrink:0';
    card.appendChild(coreBox); card.appendChild(bulk); card.appendChild(list); card.appendChild(selection); card.appendChild(actions);
    var hint = document.createElement('p'); hint.textContent = t('↑ ↓ Gezin · OK Seç · Geri Kapat', '↑ ↓ Navigate · OK Select · Back Close'); hint.style.cssText = 'font:19px Arial;color:#b8c4d5;margin:14px 0 0;flex-shrink:0'; card.appendChild(hint); document.body.appendChild(host);
    var choices = r.core ? [{ key: 'core', name: t('Çekirdek', 'Core') + ' · ' + self.core.status().current + ' → ' + r.core.version, checked: true }] : [];
    function siteChoice(p, isNew) {
      var installed = self.plugins.state.plugins[p.repoId + '/' + p.id], current = installed && installed.active && installed.active.version;
      return { key: p.repoId + '/' + p.id, name: p.name + ' · ' + (current ? current + ' → ' : t('Yeni · ', 'New · ')) + p.version + ' · ' + p.repo, checked: !isNew, site: p };
    }
    r.updates.forEach(function (p) { choices.push(siteChoice(p, false)); });
    r.newSites.forEach(function (p) { choices.push(siteChoice(p, true)); });
    choices.forEach(function (c) { selected[c.key] = c.checked; });
    function unlisten() { if (!active && !Object.keys(held).length) { root.removeEventListener('keydown', key, true); root.removeEventListener('keyup', release, true); } }
    function close() {
      if (self.downloading) { cancelAndClose = true; self.cancel(); status.textContent = t('İptal ediliyor…', 'Cancelling…'); return; }
      active = false; document.removeEventListener('focusin', keepFocus, true); if (host.parentNode) host.parentNode.removeChild(host); self.host = null; unlisten();
      if (previous && previous.getClientRects().length) previous.focus();
    }
    function buttons() { return Array.prototype.filter.call(host.querySelectorAll('button'), function (b) { return !b.disabled && b.offsetWidth && b.offsetHeight; }); }
    function button(label, name, fn, parent, group) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.setAttribute('data-update-choice', name);
      if (group) b.setAttribute('data-update-group', group);
      b.style.cssText = 'display:' + (group ? 'inline-block' : 'block') + ';width:' + (group ? 'auto' : '100%') + ';margin:4px ' + (group ? '12px' : '0') + ' 4px 0;padding:10px 14px;font:24px Arial;line-height:1.3;color:#fff;background:#203249;border:3px solid transparent;border-radius:6px;text-align:left;box-sizing:border-box;overflow-wrap:break-word';
      b.onfocus = function () { b.style.borderColor = '#ffc43d'; }; b.onblur = function () { b.style.borderColor = 'transparent'; }; b.onclick = fn; (parent || actions).appendChild(b); return b;
    }
    function draw(focus) {
      var scroll = list.scrollTop;
      card.style.height = Math.min(root.innerHeight * 0.88, self.downloading ? 480 : (r.core ? 500 : 440) + Math.min(6, choices.filter(function (c) { return !!c.site; }).length) * 64) + 'px';
      coreBox.textContent = ''; bulk.textContent = ''; list.textContent = ''; actions.textContent = '';
      list.style.display = bulk.style.display = coreBox.style.display = self.downloading ? 'none' : '';
      if (choices.some(function (c) { return !!c.site; })) {
        var label = document.createElement('p'); label.textContent = t('Site eklentileri', 'Site plugins'); label.style.cssText = 'font:bold 25px Arial;margin:0 0 5px'; bulk.appendChild(label);
        button(t('Tümünü seç', 'Select all'), 'select-all', function () { choices.forEach(function (c) { if (c.site) selected[c.key] = true; }); draw('select-all'); }, bulk, 'bulk');
        button(t('Seçimi kaldır', 'Clear selection'), 'clear-sites', function () { choices.forEach(function (c) { if (c.site) selected[c.key] = false; }); draw('clear-sites'); }, bulk, 'bulk');
      } else bulk.style.display = 'none';
      choices.forEach(function (c) {
        var b = button((selected[c.key] ? '☑ ' : '☐ ') + c.name, c.key, function () { selected[c.key] = !selected[c.key]; draw(c.key); }, c.site ? list : coreBox);
        b.disabled = self.downloading; b.setAttribute('aria-pressed', selected[c.key] ? 'true' : 'false');
      });
      selection.textContent = choices.filter(function (c) { return selected[c.key]; }).length + t(' paket seçildi', ' packages selected');
      var install = button(t('Seçilenleri güncelle', 'Update selected'), 'install', installSelected, actions, 'actions'); install.disabled = self.downloading || !choices.some(function (c) { return selected[c.key]; });
      button(self.downloading ? t('İptal', 'Cancel') : t('Vazgeç', 'Cancel'), 'later', close, actions, 'actions');
      list.scrollTop = scroll;
      var target = host.querySelector('[data-update-choice="' + (focus || 'later') + '"]'); lastFocus = target && !target.disabled ? target : buttons()[buttons().length - 1]; lastFocus.focus();
    }
    function installSelected() {
      if (self.downloading) return; self.downloading = true; var token = self.generation; draw('later');
      function check() { if (token !== self.generation || self.app.controller.content) throw new Error(t('Güncelleme iptal edildi.', 'Update cancelled.')); }
      var total = choices.filter(function (c) { return selected[c.key]; }).length, completed = 0; transfer.style.display = 'block';
      function progress() { meter.max = total; meter.value = completed; count.textContent = t('Tamamlanan paket: ', 'Completed packages: ') + completed + ' / ' + total; }
      progress();
      var task = Promise.resolve();
      if (selected.core && r.core) task = task.then(function () { check(); status.textContent = t('Çekirdek indiriliyor…', 'Downloading core…'); return self.core.download().then(function () { completed++; progress(); }); });
      choices.forEach(function (c) { if (c.site && selected[c.key]) task = task.then(function () { check(); status.textContent = t('Site paketi indiriliyor: ', 'Downloading site package: ') + c.site.name; return self.plugins.download(c.site.repoId, c.site.id).then(function () { completed++; progress(); }); }); });
      task.then(function () { check(); status.textContent = t('Güncellemeler uygulanıyor…', 'Applying updates…'); return selected.core && r.core ? self.core.apply() : null; }).then(function () { check(); status.textContent = t('Tamamlandı. Yeniden açılıyor…', 'Complete. Restarting…'); if (self.app.catalog.hub) self.app.catalog.hub.flush(); root.location.reload(); }, function (e) { self.downloading = false; if (cancelAndClose) return close(); status.textContent = e.message + t(' Doğrulanan hazır paketleri Güncelleme Merkezi’nden yönetebilirsiniz.', ' Manage verified pending packages in the Update Center.'); draw('later'); });
    }
    function keepFocus(e) { if (host.contains(e.target)) { lastFocus = e.target; return; } e.stopImmediatePropagation(); var target = lastFocus && host.contains(lastFocus) && !lastFocus.disabled ? lastFocus : buttons()[buttons().length - 1]; if (target) target.focus(); }
    function release(e) { var code = e.keyCode || e.which; if (active || held[code]) { e.stopImmediatePropagation(); delete held[code]; } unlisten(); }
    function key(e) {
      var code = e.keyCode || e.which;
      if (!active) { if (held[code]) { e.stopImmediatePropagation(); e.preventDefault(); } return; }
      e.stopImmediatePropagation(); e.preventDefault(); var repeated = held[code]; held[code] = true;
      if ([13,27,10009,37,38,39,40].indexOf(code) < 0 || e.repeat || repeated) return;
      if (code === 27 || code === 10009) return close();
      var a = buttons(), current = document.activeElement, i = a.indexOf(current), group = current && current.getAttribute('data-update-group'), step = code === 37 || code === 38 ? -1 : 1, next = null;
      if (i < 0) { keepFocus(e); return; }
      if (code === 13) { a[i].click(); return; }
      if (code === 37 || code === 39) {
        if (group) { var row = a.filter(function (b) { return b.getAttribute('data-update-group') === group; }); next = row[Math.max(0, Math.min(row.length - 1, row.indexOf(current) + step))]; }
      } else {
        var index = i + step;
        while (a[index] && group && a[index].getAttribute('data-update-group') === group) index += step;
        next = a[index];
      }
      if (next) { next.focus(); if (list.contains(next)) { var box = next.getBoundingClientRect(), clip = list.getBoundingClientRect(); if (box.bottom > clip.bottom) list.scrollTop += box.bottom - clip.bottom; else if (box.top < clip.top) list.scrollTop -= clip.top - box.top; } }
    }
    root.addEventListener('keydown', key, true); root.addEventListener('keyup', release, true); document.addEventListener('focusin', keepFocus, true);
    draw('later');
  };

  Coordinator.prototype.start = function () {
    var self = this, stopped = false;
    function attempt() {
      if (stopped || self.app.controller.content) return;
      var catalog = self.app.catalog;
      if (root.FilmRepositorySetup && root.FilmRepositorySetup.pending() || document.hidden || catalog.screen.loading || catalog.panel || catalog.editing || self.core.busy || self.plugins && self.plugins.busy) { self.timer = setTimeout(attempt, 1000); return; }
      self.check().then(function () { function show() { if(stopped||self.app.controller.content)return;if(document.hidden||self.app.catalog.panel||self.app.catalog.editing){self.timer=setTimeout(show,1000);return;}self.notify(); }show(); }, function () {});
    }
    this.timer = setTimeout(attempt, 2000);
    this.app.controller.on('open', function () { stopped = true;self.cancel(); });
    root.addEventListener('beforeunload', function () { stopped = true;self.cancel(); });
  };
  root.FilmUpdateCoordinator = { create: function (app) { return new Coordinator(app); }, start: function (app) { var instance = new Coordinator(app);root.FilmUpdateCoordinator.current = instance;instance.start();return instance; } };
})(window);
