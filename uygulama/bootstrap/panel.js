(function (root) {
  'use strict';
  var english = { 'Güncellemeler': 'Updates', 'Kontrol et': 'Check for updates', 'İndir': 'Download', 'Uygula ve yeniden aç': 'Apply and restart', 'Önceki sürüme dön': 'Restore previous version', 'İndirmeyi iptal et': 'Cancel download', 'Uygulama': 'Application', 'Bileşenler': 'Components', 'Bulunan sürüm': 'Available version', 'Hazır sürüm': 'Ready version', 'Güncelleme işlemi sürüyor…': 'Update in progress…', 'Yeni bileşen sürümü bulundu.': 'A new component version is available.', 'Bileşenler güncel.': 'Components are up to date.', 'Güncelleme doğrulandı; uygulamaya hazır.': 'Update verified and ready to apply.' };
  function tr(value) { return root.FilmI18n && root.FilmI18n.language() === 'en' ? english[value] || value : value; }
  english['Yeni çekirdek kanalı'] = 'New core channel';
  english['Yayıncı anahtarı özeti'] = 'Publisher key fingerprint';
  english['Kanal geçişini incele'] = 'Review channel migration';
  english['Vazgeç'] = 'Cancel';
  english['Doğrula, geçiş yap ve yeniden aç'] = 'Verify, migrate and restart';
  english['Adres ve anahtar iki imza ve hedef kanal doğrulandıktan sonra değişir.'] = 'The address and key change only after both signatures and the destination are verified.';
  root.FilmUpdatePanel = { draw: function (catalog, box, panel) {
    var manager = root.FilmUpdate, s = manager.status();
    function text(value) { var p = document.createElement('p'); p.className = 'catalog-note'; p.textContent = value; box.appendChild(p); }
    function action(label, key, operation, enabled) { var button = document.createElement('button'); button.type = 'button'; button.className = 'filter-field'; button.setAttribute('data-focus', key); button.textContent = tr(label); button.disabled = !enabled; button.onclick = function () { if (panel.working && key !== 'updates-cancel') return; panel.working = true; function refresh() { if (catalog.panel !== panel) return; var state = manager.status(); catalog.renderPanel(state.busy === 'download' ? 'updates-cancel' : state.busy ? 'panel-cancel' : key); if (panel.working) panel.updateTimer = setTimeout(refresh, 400); } function end(error) { panel.working = false; clearTimeout(panel.updateTimer); if (error) { manager.note = error.message; manager.errorReport = root.FilmErrorReporter && root.FilmErrorReporter.capture({scope:'update',stage:'core-operation',error:error}); } if (catalog.panel === panel) catalog.renderPanel(key); } operation().then(function () { end(); }, end); refresh(); }; box.appendChild(button); }
    text(tr('Uygulama') + ': ' + s.application + ' · ' + tr('Bileşenler') + ': ' + s.current);
    if (s.available) text(tr('Bulunan sürüm') + ': ' + s.available);
    if (s.pending) text(tr('Hazır sürüm') + ': ' + s.pending);
    if (s.note) text(tr(s.note));
    if (manager.errorReport && root.FilmErrorReporter) box.appendChild(root.FilmErrorReporter.button(manager.errorReport, 'updates-report-error'));
    if (s.busy) text(tr('Güncelleme işlemi sürüyor…'));
    if (!root.FilmUpdateCoordinator) action('Kontrol et', 'updates-check', function () { return manager.check(); }, !s.busy && !s.blocked);
    action('İndir', 'updates-download', function () { return manager.download(); }, !s.busy && !s.blocked && !!s.available && s.available !== s.current && s.pending !== s.available);
    if (s.pending) action('Uygula ve yeniden aç', 'updates-apply', function () { if (catalog.hub) catalog.hub.flush(); return manager.apply().then(function () { root.location.reload(); }); }, !s.busy);
    if (s.previous) action('Önceki sürüme dön', 'updates-rollback', function () { return manager.rollback().then(function () { root.location.reload(); }); }, !s.busy);
    text((root.FilmI18n && root.FilmI18n.language() === 'en' ? 'Core channel: ' : 'Çekirdek kanalı: ') + manager.config.channel);
    if (manager.migrationOffer) {
      var offer = manager.migrationDetails;
      if (offer && typeof offer.channel === 'string') {
        text(tr('Yeni çekirdek kanalı') + ': ' + offer.channel);
        text(tr('Yayıncı anahtarı özeti') + ' (SHA-256): ' + offer.fingerprint);
        if (!panel.migrationConfirm) action('Kanal geçişini incele', 'updates-migrate-review', function () { panel.migrationConfirm = true; return Promise.resolve(); }, !s.busy && !s.blocked);
        else {
          text(tr('Adres ve anahtar iki imza ve hedef kanal doğrulandıktan sonra değişir.'));
          action('Vazgeç', 'updates-migrate-cancel', function () { panel.migrationConfirm = false; return Promise.resolve(); }, !s.busy);
          action('Doğrula, geçiş yap ve yeniden aç', 'updates-migrate-confirm', function () { return manager.migrate().then(function () { root.location.reload(); }); }, !s.busy && !s.blocked);
        }
      }
    }
    if (s.busy === 'download') action('İndirmeyi iptal et', 'updates-cancel', function () { manager.cancel(); return Promise.resolve(); }, true);
  } };
})(window);
