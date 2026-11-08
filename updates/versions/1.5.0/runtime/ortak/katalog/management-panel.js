/* User-facing management only; core and site package writers are not combined. */
(function (root) {
  'use strict';
  function t(tr, en) { return root.FilmI18n && root.FilmI18n.language() === 'en' ? en : tr; }
  function render(a, focusKey) {
    var p = a.panel; if (!p || ['site-management', 'update-center'].indexOf(p.kind) < 0) return false;
    var m = a.app.siteManagement, host = document.getElementById('catalog-modal'), box = document.getElementById('catalog-modal-card');
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
    function showSite(row) { p.view = 'site'; p.siteKey = row.key; p.confirm = false; draw('management-site-check'); }
    line(p.kind === 'update-center' ? t('Güncelleme merkezi', 'Update center') : t('Site yönetimi', 'Site management'), true);
    if (!m) { line(t('Site yönetimi açılamadı.', 'Site management is unavailable.')); return true; }
    if (p.notice) line(p.notice);
    if (m.note) line(m.note);
    if (m.hasChanges()) line(t('Site değişiklikleri yeniden açılınca uygulanır.', 'Site changes take effect after restart.'));
    if (p.working) line(t('İşlem sürüyor…', 'Working…'));
    if (m.checking) button(t('Site kontrolünü iptal et', 'Cancel site check'), 'management-cancel', function () { m.cancel(); });
    if (p.kind === 'update-center') {
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
        line(t('Yalnız eklenti depoları kontrol edilir; çekirdek paketi indirilmez.', 'Only plugin repositories are checked; no core package is downloaded.'));
        button(t('Site güncellemelerini kontrol et', 'Check site updates'), 'management-check-sites', function () { work(function () { return m.checkSites().then(function (r) { p.notice = t('Kontrol edilen: ', 'Checked: ') + r.checked.length + t(' · Hatalı: ', ' · Failed: ') + r.failed.length; }); }, 'management-check-sites'); }, !m.busy() && !!m.plugins);
        m.rows().forEach(function (row) { if (row.builtin) line(row.name + t(' · Şimdilik yerleşik; bağımsız pakete taşıma bekliyor.', ' · Currently built-in; independent packaging is pending.')); else button(row.name + ' · ' + (row.version || '—') + ' · ' + state(row), 'management-update-' + row.pluginId, function () { open('site-management', 'management-update-' + row.pluginId, { view: 'site', siteKey: row.key }); }); });
        if (m.hasChanges()) button(t('Site değişikliklerini uygula ve yeniden aç', 'Apply site changes and restart'), 'management-sites-apply', restart, !m.busy());
      }
    } else if (p.view === 'site') {
      var row = m.rows().filter(function (x) { return x.key === p.siteKey; })[0];
      if (!row) { p.view = 'list'; draw(); return true; }
      line(row.name, true); line((row.enabled ? t('Etkin', 'Enabled') : t('Kapalı', 'Disabled')) + ' · ' + state(row));
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
      button(row.enabled ? t('Siteyi devre dışı bırak', 'Disable site') : t('Siteyi etkinleştir', 'Enable site'), 'management-site-toggle', function () { work(function () { return m.toggle(row.key, !row.enabled); }, 'management-site-toggle'); }, !m.busy());
      if (m.hasChanges()) button(t('Site değişikliklerini uygula ve yeniden aç', 'Apply site changes and restart'), 'management-sites-apply', restart, !m.busy());
      button(t('Sitelerime dön', 'Back to my sites'), 'management-list', function () { p.view = 'list'; draw('management-item-' + row.id); });
    } else {
      line(t('Kurulu siteler, sürümler ve hazır değişiklikler.', 'Installed sites, versions and ready changes.'));
      if (m.plugins) {
        button(t('Yeni site eklentisi kur', 'Install a site plugin'), 'management-install', function () { open('plugins', 'management-install', { pluginView: 'repositories' }); });
        button(t('Eklenti depolarını yönet', 'Manage plugin repositories'), 'management-repositories', function () { open('plugins', 'management-repositories', { pluginView: 'repositories' }); });
      }
      m.rows().forEach(function (row) { button(row.name + ' · ' + (row.enabled ? t('Etkin', 'Enabled') : t('Kapalı', 'Disabled')) + ' · ' + (row.version || (row.builtin ? t('Yerleşik', 'Built-in') : row.pending || '—')) + ' · ' + state(row), 'management-item-' + row.id, function () { showSite(row); }); });
      if (m.hasChanges()) button(t('Site değişikliklerini uygula ve yeniden aç', 'Apply site changes and restart'), 'management-sites-apply', restart, !m.busy());
    }
    button(t('Geri', 'Back'), 'panel-cancel', function () { a.closePanel(true); });
    var first = box.querySelector('button:not([disabled])');
    a.focus(focusKey || (first && first.getAttribute('data-focus')) || 'panel-cancel', false); return true;
  }
  root.CatalogManagementPanel = { render: render };
})(window);
