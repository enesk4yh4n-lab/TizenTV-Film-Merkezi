/* Small shared user preferences; never part of the disposable catalog cache. */
(function (root) {
  'use strict';
  var KEY = 'filmmerkezi.catalog.preferences.v1';
  var GENRES = [
    '',
    'action',
    'family',
    'animation',
    'documentary',
    'science-fiction',
    'drama',
    'fantasy',
    'thriller',
    'mystery',
    'comedy',
    'horror',
    'adventure',
    'romance',
    'crime',
    'war',
    'western'
  ];
  function clean(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .replace(/^\s+|\s+$/g, '');
  }
  function key(value) {
    return clean(value).replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase();
  }
  function Preferences(storage, notify) {
    this.storage = storage;
    this.notify = notify || function () {};
    this.blocked = false;
    this.data = {
      version: 1,
      recent: [],
      recommendation: { genre: '', minImdb: 0 },
      language: 'tr',
      mergeCatalog: false,
      appearance: appearance(),
      disabledSites: []
    };
    try {
      var raw = storage && storage.getItem(KEY),
        d;
      this.existingInstall = !!(raw || (storage && (
        storage.getItem('filmmerkezi.usage-consent.v1') ||
        storage.getItem('filmmerkezi.unified.v1') ||
        storage.getItem('chainprobe.player.v1')
      )));
      this.data.mergeCatalog = this.existingInstall;
      d = raw && JSON.parse(raw);
      if (raw && (raw.length > 16384 || !d || d.version !== 1 || !Array.isArray(d.recent)))
        throw Error('Unknown preferences');
      if (d) {
        this.data.appearance = appearance(d.appearance);
        if (Array.isArray(d.disabledSites)) this.data.disabledSites = d.disabledSites.filter(function (id, i, all) { return typeof id === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(id) && all.indexOf(id) === i; }).slice(0, 64);
        this.data.language = d.language === 'en' ? 'en' : 'tr';
        if (typeof d.mergeCatalog === 'boolean') this.data.mergeCatalog = d.mergeCatalog;
        var used = Object.create(null),
          self = this;
        d.recent.forEach(function (row) {
          var value = typeof row === 'string' && clean(row);
          if (value && value.length <= 100 && !used[key(value)] && self.data.recent.length < 10) {
            used[key(value)] = true;
            self.data.recent.push(value);
          }
        });
        var r = d.recommendation || {};
        this.data.recommendation = {
          genre: GENRES.indexOf(r.genre) >= 0 ? r.genre : '',
          minImdb: [0, 5, 6, 7, 8, 9].indexOf(r.minImdb) >= 0 ? r.minImdb : 0
        };
      }
    } catch (error) {
      this.blocked = true;
      if (storage && storage.protect) storage.protect(KEY);
      this.notify('Arama tercihleri okunamadı; önceki kayıt korunuyor. Bu oturum kullanılabilir.');
    }
  }
  Preferences.prototype.flush = function () {
    if (this.blocked) return;
    try {
      if (this.storage) this.storage.setItem(KEY, JSON.stringify(this.data));
      this.failed = false;
    } catch (error) {
      if (!this.failed) this.notify('Arama tercihleri kaydedilemedi; bu oturumda korunuyor.');
      this.failed = true;
    }
  };
  Preferences.prototype.list = function () {
    return this.data.recent.slice();
  };
  function appearance(value) {
    value = value || {};
    var result = { startScreen: ['home', 'movies', 'series', 'discover', 'watchlist', 'history'].indexOf(value.startScreen) >= 0 ? value.startScreen : 'home', largeText: value.largeText === true, exitConfirmation: value.exitConfirmation !== false, rows: {} };
    ['continue', 'following', 'movies', 'series', 'collections'].forEach(function (key) { result.rows[key] = !(value.rows && value.rows[key] === false); });
    return result;
  }
  Preferences.prototype.appearance = function (value) {
    if (value) { this.data.appearance = appearance(value); this.flush(); }
    return appearance(this.data.appearance);
  };
  Preferences.prototype.siteEnabled = function (id, enabled) {
    if (!/^[a-z][a-z0-9-]{0,63}$/.test(id)) return false;
    if (typeof enabled === 'boolean') {
      if (this.blocked || !this.storage) { this.notify('Site tercihi kaydedilemedi; mevcut seçim korundu.'); return this.data.disabledSites.indexOf(id) < 0; }
      var previous = this.data.disabledSites.slice();
      this.data.disabledSites = this.data.disabledSites.filter(function (value) { return value !== id; });
      if (!enabled && this.data.disabledSites.length < 64) this.data.disabledSites.push(id);
      this.flush();
      if (this.failed) this.data.disabledSites = previous;
    }
    return this.data.disabledSites.indexOf(id) < 0;
  };
  Preferences.prototype.language = function (value) {
    if (value === 'tr' || value === 'en') {
      this.data.language = value;
      this.flush();
    }
    return this.data.language;
  };
  Preferences.prototype.merging = function (value) {
    if (typeof value === 'boolean') {
      this.data.mergeCatalog = value;
      this.flush();
    }
    return this.data.mergeCatalog;
  };
  Preferences.prototype.remember = function (query) {
    if (typeof query !== 'string') return;
    query = clean(query);
    if (!query || query.length > 100) return;
    this.data.recent = [query]
      .concat(
        this.data.recent.filter(function (v) {
          return key(v) !== key(query);
        })
      )
      .slice(0, 10);
    this.flush();
  };
  Preferences.prototype.remove = function (query) {
    this.data.recent = this.data.recent.filter(function (v) {
      return key(v) !== key(query);
    });
    this.flush();
  };
  Preferences.prototype.clear = function () {
    this.data.recent = [];
    this.flush();
  };
  Preferences.prototype.criteria = function (value) {
    if (value) {
      this.data.recommendation = {
        genre: GENRES.indexOf(value.genre) >= 0 ? value.genre : '',
        minImdb: [0, 5, 6, 7, 8, 9].indexOf(Number(value.minImdb)) >= 0 ? Number(value.minImdb) : 0
      };
      this.flush();
    }
    return { genre: this.data.recommendation.genre, minImdb: this.data.recommendation.minImdb };
  };
  root.CatalogPreferences = Preferences;
})(window);
