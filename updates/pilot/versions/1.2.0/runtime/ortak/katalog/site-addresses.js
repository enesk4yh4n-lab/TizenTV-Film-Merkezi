/* Remote address data only. Provider code and content identities stay inside the WGT. */
(function (root) {
  'use strict';
  var KEY = 'filmmerkezi.site-addresses.v1',
    REMOTE = 'https://raw.githubusercontent.com/enesk4yh4n-lab/TizenTV-Film-Merkezi/main/site-adresleri.json',
    MAX = 65536;
  function object(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function origin(value, httpsOnly) {
    if (typeof value !== 'string' || value.length > 300) return '';
    try {
      var u = new root.URL(value), h = u.hostname.toLowerCase();
      if ((httpsOnly ? u.protocol !== 'https:' : !/^https?:$/.test(u.protocol)) ||
        u.username || u.password || u.port || u.search || u.hash ||
        u.pathname !== '/' || !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z][a-z0-9-]+$/.test(h) ||
        /(?:^|\.)(?:localhost|local|internal|lan|home)$/.test(h)) return '';
      return u.origin;
    } catch (ignore) { return ''; }
  }
  function aliases(value) {
    if (!Array.isArray(value) || value.length > 16) throw new Error('Invalid site aliases');
    var out = [];
    value.forEach(function (v) {
      var url = origin(v, false);
      if (!url) throw new Error('Invalid site alias');
      if (out.indexOf(url) < 0) out.push(url);
    });
    return out;
  }
  function validate(value) {
    if (!object(value) || value.schemaVersion !== 1 ||
      typeof value.revision !== 'number' || value.revision < 1 ||
      value.revision % 1 || value.revision > 2147483647 || !object(value.sites))
      throw new Error('Invalid address document');
    var ids = Object.keys(value.sites), sites = Object.create(null), used = Object.create(null);
    if (!ids.length || ids.length > 512) throw new Error('Address list size limit');
    ids.sort().forEach(function (id) {
      if (!/^[a-z][a-z0-9-]{0,63}$/.test(id) || /^(?:all|constructor|prototype)$/.test(id))
        throw new Error('Invalid provider ID');
      var row = value.sites[id], base = row && origin(row.base, true);
      if (!object(row) || !base || Object.keys(row).some(function (k) { return k !== 'base' && k !== 'aliases'; }))
        throw new Error('Invalid site address');
      var old = aliases(row.aliases || []);
      [base].concat(old).forEach(function (url) {
        var host = new root.URL(url).hostname.replace(/^www\./, '');
        if (used[host] && used[host] !== id) throw new Error('Conflicting site addresses');
        used[host] = id;
      });
      sites[id] = { base: base, aliases: old };
    });
    return { schemaVersion: 1, revision: value.revision, sites: sites };
  }
  function parse(text) {
    if (typeof text !== 'string' || text.length * 2 > MAX) throw new Error('Address document size limit');
    return validate(JSON.parse(text));
  }
  function Book(options) {
    options = options || {};
    this.storage = options.storage || null;
    this.now = options.now || Date.now;
    this.request = options.request || null;
    this.endpoint = options.endpoint || REMOTE;
    this.records = Object.create(null);
    this.routes = Object.create(null);
    this.history = Object.create(null);
    this.current = null;
    this.saved = null;
    this.checkedAt = 0;
    this.blocked = false;
    this.pending = false;
    this.inflight = null;
    this.state = 'idle';
    try {
      var raw = this.storage && this.storage.getItem(KEY);
      if (raw) {
        if (raw.length * 2 > MAX * 2) throw new Error('Address cache size limit');
        var cache = JSON.parse(raw);
        if (!object(cache) || cache.version !== 1) throw new Error('Unknown address cache');
        this.current = this.saved = validate(cache.document);
        this.checkedAt = typeof cache.checkedAt === 'number' && cache.checkedAt <= this.now() ? cache.checkedAt : 0;
        if (object(cache.history)) {
          var self = this;
          Object.keys(cache.history).forEach(function (id) {
            if (self.current.sites[id]) self.history[id] = aliases(cache.history[id]);
          });
        }
      }
    } catch (ignore) {
      this.current = this.saved = null;
      this.checkedAt = 0;
      this.blocked = true;
    }
  }
  Book.prototype.base = function (id, fallback, old) {
    if (this.records[id]) return this.records[id].base;
    var original = origin(fallback, true);
    if (!/^[a-z][a-z0-9-]{0,63}$/.test(id) || !original) throw new Error('Invalid bundled site address');
    var row = this.current && this.current.sites[id], self = this,
      record = { base: row ? row.base : original, fallback: original, aliases: [] };
    this.records[id] = record;
    function add(value) {
      var url = origin(value, false);
      if (!url || record.aliases.indexOf(url) >= 0) return;
      record.aliases.push(url);
      self.routes[url] = Object.prototype.hasOwnProperty.call(self.routes, url) && self.routes[url] !== id ? false : id;
    }
    function family(value) {
      var u = new root.URL(value), host = u.hostname.replace(/^www\./, '');
      [host, 'www.' + host].forEach(function (h) { add('https://' + h); add('http://' + h); });
    }
    family(original); family(record.base);
    (old || []).concat(row ? row.aliases : [], this.history[id] || []).forEach(add);
    return record.base;
  };
  Book.prototype.resolve = function (value) {
    if (typeof value !== 'string' || value.length > 16384) return value;
    try {
      var u = new root.URL(value), id = this.routes[u.origin], row = id && this.records[id];
      if (row && !u.username && !u.password) return row.base + u.pathname + u.search + u.hash;
    } catch (ignore) {}
    return value;
  };
  Book.prototype.safe = function (id, value, fallback, page) {
    var base = this.base(id, fallback);
    try {
      var u = new root.URL(value, page || base + '/');
      if (!u.username && !u.password && this.records[id].aliases.indexOf(u.origin) >= 0)
        return base + u.pathname + u.search + u.hash;
    } catch (ignore) {}
    return '';
  };
  Book.prototype.status = function () {
    return { state: this.state, pending: this.pending, blocked: this.blocked,
      revision: this.saved ? this.saved.revision : 0, checkedAt: this.checkedAt };
  };
  Book.prototype.content = function (content) {
    if (!content || typeof content !== 'object') return content;
    var page = this.resolve(content.pageUrl), series = this.resolve(content.seriesPageUrl), out = {};
    if (page === content.pageUrl && series === content.seriesPageUrl) return content;
    Object.keys(content).forEach(function (key) { out[key] = content[key]; });
    if (page !== undefined) out.pageUrl = page;
    if (series !== undefined) out.seriesPageUrl = series;
    return out;
  };
  Book.prototype.refresh = function (force) {
    if (this.inflight) return this.inflight;
    var self = this, now = this.now();
    if (!force && this.checkedAt && now - this.checkedAt < 6 * 60 * 60 * 1000)
      return Promise.resolve(this.status());
    var client = null, deadline = now + 5000, timer;
    this.state = 'checking';
    var work = new Promise(function (resolve, reject) {
      var done = false;
      function finish(error, response) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        if (error) { try { if (client) client.cancel(); } catch (ignore) {} reject(error); }
        else resolve(response);
      }
      timer = setTimeout(function () { finish(new Error('Address update timeout')); }, 5000);
      try {
        var result;
        if (self.request) result = self.request(self.endpoint, deadline);
        else {
          client = root.ChainNetwork.createClient({ destination: 'downloads', preferXHR: true });
          result = client.get(self.endpoint, '', { Accept: 'application/json' }, { timeoutMs: 5000, deadline: deadline, siteAddresses: false });
        }
        Promise.resolve(result).then(function (v) { finish(null, v); }, function (e) { finish(e); });
      } catch (e) { finish(e); }
    }).then(function (response) {
      var document = parse(typeof response === 'string' ? response : response.body),
        previous = self.saved || self.current;
      if (previous && document.revision < previous.revision) throw new Error('Stale address revision');
      if (previous && document.revision === previous.revision &&
        JSON.stringify(document) !== JSON.stringify(previous)) throw new Error('Address revision must increase');
      var history = copy(self.history), changed = false;
      Object.keys(self.records).forEach(function (id) {
        var active = self.records[id], row = document.sites[id], base = row ? row.base : active.fallback,
          known = active.aliases.concat(history[id] || []);
        history[id] = [];
        known.forEach(function (url) { if (history[id].indexOf(url) < 0 && history[id].length < 16) history[id].push(url); });
        if (base !== active.base || (row && row.aliases.some(function (url) { return active.aliases.indexOf(url) < 0; }))) changed = true;
      });
      var text = JSON.stringify({ version: 1, document: document, history: history, checkedAt: self.now() });
      if (text.length * 2 > MAX * 2) throw new Error('Address cache size limit');
      if (self.blocked || !self.storage) throw new Error('Address storage unavailable');
      self.storage.setItem(KEY, text);
      self.saved = document;
      self.history = history;
      self.checkedAt = self.now();
      self.pending = changed;
      self.state = 'ready';
      return self.status();
    });
    this.inflight = work.then(function (value) { self.inflight = null; return value; }, function (error) {
      self.inflight = null; self.state = 'error'; throw error;
    });
    return this.inflight;
  };
  var storage = null;
  try { storage = root.localStorage; } catch (ignore) {}
  root.SiteAddresses = new Book({ storage: storage });
  root.SiteAddresses.create = function (options) { return new Book(options); };
  root.SiteAddresses.validate = validate;
  root.SiteAddresses.key = KEY;
})(window);
