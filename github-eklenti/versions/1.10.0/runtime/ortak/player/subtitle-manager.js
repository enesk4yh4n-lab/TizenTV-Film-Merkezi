/* One safe text renderer for external SRT/WebVTT and hls.js non-native cues. */
(function (root) {
 'use strict';
 var C = root.PlayerCore;
 function stamp(s) {
  var m = /^(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})$/.exec(String(s).trim());
  if (!m || Number(m[2]) > 59 || Number(m[3]) > 59) return NaN;
  return Number(m[1] || 0) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number((m[4] + '00').slice(0, 3)) / 1000;
 }
 function plain(s) {
  return String(s).replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/ig, '').replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/ig, '').replace(/<br\s*\/?\s*>/ig, '\n').replace(/<[^>]*>/g, '').replace(/\{\\[^}]*\}/g, '')
   .replace(/&(?:amp|lt|gt|quot|apos|nbsp|#\d+|#x[a-f0-9]+);/ig, function (x) {
    var named = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&nbsp;': ' ' };
    if (named[x.toLowerCase()]) return named[x.toLowerCase()];
    var n = x.charAt(2).toLowerCase() === 'x' ? parseInt(x.slice(3), 16) : parseInt(x.slice(2), 10);
    return n > 0 && n <= 65535 ? String.fromCharCode(n) : '';
   }).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, 4000).trim();
 }
 function parse(text, raw) {
  text = String(text).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  if (/^\s*(?:<!doctype|<html|\[Script Info\])/i.test(text)) throw new Error('Desteklenmeyen altyazı biçimi. SRT veya WebVTT gerekli.');
  var blocks = text.split(/\n\s*\n/), cues = [];
  blocks.forEach(function (block) {
   var lines = block.split('\n'), i = -1;
   for (var j = 0; j < Math.min(3, lines.length); j++) if (lines[j].indexOf('-->') >= 0) { i = j; break; }
   if (i < 0) return;
   var m = /^(\S+)\s+-->\s+(\S+)/.exec(lines[i].trim()); if (!m) return;
   var start = stamp(m[1]), end = stamp(m[2]), value = raw ? lines.slice(i + 1).join('\n').trim() : plain(lines.slice(i + 1).join('\n'));
   if (!C.finite(start) || !C.finite(end) || start < 0 || end <= start || !value || cues.length >= 10000) return;
   cues.push({ start: start, end: end, text: value });
  });
  cues.sort(function (a, b) { return a.start - b.start; });
  if (!cues.length) throw new Error('Geçerli altyazı satırı bulunamadı.'); return cues;
 }
 function decode(buffer, encoding) {
  var bytes = new Uint8Array(buffer), i, text = '';
  if (root.TextDecoder) {
   try { return new root.TextDecoder(encoding || 'utf-8', { fatal: true }).decode(bytes); }
   catch (e) { if (encoding) throw new Error('Altyazı karakter kodlaması desteklenmiyor.'); }
  }
  if (encoding && /1254|latin5|8859-9/i.test(encoding)) {
   var tr = { 208: 286, 221: 304, 222: 350, 240: 287, 253: 305, 254: 351, 128: 8364, 145: 8216, 146: 8217, 147: 8220, 148: 8221, 150: 8211, 151: 8212 };
   for (i = 0; i < bytes.length; i++) text += String.fromCharCode(tr[bytes[i]] || bytes[i]); return text;
  }
  // Legacy engines: strict UTF-8 conversion, then the provider's Turkish encoding.
  try { var chunks = []; for (i = 0; i < bytes.length; i += 8192) chunks.push(String.fromCharCode.apply(null, bytes.subarray(i, i + 8192))); return decodeURIComponent(escape(chunks.join(''))); }
  catch (ignore) { return decode(buffer, 'windows-1254'); }
 }
 function Manager(node, onerror) {
  this.node = node; this.onerror = onerror || function () {}; this.generation = 0; this.job = null; this.cues = []; this.cache = {}; this.active = null; this.offset = 0; this.style = C.copy(C.defaults.subtitleStyle); this.last = ''; this.styleApply();
 }
 Manager.prototype.clear = function () { this.generation++; if (this.job) this.job.cancel(); this.job = null; this.cues = []; this.cache = {}; this.active = null; this.last = ''; if (this.node) this.node.textContent = ''; };
 Manager.prototype.select = function (track, options) {
  this.generation++; if (this.job) this.job.cancel(); this.job = null; this.active = track || null; this.cues = []; this.last = ''; if (this.node) this.node.textContent = '';
  if (!track) return Promise.resolve();
  var self = this, token = this.generation;
  if (track.kind === 'hls') { self.cues = self.cache[track.key] || []; return Promise.resolve(); }
  if (!track.url || /\.(?:ass|ssa|sup|sub)(?:\?|$)/i.test(track.url)) { var e = new Error('Bu altyazı biçimi desteklenmiyor.'); self.onerror(e.message); return Promise.reject(e); }
  options = options || {};
  self.job = root.MediaNetwork.request(track.url, { binary: true, kind: 'subtitle', byteLimit: 2 * 1024 * 1024, referer: options.referer, policy: options.policy, timeoutMs: 12000 });
  return self.job.promise.then(function (r) { if (token !== self.generation) return; self.cues = parse(decode(r.data, track.encoding)); self.job = null; }).catch(function (e) { if (token !== self.generation) return; self.job = null; self.onerror('Altyazı açılamadı. Altyazılar menüsünden yeniden deneyebilirsiniz.'); throw e; });
 };
 Manager.prototype.ingest = function (key, cues, time) {
  var list = this.cache[key] || [], seen = {}, result = [];
  list.concat(cues.map(function (c) { return { start: c.startTime, end: c.endTime, text: plain(c.text) }; })).forEach(function (c) {
   var id = c.start + ':' + c.end + ':' + c.text;
   if (C.finite(c.start) && C.finite(c.end) && c.end > c.start && c.end >= time - 150 && !seen[id]) { seen[id] = true; result.push(c); }
  });
  result.sort(function (a, b) { return a.start - b.start; }); this.cache[key] = result.slice(-1500);
  if (this.active && this.active.key === key) this.cues = this.cache[key];
 };
 Manager.prototype.textAt = function (time) {
  if (!this.active) return ''; var shifted = time - this.offset, lines = [];
  for (var i = 0; i < this.cues.length; i++) { var c = this.cues[i]; if (c.start > shifted) break; if (c.end > shifted && lines.indexOf(c.text) < 0) lines.push(c.text); }
  return lines.slice(0, 4).join('\n');
 };
 Manager.prototype.render = function (time) { var text = this.textAt(time); if (text !== this.last) { if (this.node) this.node.textContent = text; this.last = text; } };
 Manager.prototype.setOffset = function (value) { this.offset = Math.round(C.clamp(Number(value) || 0, -120, 120) * 10) / 10; this.last = null; };
 Manager.prototype.setStyle = function (value) { this.style = C.copy(value); this.styleApply(); };
 Manager.prototype.styleApply = function () {
  if (!this.node) return; var s = this.style, scale = root.innerWidth && root.innerHeight ? Math.min(root.innerWidth / 1920, root.innerHeight / 1080) : 1; this.node.style.fontSize = (s.size * scale) + 'px'; this.node.style.color = s.color; this.node.style.backgroundColor = 'rgba(0,0,0,' + s.background + ')';
  this.node.style.textShadow = s.shadow ? '2px 2px 3px #000, -1px -1px 2px #000' : 'none'; this.node.style.bottom = s.bottom + '%';
 };
 root.SubtitleManager = Manager; root.SubtitleParser = { parse: parse, stamp: stamp, plain: plain, decode: decode };
})(window);
