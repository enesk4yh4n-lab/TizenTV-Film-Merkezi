/* Repository onboarding is independent of the versioned usage acknowledgement. */
(function (root) {
  'use strict';
  var KEY = 'filmmerkezi.repository-setup.v1', storage, blocked = false, pending = false;
  function save(completed) {
    if (blocked || !storage) return false;
    try { storage.setItem(KEY, JSON.stringify({ version: 1, completed: completed })); return true; }
    catch (ignore) { return false; }
  }
  root.FilmRepositorySetup = {
    init: function (local, existing) {
      storage = local;
      pending = !existing;
      try {
        var raw = storage && storage.getItem(KEY), value;
        if (raw) {
          value = JSON.parse(raw);
          if (raw.length > 1024 || !value || value.version !== 1 || typeof value.completed !== 'boolean') throw new Error('Unknown setup record');
          pending = !value.completed;
        } else if (pending && !save(false)) this.notice = true;
      } catch (ignore) { blocked = true; this.notice = true; }
    },
    pending: function () { return pending; },
    start: function (app) {
      if (!pending) return;
      var catalog = app.catalog;
      catalog.panel = { kind: 'plugins', pluginView: 'repositories', onboarding: true };
      catalog.renderPanel(root.FilmPlugins && root.FilmPlugins.blocked ? 'plugins-setup-done' : 'plugins-add-repository');
    },
    complete: function (catalog) {
      if (!save(true)) this.notice = true;
      pending = false;
      catalog.closePanel(true);
      if (this.notice) catalog.app.view.toast(root.FilmI18n && root.FilmI18n.language() === 'en' ? 'Setup is complete for this session; it could not be saved.' : 'Kurulum bu oturum için tamamlandı; kalıcı kaydedilemedi.');
    },
    key: KEY
  };
})(window);
