/* Session, user intent, persistence and a single bounded recovery budget. */
(function (root) {
 'use strict'; var C = root.PlayerCore;
 function Controller(options) {
  C.emitter(this); this.engine = options.engine; this.resolver = options.resolver; this.store = options.store; this.now = options.now || Date.now; this.log = options.log || function () {};
  this.session = 0; this.loadToken = 0; this.content = null; this.phase = 'idle'; this.desiredPlay = false; this.currentSource = -1; this.position = 0; this.duration = 0; this.snapshot = {}; this.tracks = { audio: [], subtitles: [], qualities: [] }; this.settings = this.store.settings();
  this.loop = new root.PlayerLoop(); this.sleepAt = null; this.sleepEnd = false; this.countdownAt = null; this.pendingSeek = null; this.suspended = null; this.retryTimer = null; this.dialog = null;
  var self = this; this.timer = (options.setInterval || setInterval)(function () { self.tick(); }, 250); this.clearInterval = options.clearInterval || clearInterval;
 }
 Controller.prototype.changed = function () { this.emit('change', this); };
 Controller.prototype.notice = function (message) { this.emit('notice', message); this.log(message); };
 Controller.prototype.setPhase = function (phase) { if (this.phase !== phase) { this.log('Durum: ' + phase); this.phase = phase; } this.changed(); };
 Controller.prototype.resetBudget = function () { this.budgetEnd = this.now() + 60000; this.retryCount = 0; this.sameRetries = 0; this.refreshCount = 0; this.mediaRetries = 0; this.failedSources = {}; this.healthySince = 0; };
 Controller.prototype.deadline = function () { return ['resolving', 'loading', 'recovering', 'buffering'].indexOf(this.phase) >= 0 ? this.budgetEnd : null; };
 Controller.prototype.ask = function (kind, message, choices) { this.dialog = { kind: kind, message: message, choices: choices, session: this.session }; this.emit('dialog', this.dialog); this.changed(); };
 Controller.prototype.answer = function (index) {
  var d = this.dialog; if (!d || d.session !== this.session) return;
  this.dialog = null; this.emit('dialog', null); var choice = d.choices[index]; if (choice && choice.action) choice.action(); this.changed();
 };
 Controller.prototype.open = function (input) {
  var next; try { next = C.content(input); } catch (e) { this.notice(e.message); return; }
  this.stop('replace'); this.content = next; this.settings = this.store.settings(); this.prefs = this.settings.rememberTracks && this.store.get(next.contentId) ? this.store.get(next.contentId).prefs : {};
  this.episodes = new root.PlayerEpisodes(next); this.position = 0; this.duration = 0; this.snapshot = {}; this.tracks = { audio: [], subtitles: [], qualities: [] }; this.loop = new root.PlayerLoop(); this.resetBudget(); this.lastCheckpoint = this.now(); this.lastPlaybackAt = 0; this.watched = false;
  this.emit('open', next); var saved = this.store.get(next.contentId), self = this;
  if (saved && saved.position >= 5 && !saved.completed) {
   this.phase = 'resume'; this.ask('resume', 'Son izleme konumu ' + C.format(saved.position) + '. Nasıl başlamak istersiniz?', [
    { label: 'Devam et · ' + C.format(Math.max(0, saved.position - 5)), action: function () { self.start(Math.max(0, saved.position - 5), saved.duration); } },
    { label: 'Baştan başlat', action: function () { self.start(0, 0); } }, { label: 'Vazgeç', action: function () { self.stop('exit'); } }, { label: 'Çıkış', action: function () { self.stop('exit'); } }
   ]);
  } else this.start(0, 0);
 };
 Controller.prototype.start = function (position, oldDuration) {
  this.resetBudget(); this.position = position || 0; this.referenceDuration = oldDuration || 0; this.desiredPlay = true; this.resolveAndLoad(false);
 };
 Controller.prototype.resolveAndLoad = function (refresh) {
  var self = this, session = self.session;
  if (!refresh && self.content.sources.length) { self.load(0, self.position); return; }
  self.engine.stop(); var resolveToken = ++self.loadToken; self.ready = false; self.pendingSeek = null; self.setPhase('resolving');
  self.resolver.resolve(self.content, self.budgetEnd).then(function (sources) {
   if (session !== self.session || resolveToken !== self.loadToken) return;
   var previous = self.content.sources[self.currentSource], preferred = previous && previous.label; self.content.sources = sources;
   var index = 0; sources.some(function (s, i) { if (s.label === preferred) { index = i; return true; } return false; }); self.load(index, self.position);
  }).catch(function (e) { if (session === self.session && resolveToken === self.loadToken && !e.cancelled) { var stage = { page: 'Video sayfası alınamadı', embed: 'Oynatıcı sayfası alınamadı', decode: 'Kaynak çözümlenemedi', manifest: 'Yayın listesi alınamadı' }; self.log('Kaynak hatası [' + (e.stage || 'unknown') + ']: ' + C.safeMessage(e.message)); self.fail((stage[e.stage] || 'Kaynaklar alınamadı') + '. ' + C.safeMessage(e.message)); } });
 };
 Controller.prototype.load = function (index, position) {
  if (!this.content || !this.content.sources[index]) { this.fail('Oynatılabilir kaynak bulunamadı.'); return; }
  if (this.now() >= this.budgetEnd) { this.fail('60 saniyelik deneme süresi doldu. Tekrar deneyebilir veya başka kaynak seçebilirsiniz.'); return; }
  clearTimeout(this.retryTimer); this.retryTimer = null; this.engine.stop(); this.loadToken++; var self = this, session = self.session, token = self.loadToken;
  self.currentSource = index; self.position = position || 0; self.ready = false; self.audioApplied = false; self.subtitleApplied = false; self.audioSignature = null; self.subtitleSignature = null; self.seekHold = false; self.pendingSeek = null; self.setPhase('loading');
  var source = self.content.sources[index], settings = self.settings, prefs = self.prefs || {};
  self.log('Motor açılıyor: ' + source.label + '; deneme ' + (self.retryCount + 1));
  self.engine.open(source, { position: self.position, quality: prefs.quality === undefined ? settings.quality : prefs.quality, qualityCap: settings.qualityCap, style: settings.subtitleStyle, subtitleOffset: prefs.subtitleOffset || 0, aspect: settings.aspect, smallBuffer: self.mediaRetries > 0, deadline: function () { return self.deadline(); } }, function (type, data) {
   if (session !== self.session || token !== self.loadToken || !self.content) return;
   self.event(type, data);
  });
 };
 Controller.prototype.event = function (type, data) {
  var self = this;
  if (type === 'tracks') { var audioSignature = data.audio.map(function (t) { return t.url + ':' + t.lang + ':' + C.role(t) + ':' + (t.codec || '') + ':' + (t.blockedReason || ''); }).join('|'), subtitleSignature = data.subtitles.map(function (t) { return t.key; }).join('|'); if (audioSignature !== this.audioSignature) this.audioApplied = false; if (subtitleSignature !== this.subtitleSignature) this.subtitleApplied = false; this.audioSignature = audioSignature; this.subtitleSignature = subtitleSignature; this.tracks = data; this.applyTracks(); this.changed(); return; }
  if (type === 'ready') {
   this.ready = true; var newDuration = data.duration || 0;
   if (this.referenceDuration > 0 && newDuration > 0 && Math.abs(newDuration - this.referenceDuration) > Math.max(5, this.referenceDuration * 0.02) && this.position > 0) {
    this.desiredBeforeMismatch = this.desiredPlay; this.engine.pause(); this.setPhase('mismatch');
    this.ask('duration', 'Bu kaynağın süresi önceki kayıttan farklı (' + C.format(this.referenceDuration) + ' → ' + C.format(newDuration) + '). Konum eşleşmeyebilir.', [
     { label: 'Kayıtlı konumu dene', action: function () { self.referenceDuration = newDuration; self.finishReady(data); } },
     { label: 'Baştan başlat', action: function () { self.position = 0; self.referenceDuration = newDuration; self.finishReady(data); } },
     { label: self.previousSource !== null && self.previousSource !== undefined ? 'Önceki kaynağa dön' : 'Geri', action: function () { if (self.previousSource !== null && self.previousSource !== undefined) self.revertSource(); else self.stop('exit'); } }
    ]); return;
   }
   this.finishReady(data); return;
  }
  if (type === 'error') { this.recover(data); return; }
  if (type === 'notice' || type === 'subtitleerror') { this.notice(data.message); return; }
  if (type === 'audiochanged') { this.tracks = data; this.changed(); return; }
  if (type === 'audiofailed') { this.savePref('audio', data.track ? C.trackKey(data.track) : { lang: this.settings.audioLanguage, role: 'main' }); this.notice(data.message); this.changed(); return; }
  if (type === 'qualitychanged') { this.snapshot = data; this.changed(); return; }
  if (type === 'ended') { this.end(); return; }
  if (['time', 'tick', 'playing', 'paused', 'seeked', 'seeking', 'buffering'].indexOf(type) < 0) return;
  this.snapshot = data;
  // Ignore load-time resets before the requested starting position has been applied.
  if (this.ready && this.phase !== 'mismatch') {
   this.position = C.finite(data.position) ? data.position : this.position; this.duration = data.duration || this.duration;
  }
  if (type === 'playing') {
   if (!this.desiredPlay || this.seekHold || this.dialog && this.dialog.kind === 'duration') { this.engine.pause(); return; }
   if (!this.healthySince) this.healthySince = this.now(); this.bufferingAt = null; this.lastPlaybackAt = this.now(); this.setPhase('playing');
  } else if (type === 'paused' && this.ready && ['mismatch', 'ended', 'recovering', 'error'].indexOf(this.phase) < 0) { this.setPhase('paused'); this.checkpoint(); }
  else if (type === 'buffering' && this.ready && this.desiredPlay && !this.seekHold) { if (this.phase !== 'buffering') { if (this.healthySince && this.now() - this.healthySince >= 30000) this.resetBudget(); this.bufferingAt = this.now(); } this.setPhase('buffering'); }
  else if (type === 'seeking' && this.ready && this.phase !== 'mismatch') this.setPhase('seeking');
  else if (type === 'seeked' && this.ready) { this.pendingSeek = null; this.lastPlaybackAt = this.now(); this.loop.pending = false; this.checkpoint(); this.engine.subtitles.render(this.position); if (!this.desiredPlay || this.seekHold) { this.engine.pause(); this.setPhase('paused'); } else { this.engine.play(); this.setPhase('playing'); } }
  if (type === 'time' && this.ready && this.desiredPlay && !data.paused && !data.seeking) { if (this.lastTime !== undefined && data.position > this.lastTime && data.position - this.lastTime < 2) this.watched = true; this.lastTime = data.position; this.lastPlaybackAt = this.now(); }
  this.changed();
 };
 Controller.prototype.finishReady = function (data) {
  this.duration = data.duration || 0; this.referenceDuration = this.duration;
  if (this.duration && this.position >= this.duration - 0.1) { this.position = 0; this.notice('Kayıt bu kaynağın süresini aşıyor; baştan başlanıyor.'); }
  this.applyTracks(); if (!this.ready) return; if (this.position > 0) this.engine.seek(this.position);
  this.engine.setRate(this.settings.verifiedRates.indexOf(this.settings.speed) >= 0 ? this.settings.speed : 1);
  this.engine.setAspect(this.settings.aspect); this.lastPlaybackAt = this.now();
  if (this.desiredPlay && !this.seekHold) this.engine.play(); else { this.engine.pause(); this.setPhase('paused'); }
  this.changed();
 };
 Controller.prototype.applyTracks = function () {
  var t = this.tracks, prefs = this.prefs || {}, self = this;
  if (!this.audioApplied && t.audio.length) {
   var available = t.audio.filter(function (track) { return !track.blockedReason && !C.audioGate(track); });
   var index = C.matchTrack(available, prefs.audio || { lang: this.settings.audioLanguage, role: 'main' });
   if (index < 0 && prefs.audio) { index = C.matchTrack(available, { lang: this.settings.audioLanguage, role: 'main' }); this.notice('Kayıtlı ses kullanılamıyor; mevcut uygun ses kullanılıyor.'); }
   var current = this.engine.tracks().audioIndex, blockedCurrent = t.audio.some(function (track) { return track.index === current && (track.blockedReason || C.audioGate(track)); });
   this.audioApplied = true;
   if (!available.length) { this.fail('Kaynağın bildirdiği ses biçimleri bu motorda doğrulanmadı. Başka kaynak seçin.'); return; }
   if (index < 0 && blockedCurrent) { index = 0; this.notice('Seçili ses biçimi doğrulanmadı; uygun başka ses seçildi.'); }
   if (index >= 0) this.engine.selectAudio(available[index].index);
  }
  if (!this.subtitleApplied && (t.subtitles.length || !prefs.subtitle)) {
   var chosen = null;
   if (prefs.subtitle && prefs.subtitle !== 'off') { var sub = C.matchTrack(t.subtitles, prefs.subtitle); if (sub >= 0) chosen = t.subtitles[sub]; else this.notice('Kayıtlı altyazı bu kaynakta bulunamadı; altyazı kapalı.'); }
   this.engine.selectSubtitle(chosen).catch(function () {}); this.subtitleApplied = true;
  }
 };
 Controller.prototype.savePref = function (key, value) { this.prefs[key] = C.copy(value); if (this.settings.rememberTracks) this.store.preference(this.content.contentId, key, value); };
 Controller.prototype.play = function () { if (!this.content) return; if (this.dialog && this.dialog.kind === 'stop') { this.answer(0); return; } if (this.phase === 'ended') { this.replay(); return; } this.desiredPlay = true; if (this.ready && (!this.dialog || ['exit', 'rate-test', 'clear'].indexOf(this.dialog.kind) >= 0) && !this.seekHold) this.engine.play(); this.changed(); };
 Controller.prototype.pause = function () { this.desiredPlay = false; if (this.ready) this.engine.pause(); this.checkpoint(); this.changed(); };
 Controller.prototype.toggle = function () { if (this.desiredPlay && this.phase !== 'ended') this.pause(); else this.play(); };
 Controller.prototype.seek = function (position) {
  if (!this.ready || !C.finite(position) || !this.duration) return false; var target = C.clamp(position, 0, Math.max(0, this.duration - 0.1));
  this.pendingSeek = target; this.watched = false; this.lastTime = undefined; this.lastPlaybackAt = this.now(); this.cancelCountdown();
  if (!this.engine.seek(target)) { this.pendingSeek = null; this.notice('Bu yayında sarma kullanılamıyor.'); return false; } this.setPhase('seeking'); return true;
 };
 Controller.prototype.holdSeek = function (hold) { this.seekHold = hold; if (hold && this.ready) this.engine.pause(); else if (!hold && this.ready && this.desiredPlay) this.engine.play(); this.changed(); };
 Controller.prototype.checkpoint = function (ended) { if (!this.content || !this.ready || this.phase === 'mismatch' || this.engine.requestedSeek) return; this.store.checkpoint(this.content.contentId, this.position, this.duration, ended === true || this.phase === 'ended', this.watched && !this.pendingSeek && !this.seekHold); this.lastCheckpoint = this.now(); };
 Controller.prototype.selectSource = function (index) { if (!this.content || index === this.currentSource || !this.content.sources[index]) return; this.checkpoint(); this.previousSource = this.currentSource; this.previousPosition = this.position; this.previousDesired = this.desiredPlay; this.referenceDuration = this.duration; this.resetBudget(); this.resolver.cancel(); this.load(index, this.position); };
 Controller.prototype.revertSource = function () { if (this.previousSource === null || this.previousSource === undefined) return; var i = this.previousSource; this.previousSource = null; this.desiredPlay = this.previousDesired; this.resetBudget(); this.load(i, this.previousPosition); };
 Controller.prototype.selectAudio = function (track) { if (!track || track.blockedReason || C.audioGate(track) || !this.engine.selectAudio(track.index)) return; this.savePref('audio', C.trackKey(track)); if (!this.desiredPlay) this.engine.pause(); this.changed(); };
 Controller.prototype.selectSubtitle = function (track) { var self = this; this.savePref('subtitle', track ? C.trackKey(track) : 'off'); this.engine.selectSubtitle(track).catch(function () {}); this.changed(); };
 Controller.prototype.setSubtitleOffset = function (value) { this.engine.subtitles.setOffset(value); this.savePref('subtitleOffset', this.engine.subtitles.offset); this.changed(); };
 Controller.prototype.setSubtitleStyle = function (style) { this.store.setting('subtitleStyle', style); this.settings = this.store.settings(); this.engine.subtitles.setStyle(this.settings.subtitleStyle); this.changed(); };
 Controller.prototype.selectQuality = function (height, index) { var old = this.prefs.quality === undefined ? this.settings.quality : this.prefs.quality; this.qualityChange = { old: old, at: this.now() }; if (index !== undefined) this.engine.selectLevel(index); else if (!this.engine.setQuality(height, this.settings.qualityCap)) this.notice('İstenen kalite bu kaynakta yok; otomatik seçim kullanılıyor.'); this.savePref('quality', height); if (!this.desiredPlay) this.engine.pause(); this.changed(); };
 Controller.prototype.setting = function (key, value) {
  this.store.setting(key, value); this.settings = this.store.settings();
  if (key === 'qualityCap' && !this.engine.setQuality(this.prefs.quality || 0, this.settings.qualityCap)) this.notice('Kaynakta seçilen üst sınırın altında bir kalite yok. Mevcut en düşük kalite kullanılıyor.');
  if (key === 'aspect') this.engine.setAspect(this.settings.aspect);
  if (key === 'speed' && !this.engine.setRate(this.settings.speed)) { this.store.setting('speed', 1); this.settings = this.store.settings(); this.notice('Bu motor hızı uygulayamadı; 1x kullanılıyor.'); }
  if (!this.settings.autoNext) this.cancelCountdown(); this.changed();
 };
 Controller.prototype.bookmark = function () { if (!this.content || !this.ready) return; this.notice(this.store.bookmark(this.content.contentId, this.position) ? 'Yer imi eklendi: ' + C.format(this.position) : 'En fazla 10 farklı yer imi saklanabilir.'); this.changed(); };
 Controller.prototype.markLoop = function () { if (!this.loop.mark(this.position, this.duration)) this.notice('B noktası A’dan en az 1 saniye sonra olmalı.'); else this.notice(this.loop.b !== null ? 'A–B tekrarı etkin.' : 'A noktası: ' + C.format(this.loop.a)); this.cancelCountdown(); this.changed(); };
 Controller.prototype.clearLoop = function () { this.loop = new root.PlayerLoop(); this.changed(); };
 Controller.prototype.sleep = function (minutes) { this.sleepAt = typeof minutes === 'number' && minutes > 0 ? this.now() + minutes * 60000 : null; this.sleepEnd = minutes === 'end'; this.cancelCountdown(); this.changed(); };
 Controller.prototype.cancelCountdown = function () { if (this.countdownAt !== null) { this.countdownAt = null; this.emit('countdown', null); } };
 Controller.prototype.next = function (episode) { var target = episode || this.episodes && this.episodes.next(), sleepAt = this.sleepAt, sleepEnd = this.sleepEnd; this.cancelCountdown(); if (target) { this.open(this.episodes.decorate(target)); this.sleepAt = sleepAt; this.sleepEnd = sleepEnd; } };
 Controller.prototype.neighbor = function (direction) { if (!this.content) return null; if (this.content.type === 'episode') return direction < 0 ? this.episodes.previous() : this.episodes.next(); var nav = this.content.navigation, list = nav && nav.kind === 'movies' && nav.items || [], index = -1; list.some(function (item, i) { if (item.contentId === this.content.contentId) { index = i; return true; } return false; }, this); return index >= 0 ? list[index + direction] || null : null; };
 Controller.prototype.navigate = function (direction) { var target = this.neighbor(direction); if (!target) return; if (this.content.type === 'episode') { this.next(target); return; } var next = C.copy(target); next.navigation = C.copy(this.content.navigation); this.open(next); };
 Controller.prototype.end = function () {
  if (!this.ready || this.phase === 'ended') return;
  if (this.loop.b !== null) { this.loop.pending = false; this.seek(this.loop.a); return; }
  this.position = this.duration || this.position; this.checkpoint(true); this.desiredPlay = false; this.setPhase('ended');
  if (this.sleepEnd) { this.stop('sleep'); return; }
  if (this.settings.autoNext && this.episodes.next()) { this.countdownAt = this.now() + 15000; this.emit('countdown', 15); } else this.emit('ended', this.episodes.next());
 };
 Controller.prototype.replay = function () { if (!this.content) return; this.cancelCountdown(); clearTimeout(this.retryTimer); this.resolver.cancel(); this.dialog = null; this.emit('dialog', null); this.desiredPlay = true; this.position = 0; this.referenceDuration = 0; this.watched = false; this.lastTime = undefined; this.loop = new root.PlayerLoop(); this.resetBudget(); if (this.content.sources.length) this.load(Math.max(0, this.currentSource), 0); else this.resolveAndLoad(false); };
 Controller.prototype.recover = function (error) {
  if (!this.content || ['error', 'ended', 'idle', 'suspended', 'mismatch'].indexOf(this.phase) >= 0) return;
  var requestedTarget = this.engine.requestedSeek && this.engine.requestedSeek.target;
  var restoringSeek = C.finite(requestedTarget) || error.details === 'seekTimeout' && C.finite(error.position);
  if (restoringSeek) this.position = C.clamp(C.finite(requestedTarget) ? requestedTarget : error.position, 0, Math.max(0, this.duration - 0.1));
  this.checkpoint(); this.log('Hata: ' + (error.type || '') + '/' + (error.details || '') + '; kod ' + (error.code === undefined ? 'n/a' : error.code) + '; ' + C.safeMessage(error.message));
  if (this.qualityChange && this.now() - this.qualityChange.at < 15000) { this.savePref('quality', this.qualityChange.old); this.qualityChange = null; this.notice('Kalite değişimi tamamlanamadı; önceki kaliteyle toparlanıyor.'); }
  if (error.type === 'unsupported' || error.type === 'play') { this.fail(error.type === 'play' ? 'Oynatma başlatılamadı. Tekrar deneyin.' : error.message); return; }
  if (this.healthySince && this.now() - this.healthySince >= 30000) this.resetBudget(); this.healthySince = 0;
  if (this.now() >= this.budgetEnd || this.retryCount >= 5) { this.fail('Oynatma sürdürülemedi. Ağınızı veya başka bir kaynağı deneyin.'); return; }
  this.retryCount++; this.cancelCountdown(); this.engine.stop(); this.ready = false; this.loadToken++; this.setPhase('recovering');
  var self = this, session = this.session, delay = Math.min(4000, 1000 * Math.pow(2, this.retryCount - 1)), action;
  var stalledAlternative = -1;
  if (restoringSeek || /^(bufferAppendNoProgress|playbackStalled|seekTimeout)$/.test(error.details || '')) this.content.sources.some(function (s, i) { if (i !== self.currentSource && !self.failedSources[i]) { stalledAlternative = i; return true; } return false; });
  if (stalledAlternative >= 0) { this.failedSources[this.currentSource] = true; action = function () { self.notice('Medya ilerlemiyor; alternatif kaynak deneniyor.'); self.load(stalledAlternative, self.position); }; }
  else if (/manifestIncompatibleCodecs|bufferIncompatibleCodecs|bufferAddCodec/i.test(error.details || '')) {
   this.failedSources[this.currentSource] = true; var compatible = -1;
   this.content.sources.some(function (s, i) { if (!self.failedSources[i] && i !== self.currentSource) { compatible = i; return true; } return false; });
   if (compatible < 0) { this.fail('Bu kaynağın görüntü veya ses biçimi TV/motor tarafından desteklenmiyor. Başka kaynak seçin.'); return; }
   action = function () { self.load(compatible, self.position); };
  }
  else if (error.type === 'media' && this.mediaRetries < 1) { this.mediaRetries++; action = function () { self.load(self.currentSource, self.position); }; }
  else if (this.sameRetries < 1 && error.code !== 403 && error.code !== 404) { this.sameRetries++; action = function () { self.load(self.currentSource, self.position); }; }
  else if (this.content.pageUrl && this.refreshCount < 1) { this.refreshCount++; action = function () { self.resolveAndLoad(true); }; }
  else {
   this.failedSources[this.currentSource] = true; var index = -1;
   this.content.sources.some(function (s, i) { if (!self.failedSources[i] && i !== self.currentSource) { index = i; return true; } return false; });
   if (index < 0) { this.fail('Uygun kaynak kalmadı. Tekrar deneyebilir veya bir kaynak seçebilirsiniz.'); return; }
   action = function () { self.load(index, self.position); };
  }
  this.notice('Bağlantı toparlanıyor · deneme ' + this.retryCount + '/5');
  clearTimeout(this.retryTimer); this.retryTimer = setTimeout(function () { self.retryTimer = null; if (session === self.session && self.phase === 'recovering') action(); }, delay);
 };
 Controller.prototype.fail = function (message) { clearTimeout(this.retryTimer); this.retryTimer = null; this.resolver.cancel(); this.engine.stop(); this.loadToken++; this.ready = false; this.cancelCountdown(); this.error = C.safeMessage(message); this.setPhase('error'); this.emit('error', this.error); };
 Controller.prototype.retry = function (refresh) { if (!this.content) return; this.referenceDuration = this.duration || this.referenceDuration; this.resetBudget(); if (refresh) this.resolveAndLoad(true); else this.load(Math.max(0, this.currentSource), this.position); };
 Controller.prototype.requestExit = function () {
  var self = this; this.cancelCountdown(); if (this.dialog) { if (this.dialog.kind === 'exit') this.answer(0); else this.stop('exit'); return; }
  this.ask('exit', 'Oynatıcıdan çıkılsın mı? Konumunuz kaydedilecek.', [{ label: 'İzlemeye dön', action: function () {} }, { label: 'Kaydet ve çık', action: function () { self.stop('exit'); } }]);
 };
 Controller.prototype.requestStop = function () {
  if (!this.content || this.dialog && this.dialog.kind === 'stop') return;
  if (this.dialog && this.dialog.kind === 'resume') { this.stop('exit'); return; }
  var self = this, intent = this.desiredPlay, ended = this.phase === 'ended'; this.cancelCountdown();
  this.desiredPlay = false; if (this.ready && !ended) this.engine.pause(); this.checkpoint();
  this.ask('stop', 'Oynatma durduruldu. Ne yapmak istersiniz?', [
   { label: 'Devam et', action: function () { if (ended) self.replay(); else if (!self.ready && self.phase === 'error') { self.desiredPlay = true; self.retry(!self.content.sources.length); } else self.play(); } },
   { label: 'Baştan başlat', action: function () { self.replay(); } },
   { label: 'Vazgeç', action: function () { if (intent) self.play(); else self.pause(); } },
   { label: 'Çıkış', action: function () { self.stop('exit'); } }
  ]);
 };
 Controller.prototype.stop = function (reason) {
  this.checkpoint(); this.session++; this.loadToken++; clearTimeout(this.retryTimer); this.retryTimer = null; this.resolver.cancel(); this.engine.stop(); this.cancelCountdown(); this.pendingSeek = null; this.seekHold = false; this.dialog = null;
  this.desiredPlay = false; this.ready = false; this.sleepAt = null; this.sleepEnd = false; this.previousSource = null; this.qualityChange = null; this.loop = new root.PlayerLoop(); this.phase = 'idle'; this.emit('dialog', null);
  var old = this.content; this.content = null; this.emit('close', { content: old, reason: reason || 'stop' }); this.changed();
 };
 Controller.prototype.hide = function () { if (!this.content) return; this.suspended = C.copy(this.content); this.stop('hidden'); this.phase = 'suspended'; this.changed(); };
 Controller.prototype.show = function () { if (!this.suspended) return; var content = this.suspended; this.suspended = null; this.emit('suspended', content); };
 Controller.prototype.tick = function () {
  if (!this.content) return; var time = this.now();
  if (this.sleepAt && time >= this.sleepAt) { this.stop('sleep'); this.notice('Uyku süresi doldu. Oynatma durduruldu.'); return; }
  if (this.countdownAt !== null) { var remaining = Math.ceil((this.countdownAt - time) / 1000); if (remaining <= 0) { this.next(); return; } this.emit('countdown', remaining); }
  if (this.ready && this.now() - this.lastCheckpoint >= 5000 && !this.pendingSeek && !this.seekHold) this.checkpoint();
  if (this.ready && this.desiredPlay && this.phase === 'playing' && !this.pendingSeek && !this.seekHold) { var target = this.loop.target(this.position); if (target !== null) this.seek(target); }
  if (['resolving', 'loading', 'recovering'].indexOf(this.phase) >= 0 && time >= this.budgetEnd) { this.fail('60 saniyelik deneme süresi doldu. Tekrar deneyebilir veya başka kaynak seçebilirsiniz.'); return; }
  if (this.ready && this.desiredPlay && !this.seekHold && !this.dialog && ['playing', 'buffering', 'seeking'].indexOf(this.phase) >= 0 && this.lastPlaybackAt && time - this.lastPlaybackAt > 20000) this.recover({ type: 'network', details: 'playbackStalled', message: 'Oynatma 20 saniyedir ilerlemiyor.' });
 };
 Controller.prototype.dispose = function () { this.stop('dispose'); this.clearInterval(this.timer); this.timer = null; };
 root.PlayerController = Controller;
})(window);
