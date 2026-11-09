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
      Promise.resolve().then(fn).then(function () { p.working = false; draw(key); }, function (e) { p.working = false; p.notice = e.message; p.errorReport = root.FilmErrorReporter && root.FilmErrorReporter.capture({scope:'update',stage:'package-operation',error:e}); draw(key); }); draw('panel-cancel');
    }
    function open(kind, key, extra) { var child = { kind: kind, settingsParent: p, settingsReturnKey: key, returnKey: 'catalog-tools' }; Object.keys(extra || {}).forEach(function (k) { child[k] = extra[k]; }); a.panel = child; a.renderPanel(); }
    function restart() { if (m.busy() || a.app.controller.content) return; if (a.hub) a.hub.flush(); root.location.reload(); }
    function state(row) { return row.pending ? t('Hazır: ', 'Ready: ') + row.pending : row.updateState === 'available' ? t('Yeni: ', 'New: ') + row.available : row.updateState === 'current' ? t('Güncel', 'Up to date') : row.builtin ? t('Yerleşik', 'Built-in') : t('Kontrol edilmedi', 'Not checked'); }
    function repository(row) { var repo = m.plugins && m.plugins.state.repositories[row.repoId]; return row.builtin ? t('Uygulama paketi', 'Application bundle') : repo ? repo.name + ' · ' + repo.url : t('Depo bulunamadı', 'Repository unavailable'); }
    function tabs(group, values, selected, change) {
      var bar = document.createElement('div'); bar.setAttribute('role', 'tablist'); bar.setAttribute('aria-label', group === 'scope' ? t('Güncelleme türü', 'Update type') : t('Eklenti listeleri', 'Plugin lists')); bar.style.cssText = 'display:flex;flex-wrap:wrap;margin:10px 0'; box.appendChild(bar);
      values.forEach(function (v) {
        var tab = button(v.label, v.key, function () { change(v.value, v.key); });
        bar.appendChild(tab); tab.style.cssText = 'width:auto;flex:1 1 auto;margin:3px;padding:10px 14px;font-size:23px';
        tab.setAttribute('role', 'tab'); tab.setAttribute('aria-selected', selected === v.value ? 'true' : 'false'); tab.setAttribute('data-management-group', group);
        if (selected === v.value) tab.style.borderColor = '#ffc43d';
      });
    }
    function batchStart(action, keys) {
      if (m.busy()) return;
      p.batchConfirm = null; p.batchResults = true; p.batchPage = 0;
      function refresh() { if (a.panel === p && !a.app.controller.content) draw(m.batch && m.batch.running ? 'management-batch-cancel' : 'management-batch-list'); }
      var previous = m.batch;
      m.runBatch(action, keys, refresh).then(refresh, function (e) { p.notice = e.message; if (m.batch === previous) p.batchResults = false; refresh(); });
    }
    function batchView() {
      if (p.batchConfirm) {
        line(t('Seçilen eklentiler kaldırılsın mı?', 'Remove selected plugins?'), true);
        line(p.batchConfirm.names.slice(0,10).join(', ') + (p.batchConfirm.names.length>10 ? t(' … ve ',' … and ')+(p.batchConfirm.names.length-10)+t(' eklenti daha',' more plugins') : ''));
        line(p.batchConfirm.keys.length + t(' eklenti kaldırılacak. Listem, izleme ve devam kayıtları silinmez. Değişiklikler yeniden açılışta uygulanır.', ' plugins will be removed. My list, history and resume records are kept. Changes apply after restart.'));
        button(t('Vazgeç', 'Cancel'), 'management-batch-remove-cancel', function () { p.batchConfirm = null; draw('management-batch-run'); });
        button(t('Seçilenleri kaldır', 'Remove selected'), 'management-batch-remove-confirm', function () { var keys = p.batchConfirm.keys; batchStart('remove', keys); });
        var cancel = box.querySelector('[data-focus=management-batch-remove-cancel]'); if (cancel) cancel.focus(); return true;
      }
      var batch = m.batch;
      if (!batch || !batch.running && !p.batchResults) return false;
      var statuses = {queued:t('Bekliyor','Queued'),running:t('İşleniyor','Working'),ready:t('Doğrulandı · yeniden açılışa hazır','Verified · ready for restart'),removed:t('Kaldırıldı · yeniden açılış gerekli','Removed · restart required'),failed:t('Başarısız','Failed'),cancelled:t('İptal edildi','Cancelled')};
      line(batch.action === 'remove' ? t('Toplu kaldırma','Batch removal') : batch.action === 'update' ? t('Toplu güncelleme','Batch update') : t('Toplu kurulum','Batch installation'), true);
      var done = batch.items.filter(function (x) { return x.status !== 'queued' && x.status !== 'running'; }).length;
      var progress = document.createElement('progress'); progress.id = 'management-batch-progress'; progress.max = batch.items.length; progress.value = done; progress.style.cssText = 'width:100%;height:16px'; progress.setAttribute('aria-label',t('Paket ilerlemesi','Package progress')); box.appendChild(progress);
      line(done + ' / ' + batch.items.length + (batch.running ? batch.cancelled ? t(' · İptal tamamlanıyor…',' · Finishing cancellation…') : t(' · İşlem sürüyor…',' · Working…') : batch.cancelled ? t(' · İptal tamamlandı',' · Cancelled') : t(' · İşlem tamamlandı',' · Finished')));
      if(!batch.running){var totals={ready:0,removed:0,failed:0,cancelled:0};batch.items.forEach(function(x){if(totals[x.status]!==undefined)totals[x.status]++;});line(t('Hazır: ','Ready: ')+totals.ready+t(' · Kaldırılan: ',' · Removed: ')+totals.removed+t(' · Başarısız: ',' · Failed: ')+totals.failed+t(' · İptal: ',' · Cancelled: ')+totals.cancelled);}
      var current = batch.items.filter(function (x) { return x.status === 'running'; })[0]; if (current) line(t('Şimdi: ','Current: ') + current.name);
      if (batch.running) button(t('İptal','Cancel'),'management-batch-cancel',function () { m.cancelBatch(); draw('management-batch-cancel'); });
      else {
        if (m.hasChanges()) button(t('Uygula ve yeniden aç','Apply and restart'),'management-sites-apply',restart,!m.busy());
        var failed = batch.items.filter(function (x) { return x.status === 'failed'; });
        if (failed.length) button(t('Başarısızları tekrar dene','Retry failed'),'management-batch-retry',function () { batchStart(batch.action,failed.map(function (x) { return x.key; })); },!m.busy());
        button(t('Listeye dön','Back to list'),'management-batch-list',function () { p.batchResults=false;p.bulkMode=false;p.bulkSelection={};draw('management-packages-'+(p.pluginTab||'installed')); });
      }
      var page = Math.max(0,Math.min(p.batchPage||0,Math.ceil(batch.items.length/24)-1)); p.batchPage=page;
      batch.items.slice(page*24,page*24+24).forEach(function (item) { var row=document.createElement('p');row.setAttribute('data-batch-key',item.key);row.setAttribute('data-batch-status',item.status);row.style.cssText='font-size:22px;padding:10px;background:#203249;white-space:normal;overflow-wrap:break-word';row.textContent=item.name+' · '+statuses[item.status]+(item.message?' · '+item.message:'');box.appendChild(row); if (item.status === 'failed' && item.errorReport && root.FilmErrorReporter) box.appendChild(root.FilmErrorReporter.button(item.errorReport, 'batch-report-' + batch.items.indexOf(item))); });
      if(batch.items.length>24){button(t('Önceki sonuçlar','Previous results'),'management-batch-prev',function(){p.batchPage=page-1;draw('management-batch-prev');},page>0);button(t('Sonraki sonuçlar','Next results'),'management-batch-next',function(){p.batchPage=page+1;draw('management-batch-next');},(page+1)*24<batch.items.length);}
      var target=box.querySelector('[data-focus='+(focusKey|| (batch.running?'management-batch-cancel':'management-batch-list'))+']:not([disabled])');if(!target)target=box.querySelector('button:not([disabled])');if(target)target.focus();return true;
    }
    function batchControls(rows, tab) {
      p.bulkSelection=p.bulkSelection||{};
      var allowed={};rows.forEach(function(r){allowed[r.key]=true;});Object.keys(p.bulkSelection).forEach(function(k){if(!allowed[k])delete p.bulkSelection[k];});
      button(p.bulkMode?t('Toplu seçimden çık','Leave batch selection'):t('Toplu seçim','Batch selection'),'management-batch-mode',function(){p.bulkMode=!p.bulkMode;p.bulkSelection={};draw('management-batch-mode');},!m.busy());
      if(!p.bulkMode)return;
      line(t('Seçimler bu sekmeye aittir; sayfa değiştirirken korunur.','Selections belong to this tab and persist across pages.'));
      button(t('Tümünü seç','Select all'),'management-batch-all',function(){rows.forEach(function(r){p.bulkSelection[r.key]=true;});draw('management-batch-all');},!m.busy());
      button(t('Seçimi kaldır','Clear selection'),'management-batch-none',function(){p.bulkSelection={};draw('management-batch-none');},!m.busy());
      var chosen=rows.filter(function(r){return !!p.bulkSelection[r.key];});line(chosen.length+t(' eklenti seçildi',' plugins selected'));
      button(tab==='newSites'?t('Seçilenleri kur','Install selected'):tab==='updates'?t('Seçilenleri güncelle','Update selected'):t('Seçilenleri kaldır','Remove selected'),'management-batch-run',function(){var keys=chosen.map(function(r){return r.key;});if(tab==='installed'){p.batchConfirm={keys:keys,names:chosen.map(function(r){return r.name;})};draw();}else batchStart(tab==='newSites'?'install':'update',keys);},chosen.length>0&&!m.busy());
    }

    function packageKey(row) { return 'management-package-' + row.key.replace(/[^a-zA-Z0-9_-]/g, '-'); }
    function packages() {
      var groups = m.packageGroups(), tab = p.pluginTab || 'installed', values = [
        {value:'installed',key:'management-packages-installed',label:t('Kurulu', 'Installed') + ' (' + groups.installed.length + ')'},
        {value:'updates',key:'management-packages-updates',label:t('Güncellemesi olan', 'Updates') + ' (' + groups.updates.length + ')'},
        {value:'newSites',key:'management-packages-newSites',label:t('Yeni', 'New') + ' (' + groups.newSites.length + ')'}
      ];
      if (!groups[tab]) tab = 'installed'; p.pluginTab = tab;
      tabs('packages', values, tab, function (value, key) { p.pluginTab = value; p.packagePage = 0; p.bulkMode=false;p.bulkSelection={};draw(key); });
      Object.keys(m.failures).forEach(function (id) { var r = m.plugins && m.plugins.state.repositories[id]; if (r && r.enabled) line(r.name + ' · ' + t('Son kontrol başarısız; varsa önceki liste gösteriliyor: ', 'Last check failed; any list shown is cached: ') + m.failures[id]); });
      var rows = groups[tab], page = Math.max(0, Math.min(p.packagePage || 0, Math.max(0, Math.ceil(rows.length / 24) - 1))); p.packagePage = page;
      if (rows.length) batchControls(rows,tab);
      if (!rows.length) line(tab === 'installed' ? t('Henüz kurulu eklenti yok.', 'No plugins are installed.') : !groups.checkedAt ? t('Listeyi görmek için Kontrol et seçeneğini kullanın.', 'Use Check for updates to load this list.') : Object.keys(m.failures).length ? t('Bazı depolar denetlenemedi; sonuçlar eksik olabilir.', 'Some repositories could not be checked; results may be incomplete.') : tab === 'updates' ? t('Kurulu eklentiler için güncelleme bulunmadı.', 'No updates were found for installed plugins.') : t('Yeni eklenti bulunmadı.', 'No new plugins were found.'));
      rows.slice(page * 24, page * 24 + 24).forEach(function (row) {
        var key = packageKey(row), repo = m.plugins && m.plugins.state.repositories[row.repoId];
        var x = button('', key, function () { if(p.bulkMode){p.bulkSelection[row.key]=!p.bulkSelection[row.key];draw(key);return;}open('site-management', key, tab === 'newSites' ? {view:'available',packageItem:row} : {view:'site',siteKey:row.key}); });if(p.bulkMode)x.setAttribute('aria-pressed',p.bulkSelection[row.key]?'true':'false');
        var title = document.createElement('strong'), info = document.createElement('span'), versions = [];
        title.textContent = (p.bulkMode?(p.bulkSelection[row.key]?'☑ ':'☐ '):'')+row.name; title.style.display = 'block'; x.appendChild(title);
        if (row.version) versions.push(t('Kurulu: ', 'Installed: ') + row.version);
        if (row.available && row.pending !== row.available && (!row.version || root.FilmPluginSchema.compare(row.available, row.version) > 0)) versions.push(t('Yeni: ', 'Available: ') + row.available);
        if (row.pending) versions.push(t('Hazır: ', 'Ready: ') + row.pending);
        if (tab !== 'newSites') versions.push(row.repositoryEnabled ? row.enabled ? t('Açık', 'Enabled') : t('Kapalı', 'Disabled') : t('Depo kapalı', 'Repository disabled'));
        info.textContent = versions.join(' · ') + ' · ' + t('Depo: ', 'Repository: ') + (repo ? repo.name : t('Bulunamadı', 'Unavailable')) + (row.error ? ' · ⚠ ' + t('Ayrıntıya bakın', 'See details') : '');
        info.style.cssText = 'display:block;font-size:21px;color:#bdc9d9;margin-top:6px;white-space:normal;overflow-wrap:break-word'; x.appendChild(info);
      });
      if (rows.length > 24) {
        line((page * 24 + 1) + '–' + Math.min(rows.length, page * 24 + 24) + ' / ' + rows.length);
        button(t('Önceki sayfa', 'Previous page'), 'management-packages-prev', function () { p.packagePage = page - 1; draw('management-packages-prev'); }, page > 0);
        button(t('Sonraki sayfa', 'Next page'), 'management-packages-next', function () { p.packagePage = page + 1; draw('management-packages-next'); }, (page + 1) * 24 < rows.length);
      }
    }

    function showSite(row) { p.view = 'site'; p.siteKey = row.key; p.confirm = false; draw('management-site-check'); }
    line(p.kind === 'active-sites' ? t('Aktif siteler', 'Active sites') : p.kind === 'update-center' ? t('Güncelleme Merkezi', 'Update Center') : t('Kurulu site paketleri', 'Installed site packages'), true);
    if (!m) { line(t('Site yönetimi açılamadı.', 'Site management is unavailable.')); return true; }
    if (p.kind==='update-center'&&p.scope==='sites'&&batchView()) return true;
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
    } else if (p.kind === 'update-center') {
      if (updates) {
        line(t('Tek kontrol: çekirdek, kurulu site güncellemeleri ve etkin depolardaki yeni siteler. Paketler onayınız olmadan indirilmez.', 'One check: core, installed site updates and new sites in enabled repositories. Packages are not downloaded without your approval.'));
        if (updates.last) { line(updates.summary()); (updates.last.errors || []).forEach(function (e, index) { if (e.report && root.FilmErrorReporter) box.appendChild(root.FilmErrorReporter.button(e.report, 'update-check-report-' + index)); }); }
        button(t('Kontrol et', 'Check for updates'), 'management-check-all', function () { work(function () { return updates.check().then(function () { p.notice = updates.summary(); }); }, 'management-check-all'); }, !m.busy() && !updates.task);
        if (updates.hasUpdates()) button(t('Bulunan güncellemeleri seç', 'Choose available updates'), 'management-choose-updates', function () { updates.offer(); }, !m.busy() && !updates.task);
      }
      tabs('scope', [{value:'core',key:'management-core-tab',label:t('Uygulama / çekirdek','Application / core')},{value:'sites',key:'management-sites-tab',label:t('Site eklentileri','Site plugins')}], p.scope || 'core', function (value,key) { p.scope=value; draw(key); });
      if ((p.scope || 'core') === 'core') {
        line(t('Arayüz ve ortak oynatıcı bileşenleri. Site eklentileri ayrı sürümlenir.', 'Interface and shared player components. Site plugins have separate versions.'));
        if (root.FilmUpdatePanel) root.FilmUpdatePanel.draw(a, box, p);
        else line(t('Bu uygulama paketinde çekirdek güncellemesi yok.', 'Core updates are unavailable in this app package.'));
        if (m.hasChanges()) {
          line(t('Hazır site değişikliklerini önce site bölümünden uygulayın. Çekirdek geçişi bunları sessizce etkinleştirmez.', 'Apply ready site changes from the site section first. A core switch will not silently activate them.'));
          ['updates-apply', 'updates-rollback'].forEach(function (key) { var x = box.querySelector('[data-focus="' + key + '"]'); if (x) x.disabled = true; });
        }
      } else {
        packages();
        if (m.hasChanges()) button(t('Site değişikliklerini uygula ve yeniden aç', 'Apply site changes and restart'), 'management-sites-apply', restart, !m.busy());
      }
    } else if (p.view === 'available') {
      var item = p.packageItem, repo = item && m.plugins && m.plugins.state.repositories[item.repoId];
      if (!item || !repo) { line(t('Eklenti veya depo bulunamadı.', 'Plugin or repository unavailable.')); }
      else {
        var installed = m.rows().filter(function (r) { return r.key === item.key; })[0];
        line(item.name, true); line(t('Yeni sürüm: ', 'Available version: ') + item.available); line(t('Depo: ', 'Repository: ') + repo.name); line(repo.url);
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
      button(t('Sitelerime dön', 'Back to my sites'), 'management-list', function () { if (p.settingsParent && p.settingsParent.kind === 'update-center') { a.closePanel(true); return; } p.view = 'list'; draw('management-item-' + row.id); });
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
    var p = a.panel, code = event.keyCode;
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
