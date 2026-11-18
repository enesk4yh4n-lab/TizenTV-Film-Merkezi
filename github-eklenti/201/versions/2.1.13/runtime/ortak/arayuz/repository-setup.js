/* Repository onboarding is independent of the versioned usage acknowledgement. */
(function (root) {
  'use strict';
  var KEY = 'filmmerkezi.repository-setup.v1', storage, blocked = false, pending = false, progress = {step:1,repoId:'',query:'',url:''};
  function save(completed) {
    if (blocked || !storage) return false;
    try { storage.setItem(KEY, JSON.stringify({ version: 1, completed: completed, step:progress.step,repoId:progress.repoId,query:progress.query,url:progress.url })); return true; }
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
          if (raw.length > 4096 || !value || value.version !== 1 || typeof value.completed !== 'boolean') throw new Error('Unknown setup record');
          pending = !value.completed;
          if(value.step!==undefined&&(typeof value.step!=='number'||value.step%1||value.step<1||value.step>6))throw Error('Unknown setup step');
          progress={step:value.step|| (existing?3:1),repoId:typeof value.repoId==='string'?value.repoId.slice(0,100):'',query:typeof value.query==='string'?value.query.slice(0,80):'',url:typeof value.url==='string'?value.url.slice(0,2048):''};
        } else if (pending && !save(false)) this.notice = true;
      } catch (ignore) { blocked = true; this.notice = true; }
    },
    pending: function () { return pending; },
    progress: function () { return progress; },
    checkpoint: function (step, extra) { progress.step=Math.max(1,Math.min(6,step));Object.keys(extra||{}).forEach(function(key){if(key==='repoId'||key==='query'||key==='url')progress[key]=String(extra[key]||'').slice(0,key==='url'?2048:key==='query'?80:100);});if(!save(false))this.notice=true; },
    start: function (app) {
      if (!pending) return;
      if(root.FilmSetupWizard){root.FilmSetupWizard.attach(app);return;}
      var catalog = app.catalog;
      catalog.panel = { kind: 'plugins', pluginView: 'setup-search', onboarding: true, centerAction:'add' };
      catalog.renderPanel('plugins-setup-done');
    },
    complete: function (catalog) {
      if (!save(true)) this.notice = true;
      pending = false;
      if(root.FilmSetupWizard)root.FilmSetupWizard.close();
      catalog.closePanel(true);
      if (this.notice) catalog.app.view.toast(root.FilmI18n && root.FilmI18n.language() === 'en' ? 'Setup is complete for this session; it could not be saved.' : 'Kurulum bu oturum için tamamlandı; kalıcı kaydedilemedi.');
    },
    key: KEY
  };
})(window);
