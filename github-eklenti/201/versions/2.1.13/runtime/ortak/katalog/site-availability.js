/* Session-local catalog circuit breaker. Resolver and media clients are not gated. ES5. */
(function (root) {
  'use strict';
  var DEFAULT_PAUSE_MS = 1800000;
  function Service(options) {
    options = options || {};
    this.now = options.now || function () { return Date.now(); };
    this.cooldownMs = options.cooldownMs || DEFAULT_PAUSE_MS;
    this.rows = {};
  }
  Service.prototype.row = function (id) {
    return this.rows[id] || (this.rows[id] = { failures: 0, until: 0, probe: false, generation: 0, reason: '' });
  };
  Service.prototype.status = function (id) {
    var row = this.rows[id], left = row ? Math.max(0, row.until - this.now()) : 0;
    return { failures: row ? row.failures : 0, until: row ? row.until : 0,
      remainingMs: left, paused: left > 0 || !!(row && row.probe), probing: !!(row && row.probe), reason: row && row.reason || '' };
  };
  Service.prototype.message = function (id) {
    var state = this.status(id), en = root.FilmI18n && root.FilmI18n.language() === 'en';
    return state.remainingMs ? (en ? 'Site temporarily paused; retry in ' : 'Site geçici olarak bekletiliyor; kalan süre: ') +
      Math.ceil(state.remainingMs / 60000) + (en ? ' min.' : ' dk.') :
      state.probing ? (en ? 'Site recovery check is in progress.' : 'Siteye yeniden erişim kontrol ediliyor.') :
      (en ? 'The site is ready to retry.' : 'Site yeniden denemeye hazır.');
  };
  Service.prototype.error = function (id) {
    var e = new Error(this.message(id));
    e.sitePaused = true; e.siteId = id; e.cooldownUntil = this.row(id).until;
    e.stage = 'availability'; e.code = 'site-paused';
    return e;
  };
  Service.prototype.acquire = function (id) {
    var row = this.row(id);
    if (row.until > this.now() || row.probe) throw this.error(id);
    var probe = row.until > 0;
    if (probe) row.probe = true;
    return { id: id, generation: row.generation, probe: probe };
  };
  Service.prototype.success = function (ticket) {
    var row = this.row(ticket.id);
    if (ticket.generation !== row.generation) return;
    row.failures = 0; row.until = 0; row.probe = false; row.reason = ''; row.generation++;
  };
  Service.prototype.isAccessError = function (error, ticket) {
    if (!error || error.cancelled || error.sitePaused || error.byteLimitExceeded ||
        root.navigator && root.navigator.onLine === false) return false;
    var stage = error.stage || '', message = String(error.message || ''),
      status = Number(error.status || error.statusCode || (stage === 'http' && error.code)) ||
        Number((/\bHTTP\s+(\d{3})\b/i.exec(message) || [])[1]);
    if (/^(?:cancel|validation|policy|unavailable|size|range|protocol|redirect|availability)$/.test(stage) ||
        /cancel|iptal|bütçe|budget|Ortak arama süresi/i.test(message)) return false;
    if (status) return [401, 403, 408, 429, 451].indexOf(status) >= 0 || status >= 500 && status <= 599;
    if (stage === 'timeout' && ticket && ticket.timeoutMs < 3000) return false;
    return /^(?:access|timeout|dns|connect|tls|network|read|write)$/.test(stage) ||
      /ENOTFOUND|EAI_AGAIN|ECONN|ETIMEDOUT|NetworkError|Failed to fetch|XHR ag\/CORS\/TLS|erişim engeli|erisim engeli|Access denied/i.test(message);
  };
  Service.prototype.failure = function (ticket, error) {
    var row = this.row(ticket.id);
    if (ticket.generation !== row.generation) return;
    row.probe = false;
    if (!this.isAccessError(error, ticket)) {
      if (error && error.stage === 'http') this.success(ticket);
      return;
    }
    row.failures++;
    row.reason = String(error.message || '').slice(0, 180);
    if (ticket.probe || row.failures >= 2) {
      row.until = this.now() + this.cooldownMs; row.generation++;
      error.cooldownUntil = row.until; error.siteId = ticket.id;
    }
  };
  Service.prototype.retry = function (id) {
    var row = this.row(id);
    if (row.probe) return false;
    row.until = this.now() || 1; row.generation++;
    return true;
  };
  root.SiteAvailability = Service;
  root.CatalogSiteAvailability = new Service();
})(window);
