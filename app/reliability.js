/* Bounded local measurements. No remote reports, media URLs or native state polling. */
(function (root) {
 'use strict';
 var KEY = 'chainprobe.reliability.v1', activeCall = null, slow = [], requests = {}, serial = 0, completed = 0, failed = 0, inputCount = 0, maxGap = 0, lastBeat = 0, timer = null, session = null, store = null, controller = null, records = [], lastSample = 0, hidden = false;
 function clock() { return root.performance && root.performance.now ? root.performance.now() : Date.now(); }
 function call(name, fn) {
  var previous = activeCall, started = clock(); activeCall = { name: name, at: Date.now() };
  try { return fn(); } finally { var elapsed = Math.max(0, clock() - started); if (elapsed >= 100) { slow.push({ name: name, ms: Math.round(elapsed), at: Date.now() }); if (slow.length > 32) slow.shift(); } activeCall = previous; }
 }
 function begin(kind, method) { var id = ++serial; requests[id] = { kind: kind, method: method, at: Date.now(), bytes: 0 }; return id; }
 function progress(id, bytes) { if (requests[id]) requests[id].bytes = Math.max(requests[id].bytes, bytes || 0); }
 function end(id, error) { if (!requests[id]) return; delete requests[id]; completed++; if (error) failed++; }
 function snapshot() {
  var c = controller, s = c && c.snapshot || {}, pending = [], now = Date.now();
  Object.keys(requests).forEach(function (id) { var r = requests[id]; pending.push({ kind: r.kind, method: r.method, age: Math.max(0, now - r.at), bytes: r.bytes }); });
  return { at: now, phase: c ? c.phase : 'idle', position: c && c.position || 0, desiredPlay: !!(c && c.desiredPlay), contentId: c && c.content ? c.content.contentId : null,
   transport: s.transport || 'n/a', codecs: s.codecs || 'n/a', buffered: s.buffered || [], inputCount: inputCount, eventLoopMaxGapMs: maxGap, lastNativeCall: activeCall, slowCalls: slow.slice(), pending: pending, completed: completed, failed: failed, hidden: hidden };
 }
 function persist() { try { var data = JSON.stringify({ version: 1, records: records }); while (data.length * 2 > 262144 && records.length > 1) { records.pop(); data = JSON.stringify({ version: 1, records: records }); } if (store) store.setItem(KEY, data); } catch (ignore) {} }
 function save() {
  if (!session) return;
  session.latest = snapshot(); var s = session.latest; session.samples.push({ at: s.at, phase: s.phase, contentId: s.contentId, position: s.position, transport: s.transport, inputCount: s.inputCount, eventLoopMaxGapMs: s.eventLoopMaxGapMs, pending: s.pending.length, completed: s.completed, failed: s.failed, hidden: s.hidden }); if (session.samples.length > 60) session.samples.shift();
  var i = -1; records.some(function (r, index) { if (r.id === session.id) { i = index; return true; } return false; });
  if (i < 0) records.unshift(session); else records[i] = session; records = records.slice(0, 8); persist();
 }
 function stop(reason) { if (!session) return; session.endedAt = Date.now(); session.reason = reason || 'manual'; save(); session = null; }
 function start(device) {
  if (device !== 'tv' && device !== 'emulator') throw new Error('Cihaz türünü seçin.');
  stop('replace'); maxGap = 0; slow = []; inputCount = 0; completed = failed = 0;
  session = { id: String(Date.now()) + '-' + device, version: root.AppInfo.version, device: device, startedAt: Date.now(), samples: [], endedAt: null, reason: null };
  lastBeat = clock(); lastSample = 0; save(); return session.id;
 }
 function beat() {
  var now = clock(); if (lastBeat && !hidden) maxGap = Math.max(maxGap, Math.max(0, Math.round(now - lastBeat - 500))); lastBeat = now;
  if (session && Date.now() - lastSample >= 5000) { lastSample = Date.now(); save(); }
  if (session && Date.now() - session.startedAt >= 300000) stop('five-minutes');
 }
 function attach(c, storage, doc) {
  if (timer) return; controller = c; store = storage;
  try { var data = storage && JSON.parse(storage.getItem(KEY)); if (data && data.version === 1 && Array.isArray(data.records)) records = data.records.filter(function (r) { return r && r.id && Array.isArray(r.samples); }).slice(0, 8); } catch (ignore) {}
  // A previous interrupted record stays interrupted; it is never reported as passed.
  records.forEach(function (r) { if (!r.endedAt) { r.reason = 'interrupted'; r.endedAt = r.latest && r.latest.at || r.startedAt; } });
  doc.addEventListener('keydown', function () { inputCount++; }, true);
  doc.addEventListener('visibilitychange', function () { hidden = !!(doc.hidden || doc.webkitHidden); lastBeat = clock(); if (hidden && session) save(); });
  root.addEventListener('pagehide', function () { stop('pagehide'); });
  lastBeat = clock(); timer = setInterval(beat, 500);
 }
 function describe() {
  var s = snapshot(), lines = ['Karşılaştırma: ' + (session ? (session.device === 'tv' ? 'Gerçek TV' : 'Emülatör') + ' · kayıt sürüyor (5 dk)' : 'Kapalı'),
   'Kontrol döngüsü en büyük gecikme: ' + s.eventLoopMaxGapMs + ' ms', 'Gelen tuş olayı: ' + s.inputCount,
   'Ağ: ' + s.pending.length + ' bekleyen · ' + s.completed + ' biten · ' + s.failed + ' hatalı/iptal',
   'Son yavaş çağrı: ' + (s.slowCalls.length ? s.slowCalls[s.slowCalls.length - 1].name + ' · ' + s.slowCalls[s.slowCalls.length - 1].ms + ' ms' : 'ölçülmedi'),
   'Bu ölçümler kök neden veya başarılı oynatma kararı değildir.', 'Son yerel karşılaştırmalar:'];
  records.forEach(function (r) { var last = r.latest || {}; lines.push((r.device === 'tv' ? 'TV' : 'Emülatör') + ' · v' + r.version + ' · ' + new Date(r.startedAt).toLocaleString('tr-TR') + ' · ' + (r.reason || 'sürüyor') + ' · ' + (last.phase || '?') + ' · ' + Math.round(last.position || 0) + ' sn · gecikme ' + (last.eventLoopMaxGapMs || 0) + ' ms'); });
  return lines.join('\n');
 }
 root.PlayerReliability = { call: call, begin: begin, progress: progress, end: end, attach: attach, start: start, stop: stop, snapshot: snapshot, describe: describe, report: function () { return JSON.parse(JSON.stringify({ version: 1, current: snapshot(), records: records })); } };
})(window);
