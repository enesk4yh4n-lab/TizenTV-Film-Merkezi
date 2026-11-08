/* Empty-install site package screen. No provider code is bundled or fetched without choice. */
(function (root) {
  'use strict';
  var active = false;
  function open(manager, core) {
    if (active) return new Promise(function () {});
    active = true;
    core.markHealthy();
    var host = document.createElement('section'), box = document.createElement('div'), status = document.createElement('p'), list = document.createElement('div'), actions = document.createElement('div'), input = document.createElement('input'), repoId = '', index = null, busy = false, selected = { hdf: true, filmizle: true }, pendingTrust = false;
    host.id = 'site-package-setup'; host.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:10000;background:#0c1421;color:#fff;font:26px Arial;overflow:auto;padding:44px 64px;box-sizing:border-box';
    box.style.cssText = 'max-width:1700px;margin:auto'; host.appendChild(box);
    var title = document.createElement('h1'); title.textContent = 'Film Merkezi · Site paketleri / Site packages'; box.appendChild(title);
    var intro = document.createElement('p'); intro.textContent = 'Kurulu site yok. Siteleri seçip internetten kurun. / No sites installed. Choose site packages to download.'; box.appendChild(intro);
    box.appendChild(status); box.appendChild(list); input.type = 'url'; input.maxLength = 500; input.setAttribute('aria-label', 'Eklenti deposu / Repository URL'); input.style.cssText = 'display:block;width:95%;font-size:24px;padding:12px;margin:20px 0'; input.placeholder = 'https://…/repository.json'; box.appendChild(input); box.appendChild(actions); document.body.appendChild(host);
    function buttons() { return Array.prototype.filter.call(host.querySelectorAll('button,input'), function (n) { return !n.disabled && n.getClientRects().length; }); }
    function style(n) { n.style.cssText = 'font:24px Arial;color:#fff;background:#203249;border:3px solid transparent;padding:14px;margin:6px;text-align:left;max-width:100%;box-sizing:border-box'; n.onfocus = function () { n.style.borderColor = '#ffc43d'; }; n.onblur = function () { n.style.borderColor = 'transparent'; }; }
    function button(text, key, fn, parent, enabled) { var n = document.createElement('button'); n.type = 'button'; n.textContent = text; n.setAttribute('data-setup', key); n.disabled = busy || enabled === false; style(n); n.onclick = fn; (parent || actions).appendChild(n); return n; }
    function exit() { if (busy) { manager.cancel(); core.cancel(); status.textContent = 'İşlem iptal ediliyor / Cancelling'; return; } try { root.tizen.application.getCurrentApplication().exit(); } catch (ignore) { status.textContent = 'Geri dönmek için uygulamayı kapatın / Close the application to exit.'; } }
    function draw(focus) {
      var old = document.activeElement && document.activeElement.getAttribute('data-setup'); list.textContent = ''; actions.textContent = ''; input.disabled = busy;
      if (index) {
        var name = document.createElement('p'); name.textContent = index.name; list.appendChild(name);
        index.plugins.forEach(function (item) { var n = button((selected[item.id] ? '☑ ' : '☐ ') + item.name + ' · ' + item.version, 'site-' + item.id, function () { selected[item.id] = !selected[item.id]; draw('site-' + item.id); }, list); n.style.display = 'block'; n.style.width = '95%'; n.setAttribute('aria-pressed', selected[item.id] ? 'true' : 'false'); });
        button('Tümünü seç / Select all', 'all', function () { index.plugins.forEach(function (p) { selected[p.id] = true; }); draw('all'); });
        button('Seçimleri temizle / Clear selection', 'none', function () { selected = {}; draw('none'); });
        var count = index.plugins.filter(function (p) { return selected[p.id]; }).length;
        button('Seçilenleri kur / Install selected (' + count + ')', 'install', install, actions, count > 0 && !!repoId);
      }
      button('Kontrol et: çekirdek ve siteler / Check: core and sites', 'official', official);
      button('Bu depoyu incele / Inspect this repository', 'probe', custom);
      if (pendingTrust) button('Bu yayıncıya güven / Trust this publisher', 'trust', function () { work(function () { return manager.approve().then(catalog); }); });
      if (Object.keys(manager.state.plugins).some(function (k) { return !!manager.state.plugins[k].pending; })) button('Uygula ve yeniden aç / Apply and restart', 'apply', function () { root.location.reload(); });
      var s = core.status();
      if (s.available && s.available !== s.current) button('Çekirdek güncellemesini indir / Download core update', 'core-download', function () { work(function () { return core.download().then(function () { status.textContent = core.note; }); }); });
      if (s.pending) button('Çekirdeği uygula ve yeniden aç / Apply core update', 'core-apply', function () { work(function () { return core.apply().then(function () { root.location.reload(); }); }); });
      var cancel = button(busy ? 'İptal / Cancel' : 'Çıkış / Exit', 'exit', exit); cancel.disabled = false;
      var target = host.querySelector('[data-setup="' + (focus || old || 'official') + '"]'); if (target && !target.disabled) target.focus(); else cancel.focus();
    }
    function work(fn) { if (busy) return; busy = true; draw('exit'); Promise.resolve().then(fn).then(function () { busy = false; draw(); }, function (e) { busy = false; status.textContent = e.message || 'İşlem tamamlanamadı / Operation failed'; draw(); }); }
    function catalog(id) { repoId = id; pendingTrust = false; return manager.catalog(id).then(function (value) { index = value; status.textContent = 'Depo: ' + value.name + ' · ' + value.plugins.length + ' paket. İndirme için seçim yapın. / Choose packages to download.'; }); }
    function official() {
      work(function () {
        var config = root.FilmUpdateConfig.officialRepository, failures = [];
        if (!config) throw new Error('Resmî depo bilgisi bulunamadı / Official repository unavailable');
        var existing = Object.keys(manager.state.repositories).filter(function (id) { return manager.state.repositories[id].url === config.url; })[0];
        var task = existing ? manager.state.repositories[existing].enabled ? manager.checkRepository(existing).then(function () { return catalog(existing); }) : Promise.resolve() : manager.probe(config.url).then(function (candidate) { if (candidate.fingerprint !== config.fingerprint) { manager.discardCandidate(); throw new Error('Resmî yayıncı anahtarı eşleşmiyor / Official publisher key mismatch'); } return manager.approve(); }).then(catalog);
        return task.catch(function (e) { failures.push(e.message); }).then(function () {
          var p = Promise.resolve();Object.keys(manager.state.repositories).forEach(function (id) { var r = manager.state.repositories[id];if (!r.enabled || r.url === config.url) return;p = p.then(function () { return manager.checkRepository(id).catch(function (e) { failures.push(e.message); }); }); });return p;
        }).then(function () { return core.check().then(function (s) { status.textContent += ' · ' + s.note; }, function (e) { failures.push(e.message); }); }).then(function () { if (failures.length) status.textContent += ' · Denetlenemeyen / Unchecked: ' + failures.join(' · '); });
      });
    }
    function custom() { work(function () { return manager.probe(input.value).then(function (candidate) { pendingTrust = true; index = null; repoId = ''; status.textContent = candidate.repository.name + ' · ' + candidate.fingerprint + '. Eklentiler uygulamayla aynı yetkilere sahiptir. / Plugins share application privileges.'; }); }); }
    function install() { var jobs = index && index.plugins.filter(function (item) { return selected[item.id]; }); if (!jobs || !jobs.length) return; work(function () { var p = Promise.resolve(); jobs.forEach(function (item, i) { p = p.then(function () { status.textContent = (i + 1) + '/' + jobs.length + ' · ' + item.name; return manager.download(repoId, item.id); }); }); return p.then(function () { status.textContent = 'Paketler doğrulandı. Uygula ve yeniden aç seçin. / Packages verified. Select Apply and restart.'; }); }); }
    host.addEventListener('keydown', function (e) { var code = e.keyCode || e.which; if (document.activeElement === input && [13,27,10009].indexOf(code) < 0) return; if ([37,38,39,40,13,27,10009].indexOf(code) < 0) return; e.preventDefault(); e.stopImmediatePropagation(); if (e.repeat) return; if (code === 27 || code === 10009) return exit(); var nodes = buttons(), i = nodes.indexOf(document.activeElement); if (code === 13) { if (document.activeElement === input) custom(); else if (i >= 0 && nodes[i].tagName === 'BUTTON') nodes[i].click(); } else { var next = nodes[Math.max(0, Math.min(nodes.length - 1, i + (code === 37 || code === 38 ? -1 : 1)))]; if (next) { next.focus(); next.scrollIntoView(false); } } });
    draw('official');
    setTimeout(function () { if (!busy) official(); }, 1200);
    return new Promise(function () {});
  }
  root.FilmSiteSetup = { open: open };
})(window);
