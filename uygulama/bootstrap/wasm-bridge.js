/* One modern-TV HTTPS worker. Legacy NaCl remains unchanged. ES5. */
(function (root) {
  'use strict';
  function supported() {
    return /\bTizen (?:7|8|9|10)(?:\.|\b)/i.test(root.navigator && root.navigator.userAgent || '') &&
      !!(root.Worker && root.WebAssembly && root.TextDecoder) &&
      !(root.navigator.mimeTypes && root.navigator.mimeTypes['application/x-nacl']);
  }
  function create() {
    var listeners = {}, worker = null, generation = 0, queue = [], current = null,
      journal = {}, ready = false, announced = false, replay = [], replaying = false, originLimit = 128,
      timer = null, idle = null, destroyed = false, internalId = 2147483647;
    function clone(value) { return JSON.parse(JSON.stringify(value)); }
    function emit(type, value) {
      (listeners[type] || []).slice().forEach(function (fn) { fn(type === 'message' ? { data: value } : value); });
    }
    function stop() { generation++; clearTimeout(timer); clearTimeout(idle); timer = idle = null; if (worker) worker.terminate(); worker = null; ready = false; }
    function broken() { if (destroyed) return; stop(); queue = []; current = null; emit('error', { message: 'WASM HTTPS worker unavailable' }); }
    function remember(m) {
      var key;
      if (m.kind === 'configure') key = 'core';
      if (m.kind === 'repository') key = 'repo/' + m.repositoryId;
      if (m.kind === 'repository-policy') key = 'policy/' + m.repositoryId + '/' + m.pluginId;
      if (m.kind === 'repository-remove') {
        Object.keys(journal).forEach(function (k) { if (k === 'repo/' + m.repositoryId || k.indexOf('policy/' + m.repositoryId + '/') === 0) delete journal[k]; });
      }
      if (key) journal[key] = clone(m);
    }
    function nextReplay() {
      if (!worker || !ready) return;
      if (replay.length) { var m = clone(replay.shift()); m.id = internalId; worker.postMessage(m); return; }
      replaying = false; clearTimeout(timer); timer = null;
      if (!announced) { announced = true; emit('message', { kind: 'ready', protocol: 1, policy: 1, tls: true, binary: true, repositoryTrust: 1, originPatterns: 1, maxOrigins: originLimit, tlsEngine: 'MbedTLS 3.6.7 / WebAssembly', engine: 'wasm' }); }
      pump();
    }
    function start() {
      if (destroyed || worker) return;
      var token = ++generation;
      ready = false; replaying = true; replay = Object.keys(journal).sort(function (a, b) {
        function rank(key) { return key === 'core' ? 0 : key.indexOf('repo/') === 0 ? 1 : 2; }
        return rank(a) - rank(b) || (a < b ? -1 : a > b ? 1 : 0);
      }).map(function (key) { return journal[key]; });
      try { worker = new root.Worker('bootstrap/wasm-http-worker.js'); } catch (ignore) { broken(); return; }
      timer = setTimeout(broken, 8000);
      worker.onmessage = function (event) {
        if (destroyed || token !== generation) return;
        var m = event.data, previous;
        if (!m || typeof m !== 'object') return;
        if (m.kind === 'fatal') { broken(); return; }
        if (m.kind === 'ready') { originLimit = typeof m.maxOrigins === 'number' && m.maxOrigins >= 128 && m.maxOrigins <= 2048 && m.maxOrigins % 1 === 0 ? m.maxOrigins : 128; ready = true; nextReplay(); return; }
        if (replaying) { if (m.kind === 'result' && m.id === internalId) { if (m.code !== 0) broken(); else nextReplay(); } return; }
        if (!current || m.id !== current.id) return;
        if (m.kind === 'progress') { emit('message', m); return; }
        if (m.kind !== 'result') return;
        previous = current; current = null;
        if (m.code === 0 && previous.kind !== 'request') remember(previous);
        emit('message', m); pump();
      };
      worker.onerror = function () { if (token === generation) broken(); };
    }
    function pump() {
      clearTimeout(idle); idle = null;
      if (destroyed || current) return;
      if (!queue.length) { if (worker && !replaying) idle = setTimeout(stop, 15000); return; }
      if (!worker) start();
      if (!ready || replaying || !worker) return;
      current = queue.shift();
      try { worker.postMessage(current); } catch (ignore) { broken(); }
    }
    return {
      parentNode: null,
      addEventListener: function (type, fn) { if (!listeners[type]) listeners[type] = []; if (listeners[type].indexOf(fn) < 0) listeners[type].push(fn); },
      removeEventListener: function (type, fn) { var list = listeners[type] || [], at = list.indexOf(fn); if (at >= 0) list.splice(at, 1); },
      start: start,
      postMessage: function (m) {
        if (destroyed || !m || typeof m.id !== 'number') return;
        if (m.kind === 'cancel') {
          queue = queue.filter(function (q) { return q.id !== m.id; });
          if (current && current.id === m.id) { current = null; stop(); }
          if (queue.length) pump(); return;
        }
        if (queue.length >= 32) { emit('message', { kind: 'result', id: m.id, stage: 'unavailable', code: -1 }); return; }
        queue.push(clone(m)); pump();
      },
      destroy: function () { destroyed = true; stop(); current = null; queue = []; journal = {}; listeners = {}; }
    };
  }
  root.FilmWasmTLS = { supported: supported, create: create };
})(window);
