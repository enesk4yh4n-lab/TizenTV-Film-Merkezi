/* User-facing management only; core and site package writers are not combined. */
(function (root) {
  'use strict';
  function t(tr, en) { return root.FilmI18n && root.FilmI18n.language() === 'en' ? en : tr; }
  function render(a, focusKey) {
    var p = a.panel; if (!p || ['active-sites', 'site-management', 'update-center'].indexOf(p.kind) < 0) return false;
    var m = a.app.siteManagement, updates = root.FilmUpdateCoordinator && root.FilmUpdateCoordinator.current, host = document.getElementById('catalog-modal'), box = document.getElementById('catalog-modal-card');
    host.classList.remove('fm-settings'); host.style.display = 'block'; box.textContent = '';
    function line(text, title) { var x = document.createElement(title ? 'h2' : 'p'); x.className = title ? '' : 'catalog-note'; x.textContent = text; box.appendChild(x); }
    function button(text, key, action, enabled) { var x = document.createElement('button'); x.type = 'button'; x.className = 'filter-field'; x.setAttribute('data-focus', key); x.textContent = text; x.disabled = enabled === false || !!p.working && key !== 'panel-cancel' && key !== 'management-cancel'; x.onclick = action; box.appendChild(x); return x; }
    function draw(key) { if (a.panel === p) a.renderPanel(key); }
    function work(fn, key) {
      if (p.working || m.busy()) return; p.working = true; p.notice = '';
      Promise.resolve().then(fn).then(function () { p.working = false; draw(key); }, function (e) { p.working = false; p.notice = e.message; draw(key); }); draw('panel-cancel');
    }
    function open(kind, key, extra) { var child = { kind: kind, settingsParent: p, settingsReturnKey: key, returnKey: 'catalog-tools' }; Object.keys(extra || {}).forEach(function (k) { child[k] = extra[k]; }); a.panel = child; a.renderPanel(); }
    function restart() { if (m.busy() || a.app.controller.content) return; if (a.hub) a.hub.flush(); root.location.reload(); }
    function state(row) { return row.pending ? t('Hazır: ', 'Ready: ') + row.pending : row.updateState === 'available' ? t('Yeni: ', 'New: ') + row.available : row.updateState === 'current' ? t('Güncel', 'Up to date') : row.builtin ? t('Yerleşik', 'Built-in') : t('Kontrol edilmedi', 'Not checked'); }
    function repository(row) { var repo = m.plugins && m.plugins.state.repositories[row.repoId]; return row.builtin ? t('Uygulama paketi', 'Application bundle') : repo ? repo.name + ' · ' + repo.url : t('Depo bulunamadı', 'Repository unavailable'); }
    function showSite(row) { p.view = 'site'; p.siteKey = row.key; p.confirm = false; draw('management-site-check'); }
    line(p.kind === 'active-sites' ? t('Aktif siteler', 'Active sites') : p.kind === 'update-center' ? t('Güncelleme Merkezi', 'Update Center') : t('Kurulu site paketleri', 'Installed site packages'), true);
    if (!m) { line(t('Site yönetimi açılamadı.', 'Site management is unavailable.')); return true; }
    if (p.notice) line(p.notice);
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
    } else if (p.kind === 'update-center') {
      if (updates) {
        line(t('Tek kontrol: çekirdek, kurulu site güncellemeleri ve etkin depolardaki yeni siteler. Paketler onayınız olmadan indirilmez.', 'One check: core, installed site updates and new sites in enabled repositories. Packages are not downloaded without your approval.'));
        if (updates.last) line(updates.summary());
        button(t('Kontrol et', 'Check for updates'), 'management-check-all', function () { work(function () { return updates.check().then(function () { p.notice = updates.summary(); if (updates.hasUpdates()) setTimeout(function () { if (a.panel === p) updates.offer(); }, 0); }); }, 'management-check-all'); }, !m.busy() && !updates.task);
        if (updates.hasUpdates()) button(t('Bulunan güncellemeleri seç', 'Choose available updates'), 'management-choose-updates', function () { updates.offer(); }, !m.busy() && !updates.task);
      }
      button(t('Uygulama / çekirdek', 'Application / core'), 'management-core-tab', function () { p.scope = 'core'; draw('management-core-tab'); }, !m.busy());
      button(t('Site eklentileri', 'Site plugins'), 'management-sites-tab', function () { p.scope = 'sites'; draw('management-sites-tab'); }, !m.busy());
      if ((p.scope || 'core') === 'core') {
        line(t('Arayüz ve ortak oynatıcı bileşenleri. Site eklentileri ayrı sürümlenir.', 'Interface and shared player components. Site plugins have separate versions.'));
        if (root.FilmUpdatePanel) root.FilmUpdatePanel.draw(a, box, p);
        else line(t('Bu uygulama paketinde çekirdek güncellemesi yok.', 'Core updates are unavailable in this app package.'));
        if (m.hasChanges()) {
          line(t('Hazır site değişikliklerini önce site bölümünden uygulayın. Çekirdek geçişi bunları sessizce etkinleştirmez.', 'Apply ready site changes from the site section first. A core switch will not silently activate them.'));
          ['updates-apply', 'updates-rollback'].forEach(function (key) { var x = box.querySelector('[data-focus="' + key + '"]'); if (x) x.disabled = true; });
        }
      } else {
        line(t('Kurulu sitelerin sürümleri ve hazır paketleri.', 'Installed site versions and pending packages.'));
        if (!updates) button(t('Site güncellemelerini kontrol et', 'Check site updates'), 'management-check-sites', function () { work(function () { return m.checkSites().then(function (r) { p.notice = t('Kontrol edilen: ', 'Checked: ') + r.checked.length + t(' · Hatalı: ', ' · Failed: ') + r.failed.length; }); }, 'management-check-sites'); }, !m.busy() && !!m.plugins);
        m.rows().forEach(function (row) { if (row.builtin) line(row.name + t(' · Şimdilik yerleşik; bağımsız pakete taşıma bekliyor.', ' · Currently built-in; independent packaging is pending.')); else button(row.name + ' · ' + (row.version || '—') + ' · ' + state(row) + ' · ' + repository(row), 'management-update-' + row.pluginId, function () { open('site-management', 'management-update-' + row.pluginId, { view: 'site', siteKey: row.key }); }); });
        if (m.hasChanges()) button(t('Site değişikliklerini uygula ve yeniden aç', 'Apply site changes and restart'), 'management-sites-apply', restart, !m.busy());
      }
    } else if (p.view === 'site') {
      var row = m.rows().filter(function (x) { return x.key === p.siteKey; })[0];
      if (!row) { p.view = 'list'; draw(); return true; }
      line(row.name, true); line((row.enabled ? t('Etkin', 'Enabled') : t('Kapalı', 'Disabled')) + ' · ' + state(row));
      line(repository(row));
      if (row.builtin) { line(t('Yerleşik site. Şimdilik uygulama/çekirdek setiyle güncellenir; kaldırmak yerine kapatabilirsiniz.', 'Built-in site. Currently updated with the core set; it can be disabled rather than uninstalled.')); line(t('Çekirdek sürümü: ', 'Core version: ') + row.coreVersion); }
      else {
        line(t('Kurulu: ', 'Installed: ') + (row.version || '—') + (row.pending ? t(' · Hazır: ', ' · Ready: ') + row.pending : ''));
        if (row.error) line(row.error);
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
      button(t('Sitelerime dön', 'Back to my sites'), 'management-list', function () { p.view = 'list'; draw('management-item-' + row.id); });
    } else {
      line(t('Kurulu siteler, sürümler ve hazır değişiklikler.', 'Installed sites, versions and ready changes.'));
      if (m.plugins) {
        button(t('Yeni site eklentisi kur', 'Install a site plugin'), 'management-install', function () { open('plugins', 'management-install', { pluginView: 'repositories' }); });
        button(t('Eklenti depolarını yönet', 'Manage plugin repositories'), 'management-repositories', function () { open('plugins', 'management-repositories', { pluginView: 'repositories' }); });
      }
      m.rows().forEach(function (row) { button(row.name + ' · ' + (row.version || row.pending || state(row)) + (row.builtin ? '' : ' · ' + state(row)) + ' · ' + repository(row), 'management-item-' + row.id, function () { showSite(row); }); });
      if (m.hasChanges()) button(t('Site değişikliklerini uygula ve yeniden aç', 'Apply site changes and restart'), 'management-sites-apply', restart, !m.busy());
    }
    button(t('Geri', 'Back'), 'panel-cancel', function () { a.closePanel(true); });
    var first = box.querySelector('button:not([disabled])');
    var wanted = focusKey && box.querySelector('[data-focus="' + focusKey.replace(/[^a-zA-Z0-9:_-]/g, '') + '"]:not([disabled])');
    var target = wanted || first;
    if (target) target.focus();
    return true;
  }
  function back(a) {
    var p = a.panel;
    if (!p || p.kind !== 'site-management' || p.view !== 'site' || p.working) return false;
    if (p.confirm) { p.confirm = false; render(a, 'management-site-remove'); return true; }
    if (p.settingsParent && p.settingsParent.kind === 'update-center') return false;
    var row = a.app.siteManagement.rows().filter(function (r) { return r.key === p.siteKey; })[0];
    p.view = 'list'; render(a, row ? 'management-item-' + row.id : 'panel-cancel'); return true;
  }
  function key(a, event) {
    var p = a.panel, code = event.keyCode;
    if (!p || ['active-sites', 'site-management', 'update-center'].indexOf(p.kind) < 0 || [37,38,39,40].indexOf(code) < 0) return false;
    event.preventDefault();
    var items = Array.prototype.slice.call(document.querySelectorAll('#catalog-modal-card button:not([disabled])')).filter(function (x) { return !!x.offsetWidth; }), at = items.indexOf(document.activeElement);
    if (code === 37) { a.closePanel(true); return true; }
    if (code === 39) return true;
    var next = Math.max(0, Math.min(items.length - 1, at + (code === 38 ? -1 : 1)));
    if (items[next]) { items[next].focus(); items[next].scrollIntoView(false); }
    return true;
  }
  root.CatalogManagementPanel = { render: render, back: back, key: key };
})(window);
