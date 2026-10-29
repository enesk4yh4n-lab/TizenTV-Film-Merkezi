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
      language: 'tr'
    };
    try {
      var raw = storage && storage.getItem(KEY),
        d = raw && JSON.parse(raw);
      if (raw && (raw.length > 16384 || !d || d.version !== 1 || !Array.isArray(d.recent)))
        throw Error('Unknown preferences');
      if (d) {
        this.data.language = d.language === 'en' ? 'en' : 'tr';
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
    } catch (error) {
      if (!this.failed) this.notify('Arama tercihleri kaydedilemedi; bu oturumda korunuyor.');
      this.failed = true;
    }
  };
  Preferences.prototype.list = function () {
    return this.data.recent.slice();
  };
  Preferences.prototype.language = function (value) {
    if (value === 'tr' || value === 'en') {
      this.data.language = value;
      this.flush();
    }
    return this.data.language;
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
