/* Fixed native transport. Policies are signed; payloads keep the caller's limits. */
(function (root) {
  'use strict';
  var embed = null, loading = null, enabled = true, ready = false, nextId = 0;
  var jobs = {}, queue = [], active = 0, origins = [], allOrigins = [], configured = false, repositories = {}, repositoryTrust = false;
  function rebuildOrigins() { allOrigins = origins.slice(); Object.keys(repositories).forEach(function (id) { var policies = repositories[id].policies; Object.keys(policies).forEach(function (key) { policies[key].forEach(function (origin) { if (allOrigins.indexOf(origin) < 0) allOrigins.push(origin); }); }); }); }
  function fault(stage, message, code) { var e = new Error(message); e.stage = stage; e.code = code || 0; e.unavailable = e.nativeUnavailable = stage === 'unavailable'; return e; }
  function supported() { return enabled && !!(root.tizen && root.navigator && root.navigator.mimeTypes && root.navigator.mimeTypes['application/x-nacl']); }
  function hostAllowed(host) {
    return allOrigins.some(function (origin) { return root.FilmUpdateVerify.policyMatch(host, origin.slice(8)); });
  }
  function discoveryAllowed(u) {
    if (u.origin !== 'https://api.github.com') return false;
    if (u.pathname === '/search/repositories') return u.search.indexOf('filmmerkezi-repository.json') >= 0;
    return /^\/repos\/[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}\/readme$/.test(u.pathname) && u.pathname.indexOf('/../') < 0;
  }
  function allowed(value) {
    try {
      var u = new root.URL(value), channel = new root.URL(root.FilmUpdateConfig.channel);
      if (u.protocol !== 'https:' || u.username || u.password || u.port && u.port !== '443' || u.hash || /[\r\n\t \\]/.test(value)) return false;
      if (discoveryAllowed(u)) return true;
      if (u.origin === channel.origin && u.pathname.indexOf(channel.pathname + '/') === 0 && !/%|\.\./.test(u.pathname)) return true;
      if (!/%|\.\./.test(u.pathname) && Object.keys(repositories).some(function (id) { var r = repositories[id], base = new root.URL(r.root); return u.origin === base.origin && u.pathname.indexOf(base.pathname) === 0 && (r.publicKey || u.pathname === base.pathname + 'filmmerkezi-repository.json' || u.pathname === base.pathname + 'filmmerkezi-repository.sig'); })) return true;
      return hostAllowed(u.hostname);
    } catch (ignore) { return false; }
  }
  function scopeAllowed(job, value) {
    if (!job.repositoryId && !job.pluginId) return true;
    var r = repositories[job.repositoryId], policies = r && r.policies[job.pluginId], u;
    try { u = new root.URL(value); } catch (ignore) { return false; }
    return !!policies && policies.some(function (origin) { return root.FilmUpdateVerify.policyMatch(u.hostname, origin.slice(8)); });
  }
  function textAllowed(value) {
    if (!allowed(value)) return false;
    return true;
  }
  function failAll(e) { Object.keys(jobs).forEach(function (id) { jobs[id].finish(e); }); }
  function ensure() {
    if (!supported()) return Promise.reject(fault('unavailable', 'Native TLS bu platformda bulunmuyor.'));
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      var timer;
      function broken(message) { enabled = false; ready = false; clearTimeout(timer); var e = fault('unavailable', message); reject(e); failAll(e); if (embed && embed.parentNode) embed.parentNode.removeChild(embed); embed = null; }
      embed = document.createElement('embed'); embed.type = 'application/x-nacl'; embed.src = 'ortak/ag/native/secure-http.nmf'; embed.width = embed.height = 1; embed.tabIndex = -1; embed.setAttribute('aria-hidden', 'true'); embed.style.cssText = 'position:absolute;left:0;top:0;opacity:0;pointer-events:none';
      embed.addEventListener('message', function (event) {
        var m = event.data, job;
        if (!m || typeof m !== 'object') return;
        if (m.kind === 'ready') { if (m.protocol !== 1 || m.policy !== 1 || m.binary !== true || m.tls !== true) { broken('Native TLS sözleşmesi uyumsuz.'); return; } clearTimeout(timer); ready = true; repositoryTrust = m.repositoryTrust === 1; resolve(embed); pump(); return; }
        if (!(job = jobs[m.id])) return;
        if (m.kind === 'progress') { job.firstByte(); if (job.progress) job.progress(m.loaded || 0, 0); return; }
        if (m.kind !== 'result') return;
        if (m.code !== 0) { var e = fault(m.stage || 'network', 'Native TLS: ' + (m.stage || 'network') + ' (' + m.code + ')', m.code); if (m.byteLimitExceeded) { e.byteLimitExceeded = true; e.byteLimit = m.byteLimit || job.limit; } job.finish(e); return; }
        if (job.configure || job.control) { job.finish(null, true); return; }
        if (typeof m.status !== 'number') { job.finish(fault('protocol', 'Native TLS yanıtı geçersiz.')); return; }
        if ([301, 302, 303, 307, 308].indexOf(m.status) >= 0) { job.redirect(m); return; }
        if (m.status < 200 || m.status >= 300) { job.finish(fault('http', 'HTTP ' + m.status + (m.status === 403 ? ' · Site erişimi reddetti / Site denied access' : m.status === 429 ? ' · İstek sınırı / Request limit' : ''), m.status)); return; }
        var data = job.binary ? m.data : m.body, size = data && (job.binary ? data.byteLength : root.FilmUpdateVerify.bytes(data).length);
        if (typeof size !== 'number' || size > job.limit) { var limit = fault('size', 'Native TLS boyut sınırı'); limit.byteLimitExceeded = true; limit.byteLimit = job.limit; job.finish(limit); return; }
        if (job.binary && m.status === 206) { var match = /^bytes\s+(\d+)-(\d+)\/(?:\d+|\*)$/i.exec(m.contentRange || ''); if (!match || Number(match[1]) !== job.rangeStart || Number(match[2]) + 1 !== job.rangeEnd || size !== job.rangeEnd - job.rangeStart) { job.finish(fault('range', 'Doğrulanamayan HTTP byte range', 206)); return; } }
        if (!job.binary && /<title[^>]*>\s*(Just a moment|Attention Required|Access Denied)|cf-browser-verification|cf-mitigated/i.test(data)) { job.finish(fault('access', 'Doğrulama/erişim engeli')); return; }
        if (job.progress) job.progress(size, size);
        job.finish(null, { body: job.binary ? null : data, data: data, method: 'NativeTLS', url: job.url, status: m.status, code: m.status, mimeType: m.mimeType || '', contentRange: m.contentRange || '', partial: m.status === 206 });
      });
      embed.addEventListener('error', function () { broken('Native TLS yüklenemedi.'); }); embed.addEventListener('crash', function () { broken('Native TLS kapandı.'); }); timer = setTimeout(function () { broken('Native TLS yükleme süresi doldu.'); }, 8000); document.body.appendChild(embed);
    });
    return loading;
  }
  function pump() {
    if (!ready || !embed) return;
    while (queue.length) {
      var index = -1, i;
      for (i = 0; i < queue.length; i++) if (queue[i].control || queue[i].configure) { index = i; break; }
      if (index < 0) { if (active >= 2) return; index = 0; }
      var job = queue.splice(index, 1)[0]; if (job.done) continue;
      if (job.control && !repositoryTrust) { job.finish(fault('unavailable', 'Eklenti depoları için WGT 1.4.0 veya sonrası gerekli.')); continue; }
      job.running = true; job.counted = !job.control && !job.configure; if (job.counted) { active++; job.begin(); }
      try { var message = job.control || (job.configure ? { kind: 'configure', policy: job.policy, signature: job.signature } : { kind: 'request', url: job.url, referer: job.referer, binary: job.binary, byteLimit: job.limit, repositoryId: job.repositoryId, pluginId: job.pluginId, method: job.method, body: job.body, headers: job.headers }); message.id = job.id; embed.postMessage(message); } catch (ignore) { job.finish(fault('unavailable', 'Native TLS isteği gönderilemedi.')); }
    }
  }
  function request(url, referer, options) {
    options = options || {}; var job, cancel = function () {};
    var promise = new Promise(function (resolve, reject) {
      var id = ++nextId, done = false, timer, firstTimer, deadline = Math.min(options.deadline || Infinity, Date.now() + (options.timeoutMs || options.timeout || 20000));
      job = { id: id, url: url, referer: referer || '', configure: !!options.configure, policy: options.policy, signature: options.signature, binary: !!options.binary, limit: options.byteLimit || (options.binary ? 8 * 1024 * 1024 : 2 * 1024 * 1024), method: options.method || 'GET', body: options.body || '', headers: {}, rangeStart: options.rangeStart, rangeEnd: options.rangeEnd, progress: options.onprogress, redirects: 0, running: false, done: false };
      job.control = options.control || null; job.repositoryId = options.repositoryId || ""; job.pluginId = options.pluginId || "";
      function release() { if (job.running) { if (job.counted) active--; job.running = false; } }
      function finish(e, value) { if (done) return; done = job.done = true; clearTimeout(timer); clearTimeout(firstTimer); delete jobs[id]; var i = queue.indexOf(job); if (i >= 0) queue.splice(i, 1); if (e && job.running && ready && embed) try { embed.postMessage({ kind: 'cancel', id: id }); } catch (ignore) {} release(); job.progress = null; if (e) reject(e); else resolve(value); pump(); }
      job.firstByte = function () { clearTimeout(firstTimer); };
      job.begin = function () { clearTimeout(firstTimer); if (options.firstByteTimeoutMs) firstTimer = setTimeout(function () { finish(fault('timeout', 'Native TLS ilk veri zaman aşımı.')); }, Math.min(options.firstByteTimeoutMs, Math.max(1, deadline - Date.now()))); };
      job.finish = finish;
      job.redirect = function (m) { var target; try { target = new root.URL(m.location, job.url).href; } catch (ignore) {} if (++job.redirects > 3 || !target || !allowed(target) || !scopeAllowed(job, target)) { finish(fault('redirect', 'TLS yönlendirmesi izinli değil.')); return; } if (m.status === 303 || (m.status === 301 || m.status === 302) && job.method === 'POST') { job.method = 'GET'; job.body = ''; delete job.headers['Content-Type']; } job.url = target; release(); queue.push(job); pump(); };
      cancel = function () { var e = fault('cancel', 'İptal edildi'); e.cancelled = true; finish(e); };
      if (!job.configure && !job.control && (!allowed(url) || !scopeAllowed(job, url) || job.referer && (!allowed(job.referer) || !scopeAllowed(job, job.referer)))) { finish(fault('validation', 'TLS adresi imzalı izin listesinde yok.')); return; }
      if (job.limit < 1 || job.limit > (job.binary ? 12 : 2) * 1024 * 1024 || job.limit % 1 || queue.length >= 32) { finish(fault('validation', 'TLS istek sınırı geçersiz.')); return; }
      Object.keys(options.headers || {}).forEach(function (name) { var normalized = { range: 'Range', origin: 'Origin', 'content-type': 'Content-Type', 'x-requested-with': 'X-Requested-With' }[name.toLowerCase()]; if (normalized) { if (normalized === 'Origin' && !scopeAllowed(job, options.headers[name])) throw fault('validation', 'Package Origin denied'); job.headers[normalized] = options.headers[name]; } });
      if (options.rangeEnd > options.rangeStart) job.headers.Range = 'bytes=' + options.rangeStart + '-' + (options.rangeEnd - 1);
      jobs[id] = job; timer = setTimeout(function () { finish(fault('timeout', 'Native TLS zaman aşımı.')); }, Math.max(1, deadline - Date.now())); queue.push(job); ensure().then(pump, finish);
    });
    return { promise: promise, cancel: function () { cancel(); } };
  }
  function configure(text, signature) {
    if (configured) return Promise.reject(fault('policy', 'TLS izinleri bu açılışta zaten ayarlandı.'));
    var parsed = root.FilmUpdateVerify.networkPolicy(text);
    if (!supported()) { origins = parsed; rebuildOrigins(); configured = true; return Promise.resolve(); }
    return request('', '', { configure: true, policy: text, signature: signature, timeout: 12000 }).promise.then(function () { origins = parsed; rebuildOrigins(); configured = true; });
  }
  function control(message) { return supported() ? request('', '', { control: message, timeout: 12000 }).promise : Promise.resolve(); }
  function registerRepository(id, index, publicKey) {
    if (!/^[a-z][a-z0-9-]{0,63}$/.test(id) || typeof publicKey !== 'string' || publicKey.length > 800) return Promise.reject(fault('repository', 'Depo kimliği veya anahtarı geçersiz.'));
    var url; try { url = root.FilmPluginSchema.address(index); } catch (e) { return Promise.reject(e); }
    if (repositories[id] && repositories[id].publicKey && repositories[id].publicKey !== publicKey) return Promise.reject(fault('repository', 'Depo anahtarı bu açılışta değiştirilemez.'));
    return control({ kind: 'repository', repositoryId: id, url: url, publicKey: publicKey }).then(function () { var old = repositories[id]; repositories[id] = { root: url.replace(/filmmerkezi-repository\.json$/, ''), publicKey: publicKey, policies: old ? old.policies : {} }; });
  }
  function configureRepository(id, pluginId, text, signature) {
    var r = repositories[id], parsed; if (!r || !r.publicKey || !/^[a-z][a-z0-9-]{0,63}$/.test(pluginId)) return Promise.reject(fault('repository', 'Önce depo yayıncısına güvenilmeli.'));
    try { parsed = root.FilmUpdateVerify.networkPolicy(text); } catch (e) { return Promise.reject(e); }
    return control({ kind: 'repository-policy', repositoryId: id, pluginId: pluginId, policy: text, signature: signature }).then(function () { r.policies[pluginId] = parsed; rebuildOrigins(); });
  }
  function removeRepository(id) { return control({ kind: 'repository-remove', repositoryId: id }).then(function () { delete repositories[id]; rebuildOrigins(); }); }
  root.FilmNativeTLS = { supported: supported, allowed: allowed, textAllowed: textAllowed, configure: configure, request: request, registerRepository: registerRepository, configureRepository: configureRepository, removeRepository: removeRepository };
  root.FilmUpdateHttp = { supported: supported, allowed: allowed, request: request };
})(window);
