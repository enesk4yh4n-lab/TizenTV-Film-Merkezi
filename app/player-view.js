(function (root) {
 'use strict'; var C = root.PlayerCore;
 function el(id) { return document.getElementById(id); }
 function text(id, value) { var node = el(id); if (node && node.textContent !== String(value)) node.textContent = value; }
 function View(controller, diagnostics) {
  var self = this; this.c = controller; this.diagnostics = diagnostics; this.visible = true; this.menu = null; this.seekTarget = null; this.quickSeek = false; this.lastActivity = Date.now(); this.lastDraw = 0; this.dialogFocus = null; this.returnFocus = null; this.thumb = new root.PlayerThumbnail(); this.gotoTime = 0; this.toastTimer = null;
  controller.on('open', function (content) { if (el('shell').style.display !== 'none') self.returnFocus = document.activeElement; el('shell').style.display = 'none'; el('player-ui').style.display = 'block'; self.menu = null; self.seekTarget = null; self.show(); self.loadThumbnail(content); self.focus(el('play-button')); });
  controller.on('close', function (result) { self.close(result); });
  controller.on('change', function () { self.render(); }); controller.on('notice', function (message) { self.toast(message); });
  controller.on('dialog', function (dialog) { self.drawDialog(dialog); });
  controller.on('error', function () { self.show(); self.openMenu('error'); });
  controller.on('countdown', function (remaining) { var first = el('next-card').style.display !== 'block'; el('next-card').style.display = remaining === null ? 'none' : 'block'; if (remaining !== null) { text('next-count', remaining); self.show(); if (first && !self.menu && !self.c.dialog) self.focus(el('next-now')); } });
  controller.on('ended', function () { self.show(); self.openMenu('ended'); });
  el('player-ui').addEventListener('click', function (event) { var node = event.target; while (node && node !== el('player-ui') && !node.getAttribute('data-command')) node = node.parentNode; if (node && node.getAttribute('data-command')) { event.preventDefault(); self.command(node.getAttribute('data-command')); } });
  this.resize = function () { var scale = Math.min(root.innerWidth / 1920, root.innerHeight / 1080), editing = root.ChainApp && root.ChainApp.catalog && root.ChainApp.catalog.editing; el('player-ui').style.transform = 'scale(' + scale + ')'; el('shell').style.transform = 'scale(' + (editing ? root.innerWidth / 1920 : scale) + ')'; el('subtitle-layer').style.fontSize = (controller.settings.subtitleStyle.size * scale) + 'px'; };
  root.addEventListener('resize', this.resize); this.resize();
 }
 View.prototype.loadThumbnail = function (content) { var source = content.sources[this.c.currentSource] || content.sources[0]; this.thumb.load(source && source.thumbnails || content.thumbnails, { policy: { preferred: source && source.transport || 'native' }, referer: source && source.referer }); };
 View.prototype.focus = function (node) { if (node && !node.disabled) { node.focus(); if (node.scrollIntoView && this.menu) node.scrollIntoView(false); } };
 View.prototype.buttons = function (container) { return Array.prototype.slice.call(container.querySelectorAll('button')).filter(function (b) { return !b.disabled && b.offsetParent !== null; }); };
 View.prototype.modalOpen = function () { return !!this.c.dialog || !!this.menu; };
 View.prototype.show = function () { this.visible = true; this.lastActivity = Date.now(); el('transport').style.display = 'block'; el('player-header').style.display = 'block'; el('subtitle-layer').className = 'raised'; this.render(true); };
 View.prototype.hide = function () { if (this.modalOpen() || this.seekTarget !== null || this.c.phase !== 'playing' || this.c.countdownAt !== null) return; this.visible = false; el('transport').style.display = 'none'; el('player-header').style.display = 'none'; el('subtitle-layer').className = ''; if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); };
 View.prototype.close = function (result) { this.thumb.clear(); this.thumbnailSource = null; clearTimeout(this.toastTimer); el('toast').style.display = 'none'; this.menu = null; this.seekTarget = null; el('menu-shade').style.display = 'none'; el('dialog-shade').style.display = 'none'; el('next-card').style.display = 'none'; if (result.reason === 'replace') return; el('player-ui').style.display = 'none'; el('shell').style.display = 'block'; el('subtitle-layer').className = ''; if (this.returnFocus && document.contains(this.returnFocus)) this.returnFocus.focus(); if (result.reason === 'sleep') this.toast('Uyku süresi doldu.'); };
 View.prototype.toast = function (message) { text('toast', message); el('toast').style.display = 'block'; clearTimeout(this.toastTimer); this.toastTimer = setTimeout(function () { el('toast').style.display = 'none'; }, 5000); };
 View.prototype.render = function (force) {
  var c = this.c, now = Date.now(); if (!c.content) return;
  if (!force && now - this.lastDraw < 200) return; this.lastDraw = now;
  var thumbSource = c.content.sources[c.currentSource];
  if (thumbSource && this.thumbnailSource !== thumbSource.id + ':' + thumbSource.url) { this.thumbnailSource = thumbSource.id + ':' + thumbSource.url; this.loadThumbnail(c.content); }
  this.thumb.engine = c.engine;
  if (this.visible && now - this.lastActivity > 4000 && c.phase === 'playing') this.hide();
  var phase = { idle: 'Hazır', resume: 'Kaldığınız yer', resolving: 'Kaynaklar aranıyor', loading: 'Video hazırlanıyor', playing: 'Oynatılıyor', paused: 'Duraklatıldı', seeking: 'Konuma gidiliyor', buffering: 'Tamponlanıyor', recovering: 'Bağlantı toparlanıyor', error: 'Oynatma durdu', ended: 'Tamamlandı', mismatch: 'Kaynak süresi farklı' };
  text('player-title', c.content.title); var episode = c.content.episode;
  text('player-meta', (episode ? 'S' + ('0' + episode.season).slice(-2) + 'B' + ('0' + episode.number).slice(-2) + ' · ' : '') + (c.content.sources[c.currentSource] ? c.content.sources[c.currentSource].label : 'HDfilmCehennemi'));
  text('phase', phase[c.phase] || c.phase);
  el('previous-content').disabled = !c.neighbor(-1); el('next-content').disabled = !c.neighbor(1);
  el('previous-content').setAttribute('aria-label', c.content.type === 'episode' ? 'Önceki bölüm' : 'Önceki film'); el('next-content').setAttribute('aria-label', c.content.type === 'episode' ? 'Sonraki bölüm' : 'Sonraki film');
  var playIcon = c.phase === 'ended' ? 'replay' : c.desiredPlay ? 'pause' : 'play', playLabel = c.phase === 'ended' ? 'Yeniden oynat' : c.desiredPlay ? 'Duraklat' : 'Oynat', playButton = el('play-button');
  if (playButton.getAttribute('data-icon') !== playIcon) { playButton.setAttribute('data-icon', playIcon); playButton.setAttribute('aria-label', playLabel); playButton.setAttribute('title', playLabel); }
  text('elapsed', C.format(this.seekTarget === null ? c.position : this.seekTarget)); text('duration', c.snapshot.live ? 'CANLI' : C.format(c.duration || NaN));
  text('remaining', c.duration ? '−' + C.format(Math.max(0, c.duration - c.position)) : 'Süre bilinmiyor');
  var end = c.duration && c.desiredPlay ? new Date(now + (c.duration - c.position) / (c.snapshot.rate || 1) * 1000) : null;
  text('estimated-end', end ? 'Bitiş ≈ ' + ('0' + end.getHours()).slice(-2) + ':' + ('0' + end.getMinutes()).slice(-2) : '');
  var target = this.seekTarget === null ? c.position : this.seekTarget, percent = c.duration ? C.clamp(target / c.duration * 100, 0, 100) : 0;
  el('progress-fill').style.width = percent + '%'; el('progress-head').style.left = percent + '%';
  el('timeline').setAttribute('aria-valuenow', Math.floor(target)); el('timeline').setAttribute('aria-valuemax', Math.floor(c.duration)); el('timeline').setAttribute('aria-valuetext', C.format(target));
  var ranges = c.snapshot.buffered || [], buffer = el('buffer-ranges'); while (buffer.firstChild) buffer.removeChild(buffer.firstChild);
  if (c.duration) ranges.forEach(function (r) { var span = document.createElement('span'); span.style.left = C.clamp(r.start / c.duration * 100, 0, 100) + '%'; span.style.width = Math.max(0, Math.min(c.duration, r.end) - r.start) / c.duration * 100 + '%'; buffer.appendChild(span); });
  var busy = ['resolving', 'loading', 'recovering', 'buffering'].indexOf(c.phase) >= 0;
  el('busy-card').style.display = busy && !c.dialog && !this.menu ? 'block' : 'none'; text('busy-text', phase[c.phase]);
  text('busy-budget', 'İptal edebilirsiniz · en fazla ' + Math.max(0, Math.ceil((c.budgetEnd - c.now()) / 1000)) + ' sn');
  el('revert-source').style.display = c.previousSource !== null && c.previousSource !== undefined ? 'inline-block' : 'none';
  el('seek-preview').style.display = this.seekTarget !== null ? 'block' : 'none'; text('seek-time', C.format(this.seekTarget || 0)); text('seek-help', this.quickSeek ? 'Tuşu bırakınca uygula · Geri: vazgeç' : '← → seç · OK: git · Geri: vazgeç');
  if (this.seekTarget !== null) this.thumb.at(this.seekTarget, el('thumbnail'));
  var chapter = (c.content.chapters || []).filter(function (ch) { return ch.kind === 'intro' && ch.end && c.position >= ch.start && c.position < ch.end; })[0]; this.skipChapter = chapter; el('skip-intro').style.display = chapter ? 'block' : 'none';
  text('loop-indicator', c.loop.a !== null ? 'A ' + C.format(c.loop.a) + (c.loop.b !== null ? ' ↔ B ' + C.format(c.loop.b) : ' · B bekleniyor') : '');
  text('sleep-indicator', c.sleepAt ? 'Uyku ' + Math.ceil((c.sleepAt - c.now()) / 60000) + ' dk' : c.sleepEnd ? 'Uyku: bitince' : '');
  if (this.menu === 'diagnostics') text('diagnostic-text', this.diagnostics.describe(c));
 };
 View.prototype.beginSeek = function (quick) { if (!this.c.ready || !this.c.duration) return; if (this.seekTarget === null) { this.seekTarget = this.c.position; this.c.holdSeek(true); } this.quickSeek = quick === true; if (!quick) this.show(); this.lastActivity = Date.now(); this.render(true); };
 View.prototype.moveSeek = function (delta) { if (this.seekTarget === null) this.beginSeek(false); if (this.seekTarget === null) return; this.seekTarget = C.clamp(this.seekTarget + delta, 0, Math.max(0, this.c.duration - 0.1)); this.lastActivity = Date.now(); this.render(true); };
 View.prototype.commitSeek = function () { if (this.seekTarget === null) return; var target = this.seekTarget; this.seekTarget = null; this.c.seek(target); this.c.holdSeek(false); this.lastActivity = Date.now(); this.render(true); };
 View.prototype.cancelSeek = function () { this.seekTarget = null; this.quickSeek = false; this.c.holdSeek(false); this.lastActivity = Date.now(); this.render(true); };
 View.prototype.navigate = function (code) {
  this.lastActivity = Date.now(); var list, i;
  if (this.c.dialog) list = this.buttons(el('dialog-actions'));
  else if (this.menu) { if (code === 37) { this.closeMenu(); return; } list = this.buttons(el('menu-items')); }
  else {
   if (!this.visible) { this.show(); this.focus(el('play-button')); return; }
   if (document.activeElement === el('timeline') && (code === 37 || code === 39)) { this.moveSeek((code === 37 ? -1 : 1) * this.c.settings.seekStep); return; }
   if (this.seekTarget !== null) { if (code === 37 || code === 39) this.moveSeek((code === 37 ? -1 : 1) * this.c.settings.seekStep); return; }
   if (code === 38) { this.focus(el('timeline')); return; }
   if (code === 40 && document.activeElement === el('timeline')) { this.focus(el('play-button')); return; }
   list = this.buttons(el('transport')).concat(this.buttons(el('next-card'))).concat(this.buttons(el('context-actions')));
  }
  if (!list.length) return; i = list.indexOf(document.activeElement); i = (i + (code === 37 || code === 38 ? -1 : 1) + list.length) % list.length; this.focus(list[i]);
 };
 View.prototype.enter = function () { this.lastActivity = Date.now(); if (this.seekTarget !== null) { this.commitSeek(); return; } if (!this.visible && !this.modalOpen()) { this.show(); this.focus(el('play-button')); return; } if (document.activeElement === el('timeline')) { this.beginSeek(false); return; } var node = document.activeElement; if (node && node.tagName === 'BUTTON' && node.offsetParent !== null) node.click(); else { this.show(); this.focus(el('play-button')); } };
 View.prototype.back = function () {
  this.c.cancelCountdown(); if (this.seekTarget !== null) { this.cancelSeek(); return; }
  if (this.c.dialog) { if (this.c.dialog.kind === 'stop') this.c.answer(2); else if (this.c.dialog.kind === 'resume' || this.c.dialog.kind === 'duration' || this.c.dialog.kind === 'rate-test') this.c.answer(this.c.dialog.choices.length - 1); else this.c.answer(0); return; }
  if (this.menu) { this.closeMenu(); return; }
  if (['resolving', 'loading', 'recovering', 'error'].indexOf(this.c.phase) >= 0) { if (this.c.previousSource !== null && this.c.previousSource !== undefined) this.c.revertSource(); else this.c.stop('cancel'); return; }
  if (this.visible) { this.visible = false; el('transport').style.display = 'none'; el('player-header').style.display = 'none'; el('subtitle-layer').className = ''; return; }
  this.c.requestExit();
 };
 View.prototype.drawDialog = function (dialog) {
  var self = this, container = el('dialog-actions'); while (container.firstChild) container.removeChild(container.firstChild);
  el('dialog-shade').style.display = dialog ? 'block' : 'none'; if (!dialog) { if (this.dialogFocus && this.dialogFocus.offsetParent !== null) this.dialogFocus.focus(); return; }
  this.dialogFocus = document.activeElement; text('dialog-message', dialog.message);
  dialog.choices.forEach(function (choice, i) { var b = document.createElement('button'); b.textContent = choice.label; b.setAttribute('data-command', 'answer:' + i); container.appendChild(b); }); this.focus(container.firstChild); this.show();
 };
 View.prototype.closeMenu = function () { this.menu = null; el('menu-shade').style.display = 'none'; this.lastActivity = Date.now(); this.show(); this.focus(this.menuFocus && this.menuFocus.offsetParent !== null ? this.menuFocus : el('play-button')); };
 View.prototype.command = function (command) {
  var c = this.c; this.lastActivity = Date.now();
  if (command.indexOf('answer:') === 0) { c.answer(Number(command.slice(7))); return; }
  if (command.indexOf('item:') === 0) { var item = this.items[Number(command.slice(5))]; if (item && !item.disabled) item.action(); return; }
  if (command === 'play') c.toggle(); else if (command === 'rewind') c.seek(c.position - c.settings.seekStep); else if (command === 'forward') c.seek(c.position + c.settings.seekStep);
  else if (command === 'timeline') this.beginSeek(false); else if (command === 'stop') { if (this.seekTarget !== null) this.cancelSeek(); c.requestStop(); } else if (command === 'exit') c.requestExit(); else if (command === 'previous') c.navigate(-1); else if (command === 'next-content') c.navigate(1); else if (command === 'back-menu') this.closeMenu(); else if (command === 'next') c.next(); else if (command === 'cancel-next') { c.cancelCountdown(); this.focus(el('play-button')); }
  else if (command === 'revert') c.revertSource(); else if (command === 'skip-intro' && this.skipChapter) c.seek(this.skipChapter.end); else this.openMenu(command);
  this.render(true);
 };
 View.prototype.openMenu = function (name, keepIndex) {
  var self = this, c = this.c, items = [], title = '', container = el('menu-items');
  function item(label, action, selected, disabled, detail) { items.push({ label: label, action: action || function () {}, selected: selected, disabled: disabled, detail: detail || '' }); }
  function menu(label, target, detail) { item(label, function () { self.openMenu(target); }, false, false, detail); }
  function refresh() { self.openMenu(name, self.focusIndex()); }
  function setting(label, key, value, selected, detail) { item(label, function () { c.setting(key, value); refresh(); }, selected, false, detail); }
  if (!this.menu) this.menuFocus = document.activeElement; this.menu = name; this.show();
  if (name === 'audio') {
   title = 'Ses dili'; c.tracks.audio.forEach(function (t) { var role = C.role(t), blocked = t.blockedReason || C.audioGate(t); item((t.name || 'Etiketsiz ses') + (t.lang ? ' · ' + t.lang : '') + (role === 'description' ? ' · Sesli betimleme' : role === 'commentary' ? ' · Yorum' : ''), function () { c.selectAudio(t); refresh(); }, t.index === c.engine.tracks().audioIndex, !!blocked, blocked || [t.codec || 'Codec bildirilmedi', t.channels ? t.channels + ' kanal' : ''].filter(Boolean).join(' · ')); });
   if (!c.tracks.audio.length) item('Kaynakta ayrı ses seçeneği bildirilmedi', null, false, true, 'Mevcut gömülü ses kullanılır.');
   menu('Tercih edilen dil', 'audio-language'); item('Ses gecikmesi', null, false, true, 'Bu sürümde bağımsız ses kaydırma desteklenmiyor.'); menu('Oynatma desteği', 'support');
  } else if (name === 'audio-language') {
   title = 'Varsayılan ses dili'; [['Türkçe', 'tr'], ['English', 'en'], ['Deutsch', 'de'], ['Français', 'fr']].forEach(function (x) { setting(x[0], 'audioLanguage', x[1], c.settings.audioLanguage === x[1]); });
  } else if (name === 'subtitles') {
   title = 'Altyazılar'; var selected = c.engine.tracks().subtitleKey;
   item('Kapalı', function () { c.selectSubtitle(null); refresh(); }, !selected);
   c.tracks.subtitles.forEach(function (t) { var role = C.role(t); item((t.name || t.label || t.lang || 'Altyazı') + (t.lang ? ' · ' + t.lang : '') + (role === 'sdh' ? ' · SDH' : role === 'forced' ? ' · Zorunlu' : ''), function () { c.selectSubtitle(t); refresh(); }, selected === t.key, false, t.kind === 'hls' ? 'Yayının altyazısı' : 'Kaynak altyazısı · yeniden yüklemek için seçin'); });
   if (!c.tracks.subtitles.length) item('Bu kaynak altyazı bildirmiyor', null, false, true);
   menu('Altyazı görünümü', 'subtitle-style'); menu('Altyazı senkronu', 'subtitle-offset', ((c.prefs.subtitleOffset || 0) >= 0 ? '+' : '') + (c.prefs.subtitleOffset || 0).toFixed(1) + ' sn');
  } else if (name === 'subtitle-offset') {
   title = 'Altyazı senkronu'; var offset = c.prefs.subtitleOffset || 0;
   item('Şu an: ' + (offset >= 0 ? '+' : '') + offset.toFixed(1) + ' saniye', null, false, true, '+ değer altyazıyı daha geç gösterir.');
   [-1, -0.1, 0.1, 1].forEach(function (delta) { item((delta > 0 ? '+' : '') + delta + ' saniye', function () { c.setSubtitleOffset(offset + delta); refresh(); }); });
   item('Senkronu sıfırla', function () { c.setSubtitleOffset(0); refresh(); });
  } else if (name === 'subtitle-style') {
   title = 'Altyazı görünümü'; var style = C.copy(c.settings.subtitleStyle);
   function styleChange(key, value) { var s = C.copy(style); s[key] = value; c.setSubtitleStyle(s); self.resize(); refresh(); }
   item('Boyut: ' + style.size + ' px', function () { styleChange('size', style.size >= 60 ? 24 : style.size + 6); });
   item('Renk: ' + ({ '#ffffff': 'Beyaz', '#ffff00': 'Sarı', '#00ffff': 'Camgöbeği' })[style.color], function () { var a = ['#ffffff', '#ffff00', '#00ffff']; styleChange('color', a[(a.indexOf(style.color) + 1) % a.length]); });
   item('Arka plan: %' + Math.round(style.background * 100), function () { styleChange('background', style.background >= 0.95 ? 0 : Math.min(1, style.background + 0.25)); });
   item('Kenar gölgesi: ' + (style.shadow ? 'Açık' : 'Kapalı'), function () { styleChange('shadow', !style.shadow); });
   item('Dikey konum: %' + style.bottom, function () { styleChange('bottom', style.bottom >= 28 ? 4 : style.bottom + 4); });
   item('Varsayılan görünüm', function () { c.setSubtitleStyle(C.defaults.subtitleStyle); self.resize(); refresh(); });
  } else if (name === 'quality') {
   title = 'Görüntü kalitesi'; var actualMode = c.engine.tracks();
   item('Otomatik', function () { c.selectQuality(0); refresh(); }, actualMode.autoQuality, false, 'Şu an: ' + c.snapshot.actualQuality + (typeof c.snapshot.actualQuality === 'number' ? 'p' : ''));
   c.tracks.qualities.forEach(function (q) { item((q.height ? q.height + 'p' : q.name || 'Varyant') + ' · ' + (q.bitrate / 1000000).toFixed(2) + ' Mb/sn', function () { c.selectQuality(q.height, q.index); refresh(); }, !actualMode.autoQuality && actualMode.qualityIndex === q.index, !!(c.settings.qualityCap && q.height > c.settings.qualityCap), q.codec); }); menu('Otomatik kalite üst sınırı', 'quality-cap');
   (c.tracks.blockedQualities || []).forEach(function (q) { item((q.height ? q.height + 'p' : 'Varyant') + ' · Doğrulama bekliyor', null, false, true, q.reason); });
  } else if (name === 'quality-cap') {
   title = 'Kalite üst sınırı'; [0, 480, 720, 1080].forEach(function (cap) { setting(cap ? 'En fazla ' + cap + 'p' : 'Üst sınır yok', 'qualityCap', cap, c.settings.qualityCap === cap, 'Kaynakta mevcut seviyeler kullanılır.'); });
  } else if (name === 'sources') {
   title = 'Oynatma kaynağı'; c.content.sources.forEach(function (s, i) { item(s.label, function () { self.closeMenu(); c.selectSource(i); }, i === c.currentSource, false, s.status === 'ready' ? 'Erişim doğrulandı' : 'Oynatılırken sınanır'); });
   if (c.content.pageUrl) item('Bağlantıları yenile', function () { self.closeMenu(); c.retry(true); });
   if (c.previousSource !== null && c.previousSource !== undefined) item('Önceki kaynağa dön', function () { self.closeMenu(); c.revertSource(); });
  } else if (name === 'more') {
   title = 'Diğer seçenekler'; menu('Belirli zamana git', 'goto'); menu('Hız', 'speed', c.settings.speed + 'x'); menu('Görüntü oranı', 'aspect', c.settings.aspect === 'zoom' ? 'Doldur / kırp' : 'Orijinal / sığdır'); menu('Yer imleri', 'bookmarks'); menu('A–B tekrar', 'loop'); menu('Uyku zamanlayıcısı', 'sleep');
   if (c.content.type === 'episode' || c.episodes.list.length) menu('Bölümler', 'episodes'); menu('Sahneler / giriş', 'chapters'); menu('Ayarlar', 'settings'); menu('Teknik bilgiler', 'diagnostics'); item('Kaydet ve çık', function () { c.stop('exit'); });
  } else if (name === 'goto') {
   title = 'Belirli zamana git · ' + C.format(this.gotoTime); if (!c.duration) item('Yayın süresi bilinmiyor', null, false, true);
   [[3600, 'Saat'], [60, 'Dakika'], [1, 'Saniye']].forEach(function (x) { [-1, 1].forEach(function (sign) { item(x[1] + (sign > 0 ? ' +1' : ' −1'), function () { self.gotoTime = C.clamp(self.gotoTime + sign * x[0], 0, Math.max(0, c.duration - 0.1)); refresh(); }); }); });
   item(C.format(this.gotoTime) + ' konumuna git', function () { c.seek(self.gotoTime); self.closeMenu(); }, false, !c.duration);
  } else if (name === 'speed' || name === 'verify-speed') {
   title = name === 'speed' ? 'Oynatma hızı' : 'Bu TV’de hız doğrulama';
   [0.5, 0.75, 1, 1.25, 1.5, 2].forEach(function (rate) {
    var verified = c.settings.verifiedRates.indexOf(rate) >= 0;
    if (name === 'speed') item(rate + 'x', function () { c.setting('speed', rate); refresh(); }, c.settings.speed === rate, !verified, verified ? 'Bu cihazda kullanılabilir' : 'TV’de ses ve senkron doğrulaması bekliyor');
    else item(rate + 'x deneme', function () {
     if (!c.ready || !c.engine.setRate(rate)) { self.toast('Motor bu hızı uygulayamadı.'); return; }
     c.ask('rate-test', rate + 'x hızda görüntü, ses ve altyazı senkronunu TV’de kontrol edin. Ses perdesinin korunmasını da dinleyin.', [
      { label: 'Görüntü, ses ve senkron doğru', action: function () { var rates = c.settings.verifiedRates.slice(); if (rates.indexOf(rate) < 0) rates.push(rate); c.setting('verifiedRates', rates); c.setting('speed', rate); self.openMenu('speed'); } },
      { label: 'Doğrulanmadı · 1x’e dön', action: function () { c.engine.setRate(1); c.setting('speed', 1); self.openMenu('speed'); } }
     ]);
    }, false, !c.ready);
   });
   if (name === 'speed') { menu('TV’de sesli hız denemesi', 'verify-speed', 'Deneme, doğrulama sayılmaz; sonucu siz işaretlersiniz.'); item('Hız onaylarını sıfırla', function () { c.setting('speed', 1); c.setting('verifiedRates', [1]); refresh(); }, false, false, '1x kullanılır; diğer hızlar yeniden sesli onay ister.'); }
  } else if (name === 'aspect') {
   title = 'Görüntü oranı'; setting('Orijinal / Sığdır', 'aspect', 'fit', c.settings.aspect === 'fit', 'Görüntü oranı korunur.'); setting('Doldur / Yakınlaştır', 'aspect', 'zoom', c.settings.aspect === 'zoom', 'Ekranı doldurur; kenarlar kırpılabilir.');
  } else if (name === 'bookmarks') {
   title = 'Yer imleri'; item('Bu konuma yer imi ekle', function () { c.bookmark(); refresh(); }, false, !c.ready);
   var saved = c.store.get(c.content.contentId); (saved ? saved.bookmarks : []).forEach(function (b, i) { item(C.format(b.time) + ' · Git', function () { c.seek(b.time); self.closeMenu(); }); item(C.format(b.time) + ' · Sil', function () { c.store.removeBookmark(c.content.contentId, i); refresh(); }); });
  } else if (name === 'loop') {
   title = 'A–B sahne tekrarı'; item(c.loop.a === null ? 'A başlangıcını işaretle' : c.loop.b === null ? 'B bitişini işaretle' : 'A–B tekrar etkin', function () { c.markLoop(); refresh(); }, false, !c.ready || !c.duration || c.loop.b !== null);
   item('Tekrarı kapat / noktaları sil', function () { c.clearLoop(); refresh(); });
  } else if (name === 'sleep') {
   title = 'Uyku zamanlayıcısı'; [0, 15, 30, 60, 90, 'end'].forEach(function (minutes) { item(minutes === 'end' ? 'İçerik bitince' : minutes ? minutes + ' dakika' : 'Kapalı', function () { c.sleep(minutes); refresh(); }, minutes === 'end' ? c.sleepEnd : !minutes && !c.sleepAt && !c.sleepEnd, false, 'Konum kaydedilir ve oynatma durdurulur.'); });
  } else if (name === 'episodes') {
   title = 'Bölümler'; var previous = c.episodes.previous(), next = c.episodes.next();
   item('Önceki bölüm', function () { c.next(previous); }, false, !previous); item('Sonraki bölüm', function () { c.next(next); }, false, !next);
   setting('Otomatik geçiş: ' + (c.settings.autoNext ? 'Açık' : 'Kapalı'), 'autoNext', !c.settings.autoNext, c.settings.autoNext, 'Bölüm bitince iptal edilebilir 15 saniye.');
   c.episodes.list.forEach(function (episode) { item(episode.title || episode.contentId, function () { c.next(episode); }, episode.contentId === c.content.contentId); });
   if (!c.episodes.list.length && !next && !previous) item('Bölüm sırası kaynak verisi bekliyor', null, false, true);
  } else if (name === 'chapters') {
   title = 'Sahneler'; c.content.chapters.forEach(function (chapter) { item(chapter.title || C.format(chapter.start), function () { c.seek(chapter.start); self.closeMenu(); }, false, !c.duration); }); if (!c.content.chapters.length) item('Bu içerik sahne / giriş zamanı bildirmiyor', null, false, true);
   if (!c.content.thumbnails && !(c.content.sources[c.currentSource] || {}).thumbnails) item('Görsel önizleme verisi yok · zaman önizlemesi etkin', null, false, true);
  } else if (name === 'settings') {
   title = 'Oynatıcı ayarları'; [5, 10, 30].forEach(function (step) { setting('Sarma adımı: ' + step + ' sn', 'seekStep', step, c.settings.seekStep === step); });
   setting('İçerik ses / altyazı tercihini hatırla', 'rememberTracks', !c.settings.rememberTracks, c.settings.rememberTracks);
   setting('Otomatik sonraki bölüm', 'autoNext', !c.settings.autoNext, c.settings.autoNext);
   item('Bu içerikte ses ve altyazı tercihlerini sıfırla', function () { c.store.resetPreferences(c.content.contentId); c.prefs = {}; c.audioApplied = c.subtitleApplied = false; c.applyTracks(); c.setSubtitleOffset(0); refresh(); });
   item('İzleme geçmişini temizle', function () { c.ask('clear', 'Tüm izleme konumları ve yer imleri silinsin mi?', [{ label: 'Vazgeç', action: function () {} }, { label: 'Geçmişi sil', action: function () { c.store.clear(); self.toast('Geçmiş temizlendi.'); } }]); });
  } else if (name === 'diagnostics') {
   title = 'Teknik bilgiler · v' + root.AppInfo.version; item('Bilgileri yenile', function () { refresh(); }); menu('Oynatma desteği', 'support'); menu('Cihazda hız doğrulama', 'verify-speed');
  } else if (name === 'support') {
   title = 'Oynatma desteği'; root.AppInfo.support(c).forEach(function (row) { item(row.title, function () { self.toast(row.detail); }, false, false, row.detail); }); menu('Hız seçenekleri', 'speed'); menu('Hakkında', 'about');
  } else if (name === 'about') {
   title = 'HDfilmCehennemi · ' + root.AppInfo.version;
   item('Yapımcı: ' + root.AppInfo.producer, function () {});
   item('Üçüncü taraf bileşenler', function () {}, false, false, 'hls.js · Apache-2.0. Çözümleyici uyarlamaları: enXov / Batuhan4 · MIT.');
  } else if (name === 'error') {
   title = 'Oynatma sürdürülemedi'; item(c.error || 'Bağlantı hatası', null, false, true); item('Tekrar dene', function () { self.closeMenu(); c.retry(false); }); if (c.content.pageUrl) item('Bağlantıları yenile', function () { self.closeMenu(); c.retry(true); }); menu('Kaynak seç', 'sources'); if (c.previousSource !== null && c.previousSource !== undefined) item('Önceki kaynağa dön', function () { self.closeMenu(); c.revertSource(); }); item('Geri', function () { c.stop('exit'); });
  } else if (name === 'ended') {
   title = 'İzleme tamamlandı'; item('Yeniden oynat', function () { self.closeMenu(); c.replay(); }); if (c.episodes.next()) item('Sonraki bölüm', function () { c.next(); }); item('Geri', function () { c.stop('exit'); });
  } else { this.closeMenu(); return; }
  this.items = items; text('menu-title', title); while (container.firstChild) container.removeChild(container.firstChild);
  items.forEach(function (data, i) { var button = document.createElement('button'); button.setAttribute('data-command', 'item:' + i); button.disabled = !!data.disabled; if (data.selected) button.className = 'selected';
   var label = document.createElement('span'); label.textContent = (data.selected ? '✓ ' : '') + data.label; button.appendChild(label);
   if (data.detail) { var detail = document.createElement('small'); detail.textContent = data.detail; button.appendChild(detail); } container.appendChild(button);
  });
  var preview = el('subtitle-style-preview'); preview.style.display = name === 'subtitle-style' ? 'block' : 'none';
  if (name === 'subtitle-style') { var ps = c.settings.subtitleStyle; preview.style.fontSize = ps.size + 'px'; preview.style.color = ps.color; preview.style.background = 'rgba(0,0,0,' + ps.background + ')'; preview.style.textShadow = ps.shadow ? '2px 2px 3px #000' : 'none'; }
  el('diagnostic-text').style.display = name === 'diagnostics' ? 'block' : 'none'; el('menu-panel').className = name === 'diagnostics' ? 'diagnostics' : name === 'subtitle-style' ? 'subtitle-style' : ''; el('menu-shade').style.display = 'block';
  var buttons = this.buttons(container), target = keepIndex === undefined ? buttons.filter(function (b) { return b.className === 'selected'; })[0] || buttons[0] : buttons[Math.min(keepIndex, buttons.length - 1)]; this.focus(target); this.render(true);
 };
 View.prototype.focusIndex = function () { return Math.max(0, this.buttons(el('menu-items')).indexOf(document.activeElement)); };
 root.PlayerView = View;
})(window);
