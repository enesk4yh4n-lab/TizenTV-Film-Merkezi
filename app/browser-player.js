/* HTML5/MSE engine. Transport selection remains identical to the TV-proven v0.2 path. */
(function (root) {
 'use strict'; var C = root.PlayerCore;
 function Engine(video, subtitles, log) {
  this.video = video; this.subtitles = subtitles; this.log = log || function () {}; this.generation = 0; this.playGeneration = 0; this.hls = null; this.listeners = []; this.callback = function () {}; this.active = false; this.timer = null; this.audioTimer = null;
 }
 Engine.prototype.emit = function (type, data) { if (this.active) this.callback(type, data || {}); };
 Engine.prototype.listen = function (name, fn) { this.video.addEventListener(name, fn); this.listeners.push([name, fn]); };
 Engine.prototype.stop = function () {
  this.active = false; this.generation++; this.playGeneration++; clearInterval(this.timer); clearTimeout(this.audioTimer); this.timer = this.audioTimer = null; this.audioTransaction = null; this.requestedSeek = null;
  var v = this.video; this.listeners.forEach(function (p) { v.removeEventListener(p[0], p[1]); }); this.listeners = [];
  if (this.hls) { try { this.hls.destroy(); } catch (ignore) {} this.hls = null; }
  this.subtitles.clear(); try { v.pause(); v.removeAttribute('src'); v.load(); } catch (ignore2) {} v.style.display = 'none'; this.callback = function () {};
 };
 Engine.prototype.open = function (source, options, callback) {
  this.stop(); var self = this, v = self.video, token = self.generation; self.active = true; self.callback = callback; self.source = source; self.options = options || {}; self.ready = false; self.fatalReported = false; self.lastStats = {}; self.selectedSubtitle = null;
  self.policy = { preferred: source.transport || 'native', userAgent: source.userAgent || '' }; self.position = Math.max(0, options.position || 0); self.blockedQualities = [];
  self.subtitles.setStyle(options.style || C.defaults.subtitleStyle); self.subtitles.setOffset(options.subtitleOffset || 0);
  v.style.display = 'block'; v.controls = false; v.autoplay = false; v.playbackRate = 1; v.style.objectFit = options.aspect === 'zoom' ? 'cover' : 'contain';
  function alive() { return self.active && token === self.generation; }
  function ready() { if (!alive() || self.ready || self.position > 0 && typeof v.readyState === 'number' && v.readyState < 3) return; self.ready = true; self.emit('ready', self.snapshot()); }
  function event(type) { return function () { if (alive()) self.emit(type, self.snapshot()); }; }
  self.listen('loadedmetadata', ready); self.listen('loadeddata', ready); self.listen('canplay', ready); self.listen('durationchange', function () { if (alive() && self.ready) self.emit('time', self.snapshot()); });
  self.listen('playing', event('playing')); self.listen('pause', event('paused')); self.listen('waiting', event('buffering'));
  self.listen('seeking', event('seeking')); self.listen('seeked', function () { if (!alive()) return; if (self.requestedSeek) { self.finishSeek(); return; } self.emit('seeked', self.snapshot()); }); self.listen('ended', event('ended'));
  self.listen('timeupdate', function () { if (alive()) { self.subtitles.render(v.currentTime); self.emit('time', self.snapshot()); } });
  self.listen('error', function () { if (!alive()) return; var e = v.error; self.emit('error', { type: 'media', fatal: true, code: e ? e.code : 0, message: 'Video motoru oynatmayı sürdüremedi.' }); });
  self.timer = setInterval(function () { if (!alive()) return; self.finishSeek(); self.subtitles.render(v.currentTime); self.emit('tick', self.snapshot()); }, 100);
  try {
   if (source.type === 'mp4') {
    if (!options.mp4Verified) throw new Error('Bu TV’de MP4 yolu henüz doğrulanmadı.'); v.src = source.url; v.load(); return;
   }
   if (!root.Hls || !root.Hls.isSupported()) throw new Error('Bu TV’de MSE / HLS motoru kullanılamıyor.');
   var retry = { maxNumRetry: 1, retryDelayMs: 1000, maxRetryDelayMs: 2000 };
   var loadPolicy = { default: { maxTimeToFirstByteMs: 12000, maxLoadTimeMs: 22000, timeoutRetry: retry, errorRetry: retry } };
   var h = self.hls = new root.Hls({ enableWorker: false, lowLatencyMode: false, maxBufferLength: options.smallBuffer ? 10 : 15, maxMaxBufferLength: options.smallBuffer ? 20 : 30, backBufferLength: 10, maxBufferSize: 30 * 1024 * 1024,
    // Initialize the legacy TV decoder with the opening GOP before the controller
    // applies the saved position. Starting demux and seeking to it concurrently
    // can leave the native pipeline without a decodable first frame.
    startPosition: 0, startLevel: -1, capLevelToPlayerSize: true, renderTextTracksNatively: false, subtitleDisplay: false, enableCEA708Captions: false,
    manifestLoadPolicy: loadPolicy, playlistLoadPolicy: loadPolicy, fragLoadPolicy: loadPolicy, keyLoadPolicy: loadPolicy,
    loader: root.NativeHlsLoader.create({ policy: self.policy, referer: source.referer, deadline: function () { return self.options.deadline ? self.options.deadline() : null; }, onstatus: self.log }) });
   function on(name, fn) { h.on(root.Hls.Events[name], function (eventName, data) { if (alive()) fn(data); }); }
   function tracks() { self.emit('tracks', self.tracks()); }
   on('MANIFEST_PARSED', function () {
    var safe = h.levels.filter(function (l) { return !C.mediaGate(l); });
    if (!safe.length) { self.emit('error', { type: 'unsupported', message: 'Bu kaynak yalnızca bu TV/motorda doğrulanmamış görüntü veya ses biçimleri sunuyor. Başka kaynak seçin.' }); return; }
    for (var i = h.levels.length - 1; i >= 0; i--) { var level = h.levels[i], reason = C.mediaGate(level); if (reason) { self.blockedQualities.push({ index: -1, height: level.height, bitrate: level.bitrate, codec: level.videoCodec, reason: reason }); h.removeLevel(i); } }
    h.subtitleTrack = self.selectedSubtitle && self.selectedSubtitle.kind === 'hls' ? self.selectedSubtitle.index : -1; h.subtitleDisplay = false; if (!self.setQuality(options.quality || 0, options.qualityCap || 0)) self.emit('notice', { message: 'Kayıtlı kalite veya üst sınır bu kaynakta yok; mevcut otomatik kalite kullanılıyor.' }); tracks();
   });
   on('AUDIO_TRACKS_UPDATED', tracks); on('SUBTITLE_TRACKS_UPDATED', function () { if (!self.selectedSubtitle) { h.subtitleTrack = -1; h.subtitleDisplay = false; } tracks(); });
   on('AUDIO_TRACK_SWITCHED', function () { if (self.audioTransaction && h.audioTrack === self.audioTransaction.next) self.audioTransaction.confirmed = true; self.emit('audiochanged', self.tracks()); });
   on('LEVEL_SWITCHED', function () { self.emit('qualitychanged', self.snapshot()); tracks(); });
   on('CUES_PARSED', function (d) { if (d.type === 'subtitles') self.subtitles.ingest((d.subtitleTrack && d.subtitleTrack.groupId ? d.subtitleTrack.groupId + ':' : '') + d.track, d.cues, v.currentTime); });
   on('FRAG_BUFFERED', function (d) { if (d.stats) self.lastStats = { bytes: d.stats.total, loadMs: d.stats.loading.end - d.stats.loading.start }; });
   on('ERROR', function (d) {
    self.log('hls.js ' + d.type + '/' + d.details + (d.fatal ? ' kalıcı' : ''));
    if (/subtitle/i.test(d.details)) { self.emit('subtitleerror', { message: 'Altyazı indirilemedi. Menüden yeniden deneyebilirsiniz.' }); return; }
    if (/audioTrack/i.test(d.details) && self.audioTransaction) { var oldAudio = self.audioTransaction.old; self.rollbackAudio(); self.emit('audiofailed', { track: self.tracks().audio.filter(function (t) { return t.index === oldAudio; })[0], message: 'Ses değiştirilemedi; önceki ses geri alındı.' }); return; }
    if (/bufferFull/i.test(d.details)) { h.config.maxBufferLength = 10; h.config.maxMaxBufferLength = 20; }
    if (d.fatal) self.emit('error', { type: d.type === root.Hls.ErrorTypes.NETWORK_ERROR ? 'network' : 'media', details: d.details, code: d.response && d.response.code, message: d.error && d.error.message || d.details, fatal: true });
   });
   h.attachMedia(v); h.loadSource(source.url);
  } catch (e) { self.emit('error', { type: 'unsupported', fatal: true, message: e.message }); }
 };
 Engine.prototype.snapshot = function () {
  var v = this.video, h = this.hls, ranges = [], seekable = [], i;
  try { for (i = 0; i < Math.min(v.buffered.length, 12); i++) ranges.push({ start: v.buffered.start(i), end: v.buffered.end(i) }); for (i = 0; i < v.seekable.length; i++) seekable.push({ start: v.seekable.start(i), end: v.seekable.end(i) }); } catch (ignore) {}
  var quality = h && h.levels[h.currentLevel], frames = null;
  try { if (v.getVideoPlaybackQuality) { var q = v.getVideoPlaybackQuality(); frames = { totalVideoFrames: q.totalVideoFrames, droppedVideoFrames: q.droppedVideoFrames }; } else if (typeof v.webkitDecodedFrameCount === 'number') frames = { totalVideoFrames: v.webkitDecodedFrameCount, droppedVideoFrames: v.webkitDroppedFrameCount }; } catch (ignore2) {}
  // Some legacy TV engines expose the counters but permanently return zero.
  if (frames && v.currentTime > 1 && frames.totalVideoFrames === 0) frames = null;
  return { position: v.currentTime || 0, duration: C.finite(v.duration) ? v.duration : 0, live: v.duration === Infinity, paused: v.paused, seeking: v.seeking, buffered: ranges, seekable: seekable,
   rate: v.playbackRate, actualQuality: quality ? quality.height || quality.name || 'n/a' : 'n/a', bitrate: quality ? quality.bitrate : 0, codecs: quality ? [quality.videoCodec, quality.audioCodec].filter(Boolean).join(' / ') : 'n/a',
   bandwidth: h && C.finite(h.bandwidthEstimate) ? h.bandwidthEstimate : null, frames: frames, transport: this.policy ? this.policy.preferred : 'n/a', engine: h ? 'hls.js ' + root.Hls.version + ' / MSE' : 'HTML5', stats: this.lastStats };
 };
 Engine.prototype.tracks = function () {
  var h = this.hls, v = this.video, seen = {}, external = (this.source && this.source.subtitles || []).map(function (t, i) {
   var x = C.copy(t); x.kind = 'external'; x.key = 'external-' + i; x.name = x.name || x.label || x.lang || 'Altyazı'; return x;
  });
  var subs = h ? h.subtitleTracks.map(function (t, i) { return { kind: 'hls', key: (t.groupId ? t.groupId + ':' : '') + (t.default ? 'default' : 'subtitles' + i), index: i, name: t.name || t.lang || 'Altyazı', lang: t.lang || '', characteristics: t.characteristics, forced: t.forced, url: t.url }; }) : [];
  subs = subs.concat(external).filter(function (t) { if (!t.url) return true; if (seen[t.url]) return false; seen[t.url] = true; return true; });
  var seenAudio = {};
  return { qualities: h ? h.levels.map(function (l, i) { return { index: i, height: l.height || 0, width: l.width || 0, bitrate: l.bitrate || 0, codec: l.videoCodec || '', name: l.name || '' }; }) : [],
   audio: h ? h.audioTracks.map(function (t, i) { return { index: i, lang: t.lang || '', name: t.name || 'Dil bilgisi yok', characteristics: t.characteristics, default: t.default, url: t.url, codec: t.audioCodec || t.codec || t.attrs && t.attrs.CODECS || '', channels: t.channels || t.attrs && t.attrs.CHANNELS || '', blockedReason: C.audioGate(t) }; }).filter(function (t) { if (!t.url) return true; if (seenAudio[t.url]) return false; seenAudio[t.url] = true; return true; }) : [],
   subtitles: subs, blockedQualities: this.blockedQualities || [], qualityIndex: h ? h.loadLevel : -1, autoQuality: h ? h.autoLevelEnabled : true, audioIndex: h ? h.audioTrack : -1, subtitleKey: this.selectedSubtitle ? this.selectedSubtitle.key : null, live: v.duration === Infinity };
 };
 Engine.prototype.play = function () { var self = this, token = self.generation, request = ++self.playGeneration; try { var p = self.video.play(); if (p && p.catch) p.catch(function (e) { if (self.active && token === self.generation && request === self.playGeneration) self.emit('error', { type: 'play', message: e.message }); }); } catch (e) { if (request === self.playGeneration) self.emit('error', { type: 'play', message: e.message }); } };
 Engine.prototype.pause = function () { this.playGeneration++; this.video.pause(); };
 Engine.prototype.seek = function (position) {
  var s = this.snapshot(), max = s.duration > 0 ? Math.max(0, s.duration - 0.1) : 0;
  if (s.live && s.seekable.length) { var r = s.seekable[s.seekable.length - 1]; position = C.clamp(position, r.start, r.end - 0.1); }
  else if (max) position = C.clamp(position, 0, max); else return false;
  try {
   this.requestedSeek = { target: position, started: Date.now(), last: Date.now(), attempts: 0, stableSince: 0 };
   var covered = s.buffered.some(function (r) { return position >= r.start && position < r.end; });
   if (!covered && this.hls) this.hls.startLoad(position, true);
   // MPEG-TS PTS commonly begins ~21 ms after the playlist boundary. The old
   // Tizen backend otherwise lands on the preceding GOP when seeking exactly
   // to a segment's integer boundary. Use a small PTS boundary tolerance.
   this.video.currentTime = Math.min(max || position + 0.05, position > 0 ? position + 0.05 : 0); this.subtitles.render(position); return true;
  } catch (e) { this.requestedSeek = null; return false; }
 };
 Engine.prototype.finishSeek = function () {
  var pending = this.requestedSeek, v = this.video; if (!pending) return;
  var covered = this.snapshot().buffered.some(function (r) { return pending.target >= r.start && pending.target < r.end; });
  var reached = v.paused ? Math.abs(v.currentTime - pending.target) <= 1.2 : v.currentTime >= pending.target - 0.1 && v.currentTime <= pending.target + 2;
  if (!v.seeking && covered && reached) { if (!pending.stableSince) pending.stableSince = Date.now(); if (!v.paused || Date.now() - pending.stableSince >= 800) { this.requestedSeek = null; if (v.paused && Math.abs(v.currentTime - pending.target) > 0.3) this.emit('notice', { message: 'TV bu yayında en yakın erişilebilir karede durakladı.' }); this.emit('seeked', this.snapshot()); return; } }
  else pending.stableSince = 0;
  if (covered && v.paused && !v.seeking && Math.abs(v.currentTime - pending.target) > 1.2 && Date.now() - pending.last >= 500 && pending.attempts < 3) { pending.attempts++; pending.last = Date.now(); try { v.currentTime = Math.min(v.duration - 0.1, pending.target > 0 ? pending.target + 0.05 : 0); } catch (ignore) {} }
  if (Date.now() - pending.started > 20000) {
   this.requestedSeek = null;
   if (!covered || Math.abs(v.currentTime - pending.target) > 2) { this.emit('error', { type: 'network', details: 'seekTimeout', position: pending.target, message: 'İstenen konumun medya verisi zamanında hazırlanamadı.' }); return; }
   this.emit('notice', { message: 'TV bu yayında en yakın erişilebilir konuma gitti.' }); this.emit('seeked', this.snapshot());
  }
 };
 Engine.prototype.setQuality = function (height, cap) {
  if (!this.hls) return false; var h = this.hls, capIndex = -1, chosen = -1;
  h.levels.forEach(function (l, i) { if ((!cap || l.height <= cap) && (capIndex < 0 || l.bitrate >= h.levels[capIndex].bitrate)) capIndex = i; if (height && l.height === height && (!cap || height <= cap) && (chosen < 0 || l.bitrate > h.levels[chosen].bitrate)) chosen = i; });
  // A cap below every level cannot manufacture a lower rendition.
  if (cap && capIndex < 0) { h.autoLevelCapping = 0; h.currentLevel = -1; return false; }
  h.autoLevelCapping = cap ? capIndex : -1; h.currentLevel = chosen; return !height || chosen >= 0;
 };
 Engine.prototype.selectLevel = function (index) { if (this.hls && this.hls.levels[index]) { this.hls.currentLevel = index; return true; } return false; };
 Engine.prototype.selectAudio = function (index) {
  if (!this.hls || !this.hls.audioTracks[index] || C.audioGate(this.hls.audioTracks[index])) return false;
  if (this.hls.audioTrack === index) return true;
  var self = this; clearTimeout(self.audioTimer); self.audioTransaction = { old: self.hls.audioTrack, next: index, confirmed: false }; self.hls.audioTrack = index;
  self.audioTimer = setTimeout(function () { if (!self.active || !self.audioTransaction) return; if (self.audioTransaction.confirmed) { self.audioTransaction = null; return; } var oldAudio = self.audioTransaction.old; self.rollbackAudio(); self.emit('audiofailed', { track: self.tracks().audio.filter(function (t) { return t.index === oldAudio; })[0], message: 'Ses değişimi zaman aşımına uğradı; önceki ses geri alındı.' }); }, 10000); return true;
 };
 Engine.prototype.rollbackAudio = function () { clearTimeout(this.audioTimer); if (this.hls && this.audioTransaction) this.hls.audioTrack = this.audioTransaction.old; this.audioTransaction = null; };
 Engine.prototype.selectSubtitle = function (track) {
  this.selectedSubtitle = track || null; if (this.hls) { this.hls.subtitleDisplay = false; this.hls.subtitleTrack = track && track.kind === 'hls' ? track.index : -1; }
  return this.subtitles.select(track, { policy: this.policy, referer: this.source.referer });
 };
 Engine.prototype.setRate = function (rate) { try { this.video.playbackRate = rate; ['preservesPitch', 'webkitPreservesPitch', 'mozPreservesPitch'].forEach(function (p) { if (p in this.video) this.video[p] = true; }, this); return Math.abs(this.video.playbackRate - rate) < 0.01; } catch (e) { return false; } };
 Engine.prototype.setAspect = function (aspect) { this.video.style.objectFit = aspect === 'zoom' ? 'cover' : 'contain'; };
 Engine.prototype.recoverMedia = function () { if (this.hls) { this.hls.recoverMediaError(); return true; } return false; };
 root.PlayerEngine = Engine;
})(window);
