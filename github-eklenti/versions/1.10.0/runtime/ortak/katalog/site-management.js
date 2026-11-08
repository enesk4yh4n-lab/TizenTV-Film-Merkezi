/* Coordinates existing core/plugin managers; their stores, trust and downloads stay separate. */
(function (root) {
  'use strict';
  function Manager(options) {
    this.preferences = options.preferences; this.registry = options.registry; this.plugins = options.plugins; this.core = options.core;
    this.allSites = this.registry.sites.slice(); this.catalogs = {}; this.failures = {}; this.checkedAt = 0; this.checking = null; this.generation = 0; this.restartNeeded = false; this.note = '';
  }
  Manager.prototype.applyRegistry = function () {
    var self = this, selected = this.allSites.filter(function (site) { return site.pluginKey || self.preferences.siteEnabled(site.id); });
    if (!selected.length && this.allSites.length) { selected.push(this.allSites.filter(function (s) { return !s.pluginKey; })[0] || this.allSites[0]); this.note = 'Açılış için bir site geçici olarak etkinleştirildi.'; }
    this.registry.sites.splice(0, this.registry.sites.length);
    selected.forEach(function (site) { self.registry.sites.push(site); });
  };
  Manager.prototype.rows = function () {
    var self = this, rows = [], manager = this.plugins;
    this.allSites.filter(function (site) { return !site.pluginKey; }).forEach(function (site) { rows.push({ key: 'builtin:' + site.id, id: site.id, name: site.name, builtin: true, enabled: self.preferences.siteEnabled(site.id), loaded: self.registry.sites.indexOf(site) >= 0, updateState: 'builtin', coreVersion: self.core ? self.core.status().current : root.AppInfo && root.AppInfo.version }); });
    if (!manager) return rows;
    Object.keys(manager.state.plugins).forEach(function (key) {
      var p = manager.state.plugins[key], repo = manager.state.repositories[p.repoId], index = self.catalogs[p.repoId], item = index && index.plugins.filter(function (x) { return x.id === p.id; })[0], active = p.active, pending = p.pending, state = 'unknown', error = self.failures[p.repoId] || p.error || manager.errors[p.repoId] || '';
      if (pending) state = 'ready';
      else if (item && active) {
        var compare = root.FilmPluginSchema.compare(item.version, active.version);
        state = compare > 0 ? 'available' : compare === 0 ? 'current' : 'older';
        if (compare === 0 && item.manifestSha256 !== active.hash) { state = 'error'; error = 'Aynı eklenti sürümü farklı dosyalarla yayımlanmış.'; }
      } else if (item) state = 'available';
      rows.push({ key: key, id: p.siteId || p.id, pluginId: p.id, repoId: p.repoId, name: p.name || p.id, builtin: false, enabled: p.enabled && !!repo && repo.enabled, ownEnabled: p.enabled, repositoryEnabled: !!repo && repo.enabled, loaded: !!manager.loaded[key], version: active && active.version || '', pending: pending && pending.version || '', previous: p.previous && p.previous.version || '', available: item && item.version || '', updateState: state, error: error });
    });
    return rows;
  };
  Manager.prototype.busy = function () { return !!(this.checking || this.plugins && this.plugins.busy || this.core && this.core.busy); };
  Manager.prototype.checkSites = function (onlyRepo) {
    var self = this, manager = this.plugins; if (this.checking) return this.checking;
    if (!manager) return Promise.resolve({ checked: [], failed: [], disabled: [] });
    if (manager.busy || this.core && this.core.busy || manager.app && manager.app.controller.content) return Promise.reject(new Error('Önce mevcut işlemden veya oynatıcıdan çıkın.'));
    var token = ++this.generation, result = { checked: [], failed: [], disabled: [] }, task = Promise.resolve();
    Object.keys(manager.state.repositories).filter(function (id) { return !onlyRepo || id === onlyRepo; }).forEach(function (id) {
      task = task.then(function () {
        if (token !== self.generation) throw new Error('Site güncelleme kontrolü iptal edildi.');
        if (!manager.state.repositories[id].enabled) { result.disabled.push(id); return; }
        return manager.checkRepository(id).then(function (catalog) { if (token !== self.generation) throw new Error('Site güncelleme kontrolü iptal edildi.'); self.catalogs[id] = catalog; delete self.failures[id]; result.checked.push(id); }, function (error) { if (token !== self.generation) throw error; self.failures[id] = error.message; result.failed.push({ id: id, message: error.message }); });
      });
    });
    this.checking = task.then(function () { self.checkedAt = Date.now(); self.checking = null; return result; }, function (error) { self.checking = null; throw error; }); return this.checking;
  };
  Manager.prototype.cancel = function () { if (!this.checking) return; this.generation++; if (this.plugins) this.plugins.cancel(); };
  Manager.prototype.hasChanges = function () {
    var manager = this.plugins;
    return this.restartNeeded || !!(manager && manager.restartNeeded) || this.rows().some(function (r) { return !!r.pending || r.enabled !== r.loaded; }) || !!(manager && Object.keys(manager.loaded).some(function (key) { return !manager.state.plugins[key]; }));
  };
  Manager.prototype.toggle = function (key, enabled) {
    var self = this, rows = this.rows(), row = rows.filter(function (x) { return x.key === key; })[0];
    if (!row) return Promise.reject(new Error('Site bulunamadı.'));
    if (this.busy()) return Promise.reject(new Error('Önce mevcut işlemi tamamlayın.'));
    if (!enabled && !rows.some(function (x) { return x.key !== key && x.enabled && (x.builtin || x.version || x.pending); })) return Promise.reject(new Error('En az bir site etkin kalmalı.'));
    var task;
    if (row.builtin) { if (this.preferences.siteEnabled(row.id, enabled) !== enabled) return Promise.reject(new Error('Site tercihi kaydedilemedi; mevcut seçim korundu.')); task = Promise.resolve(); }
    else if (!row.repositoryEnabled) return Promise.reject(new Error('Önce bu sitenin deposunu etkinleştirin.'));
    else task = this.plugins.toggle(key, enabled);
    return task.then(function () { self.restartNeeded = true; if (self.plugins) self.plugins.restartNeeded = true; });
  };
  Manager.prototype.download = function (key) { var self = this, row = this.rows().filter(function (x) { return x.key === key; })[0]; if (this.busy()) return Promise.reject(new Error('Önce mevcut işlemi tamamlayın.')); if (!row || row.builtin) return Promise.reject(new Error('Bu site yerleşik paketle güncellenir.')); return this.plugins.download(row.repoId, row.pluginId).then(function (v) { self.restartNeeded = true; return v; }); };
  Manager.prototype.remove = function (key) { if (this.busy()) return Promise.reject(new Error('Önce mevcut işlemi tamamlayın.')); if (!this.plugins || key.indexOf('builtin:') === 0) return Promise.reject(new Error('Yerleşik site kaldırma yerine devre dışı bırakılabilir.')); var self = this; return this.plugins.removePlugin(key).then(function () { self.restartNeeded = true; }); };
  Manager.prototype.rollback = function (key) { if (this.busy()) return Promise.reject(new Error('Önce mevcut işlemi tamamlayın.')); var self = this; return this.plugins.rollback(key).then(function () { self.restartNeeded = true; }); };
  root.FilmSiteManagement = Manager;
})(window);
