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
      var guard = root.FilmBootRecovery, status = document.getElementById('update-boot-status'), box = document.getElementById('update-boot-card'), panel = document.createElement('div'), service, english = false, held = false;
      try { english = JSON.parse(root.localStorage.getItem('filmmerkezi.catalog.preferences.v1') || '{}').language === 'en'; } catch (ignore) {}
      function label(tr, en) { return english ? en : tr; }
      function keys(e) {
        if (!panel.children.length) return;
        e.preventDefault();e.stopImmediatePropagation();
        var buttons = panel.querySelectorAll('button'), index = document.activeElement === buttons[1] ? 1 : 0;
        if (e.type === 'keyup') { held = false;return; }
        if (e.keyCode === 13) { if (!held && !e.repeat) buttons[index].click();held = true; }
        else if ([37,38,39,40].indexOf(e.keyCode) >= 0) buttons[1-index].focus();
      }
      function render(state) {
        panel.textContent = '';
        var messages = {checking:label('Çekirdek güncellemesi kontrol ediliyor…','Checking core updates…'),downloading:label('Güncel çekirdek indiriliyor…','Downloading the latest core…'),verifying:label('Güncelleme doğrulanıyor…','Verifying update…'),applying:label('Güncelleme uygulanıyor…','Applying update…'),reload:label('Güncel kurulum açılıyor…','Opening the updated setup…'),ready:label('Kurulum hazırlanıyor…','Preparing setup…')};
        status.textContent = messages[state.phase] || label('Güncelleme tamamlanamadı: ','Update could not be completed: ') + state.error;
        if (state.phase !== 'choice') return;
        [label('Tekrar dene','Retry'),label('Mevcut sürümle devam et','Continue with installed version')].forEach(function (text, index) {
          var b = document.createElement('button');b.type = 'button';b.textContent = text;b.style.cssText = 'display:block;width:100%;margin:10px 0;padding:14px;background:#223149;color:white;border:2px solid #718096;font:22px Arial';
          b.onfocus = function () { b.style.borderColor = '#ffc447'; };b.onblur = function () { b.style.borderColor = '#718096'; };
          b.onclick = function () { if (index) service.continueCurrent();else service.retry(); };panel.appendChild(b);
        });panel.firstChild.focus();
      }
      var storage = null;try { storage = root.sessionStorage; } catch (ignore) {}
      service = new root.FilmFirstRunUpdate({ core: manager, storage: storage, notify: render });
      box.appendChild(panel);root.addEventListener('keydown',keys,true);root.addEventListener('keyup',keys,true);guard.suspend();
      function cleanup() { root.removeEventListener('keydown',keys,true);root.removeEventListener('keyup',keys,true);if(panel.parentNode)panel.parentNode.removeChild(panel);guard.resume(); }
      return manager.commit({booting:false}).then(function () { return service.start({enabled:true,firstInstall:true}); }).then(function (result) { cleanup();if(result.action === 'reload') { root.location.reload();return true; }return manager.commit({booting:true}).then(function () { return false; }); },function (error) { cleanup();throw error; });
    });
  }
  root.FilmFirstRunBoot = { run: run, incomplete: incomplete };
})(window);
