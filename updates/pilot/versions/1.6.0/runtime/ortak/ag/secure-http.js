/* Lazy, local Pepper HTTPS helper. No server, downloaded scripts or disabled TLS checks. */
(function (root) {
 'use strict';
 var embed = null, loading = null, ready = false, disabled = false, next = 0, jobs = {}, loadTimer = null;
 var LIMIT = 2 * 1024 * 1024;
 function error(stage, message, code) { var e = new Error(message); e.stage = stage; e.code = code || 0; e.unavailable = stage === 'unavailable'; return e; }
 function supported() { try { return !disabled && !!(root.tizen && root.navigator && root.navigator.mimeTypes && root.navigator.mimeTypes['application/x-nacl'] && root.document); } catch (ignore) { return false; } }
 function allowed(url, referer) {
  try {
   var u = new root.URL(url), r = new root.URL(referer);
   return u.origin === 'https://www.ddizi.tel' && !u.username && !u.password && !u.hash && /^\/(?:izle|player)\//.test(u.pathname) &&
    r.origin === 'https://www.ddizi.tel' && !r.username && !r.password && !r.hash && (r.pathname === '/' || /^\/izle\//.test(r.pathname)) && !/[\r\n\t ]/.test(url + referer);
  } catch (ignore) { return false; }
 }
 function failAll(e) { Object.keys(jobs).forEach(function (id) { jobs[id].finish(e); }); }
 function ensure() {
  if (!supported()) return Promise.reject(error('unavailable', 'Yerel HTTPS modülü bu platformda bulunmuyor.'));
  if (loading) return loading;
  loading = new Promise(function (resolve, reject) {
   function broken(message) {
    disabled = true; ready = false; clearTimeout(loadTimer);
    var e = error('unavailable', message); reject(e); failAll(e);
    if (embed && embed.parentNode) embed.parentNode.removeChild(embed);
    embed = null;
   }
   embed = document.createElement('embed'); embed.type = 'application/x-nacl'; embed.src = 'ortak/ag/native/secure-http.nmf'; embed.width = 1; embed.height = 1;
   embed.setAttribute('aria-hidden', 'true'); embed.tabIndex = -1;
   embed.style.cssText = 'position:absolute;left:0;top:0;opacity:0;pointer-events:none';
   embed.addEventListener('message', function (event) {
    var m = event.data;
    if (!m || typeof m !== 'object') return;
    if (m.kind === 'ready') {
     if (m.protocol !== 1 || m.tls !== true) { broken('Yerel HTTPS modülü başlatılamadı.'); return; }
     clearTimeout(loadTimer); ready = true; resolve(embed); return;
    }
    if (m.kind !== 'result' || !jobs[m.id]) return;
    if (m.code !== 0) { jobs[m.id].finish(error(m.stage || 'network', 'TV HTTPS: ' + (m.stage || 'network') + ' (' + m.code + ')', m.code)); return; }
    if (typeof m.body !== 'string' || m.body.length > LIMIT || typeof m.status !== 'number') { jobs[m.id].finish(error('protocol', 'Yerel HTTPS yanıtı geçersiz.')); return; }
    if (m.status < 200 || m.status >= 300) { jobs[m.id].finish(error(m.status === 403 || m.status === 429 ? 'access' : 'http', 'TV HTTPS: HTTP ' + m.status, m.status)); return; }
    if (/<title[^>]*>\s*(Just a moment|Attention Required|Access Denied)|cf-browser-verification|cf-mitigated/i.test(m.body)) { jobs[m.id].finish(error('access', 'Doğrulama/erişim engeli')); return; }
    jobs[m.id].finish(null, { body: m.body, method: 'NaClTLS/IPv4 (MbedTLS 3.6.7)', url: jobs[m.id].url });
   });
   embed.addEventListener('error', function () { broken('Yerel HTTPS modülü yüklenemedi.'); });
   embed.addEventListener('crash', function () { broken('Yerel HTTPS modülü kapandı.'); });
   loadTimer = setTimeout(function () { broken('Yerel HTTPS modülü yükleme zaman aşımı.'); }, 8000);
   document.body.appendChild(embed);
  });
  return loading;
 }
 function request(url, referer, options) {
  options = options || {}; var id = ++next, timer, settled = false, cancel, task = {};
  task.promise = new Promise(function (resolve, reject) {
   function finish(e, value) { if (settled) return; settled = true; clearTimeout(timer); delete jobs[id]; if (e) reject(e); else resolve(value); }
   function stop(e) { if (settled) return; if (ready && embed) { try { embed.postMessage({ kind: 'cancel', id: id }); } catch (ignore) {} } finish(e); }
   cancel = function () { var e = error('cancel', 'İptal edildi'); e.cancelled = true; stop(e); };
   if (!allowed(url, referer)) { finish(error('validation', 'Geçersiz DDizi HTTPS isteği.')); return; }
   var ms = Math.min(options.timeout || 18000, options.deadline ? options.deadline - Date.now() : 18000);
   if (ms <= 0) { finish(error('timeout', 'TV HTTPS zaman bütçesi doldu.')); return; }
   jobs[id] = { url: url, finish: finish };
   timer = setTimeout(function () { stop(error('timeout', 'TV HTTPS zaman aşımı.')); }, ms);
   ensure().then(function (module) { if (!settled) { try { module.postMessage({ kind: 'request', id: id, url: url, referer: referer }); } catch (e) { finish(error('unavailable', 'Yerel HTTPS isteği başlatılamadı.')); } } }, finish);
  });
  task.cancel = function () { if (cancel) cancel(); }; return task;
 }
 root.ChainSecureHttp = { supported: supported, allowed: allowed, request: request };
})(window);
