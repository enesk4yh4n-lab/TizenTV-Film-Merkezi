(function (root) {
  'use strict';
  function t(tr, en) { return root.FilmI18n && root.FilmI18n.language() === 'en' ? en : tr; }
  function draw(catalog, box, panel) {
    var manager = root.FilmPlugins, view = panel.pluginView || 'repositories';
    function line(value, small) { var p = document.createElement('p'); p.className = small ? 'support-description' : 'catalog-note'; p.style.wordWrap = 'break-word'; p.textContent = value; box.appendChild(p); }
    function button(label, key, fn, enabled) { var b = document.createElement('button'); b.type = 'button'; b.className = 'filter-field'; b.setAttribute('data-focus', key); b.textContent = label; b.disabled = enabled === false || !!panel.working && key !== 'plugins-cancel-work'; b.onclick = fn; box.appendChild(b); return b; }
    function show(next, focus) { panel.pluginView = next; catalog.renderPanel(focus); }
    function work(fn, next, focus) { if (panel.working) return; panel.working = true; var promise; try { promise = fn(); } catch (e) { promise = Promise.reject(e); } catalog.renderPanel('plugins-cancel-work'); promise.then(function () { panel.working = false; if (next) panel.pluginView = next; if (catalog.panel === panel) catalog.renderPanel(focus); }, function (e) { panel.working = false; manager.note = e.message; manager.errorReport = root.FilmErrorReporter && root.FilmErrorReporter.capture({scope:'update',stage:'plugin-operation',siteId:panel.pluginId,error:e}); if (catalog.panel === panel) catalog.renderPanel(); }); }
    function back(next) { button(t('← Geri', '← Back'), 'plugins-back', function () { manager.discardCandidate(); show(next); }); }
    if (!manager) { line(t('Eklenti yöneticisi açılamadı.', 'Plugin manager is unavailable.')); return; }
    if (manager.note) line(manager.note);
    if (manager.errorReport && root.FilmErrorReporter) box.appendChild(root.FilmErrorReporter.button(manager.errorReport, 'plugins-report-error'));
    if (panel.working || manager.busy) { line(t('İşlem sürüyor…', 'Working…')); button(t('İndirmeyi iptal et', 'Cancel transfer'), 'plugins-cancel-work', function () { manager.cancel(); }); return; }
    if (manager.blocked) { line(t('Eklenti kaydı korunuyor; bu oturumda değiştirilemez.', 'Plugin records are preserved and read-only in this session.')); return; }
    if (view === 'repositories') {
      line(t('Kendi GitHub veya HTTPS eklenti deponuzu ekleyin.', 'Add your own GitHub or HTTPS plugin repository.'));
      button(t('+ Depo ekle', '+ Add repository'), 'plugins-add-repository', function () { panel.url = ''; panel.replaceId = ''; show('address', 'plugins-url-edit'); });
      button(t('Kurulu eklentiler', 'Installed plugins'), 'plugins-installed', function () { show('installed'); });
      Object.keys(manager.state.repositories).forEach(function (id) { var r = manager.state.repositories[id]; button(r.name + (r.enabled ? '' : t(' · Kapalı', ' · Disabled')), 'plugins-repo-' + id, function () { panel.repoId = id; show('repository'); }); });
      if (!Object.keys(manager.state.repositories).length) line(t('Henüz eklenmiş depo yok.', 'No repositories have been added.'));
    } else if (view === 'address') {
      line(t('repository.json adresi', 'repository.json address'));
      var input = document.createElement('input'); input.type = 'url'; input.id = 'plugins-url'; input.maxLength = 2048; input.value = panel.url || ''; input.readOnly = true; input.tabIndex = -1; input.style.cssText = 'box-sizing:border-box;width:100%;font-size:25px;padding:14px;background:#101d30;color:white;border:2px solid #576781'; input.oninput = function () { panel.url = input.value; }; box.appendChild(input);
      button(t('Adresi düzenle · OK ile klavye', 'Edit address · OK opens keyboard'), 'plugins-url-edit', function () { panel.inputEditing = true; input.readOnly = false; input.focus(); });
      button(t('Depoyu incele', 'Inspect repository'), 'plugins-probe', function () { panel.url = input.value; work(function () { return manager.probe(panel.url); }, 'trust', 'plugins-trust'); });
      back(panel.replaceId ? 'repository' : 'repositories');
    } else if (view === 'trust') {
      var candidate = manager.candidate; if (!candidate) { show('address'); return; }
      line(candidate.repository.name); line(candidate.url, true);
      line(t('Yayıncı anahtarı · SHA-256', 'Publisher key · SHA-256')); line(candidate.fingerprint.match(/.{1,8}/g).join(' '), true);
      line(t('Bu yayıncının eklentileri uygulamayla aynı JavaScript yetkileriyle çalışır. Yayıncıyı seçerek güven verirsiniz; Film Merkezi onayı gerekmez.', 'Plugins from this publisher run with the same JavaScript permissions as the app. You choose whom to trust; Film Merkezi approval is not required.'));
      button(t('Yayıncıya güven ve depoyu ekle', 'Trust publisher and add repository'), 'plugins-trust', function () { work(function () { return manager.approve(panel.replaceId).then(function (id) { panel.repoId = id; }); }, 'repository'); });
      back('address');
    } else if (view === 'repository') {
      var repo = manager.state.repositories[panel.repoId]; if (!repo) { show('repositories'); return; }
      line(repo.name); line(repo.url, true); line(t('Parmak izi: ', 'Fingerprint: ') + repo.fingerprint.match(/.{1,8}/g).join(' '), true);
      if (manager.errors[repo.id]) line(manager.errors[repo.id]);
      button(t('Eklentilere gözat', 'Browse plugins'), 'plugins-browse', function () { work(function () { return manager.catalog(repo.id).then(function (index) { panel.index = index; }); }, 'catalog'); });
      button(t('Güncellemeleri kontrol et', 'Check for updates'), 'plugins-check', function () { work(function () { return manager.checkRepository(repo.id).then(function (index) { panel.index = index; }); }, 'catalog'); });
      button(repo.enabled ? t('Depoyu devre dışı bırak', 'Disable repository') : t('Depoyu etkinleştir', 'Enable repository'), 'plugins-toggle-repository', function () { work(function () { return manager.commit(function (s) { s.repositories[repo.id].enabled = !repo.enabled; }).then(function () { manager.restartNeeded = true; }); }); });
      button(t('Depo adresini değiştir', 'Change repository address'), 'plugins-change-address', function () { panel.url = repo.url; panel.replaceId = repo.id; show('address', 'plugins-url-edit'); });
      button(t('Depoyu kaldır', 'Remove repository'), 'plugins-remove-repository', function () { panel.confirmAction = 'repository'; show('confirm'); }); back('repositories');
    } else if (view === 'catalog') {
      line(manager.state.repositories[panel.repoId].name);
      if (!panel.index || !panel.index.plugins.length) line(t('Bu depoda eklenti yok.', 'This repository has no plugins.'));
      (panel.index ? panel.index.plugins : []).forEach(function (item) { var key = panel.repoId + '/' + item.id, installed = manager.state.plugins[key]; button(item.name + ' · ' + item.version + (installed ? t(' · Kurulu', ' · Installed') : ''), 'plugins-package-' + item.id, function () { panel.item = item; panel.pluginKey = key; show('plugin'); }); }); back('repository');
    } else if (view === 'installed') {
      if (!Object.keys(manager.state.plugins).length) line(t('Henüz kurulu eklenti yok.', 'No plugins are installed.'));
      Object.keys(manager.state.plugins).forEach(function (key) { var p = manager.state.plugins[key]; button((p.name || p.id) + (p.enabled ? t(' · Etkin', ' · Enabled') : t(' · Kapalı', ' · Disabled')) + (p.error || manager.errors[key] ? ' ⚠' : ''), 'plugins-owned-' + p.id + '-' + p.repoId, function () { panel.pluginKey = key; panel.repoId = p.repoId; panel.item = null; show('plugin'); }); }); back('repositories');
    } else if (view === 'plugin') {
      var installed = manager.state.plugins[panel.pluginKey], item = panel.item;
      line(item ? item.name : installed ? installed.name || installed.id : '');
      if (item && item.description) line(item.description);
      if (installed) { line(t('Kurulu: ', 'Installed: ') + (installed.active ? installed.active.version : '—') + (installed.pending ? t(' · Hazır: ', ' · Ready: ') + installed.pending.version : '')); if (installed.error) line(installed.error); if (manager.errors[panel.pluginKey]) line(manager.errors[panel.pluginKey]); }
      if (item) button(installed ? t('Eklentiyi güncelle / yeniden indir', 'Update / download plugin again') : t('Eklentiyi yükle', 'Install plugin'), 'plugins-install', function () { work(function () { return manager.download(panel.repoId, item.id); }, 'plugin'); });
      if (installed) {
        button(installed.enabled ? t('Devre dışı bırak', 'Disable') : t('Etkinleştir', 'Enable'), 'plugins-toggle', function () { work(function () { return manager.toggle(panel.pluginKey, !installed.enabled).then(function () { manager.restartNeeded = true; }); }); });
        if (installed.previous) button(t('Önceki eklenti sürümüne dön', 'Restore previous plugin version'), 'plugins-rollback', function () { work(function () { return manager.rollback(panel.pluginKey).then(function () { manager.restartNeeded = true; }); }); });
        button(t('Eklentiyi kaldır', 'Uninstall plugin'), 'plugins-remove', function () { panel.confirmAction = 'plugin'; show('confirm'); });
      }
      back(item ? 'catalog' : 'installed');
    } else if (view === 'confirm') {
      line(t('Kaldırma yeniden açılışta uygulanır. İzleme kayıtları silinmez.', 'Removal takes effect after restart. Viewing records are kept.'));
      button(t('Kaldır', 'Remove'), 'plugins-confirm-remove', function () { work(function () { return (panel.confirmAction === 'repository' ? manager.removeRepository(panel.repoId) : manager.removePlugin(panel.pluginKey)).then(function () { manager.restartNeeded = true; }); }, panel.confirmAction === 'repository' ? 'repositories' : 'installed'); }); back(panel.confirmAction === 'repository' ? 'repository' : 'plugin');
    }
    var pending = Object.keys(manager.state.plugins).some(function (key) { return !!manager.state.plugins[key].pending; });
    if (pending || manager.restartNeeded) { line(t('Değişiklikler yeniden açılınca uygulanır.', 'Changes take effect after restart.')); button(t('Uygula ve yeniden aç', 'Apply and restart'), 'plugins-restart', function () { if (manager.busy || manager.core.busy || catalog.app.controller.content) return; if (catalog.hub) catalog.hub.flush(); root.location.reload(); }); }
  }
  function key(catalog, event) {
    var panel = catalog.panel, input = document.getElementById('plugins-url'); if (!panel || panel.kind !== 'plugins') return false;
    var code = event.keyCode;
    if (panel.inputEditing) {
      if ([13, 65376, 65385, 27, 10009].indexOf(code) >= 0) { event.preventDefault(); panel.inputEditing = false; if (input) { panel.url = input.value; input.readOnly = true; input.blur(); } catalog.focus(code === 13 || code === 65376 ? 'plugins-probe' : 'plugins-url-edit'); }
      return true;
    }
    if (code === 27 || code === 10009) { if (panel.pluginView && panel.pluginView !== 'repositories') { event.preventDefault(); root.FilmPlugins.discardCandidate(); panel.pluginView = panel.pluginView === 'trust' ? 'address' : panel.pluginView === 'catalog' ? 'repository' : panel.pluginView === 'plugin' ? panel.item ? 'catalog' : 'installed' : 'repositories'; catalog.renderPanel(); return true; } root.FilmPlugins.discardCandidate(); }
    return false;
  }
  root.FilmPluginPanel = { draw: draw, key: key };
})(window);
