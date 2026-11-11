/* Startup feedback only; never captures the remote or approves an update. */
(function (root) {
  'use strict';
  var finished = false, state = {}, initialLanguage = 'tr';
  try { var raw = root.localStorage.getItem('filmmerkezi.catalog.preferences.v1'), saved = raw && raw.length < 32768 && JSON.parse(raw); if (saved && saved.language === 'en') initialLanguage = 'en'; } catch (ignore) {}
  function english() { return root.FilmI18n ? root.FilmI18n.language() === 'en' : initialLanguage === 'en'; }
  function stage(tr, en, completed, total) {
    if (finished) return;
    var status = document.getElementById('update-boot-status'), meter = document.getElementById('update-progress'), count = document.getElementById('update-progress-count');
    state = { phase: english() ? en : tr, completed: completed, total: total };
    status.textContent = state.phase;
    if (meter) { if (total > 0 && completed >= 0) { meter.max = total; meter.value = Math.min(total, completed); count.textContent = completed + ' / ' + total; } else { meter.removeAttribute('value'); count.textContent = english() ? 'Please wait…' : 'Lütfen bekleyin…'; } }
    var hint = document.getElementById('update-progress-hint'); if (hint) hint.textContent = english() ? 'Preparing the application. Please keep it open.' : 'Uygulama hazırlanıyor. Lütfen açık bırakın.';
  }
  root.FilmBootProgress = { stage: stage, finish: function () { finished = true; document.getElementById('update-boot').style.display = 'none'; }, status: function () { return state; } };
  stage('Başlatılıyor…', 'Starting…');
})(window);
