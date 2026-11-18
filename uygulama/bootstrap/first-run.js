/* WGT adapter: update only the core before plugin/UI startup on incomplete setups. */
(function (root) {
  'use strict';
  function incomplete() {
    try {
      var store = root.localStorage, raw = store.getItem('filmmerkezi.repository-setup.v1');
      if (raw) { var value = JSON.parse(raw); return raw.length <= 4096 && value && value.version === 1 && value.completed === false; }
      return !store.getItem('filmmerkezi.catalog.preferences.v1');
    } catch (ignore) { return false; }
  }
  function run(manager, mode) {
    if (mode || manager.blocked || !incomplete()) return Promise.resolve(false);
    var servicePath = 'ortak/arayuz/first-run-update.js';
    if (!manager.entries[servicePath]) return Promise.resolve(false);
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');script.onload = resolve;script.onerror = function () { reject(Error('Startup update service could not be loaded')); };manager.appendScript(script, servicePath).catch(reject);
    }).then(function () {
      var guard = root.FilmBootRecovery, status = document.getElementById('update-boot-status'), box = document.getElementById('update-boot-card'), panel = document.createElement('div'), detail = document.createElement('p'), service, english = false, held = false, percent = 0;
      try { english = JSON.parse(root.localStorage.getItem('filmmerkezi.catalog.preferences.v1') || '{}').language === 'en'; } catch (ignore) {}
      function label(tr, en) { return english ? en : tr; }
      function keys(e) {
        if (!panel.children.length) return;
        e.preventDefault();e.stopImmediatePropagation();
        var buttons = panel.querySelectorAll('button,a'), index = Array.prototype.indexOf.call(buttons, document.activeElement);
        if (!buttons.length) return;
        if (index < 0) index = 0;
        if (e.type === 'keyup') { held = false;return; }
        if (e.keyCode === 13) { if (!held && !e.repeat) buttons[index].click();held = true; }
        else if (e.keyCode === 37 || e.keyCode === 38) buttons[Math.max(0, index - 1)].focus();
        else if (e.keyCode === 39 || e.keyCode === 40) buttons[Math.min(buttons.length - 1, index + 1)].focus();
        else if (e.keyCode === 27 || e.keyCode === 10009) buttons[0].focus();
      }
      function render(state) {
        panel.textContent = '';
        var messages = {checking:label('Çekirdek güncellemesi kontrol ediliyor…','Checking core updates…'),downloading:label('Güncel çekirdek indiriliyor…','Downloading the latest core…'),verifying:label('Güncelleme doğrulanıyor…','Verifying update…'),restart:label('Güncelleme hazır','Update ready'),applying:label('Güncelleme uygulanıyor…','Applying update…'),reload:label('Güncel kurulum açılıyor…','Opening the updated setup…'),ready:label('Kurulum hazırlanıyor…','Preparing setup…')};
        status.textContent = messages[state.phase] || label('Güncelleme tamamlanamadı: ','Update could not be completed: ') + state.error;
        var data = state.detail, meter = document.getElementById('update-progress'), count = document.getElementById('update-progress-count');
        var requirement = state.phase === 'requirement';
        if (requirement) {
          status.textContent = label('Daha yeni bir Film Merkezi kurulumu gerekiyor','Install a newer version of Film Merkezi');
          detail.textContent = label('Mevcut sürümle kuruluma devam edebilirsiniz. Yeni paketi GitHub sayfamızda bulabilirsiniz.','You can continue setup with the installed version. Find the new package on our GitHub page.');
        }
        var hint = document.getElementById('update-progress-hint'), waiting = state.phase === 'restart' || requirement;
        if (meter) meter.style.display = waiting ? 'none' : '';
        if (count) count.style.display = waiting ? 'none' : '';
        if (hint) hint.style.display = waiting ? 'none' : '';
        if (data && typeof data === 'object' && typeof data.percent === 'number') {
          percent = Math.max(percent, data.percent);
          detail.textContent = label('Doğrulanan dosya: ', 'Verified files: ') + data.filesDone + ' / ' + data.filesTotal + ' · ' + label('İndirilen: ', 'Downloaded: ') + Math.ceil(data.downloadedBytes / 1024) + ' KiB · ' + label('Yerelden: ', 'Reused: ') + Math.ceil(data.reusedBytes / 1024) + ' KiB';
        } else if (state.phase === 'verifying') percent = Math.max(percent, 98);
        else if (state.phase === 'applying') percent = Math.max(percent, 99);
        else if (state.phase === 'reload') percent = 100;
        else if (state.phase === 'restart') { percent = 98;detail.textContent = label('Değişiklikler yeniden başlatınca etkinleşecek.','Changes take effect after restart.'); }
        else if (state.phase === 'checking') { percent = 0;detail.textContent = ''; }
        if (meter && count) { if (percent > 0) { meter.max = 100;meter.value = percent;count.textContent = Math.floor(percent) + '%'; } else { meter.removeAttribute('value');count.textContent = label('Lütfen bekleyin…','Please wait…'); } }
        if (state.phase !== 'choice' && state.phase !== 'restart' && !requirement) return;
        var restarting = state.phase === 'restart';
        if (restarting && root.FilmCoreReleaseNotes) root.FilmCoreReleaseNotes.render(panel, state.detail, english).style.fontSize = '20px';
        var proceed = label('Mevcut sürümle devam et','Continue with installed version'), github = label('GitHub sayfamız','Our GitHub page');
        (restarting ? [label('Yeniden başlat','Restart'),github] : requirement ? [proceed,github] : [label('Tekrar dene','Retry'),proceed]).forEach(function (text, index) {
          var link = (restarting || requirement) && index === 1, b = document.createElement(link ? 'a' : 'button');if (link) { b.href = root.FilmCoreReleaseNotes.github;b.target = '_blank';b.rel = 'noopener noreferrer'; } else b.type = 'button';b.textContent = text;b.style.cssText = 'display:block;box-sizing:border-box;text-align:center;text-decoration:none;width:100%;margin:10px 0;padding:14px;background:#223149;color:white;border:2px solid #718096;font:22px Arial';
          b.onfocus = function () { b.style.borderColor = '#ffc447';b.style.outline = 'none'; };b.onblur = function () { b.style.borderColor = '#718096'; };
          if (!link) b.onclick = function () { if (restarting) service.restart();else if (requirement || index) service.continueCurrent();else service.retry(); };panel.appendChild(b);
        });panel.querySelectorAll('button,a')[0].focus();
      }
      var storage = null;try { storage = root.sessionStorage; } catch (ignore) {}
      service = new root.FilmFirstRunUpdate({ core: manager, storage: storage, notify: render });
      detail.style.cssText = 'font-size:20px;line-height:1.5;color:#c1cddd';box.appendChild(detail);box.appendChild(panel);root.addEventListener('keydown',keys,true);root.addEventListener('keyup',keys,true);guard.suspend();
      function cleanup() { root.removeEventListener('keydown',keys,true);root.removeEventListener('keyup',keys,true);if(panel.parentNode)panel.parentNode.removeChild(panel);if(detail.parentNode)detail.parentNode.removeChild(detail);guard.resume(); }
      return manager.commit({booting:false}).then(function () { return service.start({enabled:true,firstInstall:true,manualRestart:true,showRequirement:true}); }).then(function (result) { cleanup();if(result.action === 'reload') { root.location.reload();return true; }return manager.commit({booting:true}).then(function () { return false; }); },function (error) { cleanup();throw error; });
    });
  }
  root.FilmFirstRunBoot = { run: run, incomplete: incomplete };
})(window);
