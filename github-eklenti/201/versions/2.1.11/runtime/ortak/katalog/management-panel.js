/* User-facing management only; core and site package writers are not combined. */
(function (root) {
  'use strict';
  function t(tr, en) { return root.FilmI18n && root.FilmI18n.language() === 'en' ? en : tr; }
  function render(a, focusKey) {
    var p = a.panel; if(p&&p.kind==='update-center'&&root.FilmUpdateCenter)return root.FilmUpdateCenter.render(a,focusKey); if (!p || ['active-sites', 'site-management', 'update-center'].indexOf(p.kind) < 0) return false;
    var m = a.app.siteManagement, updates = root.FilmUpdateCoordinator && root.FilmUpdateCoordinator.current, host = document.getElementById('catalog-modal'), box = document.getElementById('catalog-modal-card');
    host.classList.remove('fm-settings'); host.style.display = 'block'; if(root.FilmUpdateCenter)root.FilmUpdateCenter.clear(box);else box.textContent = '';
    function line(text, title) { var x = document.createElement(title ? 'h2' : 'p'); x.className = title ? '' : 'catalog-note'; x.textContent = text; box.appendChild(x); }
    function button(text, key, action, enabled) { var x = document.createElement('button'); x.type = 'button'; x.className = 'filter-field'; x.setAttribute('data-focus', key); x.textContent = text; x.disabled = enabled === false || !!p.working && key !== 'panel-cancel' && key !== 'management-cancel'; x.onclick = action; box.appendChild(x); return x; }
    function draw(key) { if (a.panel === p) a.renderPanel(key); }
    function work(fn, key) {
      if (p.working || m.busy()) return; p.working = true; p.notice = '';
      Promise.resolve().then(fn).then(function () { p.working = false; draw(key); }, function (e) { p.working = false; p.notice = e.message; p.errorReport = root.FilmErrorReporter && root.FilmErrorReporter.capture({scope:'update',stage:'package-operation',error:e}); draw(key); }); draw('panel-cancel');
    }
    function open(kind, key, extra) { var child = { kind: kind, settingsParent: p, settingsReturnKey: key, returnKey: 'catalog-tools' }; Object.keys(extra || {}).forEach(function (k) { child[k] = extra[k]; }); a.panel = child; a.renderPanel(); }
    function restart() { if (m.busy() || a.app.controller.content) return; if (a.hub) a.hub.flush(); root.location.reload(); }
    function state(row) { return row.pending ? t('Hazır: ', 'Ready: ') + row.pending : row.updateState === 'available' ? t('Yeni: ', 'New: ') + row.available : row.updateState === 'current' ? t('Güncel', 'Up to date') : row.builtin ? t('Yerleşik', 'Built-in') : t('Kontrol edilmedi', 'Not checked'); }
    function repository(row) { var repo = m.plugins && m.plugins.state.repositories[row.repoId]; return row.builtin ? t('Uygulama paketi', 'Application bundle') : repo ? (repo.displayName || repo.name) + ' · ' + repo.url : t('Depo bulunamadı', 'Repository unavailable'); }
    function showSite(row) { p.view = 'site'; p.siteKey = row.key; p.confirm = false; draw('management-site-check'); }
    line(p.kind === 'active-sites' ? t('Aktif siteler', 'Active sites') : p.kind === 'update-center' ? t('Güncelleme Merkezi', 'Update Center') : t('Kurulu site paketleri', 'Installed site packages'), true);
    if (!m) { line(t('Site yönetimi açılamadı.', 'Site management is unavailable.')); return true; }
    if (p.notice) line(p.notice);
    if (p.errorReport && root.FilmErrorReporter) box.appendChild(root.FilmErrorReporter.button(p.errorReport, 'management-report-error'));
    if (m.note) line(m.note);
    if (m.hasChanges()) line(t('Site değişiklikleri yeniden açılınca uygulanır.', 'Site changes take effect after restart.'));
    if (p.working) line(t('İşlem sürüyor…', 'Working…'));
    if (m.checking || updates && updates.task) button(t('Kontrolü iptal et', 'Cancel check'), 'management-cancel', function () { if (updates) updates.cancel(); else m.cancel(); });
    if (p.kind === 'active-sites') {
      line(t('Pasif siteler katalog, arama ve video kaynaklarına katılmaz. Seçimler yeniden açılınca uygulanır.', 'Disabled sites are excluded from catalogs, search and video sources. Selections apply after restart.'));
      m.rows().forEach(function (row) {
        button(row.name + ' · ' + (row.enabled ? t('Açık', 'On') : t('Kapalı', 'Off')) + (row.enabled !== row.loaded ? t(' · Bekleyen değişiklik', ' · Pending change') : ''), 'management-active-' + row.id, function () { work(function () { return m.toggle(row.key, !row.enabled); }, 'management-active-' + row.id); }, !m.busy() && (row.builtin || row.repositoryEnabled));
      });
      if (m.hasChanges()) button(t('Uygula ve yeniden aç', 'Apply and restart'), 'management-sites-apply', restart, !m.busy());
    } else if (p.view === 'available') {
      var item = p.packageItem, repo = item && m.plugins && m.plugins.state.repositories[item.repoId];
      if (!item || !repo) { line(t('Eklenti veya depo bulunamadı.', 'Plugin or repository unavailable.')); }
      else {
        var installed = m.rows().filter(function (r) { return r.key === item.key; })[0];
        line(item.name, true); line(t('Yeni sürüm: ', 'Available version: ') + item.available); line(t('Depo: ', 'Repository: ') + (repo.displayName || repo.name)); line(repo.url);
        if (item.error) line(item.error);
        if (installed) line(t('Kurulu: ', 'Installed: ') + (installed.version || '—') + (installed.pending ? t(' · Hazır: ', ' · Ready: ') + installed.pending : ''));
        if (!installed || !installed.pending) button(t('Eklentiyi indir', 'Download plugin'), 'management-available-install', function () { work(function () { return m.plugins.download(item.repoId,item.pluginId).then(function () { m.restartNeeded=true; }); }, 'management-available-back'); }, !m.busy() && repo.enabled);
        if (installed && installed.pending) button(t('Uygula ve yeniden aç', 'Apply and restart'), 'management-sites-apply', restart, !m.busy());
      }
      button(t('Listeye dön', 'Back to list'), 'management-available-back', function () { a.closePanel(true); });
    } else if (p.view === 'site') {
      var row = m.rows().filter(function (x) { return x.key === p.siteKey; })[0];
      if (!row) { p.view = 'list'; draw(); return true; }
      line(row.name, true); line((row.enabled ? t('Etkin', 'Enabled') : t('Kapalı', 'Disabled')) + ' · ' + state(row));
      line(repository(row));
      if (row.builtin) { line(t('Yerleşik site. Şimdilik uygulama/çekirdek setiyle güncellenir; kaldırmak yerine kapatabilirsiniz.', 'Built-in site. Currently updated with the core set; it can be disabled rather than uninstalled.')); line(t('Çekirdek sürümü: ', 'Core version: ') + row.coreVersion); }
      else {
        line(t('Kurulu: ', 'Installed: ') + (row.version || '—') + (row.pending ? t(' · Hazır: ', ' · Ready: ') + row.pending : ''));
        if (row.error) { line(row.error); if (root.FilmErrorReporter) { var failedPackage = root.FilmErrorReporter.capture({scope:'update',stage:'package-state',siteId:row.id,error:{message:row.error}}); if (failedPackage) box.appendChild(root.FilmErrorReporter.button(failedPackage, 'management-package-report')); } }
        button(t('Güncellemeyi kontrol et', 'Check for updates'), 'management-site-check', function () { work(function () { return m.checkSites(row.repoId); }, 'management-site-check'); }, !m.busy());
        if (row.updateState === 'available') button(t('Yalnız bu siteyi güncelle', 'Update only this site'), 'management-site-update', function () { work(function () { return m.download(row.key); }, 'management-site-update'); }, !m.busy());
        if (row.previous) button(t('Önceki site sürümüne dön', 'Restore previous site version'), 'management-site-rollback', function () { work(function () { return m.rollback(row.key); }); }, !m.busy());
        if (p.confirm) {
          line(t('Site kaldırılır; Listem ve izleme kayıtları korunur.', 'The site is uninstalled; My list and viewing records are kept.'));
          button(t('Kaldırmayı onayla', 'Confirm uninstall'), 'management-site-remove-confirm', function () { work(function () { return m.remove(row.key).then(function () { p.view = 'list'; p.confirm = false; }); }); }, !m.busy());
          button(t('Vazgeç', 'Cancel'), 'management-site-remove-cancel', function () { p.confirm = false; draw('management-site-remove'); });
        } else button(t('Siteyi kaldır', 'Uninstall site'), 'management-site-remove', function () { p.confirm = true; draw('management-site-remove-cancel'); }, !m.busy());
      }
      if (m.hasChanges()) button(t('Site değişikliklerini uygula ve yeniden aç', 'Apply site changes and restart'), 'management-sites-apply', restart, !m.busy());
      button(t('Sitelerime dön', 'Back to my sites'), 'management-list', function () { if (p.settingsParent && (p.settingsParent.kind === 'update-center'||p.settingsParent.settingsCategory==='updates')) { a.closePanel(true); return; } p.view = 'list'; draw('management-item-' + row.id); });
    } else {
      line(t('Kurulu siteler, sürümler ve hazır değişiklikler.', 'Installed sites, versions and ready changes.'));
      if (m.plugins) {
        button(t('Yeni site eklentisi kur', 'Install a site plugin'), 'management-install', function () { root.FilmUpdateCenter.open(a,'new','update-new-plugins'); });
        button(t('Eklenti depolarını yönet', 'Manage plugin repositories'), 'management-repositories', function () { root.FilmUpdateCenter.open(a,'repositories','update-my-repositories'); });
      }
      m.rows().filter(function(row){return row.builtin||row.packageType==='site';}).forEach(function (row) { button(row.name + ' · ' + (row.version || row.pending || state(row)) + (row.builtin ? '' : ' · ' + state(row)) + ' · ' + repository(row), 'management-item-' + row.id, function () { showSite(row); }); });
      if (m.hasChanges()) button(t('Site değişikliklerini uygula ve yeniden aç', 'Apply site changes and restart'), 'management-sites-apply', restart, !m.busy());
    }
    button(t('Geri', 'Back'), 'panel-cancel', function () { a.closePanel(true); });
    var first = box.querySelector('button:not([disabled])');
    var wanted = focusKey && box.querySelector('[data-focus="' + focusKey.replace(/[^a-zA-Z0-9:_-]/g, '') + '"]:not([disabled])');
    var tabFocus = p.kind === 'update-center' && p.scope === 'sites' ? box.querySelector('[data-focus=management-packages-' + (p.pluginTab || 'installed') + ']') : null;
    var target = wanted || tabFocus || first;
    if (target) target.focus();
    return true;
  }
  function back(a) {
    var p = a.panel;
    if(p&&p.kind==='update-center'&&p.scope==='sites'){var m=a.app.siteManagement;if(p.batchConfirm){p.batchConfirm=null;render(a,'management-batch-run');return true;}if(m.batch&&m.batch.running){m.cancelBatch();render(a,'management-batch-cancel');return true;}if(p.batchResults){p.batchResults=false;p.bulkMode=false;p.bulkSelection={};render(a,'management-packages-'+(p.pluginTab||'installed'));return true;}}
    if (!p || p.kind !== 'site-management' || p.view !== 'site' || p.working) return false;
    if (p.confirm) { p.confirm = false; render(a, 'management-site-remove'); return true; }
    if (p.settingsParent && p.settingsParent.kind === 'update-center') return false;
    var row = a.app.siteManagement.rows().filter(function (r) { return r.key === p.siteKey; })[0];
    p.view = 'list'; render(a, row ? 'management-item-' + row.id : 'panel-cancel'); return true;
  }
  function key(a, event) {
    var p = a.panel, code = event.keyCode; if(root.FilmUpdateCenter&&root.FilmUpdateCenter.key(a,event))return true;
    if(p&&p.kind==='update-center'&&code===13&&event.repeat&&(p.bulkMode||p.batchConfirm||p.batchResults||a.app.siteManagement.batch&&a.app.siteManagement.batch.running)){event.preventDefault();return true;}
    if (!p || ['active-sites', 'site-management', 'update-center'].indexOf(p.kind) < 0 || [37,38,39,40].indexOf(code) < 0) return false;
    event.preventDefault();
    var items = Array.prototype.slice.call(document.querySelectorAll('#catalog-modal-card button:not([disabled])')).filter(function (x) { return !!x.offsetWidth; }), at = items.indexOf(document.activeElement);
    var group=document.activeElement&&document.activeElement.getAttribute('data-management-group');
    if (group && (code===37||code===39)) { var peers=items.filter(function(x){return x.getAttribute('data-management-group')===group;}), index=peers.indexOf(document.activeElement);var peer=peers[Math.max(0,Math.min(peers.length-1,index+(code===37?-1:1)))];if(peer)peer.focus();return true; }
    if (code === 37) { a.closePanel(true); return true; }
    if (code === 39) return true;
    var step=code===38?-1:1, next=at+step;while(items[next]&&group&&items[next].getAttribute('data-management-group')===group)next+=step;next=Math.max(0,Math.min(items.length-1,next));
    if (items[next]) { items[next].focus(); items[next].scrollIntoView(false); }
    return true;
  }
  root.CatalogManagementPanel = { render: render, back: back, key: key };
})(window);
