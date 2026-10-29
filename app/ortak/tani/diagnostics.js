(function (root) {
 'use strict'; var C = root.PlayerCore;
 function version() { return root.AppInfo && root.AppInfo.version || 'bilinmiyor'; }
 function Diagnostics() { this.lines = []; this.started = Date.now(); }
 Diagnostics.prototype.log = function (message) { this.lines.push(new Date().toISOString() + ' +' + ((Date.now() - this.started) / 1000).toFixed(1) + 's [' + version() + '] ' + C.safeMessage(message)); if (this.lines.length > 120) this.lines.splice(0, this.lines.length - 120); };
 Diagnostics.prototype.describe = function (c) {
  var s = c.snapshot || {}, buffered = (s.buffered || []).filter(function (r) { return r.start <= c.position && r.end >= c.position; })[0];
  return ['Sürüm: ' + version(), 'İçerik: ' + (c.content ? c.content.title + ' · ' + c.content.contentId : 'yok'), 'Motor: ' + (s.engine || 'n/a'), 'Kaynak: ' + (c.content && c.content.sources[c.currentSource] ? c.content.sources[c.currentSource].label : 'n/a'),
   'Durum: ' + c.phase + ' · oturum ' + c.session + ' · deneme ' + (c.retryCount || 0), 'Ağ: ' + (s.transport || 'n/a') + ' · HTTP: native bilinmiyor; XHR hataları günlükte',
   'Kalite: ' + (s.actualQuality || 'n/a') + ' · codec: ' + (s.codecs || 'n/a'), 'Varyant: ' + (s.bitrate ? (s.bitrate / 1000000).toFixed(2) + ' Mb/sn' : 'n/a'),
   'Bant genişliği tahmini: ' + (s.bandwidth ? (s.bandwidth / 1000000).toFixed(2) + ' Mb/sn' : 'n/a'), 'Tampon: ' + (buffered ? (buffered.end - c.position).toFixed(1) + ' sn' : 'n/a'),
   'Kare: ' + (s.frames ? s.frames.totalVideoFrames + ' / düşen ' + s.frames.droppedVideoFrames : 'n/a'), 'Konum: ' + C.format(c.position) + ' / ' + C.format(c.duration || NaN),
   'Ses gecikmesi: bu motorda API yok', '4K/HDR/HEVC/Dolby: bu cihaz/akış için doğrulama bekliyor', 'MP4: ayrı TV doğrulaması bekliyor',
   'Hız: ' + (s.rate || 1) + 'x · doğrulanmış: ' + c.settings.verifiedRates.join(', '), 'Günlük (son 120 kayıt):', this.lines.join('\n')].join('\n');
 };
 function Lifecycle(controller, input) {
  var disabled = null, pending = null, generation = 0;
  function screenSaver(playing) {
   if (pending === playing || pending === null && disabled === playing) return; var api = root.webapis && root.webapis.appcommon; if (!api || !api.setScreenSaver) return;
   pending = playing; var token = ++generation;
   try { var states = api.AppCommonScreenSaverState, value = states ? states[playing ? 'SCREEN_SAVER_OFF' : 'SCREEN_SAVER_ON'] : playing ? 0 : 1;
    api.setScreenSaver(value, function () { if (token === generation) { disabled = playing; pending = null; } }, function (e) { if (token === generation) pending = null; controller.log('Ekran koruyucu: ' + e.name); });
   } catch (e) { if (token === generation) pending = null; controller.log('Ekran koruyucu: ' + e.name); }
  }
  controller.on('change', function () { screenSaver(controller.phase === 'playing' && controller.desiredPlay && !controller.seekHold); });
  document.addEventListener('visibilitychange', function () { if (document.hidden || document.webkitHidden) { input.cancel(); controller.hide(); screenSaver(false); } else controller.show(); });
  root.addEventListener('pagehide', function () { input.cancel(); controller.hide(); screenSaver(false); });
  root.addEventListener('beforeunload', function () { controller.checkpoint(); controller.stop('unload'); screenSaver(false); });
 }
 root.PlayerDiagnostics = Diagnostics; root.PlayerLifecycle = Lifecycle;
})(window);
