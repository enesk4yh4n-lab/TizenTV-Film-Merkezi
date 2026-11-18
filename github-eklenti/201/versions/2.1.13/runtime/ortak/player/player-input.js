(function (root) {
 'use strict';
 function Input(controller, view, doc) {
  this.controller = controller; this.view = view; this.doc = doc; this.held = {}; this.owners = {}; this.seekKey = null; this.releaseTimer = null;
  var self = this; this.down = function (e) { self.keydown(e); }; this.up = function (e) { self.keyup(e); }; this.blur = function () { self.cancel(); };
  doc.addEventListener('keydown', this.down); doc.addEventListener('keyup', this.up); root.addEventListener('blur', this.blur); this.register();
 }
 Input.prototype.register = function () {
  try {
   if (!root.tizen || !root.tizen.tvinputdevice) return;
   var api = root.tizen.tvinputdevice, allowed = ['MediaPlayPause', 'MediaPlay', 'MediaPause', 'MediaStop', 'MediaRewind', 'MediaFastForward', 'MediaTrackNext', 'MediaTrackPrevious'];
   api.getSupportedKeys().forEach(function (key) { if (allowed.indexOf(key.name) >= 0) { try { api.registerKey(key.name); } catch (ignore) {} } });
  } catch (e) { this.controller.log('Medya tuşları kaydedilemedi: ' + e.name); }
 };
 Input.prototype.keydown = function (event) {
  var code = event.keyCode || event.which, c = this.controller, v = this.view, now = Date.now(), first = !this.held[code];
  // Long Back/Exit and system volume keys stay with the TV.
  if (code === 10182 || [447, 448, 449].indexOf(code) >= 0) return;
  if ([13, 27, 37, 38, 39, 40, 10009, 10252, 415, 19, 413, 412, 417, 10233, 10232].indexOf(code) < 0) return;
  if (first) { this.held[code] = now; this.owners[code] = c.content ? 'player' : 'catalog'; }
  var owner = this.owners[code];
  if (owner === 'catalog' && !c.content && (first || [13, 27, 10009].indexOf(code) < 0)) return;
  event.preventDefault(); if (event.stopPropagation) event.stopPropagation();
  if (!c.content || owner !== 'player') return;
  if ([10252, 415, 19, 413, 10233, 10232].indexOf(code) >= 0) {
   if (!first) return;
   if (code === 10252) c.toggle(); else if (code === 415) c.play(); else if (code === 19) c.pause(); else if (code === 413) { this.cancelQuick(); c.requestStop(); } else if (code === 10233) c.navigate(1); else c.navigate(-1); return;
  }
  if (code === 27 || code === 10009) { if (first) { if (this.seekKey !== null) this.cancelQuick(); else v.back(); } return; }
  if ((code === 37 || code === 39 || code === 412 || code === 417) && !v.modalOpen() && (!v.visible || this.seekKey !== null || code === 412 || code === 417)) {
   var direction = code === 37 || code === 412 ? -1 : 1;
   if (!c.ready || !c.duration) { v.show(); return; }
   if (this.seekKey !== code) { this.seekKey = code; v.beginSeek(true); }
   var elapsed = now - this.held[code], step = elapsed >= 3000 ? 60 : elapsed >= 1000 ? 30 : c.settings.seekStep;
   v.moveSeek(direction * step); clearTimeout(this.releaseTimer); var self = this;
   // Some legacy remotes omit keyup. Commit only after repeats have stopped.
   this.releaseTimer = setTimeout(function () { self.commitQuick(); }, 600); return;
  }
  if (code === 13) { if (first) v.enter(); }
  else if ([37, 38, 39, 40].indexOf(code) >= 0) v.navigate(code);
 };
 Input.prototype.keyup = function (event) { var code = event.keyCode || event.which; delete this.held[code]; delete this.owners[code]; if (this.seekKey === code) { clearTimeout(this.releaseTimer); var self = this; this.releaseTimer = setTimeout(function () { self.commitQuick(); }, 60); } };
 Input.prototype.commitQuick = function () { if (this.seekKey === null) return; clearTimeout(this.releaseTimer); this.releaseTimer = null; this.seekKey = null; this.view.commitSeek(); };
 Input.prototype.cancelQuick = function () { clearTimeout(this.releaseTimer); this.releaseTimer = null; if (this.seekKey !== null) { this.seekKey = null; this.view.cancelSeek(); } };
 Input.prototype.cancel = function () { this.cancelQuick(); this.held = {}; this.owners = {}; if (this.view.seekTarget !== null) this.view.cancelSeek(); };
 Input.prototype.destroy = function () { this.cancel(); this.doc.removeEventListener('keydown', this.down); this.doc.removeEventListener('keyup', this.up); root.removeEventListener('blur', this.blur); };
 root.PlayerInput = Input;
})(window);
