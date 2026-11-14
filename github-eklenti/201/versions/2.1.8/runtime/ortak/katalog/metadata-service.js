/* Optional TMDB metadata. No playback requests or provider globals are changed. ES5. */
(function (root) {
  'use strict';
  var KEY = 'filmmerkezi.metadata.cache.v1';
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function failure(code) { var e = new Error(code); e.metadata = true; e.code = code; return e; }
  function Service(options) {
    options = options || {};
    this.key = options.apiKey || '';
    this.storage = options.storage;
    this.client = options.client;
    this.clock = options.clock || Date.now;
    this.enabled = options.enabled !== false;
    this.generation = 0; this.pending = {}; this.cooldown = 0;
    this.tail = Promise.resolve(); this.cache = { version: 1, items: {} };
    this.blocked = false;
    var self = this, raw;
    try {
      raw = this.storage && this.storage.getItem(KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (!parsed || parsed.version !== 1 || !parsed.items || Array.isArray(parsed.items) || raw.length * 2 > 262144) throw failure('metadata-cache');
        Object.keys(parsed.items).forEach(function (k) {
          var r = parsed.items[k];
          if (r && typeof r.at === 'number' && typeof r.until === 'number' && Array.isArray(r.value)) self.cache.items[k] = r;
        });
      }
    } catch (ignore) { this.blocked = true; if (this.storage && this.storage.protect) this.storage.protect(KEY); }
    if (this.storage && this.storage.registerCache) this.storage.registerCache(KEY, {
      candidates: function () { return Object.keys(self.cache.items).map(function (k) { return { id: k, at: self.cache.items[k].at, bytes: JSON.stringify(self.cache.items[k]).length * 2 + k.length * 2 }; }); },
      evict: function (k) { delete self.cache.items[k]; },
      serialize: function () { return JSON.stringify(self.cache); }
    });
  }
  Service.prototype.cancel = function () {
    this.generation++; this.pending = {};
    if (this.client && this.client.cancel) this.client.cancel();
  };
  Service.prototype.setEnabled = function (enabled) { this.enabled = enabled !== false; if (!this.enabled) this.cancel(); };
  Service.prototype.get = function (key) {
    var r = this.cache.items[key];
    return r && r.until > this.clock() ? copy(r.value) : null;
  };
  Service.prototype.put = function (key, value, ttl) {
    var self = this, now = this.clock();
    this.cache.items[key] = { at: now, until: now + (value.length ? ttl : 300000), value: copy(value) };
    var ids = Object.keys(this.cache.items).sort(function (a, b) { return self.cache.items[a].at - self.cache.items[b].at; });
    ['search', 'work'].forEach(function (kind) {
      var rows = ids.filter(function (k) { return k.indexOf(kind + '|') === 0; });
      while (rows.length > (kind === 'search' ? 50 : 200)) delete self.cache.items[rows.shift()];
    });
    function distinct() {
      var seen = {}, count = 0;
      Object.keys(self.cache.items).forEach(function (k) { self.cache.items[k].value.forEach(function (r) {
        var id = (r.type || '') + '|' + r.id;
        if (!seen[id]) { seen[id] = true; count++; }
      }); });
      return count;
    }
    while (distinct() > 200 && ids.length) delete this.cache.items[ids.shift()];
    var text = JSON.stringify(this.cache);
    while (text.length * 2 > 262144 && ids.length) { delete this.cache.items[ids.shift()]; text = JSON.stringify(this.cache); }
    if (!this.blocked && this.storage) try { this.storage.setItem(KEY, text); } catch (ignore) {}
  };
  function work(row, kind) {
    if (!row || typeof row !== 'object') return null;
    kind = row.media_type || kind;
    if (!row || row.adult || ['movie', 'tv'].indexOf(kind) < 0 || !(Number(row.id) > 0) || Number(row.id) % 1) return null;
    var label = row.title || row.name;
    if (typeof label !== 'string' || !label.replace(/\s/g, '')) return null;
    var date = kind === 'movie' ? row.release_date : row.first_air_date;
    return { id: Number(row.id), type: kind === 'tv' ? 'series' : 'movie', title: String(row.title || row.name || '').slice(0, 300), originalTitle: String(row.original_title || row.original_name || '').slice(0, 300), year: /^\d{4}-/.test(date || '') ? Number(date.slice(0, 4)) : null,
      imdbId: root.ContentIdentity.imdb(row.imdb_id || row.external_ids && row.external_ids.imdb_id), aliases: (row.alternative_titles && (row.alternative_titles.titles || row.alternative_titles.results) || []).filter(function (v) { return ['TR', 'US', 'GB'].indexOf(v.iso_3166_1) >= 0; }).slice(0, 8).map(function (v) { return String(v.title || '').slice(0, 100); }) };
  }
  Service.prototype.request = function (path, params, cacheKey, ttl, context, parse) {
    var self = this, hit = this.get(cacheKey), token = this.generation;
    if (hit) return Promise.resolve(hit);
    if (!this.enabled) return Promise.reject(failure('metadata-disabled'));
    if (!this.key) return Promise.reject(failure('metadata-key-missing'));
    if (this.clock() < this.cooldown) return Promise.reject(failure('metadata-cooldown'));
    if (this.pending[cacheKey]) return this.pending[cacheKey];
    context = context || {};
    function run() {
      if (token !== self.generation || !self.enabled) throw failure('metadata-cancelled');
      var remaining = (context.deadline || self.clock() + 5000) - self.clock();
      if (remaining <= 0) throw failure('metadata-budget');
      var query = ['api_key=' + encodeURIComponent(self.key), 'language=tr-TR'];
      Object.keys(params || {}).forEach(function (k) { query.push(k + '=' + encodeURIComponent(params[k])); });
      function send() {
        if (token !== self.generation || !self.enabled) throw failure('metadata-cancelled');
        remaining = (context.deadline || self.clock() + 5000) - self.clock();
        if (remaining <= 0 || context.take && !context.take()) throw failure('metadata-budget');
        return self.client.get('https://api.themoviedb.org/3/' + path + '?' + query.join('&'), '', false, { timeoutMs: Math.min(5000, remaining), deadline: context.deadline, byteLimit: 1048576 }); }
      return Promise.resolve(context.schedule ? context.schedule(send) : send()).then(function (response) {
        if (token !== self.generation || !self.enabled) throw failure('metadata-cancelled');
        if (response.status === 429) {
          var retry = response.headers && (response.headers['retry-after'] || response.headers['Retry-After']);
          self.cooldown = self.clock() + (Number(retry) > 0 ? Number(retry) * 1000 : Math.max(60000, Date.parse(retry) - self.clock() || 0));
          throw failure('metadata-rate-limit');
        }
        if (response.status && response.status !== 200) throw failure('metadata-http-' + response.status);
        var body = typeof response.body === 'string' ? JSON.parse(response.body) : response.body;
        if (!body || body.success === false) throw failure('metadata-response');
        var values = parse(body);
        self.put(cacheKey, values, ttl); return values;
      });
    }
    var task = this.tail.then(run, run).catch(function (error) {
      if (Number(error.code) === 429 || Number(error.status) === 429) self.cooldown = self.clock() + 60000;
      throw error;
    });
    this.tail = task.then(function () {}, function () {});
    this.pending[cacheKey] = task;
    function release() { if (self.pending[cacheKey] === task) delete self.pending[cacheKey]; }
    task.then(release, release); return task;
  };
  Service.prototype.search = function (text, type, context) {
    text = String(text || '').replace(/\s+/g, ' ').replace(/^ | $/g, '').slice(0, 100);
    if (!text) return Promise.resolve([]);
    var kind = type === 'series' ? 'tv' : type === 'movie' ? 'movie' : 'multi';
    return this.request('search/' + kind, { query: text, include_adult: false }, 'search|' + kind + '|' + text.toLowerCase(), 900000, context, function (body) {
      if (!Array.isArray(body.results)) throw failure('metadata-response');
      return body.results.map(function (r) { return work(r, kind); }).filter(Boolean).slice(0, 20);
    });
  };
  Service.prototype.find = function (id, context) {
    id = root.ContentIdentity.imdb(id);
    if (!id) return Promise.resolve([]);
    return this.request('find/' + id, { external_source: 'imdb_id' }, 'work|imdb|' + id, 86400000, context, function (body) {
      if (!Array.isArray(body.movie_results) || !Array.isArray(body.tv_results)) throw failure('metadata-response');
      return body.movie_results.map(function (r) { return work(r, 'movie'); }).concat(body.tv_results.map(function (r) { return work(r, 'tv'); })).filter(Boolean).map(function (r) { r.imdbId = id; return r; });
    });
  };
  Service.prototype.detail = function (reference, context) {
    var kind = reference.type === 'series' ? 'tv' : 'movie', id = Number(reference.id);
    if (!(id > 0) || id % 1) return Promise.reject(failure('metadata-id'));
    return this.request(kind + '/' + id, { append_to_response: 'alternative_titles,external_ids' }, 'work|' + kind + '|' + id, 86400000, context, function (body) {
      var result = work(body, kind);
      if (!result || result.id !== id) throw failure('metadata-response');
      return [result];
    });
  };
  root.MetadataService = Service;
})(window);
