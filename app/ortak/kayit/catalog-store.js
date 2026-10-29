(function (root) {
  'use strict';
  var copy = root.PlayerCore.copy,
    LIBRARY = 'chainprobe.catalog.library.v1',
    RECORDS = 'chainprobe.catalog.records.v1',
    CACHE = 'chainprobe.catalog.cache.v1';
  function read(storage, key, fallback) {
    if (root.SafeStorage) return root.SafeStorage.read(storage, key, fallback);
    try {
      var value = storage && JSON.parse(storage.getItem(key));
      return value && value.version === 1 ? value : fallback;
    } catch (ignore) {
      return fallback;
    }
  }
  function own(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }
  function minimal(card) {
    card = card && typeof card === 'object' ? card : {};
    var value = {};
    [
      'contentId',
      'type',
      'pageUrl',
      'title',
      'originalTitle',
      'titleAliases',
      'releaseDate',
      'poster',
      'year',
      'imdb',
      'imdbId',
      'language',
      'languageReference',
      'episode',
      'seriesTitle',
      'seriesPageUrl',
      'nextId'
    ].forEach(function (k) {
      if (card[k] !== undefined) value[k] = copy(card[k]);
    });
    value.title = String(value.title || 'İsimsiz içerik').slice(0, 500);
    return value;
  }
  function Store(storage, notify) {
    this.storage = storage;
    this.notify = notify || function () {};
    this.failed = false;
    this.library = read(storage, LIBRARY, {
      version: 1,
      favorites: [],
      seasons: {}
    });
    if (!Array.isArray(this.library.favorites)) this.library.favorites = [];
    this.library.favorites = this.library.favorites
      .filter(function (x) {
        return x && typeof x.contentId === 'string' && typeof x.pageUrl === 'string';
      })
      .slice(0, 200);
    this.library.seasons =
      this.library.seasons &&
      typeof this.library.seasons === 'object' &&
      !Array.isArray(this.library.seasons)
        ? this.library.seasons
        : {};
    this.records = read(storage, RECORDS, { version: 1, items: {} });
    this.records.items =
      this.records.items &&
      typeof this.records.items === 'object' &&
      !Array.isArray(this.records.items)
        ? this.records.items
        : {};
    var items = this.records.items;
    Object.keys(items).forEach(function (key) {
      var item = items[key];
      if (
        !item ||
        !item.card ||
        typeof item.card.contentId !== 'string' ||
        typeof item.card.pageUrl !== 'string'
      )
        delete items[key];
    });
    var self = this;
    if (storage && storage.registerCache)
      storage.registerCache(RECORDS, {
        candidates: function () {
          var protectedIds = Object.create(null);
          self.library.favorites.forEach(function (c) {
            protectedIds[c.contentId] = true;
          });
          if (self.playback)
            self.playback.list().forEach(function (e) {
              protectedIds[e.contentId] = true;
              var row = self.records.items[e.contentId],
                card = row && row.card;
              if (card) {
                if (card.nextId) protectedIds[card.nextId] = true;
                if (card.episode) protectedIds[card.episode.seriesId] = true;
              }
            });
          return Object.keys(self.records.items)
            .filter(function (id) {
              return !protectedIds[id];
            })
            .map(function (id) {
              return {
                id: id,
                at: self.records.items[id].at || 0,
                bytes:
                  (JSON.stringify(self.records.items[id]).length + JSON.stringify(id).length + 3) *
                  2
              };
            });
        },
        evict: function (id) {
          delete self.records.items[id];
        },
        serialize: function () {
          return JSON.stringify(self.records);
        }
      });
  }
  Store.prototype.write = function (key, value) {
    try {
      if (this.storage) this.storage.setItem(key, JSON.stringify(value));
      this.failed = false;
    } catch (ignore) {
      if (!this.failed)
        this.notify('Depolama kullanılamıyor; değişiklikler bu oturumda korunuyor.');
      this.failed = true;
    }
  };
  Store.prototype.get = function (id) {
    return own(this.records.items, id) ? copy(this.records.items[id].card) : null;
  };
  Store.prototype.remember = function (card, defer) {
    if (!card || !card.contentId || !card.pageUrl) return;
    var previous = this.get(card.contentId),
      value = minimal(card);
    if (value.nextId === undefined && previous && previous.nextId) value.nextId = previous.nextId;
    if (
      value.type === 'series' &&
      previous &&
      previous.languageReference &&
      !value.languageReference
    ) {
      value.language = previous.language;
      value.languageReference = previous.languageReference;
    }
    this.records.items[card.contentId] = { at: Date.now(), card: value };
    var items = this.records.items,
      keys = Object.keys(items).sort(function (a, b) {
        return items[b].at - items[a].at;
      });
    var protectedIds = {};
    if (this.playback)
      this.playback.list().forEach(function (entry) {
        protectedIds[entry.contentId] = true;
        var item = items[entry.contentId];
        if (item) {
          if (item.card.nextId) protectedIds[item.card.nextId] = true;
          if (item.card.episode) protectedIds[item.card.episode.seriesId] = true;
        }
      });
    keys
      .filter(function (key) {
        return !protectedIds[key];
      })
      .slice(Math.max(0, 600 - Object.keys(protectedIds).length))
      .forEach(function (key) {
        delete items[key];
      });
    if (!defer) this.write(RECORDS, this.records);
  };
  Store.prototype.rememberMany = function (cards) {
    var self = this;
    cards.forEach(function (card) {
      self.remember(card, true);
    });
    this.write(RECORDS, this.records);
  };
  Store.prototype.rememberPlayback = function (content) {
    if (content.type === 'episode' && content.episode) {
      var list = content.episodes || [],
        index = -1;
      list.some(function (e, i) {
        if (e.contentId === content.contentId) {
          index = i;
          return true;
        }
        return false;
      });
      var next = index >= 0 && list[index + 1];
      content = copy(content);
      content.nextId = next ? next.contentId : '';
      if (next) this.remember(next);
      this.remember({
        contentId: content.episode.seriesId,
        type: 'series',
        pageUrl: content.seriesPageUrl,
        title: content.seriesTitle,
        poster: content.poster
      });
    }
    this.remember(content);
  };
  Store.prototype.linkEpisodes = function (detail) {
    var self = this,
      existing = Object.keys(this.records.items);
    detail.episodes.forEach(function (episode, i) {
      if (existing.indexOf(episode.contentId) < 0) return;
      var value = copy(episode),
        next = detail.episodes[i + 1];
      value.nextId = next ? next.contentId : '';
      if (next) self.remember(next, true);
      self.remember(value, true);
    });
    this.write(RECORDS, this.records);
  };
  Store.prototype.favorites = function () {
    return copy(this.library.favorites);
  };
  Store.prototype.has = function (id) {
    return this.library.favorites.some(function (x) {
      return x.contentId === id;
    });
  };
  Store.prototype.toggle = function (card) {
    var list = this.library.favorites,
      index = -1;
    list.some(function (x, i) {
      if (x.contentId === card.contentId) {
        index = i;
        return true;
      }
      return false;
    });
    if (index >= 0) list.splice(index, 1);
    else {
      if (list.length >= 200) {
        this.notify('Listem dolu (200 içerik). Yeni eklemek için bir içeriği çıkarın.');
        return false;
      }
      list.unshift(minimal(card));
    }
    this.write(LIBRARY, this.library);
    return true;
  };
  Store.prototype.season = function (id, value) {
    if (value !== undefined) {
      this.library.seasons[id] = value;
      this.write(LIBRARY, this.library);
    }
    return own(this.library.seasons, id) ? Number(this.library.seasons[id]) : null;
  };
  Store.prototype.continueWatching = function (entries) {
    var self = this,
      used = {},
      result = [],
      byId = {};
    entries.forEach(function (e) {
      byId[e.contentId] = e;
    });
    entries.forEach(function (entry) {
      var card = self.get(entry.contentId);
      if (!card || (entry.position < 5 && !entry.completed && entry.watchState !== 'unwatched'))
        return;
      var series = card.type === 'episode' && card.episode,
        key = series ? card.episode.seriesId : card.contentId;
      if (used[key]) return;
      used[key] = true;
      if (series) {
        var target = card,
          state = entry,
          visited = {};
        while (state && state.completed && target) {
          if (visited[target.contentId]) {
            target = null;
            break;
          }
          visited[target.contentId] = true;
          target = self.get(target.nextId);
          state = target && byId[target.contentId];
        }
        if (!target) return;
        var seriesCard = self.get(key);
        if (!seriesCard) return;
        seriesCard.resumeId = target.contentId;
        seriesCard.resumeLabel =
          target.episode.season + '. Sezon ' + target.episode.number + '. Bölüm';
        seriesCard.progress = state && state.duration ? state.position / state.duration : 0;
        result.push(seriesCard);
      } else if (!entry.completed) {
        card.progress = entry.duration ? entry.position / entry.duration : 0;
        result.push(card);
      }
    });
    return result;
  };
  Store.prototype.resumeEpisode = function (detail, entries) {
    var index = {},
      latest = null;
    detail.episodes.forEach(function (e, i) {
      index[e.contentId] = i;
    });
    entries.some(function (e) {
      if (
        own(index, e.contentId) &&
        (e.position >= 5 || e.completed || e.watchState === 'unwatched')
      ) {
        latest = e;
        return true;
      }
      return false;
    });
    if (!latest) return detail.episodes[0] || null;
    var i = index[latest.contentId],
      byId = {};
    entries.forEach(function (e) {
      byId[e.contentId] = e;
    });
    while (
      i < detail.episodes.length &&
      own(byId, detail.episodes[i].contentId) &&
      byId[detail.episodes[i].contentId].completed
    )
      i++;
    return detail.episodes[i] || null;
  };
  function Cache(storage, clock) {
    this.storage = storage;
    this.now = clock || Date.now;
    this.limit = 1024 * 1024;
    this.failed = false;
    this.data = read(storage, CACHE, { version: 1, items: {} });
    this.data.items =
      this.data.items && typeof this.data.items === 'object' && !Array.isArray(this.data.items)
        ? this.data.items
        : {};
    var self = this,
      items = this.data.items;
    Object.keys(items).forEach(function (key) {
      var item = items[key];
      if (!item || !item.value || typeof item.at !== 'number') delete items[key];
    });
    this.trim();
    if (storage && storage.registerCache)
      storage.registerCache(CACHE, {
        candidates: function () {
          return Object.keys(self.data.items).map(function (id) {
            var item = self.data.items[id];
            return {
              id: id,
              at: item.used || item.at,
              bytes: (JSON.stringify(item).length + JSON.stringify(id).length + 3) * 2
            };
          });
        },
        evict: function (id) {
          delete self.data.items[id];
        },
        serialize: function () {
          return JSON.stringify(self.data);
        }
      });
  }
  Cache.prototype.trim = function () {
    var self = this,
      keys = Object.keys(this.data.items).sort(function (a, b) {
        return self.data.items[a].used - self.data.items[b].used;
      });
    while (JSON.stringify(this.data).length * 2 > this.limit && keys.length)
      delete this.data.items[keys.shift()];
  };
  Cache.prototype.get = function (key) {
    var item = own(this.data.items, key) && this.data.items[key];
    if (!item || !item.value || !item.at) return null;
    item.used = this.now();
    return {
      value: copy(item.value),
      at: item.at,
      stale: this.now() - item.at >= 600000
    };
  };
  Cache.prototype.put = function (key, value) {
    this.data.items[key] = {
      at: this.now(),
      used: this.now(),
      value: copy(value)
    };
    this.trim();
    try {
      if (this.storage) this.storage.setItem(CACHE, JSON.stringify(this.data));
      this.failed = false;
    } catch (ignore) {
      this.failed = true;
    }
  };
  Cache.prototype.clear = function () {
    this.data.items = {};
    try {
      if (this.storage) this.storage.removeItem(CACHE);
    } catch (ignore) {}
  };
  root.CatalogStore = Store;
  root.CatalogCache = Cache;
})(window);
