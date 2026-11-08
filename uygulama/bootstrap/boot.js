/* Stable startup, verified Blob execution, and whole-release recovery. */
(function (root) {
  'use strict';
  var manager, recovering = false;
  function fail(error) {
    if (recovering) return; recovering = true;
    if (manager) clearTimeout(manager.watchdog);
    var status = document.getElementById('update-boot-status'); status.textContent = 'Bileşenler başlatılamadı: ' + error.message;
    if (manager && manager.state.active && !manager.blocked) manager.rollback().then(function () { root.location.reload(); }, function () { document.getElementById('update-retry').style.display = 'block'; });
    else document.getElementById('update-retry').style.display = 'block';
  }
  document.getElementById('update-retry').onclick = function () { root.location.reload(); };
  root.addEventListener('error', function (event) { if (root.FilmPlugins && root.FilmPlugins.loading) { root.FilmPlugins.scriptErrors[root.FilmPlugins.loading] = event.message || 'Plugin script failed'; return; } if (manager && !manager.healthy && event.message) fail(new Error(event.message)); });
  function sequence(paths, fn) { var p = Promise.resolve(); paths.forEach(function (path) { p = p.then(function () { return fn(path); }); }); return p; }
  function newer(a, b) { var x = a.split('.'), y = b.split('.'), i; for (i = 0; i < 3; i++) { if (+x[i] !== +y[i]) return +x[i] > +y[i]; } return false; }
  function start() {
    manager = root.FilmUpdate = new root.FilmUpdateManager();
    return manager.init().then(function () {
      if (manager.state.booting && manager.state.active) return manager.rollback();
    }).then(function () { return manager.record(manager.state.active || manager.baselineRecord); }).then(function (m) {
      if (!manager.blocked && manager.state.active && newer(manager.baseline.version, m.version) && manager.state.baselineAttempted !== manager.baseline.version) return manager.commit({ previous: manager.state.active, active: manager.baselineRecord, pending: null, booting: false, baselineAttempted: manager.baseline.version }).then(function () { return manager.baseline; });
      return m;
    }).then(function (m) {
      manager.selected = m; m.files.forEach(function (file) { manager.entries[file.path] = file; });
      return manager.blocked ? null : manager.commit({ booting: true });
    }).then(function () {
      var policy = manager.selected.networkPolicy;
      if (!policy) return;
      return Promise.all([manager.source(policy.file), manager.source(policy.signature)]).then(function (files) { return manager.trust.verify(files[0], files[1]).then(function () { return root.FilmNativeTLS.configure(files[0], files[1]); }); });
    }).then(function () { root.FilmPlugins = new root.FilmPluginManager(manager); return root.FilmPlugins.init().then(function () { return root.FilmPlugins.prepare(); }); }).then(function () { return manager.source(manager.selected.sites); }).then(function (text) {
      manager.groups = root.FilmUpdateVerify.sites(text, manager.selected).concat(root.FilmPlugins.groups());
      return manager.source(manager.selected.shell);
    }).then(function (html) {
      if (/<script\b|\son[a-z]+\s*=|javascript\s*:/i.test(html)) throw new Error('Arayüz şablonu geçersiz.');
      document.getElementById('update-runtime').innerHTML = html;
      return sequence(manager.selected.styles, function (path) { return manager.source(path).then(function (text) { if (/\burl\s*\(|@import/i.test(text)) throw new Error('CSS dış dosya başvurusu desteklenmiyor.'); var link = document.createElement('link'), url = root.URL.createObjectURL(new Blob([text], { type: 'text/css' })); link.rel = 'stylesheet'; link.href = url; link.onload = link.onerror = function () { root.URL.revokeObjectURL(url); }; document.head.appendChild(link); }); });
    }).then(function () {
      manager.watchdog = setTimeout(function () { fail(new Error('Başlangıç süresi doldu.')); }, 45000);
      return sequence(manager.selected.scripts, function (path) { return new Promise(function (resolve, reject) { var script = document.createElement('script'); script.onload = resolve; script.onerror = function () { reject(new Error('Kod yüklenemedi: ' + path)); }; manager.appendScript(script, path).catch(reject); }); });
    }).then(function () { if (root.FilmLegal && root.FilmLegal.consent && !root.FilmLegal.consent.accepted && document.getElementById('legal-overlay').getAttribute('aria-hidden') === 'false') manager.markHealthy(); });
  }
  try { start().catch(fail); } catch (error) { fail(error); }
})(window);
