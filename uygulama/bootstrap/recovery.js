/* Recovery is part of the WGT, independent of downloaded UI and plugins. */
(function (root) {
  'use strict';
  var timer, overall, stopped = false, phase = '', manager, buttons = [], visible = false;
  function en() { try { return JSON.parse(root.localStorage.getItem('filmmerkezi.catalog.preferences.v1') || '{}').language === 'en'; } catch (ignore) { return false; } }
  function label(tr, english) { return en() ? english : tr; }
  function check() { if (stopped) throw new Error('Başlangıç iptal edildi.'); }
  function stage(name, milliseconds) { check(); phase = name; clearTimeout(timer); timer = setTimeout(function () { fail(new Error(label('Aşama süresi doldu: ', 'Startup stage timed out: ') + phase)); }, milliseconds || 45000); }
  function healthy() { if (stopped) return; clearTimeout(timer); clearTimeout(overall); }
  function fail(error) {
    if (stopped || manager && manager.healthy) return;
    stopped = true; healthy(); clearTimeout(timer); clearTimeout(overall);
    if (manager) { manager.bootStopped = true; manager.cancel(); clearTimeout(manager.watchdog); }
    if (root.FilmPlugins) { root.FilmPlugins.blocked = true; root.FilmPlugins.generation++; if (root.FilmPlugins.cancel) try { root.FilmPlugins.cancel(); } catch (ignore) {} }
    visible = true;
    var overlay = document.getElementById('update-boot'), box = document.getElementById('update-boot-card'), status = document.getElementById('update-boot-status'), old = document.getElementById('boot-recovery');
    overlay.style.display = 'block'; status.textContent = label('Başlatılamadı: ', 'Startup failed: ') + (error && error.message || phase);
    if (old) old.parentNode.removeChild(old);
    var panel = document.createElement('div'); panel.id = 'boot-recovery'; box.appendChild(panel); buttons = [];
    var note = document.createElement('p'); note.textContent = label('Kayıtlar silinmez. Eklentisiz açılış tek oturumdur. Önceki çekirdek başarıyla açılırsa etkin olur.', 'Records are kept. Plugins are skipped for one launch. A previous core becomes active only after a healthy startup.'); panel.appendChild(note);
    function action(mode, tr, english, enabled) { var b = document.createElement('button'); b.type = 'button'; b.setAttribute('data-recovery', mode); b.textContent = label(tr, english); b.disabled = !enabled; b.style.cssText = 'display:block;width:100%;margin:8px 0;padding:12px;background:#223149;color:white;border:2px solid #718096;font-size:22px'; b.onfocus = function () { b.style.borderColor = '#ffc447'; }; b.onblur = function () { b.style.borderColor = '#718096'; }; b.onclick = function () { try { root.sessionStorage.setItem('film.boot.recovery', mode); root.location.reload(); } catch (e) { status.textContent = label('Yeniden açma tercihi kaydedilemedi: ', 'Cannot save recovery choice: ') + e.message; } }; panel.appendChild(b); if (enabled) buttons.push(b); }
    action('normal', 'Yeniden dene', 'Retry', true);
    action('no-plugins', 'Eklentileri yüklemeden aç', 'Start without plugins', true);
    action('bundled', 'WGT içindeki çekirdekle, eklentisiz aç', 'Start bundled core without plugins', true);
    action('previous', 'Önceki çekirdekle, eklentisiz aç', 'Start previous core without plugins', !!(manager && manager.state.previous));
    document.getElementById('update-retry').style.display = 'none'; buttons[0].focus();
  }
  root.addEventListener('focusin', function (event) {
    if (visible && buttons.length && buttons.indexOf(event.target) < 0) buttons[0].focus();
  }, true);
  root.addEventListener('keydown', function (event) {
    if (!visible) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (event.repeat) return;
    var i = buttons.indexOf(document.activeElement), k = event.keyCode;
    if (k === 38 || k === 37) i = Math.max(0, i - 1);
    else if (k === 40 || k === 39) i = Math.min(buttons.length - 1, i + 1);
    else if (k === 13 && i >= 0) { buttons[i].click(); return; }
    else if (k === 27 || k === 10009) i = 0;
    if (buttons[i]) buttons[i].focus();
  }, true);
  root.addEventListener('error', function (event) { if (!manager && event.message) fail(new Error(event.message)); });
  root.addEventListener('unhandledrejection', function (event) { if (!manager || !manager.healthy) fail(event.reason instanceof Error ? event.reason : new Error('Unhandled startup rejection')); });
  root.FilmBootRecovery = { bind: function (m) { manager = m; }, check: check, stage: stage, suspend: function () { check(); clearTimeout(timer); clearTimeout(overall); }, resume: function () { check(); clearTimeout(overall); overall = setTimeout(function () { fail(new Error('Overall startup deadline exceeded')); }, 120000); stage('startup resumed', 45000); }, healthy: healthy, fail: fail, mode: function () { var mode = ''; try { mode = root.sessionStorage.getItem('film.boot.recovery') || ''; root.sessionStorage.removeItem('film.boot.recovery'); } catch (ignore) {} return /^(normal|no-plugins|bundled|previous)$/.test(mode) ? mode : ''; } };
  overall = setTimeout(function () { fail(new Error(label('Toplam başlangıç süresi doldu.', 'Overall startup deadline exceeded.'))); }, 120000);
  stage('bootstrap', 45000);
})(window);
