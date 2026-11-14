/* Session-only batch runner; existing signed plugin operations own every write. */
(function (root) {
  'use strict';
  function t(tr, en) { return root.FilmI18n && root.FilmI18n.language() === 'en' ? en : tr; }
  function Batch(manager, action, rows, notify) {
    this.manager = manager; this.action = action; this.notify = notify || function () {};
    this.running = true; this.cancelled = false; this.active = false;
    this.items = rows.map(function (r) { return { key:r.key, name:r.name, repoId:r.repoId, pluginId:r.pluginId, targetVersion:r.available || r.pending || r.version || '', status:'queued', message:'' }; });
  }
  Batch.prototype.cancel = function () { if (!this.running) return; this.cancelled = true; if (this.active && this.action !== 'remove') this.manager.plugins.cancel(); };
  Batch.prototype.run = function () {
    var self = this, m = this.manager;
    function report() { try { self.notify(self); } catch (ignore) {} }
    function playing() { return !!(m.plugins.app && m.plugins.app.controller.content); }
    function step(index) {
      if (self.cancelled || playing()) {
        self.cancelled = true;
        self.items.slice(index).forEach(function (item) { item.status = 'cancelled'; }); report(); return Promise.resolve();
      }
      if (index >= self.items.length) return Promise.resolve();
      var item = self.items[index], record = m.plugins.state.plugins[item.key], repo = m.plugins.state.repositories[item.repoId];
      item.status = 'running'; report();
      var task = Promise.resolve().then(function () {
        if (self.cancelled || playing()) { var cancelled = new Error(t('İşlem iptal edildi.', 'Operation cancelled.')); cancelled.cancelled = true; throw cancelled; }
        if (self.action === 'remove') return m.plugins.removePlugin(item.key);
        if (!repo || !repo.enabled) throw new Error(t('Eklentinin deposu kapalı veya kaldırılmış.', 'Plugin repository is disabled or removed.'));
        if (self.action === 'update' && record && record.pending) { item.message = t('Zaten hazır; yeniden indirilmedi.', 'Already prepared; not downloaded again.'); return; }
        self.active = true; return m.plugins.download(item.repoId, item.pluginId);
      });
      return task.then(function () { self.active = false; item.status = self.action === 'remove' ? 'removed' : 'ready'; m.restartNeeded = true; report(); }, function (e) { self.active = false; item.status = self.cancelled || e.cancelled ? 'cancelled' : 'failed'; item.message = String(e.message || e).slice(0,240); if (item.status === 'failed' && root.FilmErrorReporter) item.errorReport = root.FilmErrorReporter.capture({scope:'update',stage:'package-'+self.action,siteId:item.pluginId,pluginVersion:item.targetVersion,error:e}); report(); }).then(function () { return step(index + 1); });
    }
    report();
    return step(0).then(function () { self.running = false; report(); return self; }, function (e) { self.running = false; report(); throw e; });
  };
  Batch.start = function (manager, action, keys, notify) {
    if (['install','update','remove'].indexOf(action) < 0 || !Array.isArray(keys) || !keys.length || keys.length > 64) return Promise.reject(new Error(t('Bir işlemde 1–64 eklenti seçin.', 'Select 1–64 plugins per operation.')));
    if (!manager.plugins || manager.busy() || manager.plugins.blocked || manager.plugins.app && manager.plugins.app.controller.content) return Promise.reject(new Error(t('Önce mevcut işlemden veya oynatıcıdan çıkın.', 'Close the current operation or player first.')));
    var groups = manager.packageGroups(), allowed = action === 'install' ? groups.newSites : action === 'update' ? groups.updates : groups.installed, rows = [], seen = Object.create(null);
    for (var i = 0; i < keys.length; i++) {
      var row = allowed.filter(function (r) { return r.key === keys[i]; })[0];
      if (!row || seen[keys[i]]) return Promise.reject(new Error(t('Eklenti seçimi değişti; listeyi yenileyin.', 'Plugin selection has changed; refresh the list.')));
      seen[keys[i]] = true; rows.push(row);
    }
    if (action === 'install' && Object.keys(manager.plugins.state.plugins).length + rows.length > 64) return Promise.reject(new Error(t('En fazla 64 eklenti kurulabilir; daha az paket seçin.', 'At most 64 plugins can be installed; select fewer packages.')));
    var batch = manager.batch = new Batch(manager, action, rows, notify); return batch.run();
  };
  root.FilmPluginBatch = Batch;
})(window);
