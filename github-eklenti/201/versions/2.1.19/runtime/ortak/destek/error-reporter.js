/* Explicit, bounded reports. No background logging, telemetry or persistent queue. */
(function (root) {
  'use strict';
  var SCOPES = /^(site|catalog|detail|resolve|refresh|playback|update)$/;
  function clean(value, limit) {
    if (/(?:authorization|cookie|password|token|secret|api[_-]?key)\s*["']?\s*[:=]/i.test(String(value || ''))) return '[sensitive detail omitted]';
    return String(value === undefined || value === null ? '' : value)
      .replace(/https?:\/\/[^\s<>"']+/gi, '[address]')
      .replace(/(?:authorization|cookie|password|token|secret|api[_-]?key)\s*[:=]\s*[^\s;,]+/gi, '[redacted]')
      .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[email]')
      .replace(/(?:[A-Z]:[\\/]|\/home\/|\/Users\/)[^\r\n;,]+/gi, '[path]')
      .replace(/[A-Za-z0-9_+\/-]{40,}(?:\.[A-Za-z0-9_+\/-]+)*/g, '[redacted]')
      .replace(/[\x00-\x1f\x7f]/g, ' ').slice(0, limit || 300);
  }
  function page(value) {
    try {
      var u = new root.URL(value);
      if (u.protocol !== 'https:' || u.username || u.password || u.port && u.port !== '443' || /\.(?:m3u8|mp4|ts|m4s|mpd|key)(?:$|\/)|\/(?:hls|api|stream|assets)\//i.test(u.pathname) || /[A-Za-z0-9_-]{48,}/.test(u.pathname)) return '';
      return (u.origin + u.pathname).slice(0, 1500);
    } catch (ignore) { return ''; }
  }
  function uuid() {
    var a = new Uint8Array(16); root.crypto.getRandomValues(a); a[6] = a[6] & 15 | 64; a[8] = a[8] & 63 | 128;
    var s = Array.prototype.map.call(a, function (n) { return ('0' + n.toString(16)).slice(-2); }).join('');
    return s.slice(0,8) + '-' + s.slice(8,12) + '-' + s.slice(12,16) + '-' + s.slice(16,20) + '-' + s.slice(20);
  }
  function plugin(siteId, explicit) {
    var manager = root.FilmPlugins, result = { code: /^P\d{3}$/.test(explicit || '') ? explicit : /^p\d{3}$/i.test(siteId || '') ? siteId.toUpperCase() : '', version: '' };
    if (manager) Object.keys(manager.state.plugins).some(function (key) { var p = manager.state.plugins[key]; if (p.siteId !== siteId && key !== siteId && p.id !== siteId) return false; result.code = /^p\d{3}$/i.test(p.id) ? p.id.toUpperCase() : result.code; result.version = p.active && p.active.version || p.pending && p.pending.version || ''; return true; });
    return result;
  }
  function Reporter(options) {
    options = options || {}; this.config = options.config || { enabled: false, endpoint: '' }; this.client = options.client || null; this.entries = []; this.active = null; this.now = options.now || Date.now; this.id = options.id || uuid;
  }
  Reporter.prototype.configure = function (config) {
    if (!config || config.schemaVersion !== 1 || typeof config.enabled !== 'boolean') throw new Error('Invalid reporting configuration');
    if (config.enabled) { var u = new root.URL(config.endpoint); if (u.protocol !== 'https:' || u.username || u.password || u.hash || u.search || u.port && u.port !== '443' || u.pathname !== '/v1/reports') throw new Error('Invalid report endpoint'); }
    this.config = { enabled: config.enabled, endpoint: config.enabled ? config.endpoint : '' };
  };
  Reporter.prototype.capture = function (context) {
    context = context || {};
    var e = context.error || {}, content = context.content || {}, source = context.source || {}, p = plugin(context.siteId || source.providerId || content.providerId || '', context.providerCode), core = root.FilmUpdate, platform = '';
    if (!SCOPES.test(context.scope) || e.cancelled || context.cancelled || /iptal|cancelled|canceled/i.test(e.message || '')) return null;
    try { platform = root.tizen && root.tizen.systeminfo.getCapability('http://tizen.org/feature/platform.version') || ''; } catch (ignore) {}
    var data = { schemaVersion: 1, appVersion: clean(core && core.config.appVersion || root.AppInfo && root.AppInfo.version, 24), componentVersion: clean(core && core.selected && core.selected.version, 24), pluginVersion: clean(context.pluginVersion || p.version, 24), tizenVersion: clean(platform, 24), providerCode: p.code, scope: context.scope, stage: clean(context.stage || e.stage || context.scope, 48), code: clean(context.code || e.code || e.type || 'UNKNOWN', 64), resolver: clean(context.resolver || source.family || source.label || context.label, 80), engine: clean(context.engine, 32), pageUrl: page(context.pageUrl || source.providerPageUrl || content.pageUrl), message: clean(typeof e === 'string' ? e : e.message || context.message, 400) };
    var key = JSON.stringify(data), existing = this.entries.filter(function (r) { return r.key === key; })[0];
    if (existing) return existing;
    data.reportId = this.id(); data.occurredAt = new Date(typeof context.occurredAt === 'number' ? context.occurredAt : this.now()).toISOString();
    if (Object.freeze) Object.freeze(data);
    var report = { key: key, data: data, status: 'idle', promise: null, receipt: '' };
    this.entries.push(report);
    if (this.entries.length > 30) { var i = this.entries[0] === this.active ? 1 : 0; this.entries.splice(i, 1); }
    return report;
  };
  Reporter.prototype.label = function (report) {
    var en = root.FilmI18n && root.FilmI18n.language() === 'en';
    if (report && report.status === 'sending') return en ? 'Sending…' : 'Gönderiliyor…';
    if (report && report.status === 'sent') return en ? 'Reported ✓' : 'Bildirildi ✓';
    if (report && report.status === 'failed') return en ? 'Not sent · Retry' : 'Gönderilemedi · Tekrar dene';
    return en ? 'Report error' : 'Hata bildir';
  };
  Reporter.prototype.player = function (controller, scope, error, source, stage) {
    if (!source && (scope === 'resolve' || scope === 'refresh') && controller.content) source = (controller.content.sourceOptions || []).filter(function (o) { return ['error','blocked','timeout'].indexOf(o.status) >= 0 || o.refreshStatus === 'error' || o.refreshStatus === 'timeout'; })[0];
    return this.capture({ scope: scope, content: controller.content, source: source || controller.activeSource || (controller.content && controller.content.sources[controller.currentSource]), error: error, stage: stage, engine: scope === 'playback' && controller.engineId ? controller.engineId() : '' });
  };
  Reporter.prototype.catalog = function (catalog, screen, error) {
    var card = screen.card || {};
    return this.capture({ scope: screen.kind === 'detail' ? 'detail' : 'catalog', siteId: card.providerId || catalog.siteId, pageUrl: card.pageUrl, stage: screen.kind, error: error });
  };
  Reporter.prototype.send = function (report, notify) {
    var self = this;
    if (!report) return Promise.resolve(false);
    if (report.status === 'sent') { if (notify) notify(report); return Promise.resolve(true); }
    if (report.promise) return report.promise;
    if (this.active && this.active !== report) { report.status = 'failed'; report.failure = 'busy'; if (notify) notify(report); return Promise.resolve(false); }
    function refresh() { if (notify) try { notify(report); } catch (ignore) {} }
    if (!this.config.enabled) { report.status = 'failed'; report.failure = 'not-configured'; refresh(); return Promise.resolve(false); }
    report.status = 'sending'; this.active = report; refresh();
    var ended = false, timer, finish, task = new Promise(function (resolve) { finish = function (ok) { if (ended) return; ended = true; clearTimeout(timer); report.status = ok ? 'sent' : 'failed'; report.promise = null; self.active = null; refresh(); resolve(ok); }; });
    report.promise = task;
    try {
      if (!this.client) this.client = root.ChainNetwork.createClient({ preferXHR: true });
      timer = setTimeout(function () { if (ended) return; try { self.client.cancel(); } catch (ignore) {} finish(false); }, 10000);
      this.client.post(this.config.endpoint, JSON.stringify(report.data), { 'Content-Type': 'application/json' }, { siteAddresses: false, timeoutMs: 10000, deadline: this.now() + 10000 }).then(function (response) {
        if (ended) return;
        var result; try { result = JSON.parse(response.body); } catch (ignore) {}
        if (!result || result.schemaVersion !== 1 || result.status !== 'reported' || !/^FM-\d+$/.test(result.receipt || '')) { finish(false); return; }
        report.receipt = result.receipt; finish(true);
      }, function () { finish(false); });
    } catch (ignore) { finish(false); }
    return task;
  };
  Reporter.prototype.button = function (report, key) {
    var self = this, b = document.createElement('button'); b.type = 'button'; b.className = 'quiet-button filter-field'; b.setAttribute('data-focus', key); b.setAttribute('data-report-id', report.data.reportId);
    function draw() { b.textContent = self.label(report); b.setAttribute('aria-busy', report.status === 'sending' ? 'true' : 'false'); b.setAttribute('aria-disabled', report.status === 'sent' ? 'true' : 'false'); }
    b.onclick = function () { self.send(report, draw); }; draw(); return b;
  };
  root.ErrorReporter = Reporter; root.FilmErrorReporter = new Reporter();
  if (root.FilmUpdate) root.FilmErrorReporter.ready = root.FilmUpdate.source('ortak/destek/config.json').then(function (text) { root.FilmErrorReporter.configure(JSON.parse(text)); }, function () {}).catch(function () {});
})(window);
