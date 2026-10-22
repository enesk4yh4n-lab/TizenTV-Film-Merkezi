/* Legacy transport adapter for the public hls.js 1.7.3 loader API. */
(function (root) {
 'use strict';
 function now() { return root.performance && root.performance.now ? root.performance.now() : Date.now(); }
 function stats() { return { aborted: false, loaded: 0, retry: 0, total: 0, chunkCount: 0, bwEstimate: 0, loading: { start: 0, first: 0, end: 0 }, parsing: { start: 0, end: 0 }, buffering: { start: 0, first: 0, end: 0 } }; }
 function create(options) {
  options = options || {};
  function Loader() { this.stats = stats(); this.context = null; this.job = null; this.destroyed = false; this.generation = 0; this.timer = null; this.retryTimer = null; this.active = false; this.response = null; }
  Loader.prototype.load = function (context, config, callbacks) {
   var self = this; self.abort(); self.destroyed = false; var token = self.generation; self.context = context;
   // hls.js assigns frag.stats = loader.stats BEFORE calling load. Keep the reference.
   var previousRetry = self.stats.retry, initial = stats(); Object.keys(initial).forEach(function (key) { self.stats[key] = initial[key]; }); self.stats.retry = previousRetry;
   self.stats.loading.start = now(); self.active = true; self.callbacks = callbacks; self.attemptId = 0;
   config = config || {}; var policy = config.loadPolicy || {}, timeout = policy.maxLoadTimeMs || config.timeout || 30000;
   var deadline = typeof options.deadline === 'function' ? options.deadline() : options.deadline;
   if (deadline) timeout = Math.max(1, Math.min(timeout, deadline - Date.now()));
   var endAt = Date.now() + timeout, retries = 0, firstSeen = false, range = context.rangeEnd > (context.rangeStart || 0);
   function alive() { return self.active && !self.destroyed && token === self.generation; }
   function clear() { if (root.clearTimeout) { root.clearTimeout(self.timer); root.clearTimeout(self.retryTimer); } self.timer = self.retryTimer = null; }
   function failure(error, timedout) {
    if (!alive()) return; self.attemptId++; clear(); if (self.job) self.job.cancel(); self.job = null;
    var rule = timedout ? policy.timeoutRetry : policy.errorRetry, code = error.code || 0;
    var retryable = timedout || !code || code === 408 || code === 429 || code >= 500;
    var delay = rule ? Math.min((rule.retryDelayMs || 0) * Math.pow(2, retries), rule.maxRetryDelayMs || 8000) : 0;
    if (retryable && rule && retries < rule.maxNumRetry && Date.now() + delay < endAt && root.setTimeout) {
     retries++; self.stats.retry++; self.retryTimer = root.setTimeout(function () { self.retryTimer = null; if (alive()) attempt(); }, delay); return;
    }
    self.active = false; self.stats.loading.end = now();
    if (timedout && callbacks.onTimeout) callbacks.onTimeout(self.stats, context, null);
    else callbacks.onError({ code: code, text: error.message }, context, null, self.stats);
   }
   function arm(firstByte) {
    if (!root.setTimeout) return; if (self.timer) root.clearTimeout(self.timer);
    var remaining = Math.max(1, endAt - Date.now()), delay = firstByte && policy.maxTimeToFirstByteMs ? Math.min(remaining, policy.maxTimeToFirstByteMs) : remaining;
    self.timer = root.setTimeout(function () { self.timer = null; failure(new Error(firstByte ? 'HLS ilk veri zaman aşımı' : 'HLS istek süresi doldu'), true); }, delay);
   }
   function attempt() {
    if (!alive()) return;
    var id = ++self.attemptId; firstSeen = false; arm(true);
    self.job = root.MediaNetwork.request(context.url, {
     binary: context.responseType === 'arraybuffer', kind: context.responseType === 'json' ? 'json' : context.responseType === 'arraybuffer' ? (context.type || 'fragment') : 'playlist', policy: options.policy, referer: options.referer,
     rangeStart: range ? context.rangeStart || 0 : undefined, rangeEnd: range ? context.rangeEnd : undefined, deadline: function () { var shared = typeof options.deadline === 'function' ? options.deadline() : options.deadline; return shared ? Math.min(endAt, shared) : endAt; }, timeoutMs: Math.max(1, endAt - Date.now()), firstByteTimeoutMs: policy.maxTimeToFirstByteMs ? Math.max(1, Math.floor(policy.maxTimeToFirstByteMs / 3)) : undefined, onstatus: options.onstatus,
     byteLimit: /key/.test(context.type || '') ? 64 * 1024 : options.byteLimit,
     onprogress: function (loaded, total) { if (!alive() || id !== self.attemptId) return; if (!firstSeen) { firstSeen = true; if (!self.stats.loading.first) self.stats.loading.first = now(); arm(false); } self.stats.loaded = loaded; self.stats.total = total; }
    });
    self.job.promise.then(function (response) {
     if (!alive() || id !== self.attemptId) return; var data = response.data, rawSize = typeof data === 'string' ? data.length : data.byteLength;
     if (data instanceof ArrayBuffer && range) {
      var start = context.rangeStart || 0, end = context.rangeEnd;
      if (start < 0 || end <= start || start % 1 || end % 1) throw new Error('Gecersiz HLS byte range');
      if (response.partial) { if (data.byteLength !== end - start) throw new Error('Eksik HLS byte range'); }
      else { if (end > data.byteLength) throw new Error('Eksik HLS byte range'); data = data.slice(start, end); rawSize = data.byteLength; }
     }
     if (context.responseType === 'json') data = JSON.parse(data);
     self.active = false; clear(); self.response = response; self.stats.loading.end = now();
     if (!self.stats.loading.first) self.stats.loading.first = self.stats.loading.end;
     self.stats.loaded = self.stats.total = rawSize; self.stats.chunkCount = 1;
     self.stats.bwEstimate = 8 * self.stats.loaded * 1000 / Math.max(1, self.stats.loading.end - self.stats.loading.start);
     if (callbacks.onProgress) callbacks.onProgress(self.stats, context, data, null);
     if (!self.destroyed && token === self.generation) callbacks.onSuccess({ url: response.url, data: data, code: response.code }, self.stats, context, null);
    }).catch(function (error) { if (alive() && id === self.attemptId) failure(error, false); });
   }
   attempt();
  };
  Loader.prototype.abort = function () {
   this.generation++; if (root.clearTimeout) { root.clearTimeout(this.timer); root.clearTimeout(this.retryTimer); } this.timer = this.retryTimer = null;
   var active = this.active; this.active = false; if (active) this.stats.aborted = true; if (this.job) this.job.cancel(); this.job = null;
   if (active && this.callbacks && this.callbacks.onAbort) this.callbacks.onAbort(this.stats, this.context, null);
  };
  Loader.prototype.destroy = function () { this.destroyed = true; this.abort(); this.context = null; this.callbacks = null; };
  Loader.prototype.getCacheAge = function () { return null; };
  Loader.prototype.getResponseHeader = function (name) { return name.toLowerCase() === 'content-type' && this.response ? this.response.mimeType || null : null; };
  return Loader;
 }
 root.NativeHlsLoader = { create: create };
})(window);
