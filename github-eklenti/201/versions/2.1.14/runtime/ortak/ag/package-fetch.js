/* Modern-TV package transport. Uninspectable redirects fail closed. ES5. */
(function (root) {
  'use strict';
  function supported() {
    return /\bTizen 10(?:\.|\b)/i.test(root.navigator && root.navigator.userAgent || '') &&
      !!(root.fetch && root.AbortController && root.TextDecoder && root.ReadableStream) &&
      !(root.FilmNativeTLS && root.FilmNativeTLS.supported());
  }
  function fault(message, stage, code) {
    var e = new Error(message); e.stage = stage || 'network'; e.code = code || 0; return e;
  }
  function request(url, options) {
    options = options || {};
    var controller, reader = null, timer = null, done = false, rejectJob, started = Date.now(),
      deadline = typeof options.deadline === 'function' ? options.deadline() : options.deadline,
      timeout = Math.min(options.timeoutMs || 30000, deadline ? deadline - started : Infinity),
      limit = options.byteLimit || (options.binary ? 8388608 : 2097152), redirects = 0,
      method = String(options.method || 'GET').toUpperCase(), headers = {}, controlledHeaders = [], body = options.body;
    function assert(address) {
      if (!options.packageKey) throw fault('Package owner required', 'policy');
      root.PackageNetwork.assert(options.packageKey, address);
      if (!/^https:\/\//i.test(address)) throw fault('Package HTTPS required', 'policy');
    }
    function close(abort) {
      clearTimeout(timer); timer = null;
      if (abort && controller) controller.abort();
      if (reader) { try { var p = reader.cancel(); if (p && p.catch) p.catch(function () {}); } catch (ignore) {} reader = null; }
    }
    function fail(e) { if (done) return; done = true; close(true); rejectJob(e); }
    var promise = new Promise(function (resolve, reject) {
      rejectJob = reject;
      try {
        if (!supported()) throw fault('Modern package transport unavailable', 'unavailable');
        if (!(timeout > 0) || !(limit > 0) || limit > (options.binary ? 32 : 24) * 1024 * 1024) throw fault('Package request budget exhausted', 'validation');
        if (method !== 'GET' && method !== 'POST') throw fault('Package HTTP method unsupported', 'validation');
        assert(url); if (options.referer) assert(options.referer);
        (options.requiredHeaders || []).forEach(function (name) {
          if (/^(referer|origin|cookie|user-agent|host)$/i.test(name)) throw fault('Browser-controlled required header: ' + name, 'unsupported');
        });
        Object.keys(options.headers || {}).forEach(function (name) {
          if (/^(origin|referer|user-agent)$/i.test(name)) {
            if (!/^user-agent$/i.test(name) && options.headers[name]) assert(options.headers[name]);
            controlledHeaders.push(name);
            return;
          }
          if (!/^(accept|range|content-type|x-requested-with)$/i.test(name)) throw fault('Unsupported package header: ' + name, 'unsupported');
          headers[name] = String(options.headers[name]);
        });
        if (options.rangeEnd > options.rangeStart) headers.Range = 'bytes=' + options.rangeStart + '-' + (options.rangeEnd - 1);
        controller = new root.AbortController();
        timer = setTimeout(function () { var e = fault('Package request timed out', 'timeout'); e.timeout = true; fail(e); }, timeout);
        function send(address, verb, payload) {
          if (done) return;
          assert(address);
          root.fetch(address, { method: verb, body: verb === 'GET' ? undefined : payload,
            headers: headers, redirect: 'manual', credentials: 'omit', referrerPolicy: 'no-referrer', signal: controller.signal
          }).then(function (response) {
            if (done) return;
            if (response.type === 'opaqueredirect' || response.type === 'opaque' || response.redirected) throw fault('Package redirect cannot be verified; use a direct address', 'policy');
            assert(response.url || address);
            if (response.status >= 300 && response.status < 400) {
              var location = response.headers.get('Location');
              if (!location || ++redirects > 3) throw fault('Package redirect limit', 'policy');
              var target = new root.URL(location, address).href;
              assert(target);
              var nextVerb = response.status === 303 || (response.status === 301 || response.status === 302) && verb === 'POST' ? 'GET' : verb;
              if (response.body && response.body.cancel) response.body.cancel().catch(function () {});
              send(target, nextVerb, nextVerb === 'GET' ? undefined : payload); return;
            }
            if (response.status < 200 || response.status >= 300) throw fault('HTTP ' + response.status, 'http', response.status);
            var declared = Number(response.headers.get('Content-Length') || 0), chunks = [], size = 0;
            function sizeError() { var e = fault('Package response byte limit', 'size'); e.byteLimitExceeded = true; e.byteLimit = limit; return e; }
            if (declared > limit) throw sizeError();
            if (!response.body || !response.body.getReader) throw fault('Bounded response reader unavailable', 'unavailable');
            reader = response.body.getReader();
            function read() {
              if (done) return;
              return reader.read().then(function (part) {
                if (done) return;
                if (!part.done) {
                  size += part.value.byteLength;
                  if (size > limit) throw sizeError();
                  chunks.push(part.value);
                  if (options.onprogress) options.onprogress(size, declared);
                  return read();
                }
                var bytes = new Uint8Array(size), offset = 0;
                chunks.forEach(function (chunk) { bytes.set(chunk, offset); offset += chunk.byteLength; });
                chunks = [];
                var partial = response.status === 206;
                if (partial) {
                  var range = /^bytes\s+(\d+)-(\d+)\/(?:\d+|\*)$/i.exec(response.headers.get('Content-Range') || '');
                  if (!range || Number(range[1]) !== options.rangeStart || Number(range[2]) + 1 !== options.rangeEnd || size !== options.rangeEnd - options.rangeStart)
                    throw fault('Invalid package byte range', 'validation', 206);
                }
                var data = options.binary ? bytes.buffer : new root.TextDecoder('utf-8').decode(bytes);
                done = true; clearTimeout(timer); timer = null; reader = null;
                resolve({ data: data, body: options.binary ? undefined : data, url: response.url || address,
                  code: response.status, status: response.status, partial: partial, mimeType: response.headers.get('Content-Type') || '',
                  method: 'PackageFetch', referrerMode: 'browser-controlled', browserControlledHeaders: controlledHeaders.slice(), timings: { totalMs: Date.now() - started, bytes: size } });
              });
            }
            return read();
          }).catch(function (e) { fail(e); });
        }
        send(url, method, body);
      } catch (e) { fail(e); }
    });
    return { promise: promise, cancel: function () { var e = fault('Request cancelled', 'cancel'); e.cancelled = true; fail(e); } };
  }
  root.PackageFetchTransport = { supported: supported, request: request };
})(window);
