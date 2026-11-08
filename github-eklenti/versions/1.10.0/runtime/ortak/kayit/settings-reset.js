/* Explicit factory reset of this application only. Never deletes SDK or WGT files. */
(function (root) {
  'use strict';
  function text(tr, en) { return root.FilmI18n && root.FilmI18n.language() === 'en' ? en : tr; }
  function serial(items, fn) { var p = Promise.resolve(); items.forEach(function (x) { p = p.then(function () { return fn(x); }); }); return p; }
  function Reset(app, options) { this.app = app; this.options = options || {}; this.running = null; this.stage = ''; }
  Reset.prototype.resetAll = function () {
    if (this.running) return this.running;
    var self = this, app = this.app, core = root.FilmUpdate, plugins = root.FilmPlugins, catalog = app.catalog, raw, coreStore, pluginStore;
    function step(name, action) { return function () { self.stage = name; return action(); }; }
    function emptyStore(store, state) {
      if (!store) return Promise.resolve();
      /* Both journal slots are neutralized before any objects are removed. */
      return store.ready().then(function () { return store.write('state-a.json', JSON.stringify(state)); }).then(function () {
        state.seq++; return store.write('state-b.json', JSON.stringify(state));
      }).then(function () { return store.list(); }).then(function (names) {
        return serial(names, function (name) { return store.remove(name); });
      }).then(function () { return store.remove('state-a.json'); }).then(function () { return store.remove('state-b.json'); });
    }
    function deleteUserData() {
      var keys = [], prefixes = [], sites = app.siteManagement ? app.siteManagement.allSites : root.SiteRegistry.sites;
      sites.forEach(function (s) { if (s.storagePrefix) prefixes.push(s.storagePrefix); });
      for (var i = 0; i < raw.length; i++) { var key = raw.key(i); if (/^(?:chainprobe\.|filmmerkezi\.|site\.[a-z][a-z0-9-]*\.)/.test(key) || prefixes.some(function (p) { return key.indexOf(p) === 0; })) keys.push(key); }
      keys.forEach(function (key) { raw.removeItem(key); if (raw.getItem(key) !== null) throw new Error(text('Kayıt silinemedi: ', 'Could not delete record: ') + key); });
    }
    var task = Promise.resolve().then(step(text('Hazırlık', 'Preparation'), function () {
      if (app.controller.content) throw new Error(text('Önce oynatıcıdan çıkın.', 'Exit the player first.'));
      raw = self.options.storage || root.localStorage;
      if (!raw) throw new Error(text('Depolama kullanılamıyor.', 'Storage is unavailable.'));
      if (core && (!core.baselineRecord || !core.baseline)) throw new Error(text('Başlangıç paketi doğrulanamadı.', 'The bundled package could not be verified.'));
      return core ? core.record(core.baselineRecord) : null;
    })).then(step(text('İşlemleri durdurma', 'Stopping operations'), function () {
      if (catalog) catalog.begin();
      if (app.siteManagement) app.siteManagement.cancel();
      if (core) core.cancel();
      if (plugins) { plugins.cancel(); plugins.discardCandidate(); }
      var waits = [];
      [core && core.checking, core && core.downloading, core && core.writes, plugins && plugins.checking, plugins && plugins.writes, app.siteManagement && app.siteManagement.checking].forEach(function (p) { if (p && p.then) waits.push(p.then(function () {}, function () {})); });
      /* No package mutation may outlive this reset and repopulate a journal. */
      if (plugins && plugins.busy) throw new Error(text('Eklenti işlemi iptal ediliyor; tamamlanınca yeniden deneyin.', 'Plugin operation is being cancelled; retry when it finishes.'));
      return Promise.all(waits);
    })).then(step(text('Kayıt yazımlarını durdurma', 'Stopping record writes'), function () {
      if (catalog && catalog.hub) catalog.hub.flush();
      if (catalog && catalog.images) catalog.images.clear();
      if (catalog && catalog.storage && catalog.storage.suspendWrites) catalog.storage.suspendWrites();
      if (root.SiteAddresses) root.SiteAddresses.blocked = true;
      if (core) { clearTimeout(core.watchdog); core.blocked = true; coreStore = core.storage; }
      if (plugins) { plugins.blocked = true; pluginStore = plugins.store; }
    })).then(step(text('Depoları ve site paketlerini temizleme', 'Removing repositories and site packages'), function () {
      var repos = plugins ? Object.keys(plugins.state.repositories) : [];
      return serial(repos, function (id) { return plugins.transport.removeRepository(id); }).then(function () {
        return emptyStore(pluginStore, { schemaVersion: 1, seq: (plugins ? plugins.state.seq : 0) + 1, repositories: {}, plugins: {} });
      });
    })).then(step(text('Kişisel kayıtları temizleme', 'Removing personal records'), deleteUserData)).then(step(text('İndirilen çekirdeği temizleme', 'Removing downloaded core'), function () {
      return emptyStore(coreStore, { schemaVersion: 1, seq: (core ? core.state.seq : 0) + 1, active: null, previous: null, pending: null, booting: false, revision: 0, checkedAt: 0 });
    })).then(function () { self.stage = ''; return { reset: true, bundled: core && core.baseline.version }; });
    this.running = task.then(function (result) { self.running = null; return result; }, function (error) {
      self.running = null;
      throw new Error(self.stage + ' · ' + error.message + text(' Bazı veriler silinmiş olabilir.', ' Some data may already have been removed.'));
    });
    return this.running;
  };
  root.SettingsResetService = Reset;
})(window);
