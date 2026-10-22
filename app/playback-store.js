(function (root) {
 'use strict';
 var C = root.PlayerCore, KEY = 'chainprobe.player.v1';
 function fresh() { return { version: 1, settings: C.copy(C.defaults), entries: Object.create(null) }; }
 function Store(storage, onerror, clock) {
  this.storage = storage; this.onerror = onerror || function () {}; this.now = clock || Date.now; this.data = fresh(); this.failed = false; C.emitter(this);
  try {
   var text = storage && storage.getItem(KEY), parsed = text ? JSON.parse(text) : null;
   if (parsed && parsed.version === 1 && parsed.entries && typeof parsed.entries === 'object' && !Array.isArray(parsed.entries)) {
    this.data.entries = parsed.entries;
    var saved = parsed.settings || {}, settings = this.data.settings;
    Object.keys(settings).forEach(function (k) { if (Object.prototype.hasOwnProperty.call(saved, k)) settings[k] = saved[k]; });
   }
  } catch (e) { this.onerror('İzleme kaydı okunamadı; bu oturum kullanılabilir.'); }
  this.sanitize();
 }
 Store.prototype.sanitize = function () {
  var s = this.data.settings, d = C.defaults, entries = this.data.entries;
  if ([5, 10, 30].indexOf(s.seekStep) < 0) s.seekStep = 10;
  if ([0, 480, 720, 1080, 2160].indexOf(s.qualityCap) < 0) s.qualityCap = 0;
  if (!C.finite(s.quality) || s.quality < 0) s.quality = 0;
  if (s.aspect !== 'zoom') s.aspect = 'fit';
  s.autoNext = s.autoNext === true; s.rememberTracks = s.rememberTracks !== false;
  s.audioLanguage = C.language(s.audioLanguage) || 'tr';
  s.verifiedRates = (Array.isArray(s.verifiedRates) ? s.verifiedRates : [1]).filter(function (r) { return [0.5, 0.75, 1, 1.25, 1.5, 2].indexOf(r) >= 0; });
  if (s.verifiedRates.indexOf(1) < 0) s.verifiedRates.push(1);
  if (s.verifiedRates.indexOf(s.speed) < 0) s.speed = 1;
  var style = s.subtitleStyle || {};
  s.subtitleStyle = { size: C.clamp(Number(style.size) || 36, 24, 60), color: ['#ffffff', '#ffff00', '#00ffff'].indexOf(style.color) >= 0 ? style.color : d.subtitleStyle.color,
   background: C.finite(style.background) ? C.clamp(style.background, 0, 1) : 0.65, shadow: style.shadow !== false, bottom: C.clamp(Number(style.bottom) || 8, 3, 30) };
  Object.keys(entries).forEach(function (id) {
   var e = entries[id];
   if (!e || typeof e !== 'object' || !C.finite(e.position) || e.position < 0) { delete entries[id]; return; }
   e.duration = C.finite(e.duration) && e.duration > 0 ? e.duration : 0;
   if (e.duration && e.position > e.duration) e.position = 0;
   e.updated = C.finite(e.updated) ? e.updated : 0; e.completed = e.completed === true; if (['watched', 'unwatched'].indexOf(e.watchState) < 0) delete e.watchState;
   e.prefs = e.prefs && typeof e.prefs === 'object' ? e.prefs : {};
   e.bookmarks = (Array.isArray(e.bookmarks) ? e.bookmarks : []).filter(function (b) { return b && C.finite(b.time) && b.time >= 0 && (!e.duration || b.time < e.duration); }).slice(0, 10);
  });
  this.trim();
 };
 Store.prototype.trim = function () { var entries = this.data.entries, keys = Object.keys(entries).sort(function (a, b) { return entries[b].updated - entries[a].updated; }); keys.slice(200).forEach(function (id) { delete entries[id]; }); };
 Store.prototype.flush = function () {
  this.trim();
  try { if (this.storage) this.storage.setItem(KEY, JSON.stringify(this.data)); this.failed = false; }
  catch (e) { if (!this.failed) this.onerror('Depolama dolu veya kullanılamıyor. İzleme kaydı bu oturumda bellekte tutuluyor.'); this.failed = true; }
 };
 Store.prototype.settings = function () { return C.copy(this.data.settings); };
 Store.prototype.setting = function (key, value) { if (!Object.prototype.hasOwnProperty.call(C.defaults, key)) return; this.data.settings[key] = C.copy(value); this.sanitize(); this.flush(); };
 Store.prototype.get = function (id) { return Object.prototype.hasOwnProperty.call(this.data.entries, id) ? C.copy(this.data.entries[id]) : null; };
 /* Catalog reads snapshots, never the mutable entries or preference writer. */
 Store.prototype.list = function () { var entries = this.data.entries; return Object.keys(entries).map(function (id) { var value = C.copy(entries[id]); value.contentId = id; return value; }).sort(function (a, b) { return b.updated - a.updated; }); };
 Store.prototype.entry = function (id) { if (!Object.prototype.hasOwnProperty.call(this.data.entries, id)) Object.defineProperty(this.data.entries, id, { value: { position: 0, duration: 0, completed: false, updated: this.now(), prefs: {}, bookmarks: [] }, enumerable: true, writable: true, configurable: true }); return this.data.entries[id]; };
 Store.prototype.checkpoint = function (id, position, duration, ended, watched) {
  if (!id || !C.finite(position) || position < 0) return;
  var e = this.entry(id); e.position = position; e.duration = C.finite(duration) && duration > 0 ? duration : 0;
  if (e.duration && position > e.duration + 1) { e.position = 0; e.completed = false; }
  else e.completed = ended === true || (watched === true && e.duration > 0 && position / e.duration >= 0.95 && e.duration - position <= 120);
  delete e.watchState; e.updated = this.now(); this.flush(); this.emit('checkpoint', { contentId: id, entry: this.get(id) });
 };
 Store.prototype.preference = function (id, key, value) { var e = this.entry(id); e.prefs[key] = C.copy(value); e.updated = this.now(); this.flush(); };
 Store.prototype.resetPreferences = function (id) { var e = this.entry(id); e.prefs = {}; this.flush(); };
 Store.prototype.bookmark = function (id, position, label) {
  if (!C.finite(position) || position < 0) return false;
  var e = this.entry(id); if (e.bookmarks.length >= 10) return false;
  if (e.bookmarks.some(function (b) { return Math.abs(b.time - position) < 1; })) return false;
  e.bookmarks.push({ time: position, label: String(label || C.format(position)).slice(0, 80) }); e.bookmarks.sort(function (a, b) { return a.time - b.time; }); this.flush(); return true;
 };
 Store.prototype.removeBookmark = function (id, index) { this.entry(id).bookmarks.splice(index, 1); this.flush(); };
 Store.prototype.markWatched = function (id, completed) { var e = this.entry(id); e.completed = completed === true; if (!completed) e.position = 0; e.watchState = completed ? 'watched' : 'unwatched'; e.updated = this.now(); this.flush(); this.emit('checkpoint', { contentId: id, entry: this.get(id) }); };
 Store.prototype.clearMany = function (ids) { var self = this; ids.forEach(function (id) { delete self.data.entries[id]; }); this.flush(); this.emit('clear', ids); };
 Store.prototype.resetProgress = function (ids) { var self = this; ids.forEach(function (id) { var e = self.get(id); if (!e) return; if (!Object.keys(e.prefs).length) delete self.data.entries[id]; else { e.position = e.duration = e.updated = 0; e.completed = false; e.bookmarks = []; delete e.watchState; self.data.entries[id] = e; } }); this.flush(); this.emit('clear', ids); };
 Store.prototype.clear = function (id) { if (id) this.clearMany([id]); else { this.data.entries = Object.create(null); this.flush(); this.emit('clear', null); } };
 root.PlaybackStore = Store;
})(window);
