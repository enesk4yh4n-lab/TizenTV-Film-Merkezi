/* Cross-site identity index. Existing site libraries and playback rows stay in place. */
(function (root) {
  'use strict';
  var C = root.PlayerCore,
    I = root.ContentIdentity,
    U = root.CatalogUtils,
    KEY = 'filmmerkezi.unified.v1';
  function own(o, k) {
    return Object.prototype.hasOwnProperty.call(o, k);
  }
  function map() {
    return Object.create(null);
  }
  function scoped(storage, prefix) {
    if (storage && storage.scope) return storage.scope(prefix);
    return {
      getItem: function (k) {
        return storage && storage.getItem(prefix + k);
      },
      setItem: function (k, v) {
        if (storage) storage.setItem(prefix + k, v);
      },
      removeItem: function (k) {
        if (storage) storage.removeItem(prefix + k);
      },
      protect: function (k) {
        if (storage && storage.protect) storage.protect(prefix + k);
      },
    };
  }
  function minimal(card, provider, preserveUnavailable) {
    if (!card || typeof card !== 'object' || Array.isArray(card)) return null;
    var site =
        root.SiteRegistry.get(provider || card.providerId) || root.SiteRegistry.forContent(card),
      u;
    if (
      !site &&
      preserveUnavailable &&
      /^[a-z][a-z0-9-]{0,40}$/.test(card.providerId || '') &&
      typeof card.contentId === 'string' &&
      card.contentId.indexOf(card.providerId + ':') === 0
    )
      site = { id: card.providerId, prefix: card.providerId + ':' };
    try {
      u = new root.URL(card.pageUrl);
    } catch (ignore) {}
    if (
      !site ||
      site.virtual ||
      !u ||
      !/^https?:$/.test(u.protocol) ||
      u.username ||
      u.password ||
      String(card.contentId || '').indexOf(site.prefix) !== 0
    )
      return null;
    var v = {
      providerId: site.id,
      contentId: String(card.contentId).slice(0, 800),
      type:
        card.type === 'series'
          ? 'series'
          : card.type === 'episode'
            ? 'episode'
            : card.type === 'collection'
              ? 'collection'
              : 'movie',
      pageUrl: u.href,
      title: U.clean(card.title).slice(0, 300),
      poster: U.url(card.poster, card.pageUrl),
      year: I.year(card.year),
      imdbId: I.imdb(card.imdbId || card.imdbUrl),
    };
    if (!v.title) return null;
    if (Array.isArray(card.titleAliases))
      v.titleAliases = card.titleAliases.slice(0, 8).map(U.clean).filter(Boolean);
    if (card.releaseDate && /^\d{4}-\d{2}-\d{2}$/.test(card.releaseDate))
      v.releaseDate = card.releaseDate;
    if (card.originalTitle) v.originalTitle = U.clean(card.originalTitle).slice(0, 300);
    if (card.language) v.language = U.clean(card.language).slice(0, 100);
    if (typeof card.imdb === 'number') v.imdb = card.imdb;
    if (I.year(card.yearHint)) v.yearHint = I.year(card.yearHint);
    if (card.selectedEpisodePageUrl && U.url(card.selectedEpisodePageUrl))
      v.selectedEpisodePageUrl = U.url(card.selectedEpisodePageUrl);
    if (card.languageReference && U.url(card.languageReference.pageUrl))
      v.languageReference = {
        pageUrl: U.url(card.languageReference.pageUrl),
        title: U.clean(card.languageReference.title).slice(0, 300),
        checkedAt: Number(card.languageReference.checkedAt) || 0,
        stale: !!card.languageReference.stale,
      };
    if (
      card.episode &&
      card.episode.seriesId &&
      Number(card.episode.season) > 0 &&
      Number(card.episode.number) > 0
    ) {
      v.episode = {
        seriesId: card.episode.seriesId,
        season: Number(card.episode.season),
        number: Number(card.episode.number),
      };
      v.seriesTitle = U.clean(card.seriesTitle);
      v.seriesPageUrl = U.url(card.seriesPageUrl);
      v.episodeTitle = U.clean(card.episodeTitle || card.title);
    }
    return v;
  }
  function Hub(storage, playback, notify) {
    this.storage = storage;
    this.playback = playback;
    this.notify = notify || function () {};
    this.limit = 1024 * 1024;
    this.rawGet = playback.get.bind(playback);
    this.rawList = playback.list.bind(playback);
    this.timer = null;
    this.dirty = false;
    this.failed = false;
    this.revision = 0;
    this.batchDepth = 0;
    this.seriesDirty = false;
    this.pendingWork = 0;
    this.data = {
      version: 1,
      items: {},
      favorites: [],
      redirects: {},
      seasons: {},
      imported: false,
    };
    if (root.SafeStorage)
      this.data = root.SafeStorage.read(
        storage,
        KEY,
        this.data,
        function (v) {
          return root.SafeStorage.object(v.items);
        },
        this.notify
      );
    else
      try {
        var value = storage && JSON.parse(storage.getItem(KEY));
        if (
          value &&
          value.version === 1 &&
          value.items &&
          typeof value.items === 'object' &&
          !Array.isArray(value.items)
        )
          this.data = value;
      } catch (ignore) {}
    if (!Array.isArray(this.data.favorites)) this.data.favorites = [];
    if (!this.data.redirects || typeof this.data.redirects !== 'object') this.data.redirects = {};
    if (!this.data.seasons || typeof this.data.seasons !== 'object') this.data.seasons = {};
    var self = this;
    Object.keys(this.data.items).forEach(function (id) {
      var g = self.data.items[id];
      if (
        !g ||
        g.id !== id ||
        ['movie', 'series', 'episode', 'collection'].indexOf(g.type) < 0 ||
        !Array.isArray(g.variants) ||
        !g.variants.length
      ) {
        delete self.data.items[id];
        return;
      }
      g.variants = g.variants
        .map(function (v) {
          return minimal(v, null, true);
        })
        .filter(Boolean);
      if (!g.variants.length) delete self.data.items[id];
      else {
        g.created = Number(g.created) || 0;
        g.updated = Number(g.updated) || 0;
        if (g.parent && typeof g.parent !== 'string') delete g.parent;
      }
    });
    this.data.favorites = this.data.favorites.filter(function (f) {
      return f && typeof f.id === 'string' && typeof f.sourceId === 'string';
    });
    Object.keys(this.data.redirects).forEach(function (id) {
      if (typeof self.data.redirects[id] !== 'string') delete self.data.redirects[id];
    });
    this.rebuild();
    this.series = new root.SeriesState(scoped(storage, 'unified.'), this.notify);
    if (storage && storage.registerCache)
      storage.registerCache(KEY, {
        candidates: function () {
          return self.cacheCandidates();
        },
        evict: function (id) {
          self.unindex(id);
          delete self.data.items[id];
        },
        serialize: function () {
          return JSON.stringify(self.data);
        },
      });
    this.importLegacy();
    this.installPlaybackBridge();
  }
  function episodeKey(parent, season, number) {
    return parent + '|' + season + '|' + number;
  }
  Hub.prototype.unindex = function (id) {
    var row = this.indexed[id],
      self = this;
    if (!row) return;
    row.aliases.forEach(function (k) {
      if (self.aliases[k] === id) delete self.aliases[k];
    });
    function remove(index, keys) {
      keys.forEach(function (k) {
        var ids = index[k];
        if (!ids) return;
        var i = ids.indexOf(id);
        if (i >= 0) ids.splice(i, 1);
        if (!ids.length) delete index[k];
      });
    }
    remove(this.keys, row.keys);
    remove(this.hints, row.hints);
    remove(this.episodeGroups, row.episode ? [row.episode] : []);
    delete this.indexed[id];
  };
  Hub.prototype.indexGroup = function (g) {
    this.unindex(g.id);
    var self = this,
      row = { aliases: [], keys: [], hints: [], episode: '' };
    this.indexed[g.id] = row;
    function add(index, list, key) {
      if (list.indexOf(key) >= 0) return;
      list.push(key);
      if (!index[key]) index[key] = [];
      index[key].push(g.id);
    }
    g.variants.forEach(function (v) {
      self.aliases[v.contentId] = g.id;
      row.aliases.push(v.contentId);
      I.keys(v).forEach(function (k) {
        add(self.keys, row.keys, k);
      });
      if (g.year && (g.type === 'movie' || g.type === 'series'))
        I.keys({
          type: g.type,
          year: g.year,
          title: v.title,
          originalTitle: v.originalTitle,
          titleAliases: v.titleAliases,
        }).forEach(function (k) {
          add(self.hints, row.hints, k);
        });
    });
    if (g.type === 'episode' && g.parent) {
      row.episode = episodeKey(g.parent, g.season, g.number);
      if (!this.episodeGroups[row.episode]) this.episodeGroups[row.episode] = [];
      this.episodeGroups[row.episode].push(g.id);
    }
  };
  Hub.prototype.rebuild = function () {
    var self = this;
    this.aliases = map();
    this.keys = map();
    this.hints = map();
    this.indexed = map();
    this.episodeGroups = map();
    Object.keys(this.data.items).forEach(function (id) {
      self.indexGroup(self.data.items[id]);
    });
  };
  Hub.prototype.episodeGroup = function (parent, season, number, skip) {
    var ids = this.episodeGroups[episodeKey(parent, season, number)] || [];
    for (var i = 0; i < ids.length; i++)
      if (ids[i] !== skip && own(this.data.items, ids[i])) return this.data.items[ids[i]];
    return null;
  };
  Hub.prototype.batch = function (action) {
    this.batchDepth++;
    try {
      return action();
    } finally {
      this.batchDepth--;
      if (!this.batchDepth && this.seriesDirty) {
        this.seriesDirty = false;
        this.reconcileSeries();
      }
    }
  };
  Hub.prototype.resolveId = function (id) {
    var seen = map(),
      n = 0;
    id = String(id || '');
    while (own(this.data.redirects, id) && n++ < 64 && !seen[id]) {
      seen[id] = true;
      id = this.data.redirects[id];
    }
    return own(this.data.items, id) ? id : own(this.aliases, id) ? this.aliases[id] : '';
  };
  Hub.prototype.group = function (id) {
    var key = this.resolveId(id);
    return key ? this.data.items[key] : null;
  };
  Hub.prototype.scheduleWrite = function () {
    if (this.timer || this.pendingWork || !this.dirty) return;
    var self = this;
    this.timer = setTimeout(function () {
      self.timer = null;
      self.flush();
    }, 1000);
  };
  Hub.prototype.changed = function () {
    this.revision++;
    this.dirty = true;
    this.scheduleWrite();
  };
  Hub.prototype.flush = function (force) {
    clearTimeout(this.timer);
    this.timer = null;
    if (!this.dirty || (this.pendingWork && !force)) return;
    this.trim();
    try {
      var text = JSON.stringify(this.data);
      if (text.length * 2 > this.limit) throw new Error('Ortak kayıt sınırı');
      if (this.storage) this.storage.setItem(KEY, text);
      this.failed = false;
      this.dirty = false;
    } catch (ignore) {
      if (!this.failed)
        this.notify('Ortak kütüphane bu oturumda korunuyor; depolama kullanılamıyor.');
      this.failed = true;
    }
  };
  Hub.prototype.protectedIds = function () {
    var self = this,
      protectedIds = map();
    this.data.favorites.forEach(function (f) {
      protectedIds[self.resolveId(f.id)] = true;
    });
    this.rawList().forEach(function (e) {
      var g = self.group(e.contentId);
      if (g) {
        protectedIds[g.id] = true;
        if (g.parent) protectedIds[self.resolveId(g.parent)] = true;
        if (g.nextId) protectedIds[self.resolveId(g.nextId)] = true;
      }
    });
    if (this.series)
      Object.keys(this.series.data.items).forEach(function (id) {
        if (self.series.data.items[id].follow) protectedIds[self.resolveId(id)] = true;
      });
    return protectedIds;
  };
  Hub.prototype.cacheCandidates = function () {
    var self = this,
      protectedIds = this.protectedIds();
    return Object.keys(this.data.items)
      .filter(function (id) {
        return !protectedIds[id];
      })
      .map(function (id) {
        return {
          id: id,
          at: self.data.items[id].updated || 0,
          bytes: (JSON.stringify(self.data.items[id]).length + JSON.stringify(id).length + 3) * 2,
        };
      });
  };
  Hub.prototype.trim = function () {
    var self = this,
      protectedIds = this.protectedIds(),
      keys = Object.keys(this.data.items),
      sizes = map(),
      size =
        JSON.stringify({
          version: this.data.version,
          items: {},
          favorites: this.data.favorites,
          redirects: this.data.redirects,
          seasons: this.data.seasons,
          imported: this.data.imported,
        }).length * 2,
      count = keys.length;
    keys.forEach(function (k) {
      sizes[k] = (JSON.stringify(k).length + JSON.stringify(self.data.items[k]).length + 2) * 2;
      size += sizes[k];
    });
    keys.sort(function (a, b) {
      return self.data.items[a].updated - self.data.items[b].updated;
    });
    for (var i = 0; i < keys.length && (count > 600 || size > this.limit); i++) {
      var k = keys[i];
      if (protectedIds[k]) continue;
      size -= sizes[k];
      count--;
      this.unindex(k);
      delete this.data.items[k];
    }
    var redirects = Object.keys(this.data.redirects);
    redirects.slice(0, Math.max(0, redirects.length - 600)).forEach(function (k) {
      delete self.data.redirects[k];
    });
  };
  Hub.prototype.allocate = function (v, custom) {
    var keys = I.keys(v),
      key = custom || keys[0] || v.type + '|source|' + v.contentId,
      base = 'unified:' + v.type + ':' + encodeURIComponent(key),
      id = base,
      i = 1;
    while (own(this.data.items, id)) id = base + ':' + ++i;
    return id;
  };
  Hub.prototype.reconcileSeries = function () {
    if (!this.series) return;
    var self = this,
      out = {},
      changed = false;
    Object.keys(this.series.data.items).forEach(function (id) {
      var state = C.copy(self.series.data.items[id]),
        key = self.resolveId(id) || id,
        target = out[key];
      if (key !== id) changed = true;
      state.card = self.card(key) || state.card;
      state.card.contentId = key;
      function canonical(ids) {
        var seen = map();
        return ids
          .map(function (k) {
            return self.resolveId(k) || k;
          })
          .filter(function (k) {
            if (seen[k]) return false;
            seen[k] = true;
            return true;
          });
      }
      state.known = canonical(state.known);
      state.pending = canonical(state.pending);
      var marks = {};
      Object.keys(state.marks).forEach(function (k) {
        var c = self.resolveId(k) || k,
          m = state.marks[k];
        if (!marks[c] || m.updated > marks[c].updated) marks[c] = m;
        if (c !== k) changed = true;
      });
      state.marks = marks;
      if (!target) out[key] = state;
      else {
        changed = true;
        target.follow = target.follow || state.follow;
        target.known = canonical(target.known.concat(state.known));
        target.pending = canonical(target.pending.concat(state.pending));
        target.checkedAt = Math.max(target.checkedAt, state.checkedAt);
        Object.keys(marks).forEach(function (k) {
          if (!target.marks[k] || marks[k].updated > target.marks[k].updated)
            target.marks[k] = marks[k];
        });
      }
    });
    if (changed) {
      Object.keys(out).forEach(function (id) {
        out[id].pending = out[id].pending.filter(function (k) {
          return !(out[id].marks[k] && out[id].marks[k].completed);
        });
      });
      this.series.data.items = out;
      this.series.flush();
    }
  };
  Hub.prototype.merge = function (keep, drop) {
    if (!keep || !drop || keep.id === drop.id) return keep;
    if (keep.type !== drop.type || (keep.imdbId && drop.imdbId && keep.imdbId !== drop.imdbId))
      return keep;
    keep.created = Math.min(keep.created || Date.now(), drop.created || Date.now());
    var self = this;
    drop.variants.forEach(function (v) {
      if (
        !keep.variants.some(function (x) {
          return x.contentId === v.contentId;
        })
      )
        keep.variants.push(v);
    });
    ['title', 'originalTitle', 'poster', 'year', 'language', 'imdb'].forEach(function (k) {
      if (!keep[k] && drop[k]) keep[k] = drop[k];
    });
    if (!keep.imdbId) keep.imdbId = drop.imdbId;
    if (!keep.preferred || (drop.chosenAt || 0) > (keep.chosenAt || 0)) {
      keep.preferred = drop.preferred;
      keep.chosenAt = drop.chosenAt || 0;
    }
    var favoriteIds = map();
    this.data.favorites.forEach(function (f) {
      if (f.id === drop.id) f.id = keep.id;
    });
    this.data.favorites = this.data.favorites.filter(function (f) {
      if (favoriteIds[f.id]) return false;
      favoriteIds[f.id] = true;
      return true;
    });
    this.data.redirects[drop.id] = keep.id;
    if (this.data.seasons[drop.id] && !this.data.seasons[keep.id])
      this.data.seasons[keep.id] = this.data.seasons[drop.id];
    delete this.data.items[drop.id];
    this.unindex(drop.id);
    this.indexGroup(keep);
    if (drop.type === 'series')
      Object.keys(this.data.items).forEach(function (id) {
        var child = self.data.items[id];
        if (!child || child.parent !== drop.id) return;
        child.parent = keep.id;
        var peer = self.episodeGroup(keep.id, child.season, child.number, child.id);
        self.indexGroup(child);
        if (peer) self.merge(peer, child);
      });
    if (keep.type === 'series' || keep.type === 'episode') {
      if (this.batchDepth) this.seriesDirty = true;
      else this.reconcileSeries();
    }
    return keep;
  };
  Hub.prototype.observe = function (card, provider, defer) {
    var v = minimal(card, provider);
    if (!v) return null;
    var self = this,
      old = this.group(v.contentId),
      g = null,
      keys = I.keys(v),
      parent = null,
      conflict =
        old && (old.type !== v.type || (old.imdbId && v.imdbId && old.imdbId !== v.imdbId)),
      detachedFavorite = null;
    if (v.type === 'episode' && v.episode) {
      parent = this.group(v.episode.seriesId);
      if (!parent && v.seriesPageUrl && v.seriesTitle)
        parent = this.observe(
          {
            contentId: v.episode.seriesId,
            type: 'series',
            pageUrl: v.seriesPageUrl,
            title: v.seriesTitle,
            poster: v.poster,
          },
          v.providerId,
          true
        );
      if (parent) g = this.episodeGroup(parent.id, v.episode.season, v.episode.number);
    }
    if (conflict) {
      old.variants = old.variants.filter(function (x) {
        return x.contentId !== v.contentId;
      });
      this.data.favorites.forEach(function (f) {
        if (f.sourceId === v.contentId) detachedFavorite = f;
      });
      if (!old.variants.length) {
        this.unindex(old.id);
        delete this.data.items[old.id];
      } else this.indexGroup(old);
      old = null;
    }
    if (!g && v.imdbId) {
      var ids = this.keys[v.type + '|imdb|' + v.imdbId] || [];
      g = ids.length ? this.group(ids[0]) : null;
    }
    if (!g && old) g = old;
    if (!g && v.type !== 'episode')
      keys.some(function (k) {
        var matches = (self.keys[k] || [])
          .map(function (id) {
            return self.group(id);
          })
          .filter(function (x) {
            return x && x.type === v.type && !(v.imdbId && x.imdbId && v.imdbId !== x.imdbId);
          });
        if (matches.length === 1) {
          g = matches[0];
          return true;
        }
        return false;
      });
    if (!g) {
      var id = this.allocate(
        v,
        parent ? 'episode|' + parent.id + '|' + v.episode.season + '|' + v.episode.number : null
      );
      g = {
        id: id,
        type: v.type,
        variants: [],
        created: Date.now(),
        updated: Date.now(),
      };
      this.data.items[id] = g;
    }
    if (old && old.id !== g.id) g = this.merge(g, old);
    if (v.type !== 'episode') {
      var peers = map(),
        ambiguous = false;
      keys.forEach(function (k) {
        if (k.indexOf('|name|') < 0) return;
        (self.keys[k] || []).forEach(function (id) {
          var peer = self.group(id);
          if (!peer || peer.id === g.id) return;
          if ((v.imdbId || g.imdbId) && peer.imdbId && peer.imdbId !== (v.imdbId || g.imdbId)) {
            ambiguous = true;
            return;
          }
          peers[peer.id] = peer;
        });
      });
      var peerIds = Object.keys(peers),
        knownIds = map();
      if (g.imdbId) knownIds[g.imdbId] = true;
      if (v.imdbId) knownIds[v.imdbId] = true;
      peerIds.forEach(function (id) {
        if (peers[id].imdbId) knownIds[peers[id].imdbId] = true;
      });
      if (Object.keys(knownIds).length > 1) ambiguous = true;
      if (!ambiguous)
        peerIds.forEach(function (id) {
          g = self.merge(g, self.group(id));
        });
    }
    var previous = g.variants.filter(function (x) {
      return x.contentId === v.contentId;
    })[0];
    if (previous)
      Object.keys(v).forEach(function (k) {
        if (k === 'language' && previous.languageReference && !v.languageReference) return;
        if (v[k] !== '' && v[k] !== null && v[k] !== undefined) previous[k] = v[k];
      });
    else g.variants.push(v);
    ['title', 'originalTitle', 'poster', 'year', 'language', 'imdb'].forEach(function (k) {
      if (!g[k] && v[k]) g[k] = v[k];
    });
    if (v.imdbId) g.imdbId = v.imdbId;
    if (parent) {
      g.parent = parent.id;
      g.season = v.episode.season;
      g.number = v.episode.number;
      g.seriesTitle = v.seriesTitle;
    }
    if (detachedFavorite) detachedFavorite.id = g.id;
    g.updated = Date.now();
    this.indexGroup(g);
    if (Array.isArray(card.legacyContentIds)) {
      card.legacyContentIds.slice(0, 100).forEach(function (id) {
        if (id === v.contentId || id.indexOf(root.SiteRegistry.get(v.providerId).prefix) !== 0)
          return;
        var prior = self.group(id);
        if (prior && prior.id !== g.id) {
          if (prior.type === g.type) g = self.merge(g, prior);
          else {
            self.data.favorites.forEach(function (f) {
              if (f.id === prior.id && f.sourceId === id) f.id = g.id;
            });
            prior.variants = prior.variants.filter(function (x) {
              return x.contentId !== id;
            });
            if (!prior.variants.length) {
              self.unindex(prior.id);
              delete self.data.items[prior.id];
              self.data.redirects[prior.id] = g.id;
            } else self.indexGroup(prior);
          }
        }
        g.variants = g.variants.filter(function (x) {
          return x.contentId !== id;
        });
        self.data.redirects[id] = g.id;
        self.data.favorites.forEach(function (f) {
          if (f.sourceId === id) f.sourceId = v.contentId;
        });
        if (g.preferred === id) g.preferred = v.contentId;
      });
      this.indexGroup(g);
    }
    if (!defer) this.changed();
    return g;
  };
  Hub.prototype.observeMany = function (cards, provider) {
    var self = this;
    this.batch(function () {
      cards.forEach(function (c) {
        self.observe(c, provider, true);
      });
    });
    this.changed();
  };
  Hub.prototype.refreshCards = function (cards) {
    var self = this,
      seen = map(),
      out = [];
    (cards || []).forEach(function (c) {
      var current = self.card(c.contentId) || c,
        id = self.resolveId(current.contentId) || current.contentId;
      if (seen[id]) return;
      seen[id] = true;
      [
        'progress',
        'resumeId',
        'resumeLabel',
        'newCount',
        'checkedAt',
        'historyCompleted',
        'historyAt',
      ].forEach(function (k) {
        if (c[k] !== undefined) current[k] = C.copy(c[k]);
      });
      out.push(current);
    });
    return out;
  };
  Hub.prototype.hintMatches = function (card) {
    var self = this,
      seen = map(),
      out = [],
      y = I.year(card.yearHint);
    I.keys({
      type: card.type,
      year: y,
      title: card.title,
      originalTitle: card.originalTitle,
      titleAliases: card.titleAliases,
    }).forEach(function (k) {
      (self.hints[k] || []).forEach(function (id) {
        if (seen[id]) return;
        seen[id] = true;
        var g = self.group(id);
        if (
          g &&
          g.type === card.type &&
          g.year === y &&
          !(card.imdbId && g.imdbId && card.imdbId !== g.imdbId)
        )
          out.push(g);
      });
    });
    return out;
  };
  Hub.prototype.corroborateSeries = function (card) {
    if (card.type !== 'series' || I.year(card.year) || !I.year(card.yearHint)) return card;
    var matches = this.hintMatches(card);
    if (
      matches.length === 1 &&
      matches[0].variants.some(function (v) {
        return v.providerId !== card.providerId;
      })
    ) {
      card = C.copy(card);
      card.year = I.year(card.yearHint);
    }
    return card;
  };
  Hub.prototype.observeDetail = function (detail, provider) {
    var self = this;
    return this.batch(function () {
      var g = self.observe(detail, provider, true);
      if (!g) return null;
      var list = detail.episodes || [],
        children = [];
      list.forEach(function (e) {
        var child = self.observe(e, provider, true);
        if (child) children.push(child);
      });
      children.forEach(function (child, i) {
        if (children[i + 1]) child.nextId = children[i + 1].id;
      });
      self.changed();
      return g;
    });
  };
  Hub.prototype.corroborate = function (card) {
    if (card.type === 'series') return this.corroborateSeries(card);
    if (card.type !== 'movie' || I.year(card.year) || !I.year(card.yearHint)) return card;
    var matches = this.hintMatches(card).filter(function (g) {
      return g.variants.some(function (v) {
        return v.providerId !== card.providerId;
      });
    });
    if (matches.length === 1) {
      card = C.copy(card);
      card.year = I.year(card.yearHint);
    }
    return card;
  };
  /* Revisit only this interaction's variants after all metadata has arrived. No title-only year guesses. */
  Hub.prototype.reconcileValues = function (ids) {
    var self = this,
      seen = map(),
      groups = map(),
      values = [];
    (ids || []).forEach(function (id) {
      var g = self.group(typeof id === 'string' ? id : id.contentId);
      if (!g || groups[g.id]) return;
      groups[g.id] = true;
      g.variants.forEach(function (v) {
        if (!seen[v.contentId]) {
          seen[v.contentId] = true;
          values.push(C.copy(v));
        }
      });
    });
    return values;
  };
  Hub.prototype.reconcileOne = function (v) {
    var self = this,
      before = this.resolveId(v.contentId),
      verified = this.corroborate(v),
      needs = verified.year !== v.year;
    if (!needs)
      needs = I.keys(verified).some(function (k) {
        return (self.keys[k] || []).some(function (id) {
          return self.resolveId(id) !== before;
        });
      });
    if (!needs) return false;
    var g = this.observe(verified, v.providerId, true);
    return !!g && (before !== g.id || verified.year !== v.year);
  };
  Hub.prototype.reconcile = function (ids) {
    var self = this;
    return this.batch(function () {
      for (var pass = 0; pass < 3; pass++) {
        var beforeCount = Object.keys(self.data.items).length,
          values = self.reconcileValues(ids),
          changed = false;
        values.forEach(function (v) {
          if (self.reconcileOne(v)) changed = true;
        });
        if (!changed && Object.keys(self.data.items).length === beforeCount) break;
      }
      self.changed();
    });
  };
  /* Yield between small batches so Back, directional keys and video events can run. */
  Hub.prototype.reconcileAsync = function (ids, valid) {
    var self = this;
    this.pendingWork++;
    clearTimeout(this.timer);
    this.timer = null;
    return new Promise(function (resolve, reject) {
      var pass = 0,
        values = [],
        index = 0,
        beforeCount = 0,
        changed = false,
        ended = false;
      function end(error) {
        if (ended) return;
        ended = true;
        self.pendingWork--;
        if (!error) self.changed();
        self.scheduleWrite();
        if (error) reject(error);
        else resolve();
      }
      function start() {
        beforeCount = Object.keys(self.data.items).length;
        values = self.reconcileValues(ids);
        index = 0;
        changed = false;
      }
      function step() {
        try {
          if (valid && !valid()) {
            var error = new Error('İptal edildi');
            error.cancelled = true;
            throw error;
          }
          var began = Date.now(),
            n = 0;
          self.batch(function () {
            while (index < values.length && n++ < 12) {
              if (self.reconcileOne(values[index++])) changed = true;
              if (Date.now() - began >= 6) break;
            }
          });
          if (index < values.length) {
            setTimeout(step, 0);
            return;
          }
          if (++pass < 3 && (changed || Object.keys(self.data.items).length !== beforeCount)) {
            start();
            setTimeout(step, 0);
            return;
          }
          end();
        } catch (e) {
          end(e);
        }
      }
      try {
        start();
        step();
      } catch (e) {
        end(e);
      }
    });
  };
  Hub.prototype.card = function (id) {
    var g = this.group(id);
    if (!g) return null;
    var v = this.preferred(g),
      c = {
        contentId: g.id,
        canonicalId: g.id,
        providerId: 'all',
        type: g.type,
        title: g.title || v.title,
        poster: g.poster || v.poster || '',
        pageUrl: v.pageUrl,
        year: g.year || null,
        imdb: g.imdb || null,
        imdbId: g.imdbId || '',
        language: v.language || g.language || '',
        variants: C.copy(g.variants),
        providerNames: [],
        providerCount: 0,
      };
    if (v.languageReference) c.languageReference = C.copy(v.languageReference);
    c.firstSeenAt = g.created;
    c.titleAliases = [];
    g.variants.forEach(function (x) {
      [x.title, x.originalTitle].concat(x.titleAliases || []).forEach(function (v) {
        if (v && c.titleAliases.indexOf(v) < 0) c.titleAliases.push(v);
      });
      if (x.releaseDate && !c.releaseDate) c.releaseDate = x.releaseDate;
    });
    var seen = map();
    g.variants.forEach(function (x) {
      var site = root.SiteRegistry.get(x.providerId);
      if (site && !seen[site.id]) {
        seen[site.id] = true;
        c.providerNames.push(site.name);
      }
    });
    c.providerCount = c.providerNames.length;
    if (g.originalTitle) c.originalTitle = g.originalTitle;
    if (g.type === 'episode') {
      c.episode = {
        seriesId: this.resolveId(g.parent),
        season: g.season,
        number: g.number,
      };
      c.seriesTitle = g.seriesTitle;
      c.seriesPageUrl = (this.card(g.parent) || {}).pageUrl;
      c.episodeTitle = v.episodeTitle || v.title;
      c.nextId = this.resolveId(g.nextId);
    }
    return c;
  };
  Hub.prototype.preferred = function (group, requested) {
    var g = typeof group === 'string' ? this.group(group) : group;
    if (!g) return null;
    var chosen = g.variants.filter(function (v) {
      return v.contentId === (requested || g.preferred) && !!root.SiteRegistry.get(v.providerId);
    })[0];
    if (!chosen) {
      var time = -1;
      for (var i = 0; i < g.variants.length; i++) {
        if (!root.SiteRegistry.get(g.variants[i].providerId)) continue;
        var updated = (this.rawGet(g.variants[i].contentId) || {}).updated || 0;
        if (updated > time) {
          time = updated;
          chosen = g.variants[i];
        }
      }
    }
    return C.copy(chosen || g.variants[0]);
  };
  Hub.prototype.choose = function (id, rawId) {
    var g = this.group(id),
      variant =
        g &&
        g.variants.filter(function (v) {
          return v.contentId === rawId;
        })[0];
    if (!variant) return false;
    g.preferred = rawId;
    g.chosenAt = g.updated = Date.now();
    if (g.parent) {
      var parent = this.group(g.parent),
        match =
          parent &&
          parent.variants.filter(function (v) {
            return v.providerId === variant.providerId;
          })[0];
      if (match) this.choose(parent.id, match.contentId);
    }
    this.changed();
    return true;
  };
  Hub.prototype.has = function (id) {
    var key = this.resolveId(id),
      self = this;
    return (
      !!key &&
      this.data.favorites.some(function (f) {
        return self.resolveId(f.id) === key;
      })
    );
  };
  Hub.prototype.toggle = function (card) {
    var g = this.group(card.contentId) || this.observe(card);
    if (!g) return false;
    var self = this,
      index = -1;
    this.data.favorites.some(function (f, i) {
      if (self.resolveId(f.id) === g.id) {
        index = i;
        return true;
      }
      return false;
    });
    if (index >= 0) this.data.favorites.splice(index, 1);
    else {
      if (this.data.favorites.length >= 200) {
        this.notify('Listem dolu (200 içerik). Önce bir içeriği çıkarın.');
        return false;
      }
      this.data.favorites.unshift({
        id: g.id,
        sourceId: (
          g.variants.filter(function (v) {
            return v.contentId === (card.selectedVariant || card.contentId);
          })[0] || this.preferred(g)
        ).contentId,
      });
    }
    this.changed();
    this.flush(true);
    return true;
  };
  Hub.prototype.favorites = function () {
    var self = this;
    return this.data.favorites
      .map(function (f) {
        return self.card(f.id);
      })
      .filter(Boolean);
  };
  Hub.prototype.canonicalEntries = function (entries) {
    var self = this,
      by = map();
    entries.forEach(function (e) {
      var id = self.resolveId(e.contentId);
      if (id && (!by[id] || e.updated > by[id].updated)) {
        by[id] = C.copy(e);
        by[id].contentId = id;
      }
    });
    return Object.keys(by)
      .map(function (k) {
        return by[k];
      })
      .sort(function (a, b) {
        return b.updated - a.updated;
      });
  };
  Hub.prototype.expandEntries = function (entries) {
    var self = this,
      out = [],
      seen = map();
    entries.forEach(function (e) {
      var g = self.group(e.contentId),
        ids = g
          ? [g.id].concat(
              g.variants.map(function (v) {
                return v.contentId;
              })
            )
          : [e.contentId];
      ids.forEach(function (id) {
        if (seen[id]) return;
        seen[id] = true;
        var c = C.copy(e);
        c.contentId = id;
        out.push(c);
      });
    });
    return out;
  };
  Hub.prototype.entries = function (raw) {
    return this.expandEntries(this.series.entries(this.canonicalEntries(raw)));
  };
  Hub.prototype.history = function () {
    var self = this,
      seen = map(),
      out = [];
    this.series.entries(this.canonicalEntries(this.rawList())).forEach(function (entry) {
      if (!entry.updated || (entry.position < 5 && !entry.completed && !entry.watchState)) return;
      var c = self.card(entry.contentId);
      if (!c) return;
      var id = c.episode ? c.episode.seriesId : c.contentId;
      if (seen[id]) return;
      seen[id] = true;
      if (c.episode) {
        var episode = c;
        c = self.card(id);
        if (!c) return;
        c.resumeId = episode.contentId;
        c.resumeLabel = episode.episode.season + '. Sezon ' + episode.episode.number + '. Bölüm';
      }
      c.progress = entry.duration ? entry.position / entry.duration : 0;
      c.historyCompleted = entry.completed;
      c.historyAt = entry.updated;
      out.push(c);
    });
    return out;
  };
  Hub.prototype.progress = function (id) {
    var ownEntry = this.rawGet(id),
      g = this.group(id),
      best = ownEntry;
    if (!g) return ownEntry;
    g.variants.forEach(function (v) {
      var e = this.rawGet(v.contentId);
      if (e && (!best || e.updated > best.updated)) best = e;
    }, this);
    if (!best) return null;
    var result = C.copy(best);
    result.prefs = ownEntry && ownEntry.prefs ? C.copy(ownEntry.prefs) : {};
    result.bookmarks = ownEntry && ownEntry.bookmarks ? C.copy(ownEntry.bookmarks) : [];
    return result;
  };
  Hub.prototype.installPlaybackBridge = function () {
    var self = this,
      store = this.playback,
      clear = store.clearMany.bind(store),
      reset = store.resetProgress.bind(store),
      entry = store.entry.bind(store);
    store.get = function (id) {
      return self.progress(id);
    };
    store.entry = function (id) {
      var shared = self.progress(id),
        raw = self.rawGet(id),
        e = entry(id);
      if (shared && (!raw || shared.updated > raw.updated))
        ['position', 'duration', 'completed', 'updated', 'watchState'].forEach(function (k) {
          if (shared[k] !== undefined) e[k] = shared[k];
          else if (k === 'watchState') delete e[k];
        });
      return e;
    };
    function expand(ids) {
      var all = [];
      ids.forEach(function (id) {
        var g = self.group(id),
          list = g
            ? g.variants.map(function (v) {
                return v.contentId;
              })
            : [id];
        list.forEach(function (k) {
          if (all.indexOf(k) < 0) all.push(k);
        });
      });
      return all;
    }
    store.clearMany = function (ids) {
      clear(expand(ids));
    };
    store.resetProgress = function (ids) {
      reset(expand(ids));
    };
    store.on('progressbegin', function (session) {
      var undo = self.series.captureProgress(self.card(session.contentId));
      if (undo) session.undo.push(undo);
    });
    store.on('checkpoint', function (event) {
      var card = self.card(event.contentId);
      if (card) self.series.record(card, event.entry);
    });
    store.on('clear', function (ids) {
      self.series.clearMarks(
        ids
          ? ids.map(function (id) {
              return self.resolveId(id) || id;
            })
          : null
      );
    });
  };
  Hub.prototype.importLegacy = function () {
    var self = this,
      first = !this.data.imported,
      watched = map();
    this.rawList().forEach(function (e) {
      watched[e.contentId] = true;
    });
    root.SiteRegistry.sites.forEach(function (site) {
      if (site.virtual) return;
      var storage = scoped(self.storage, site.storagePrefix || ''),
        library = new root.CatalogStore(storage),
        series = new root.SeriesState(storage),
        favorites = library.favorites();
      library.playback = self.playback;
      favorites.forEach(function (c) {
        var g = self.observe(c, site.id, true);
        if (first && g && !self.has(g.id) && self.data.favorites.length < 200)
          self.data.favorites.push({ id: g.id, sourceId: c.contentId });
      });
      Object.keys(library.records.items)
        .sort(function (a, b) {
          return library.records.items[b].at - library.records.items[a].at;
        })
        .filter(function (id, i) {
          return watched[id] || i < 30;
        })
        .forEach(function (id) {
          self.observe(library.get(id), site.id, true);
        });
      if (first)
        series.following().forEach(function (c) {
          var g = self.observe(c, site.id, true),
            canonical = g && self.card(g.id);
          if (canonical)
            self.series.change(canonical, function (s) {
              s.follow = true;
            });
        });
      if (first)
        series.entries(self.rawList()).forEach(function (e) {
          var g = self.group(e.contentId),
            c = g && self.card(g.id);
          if (c) self.series.record(c, e);
        });
    });
    this.data.imported = true;
    this.changed();
    this.flush();
  };
  Hub.prototype.decorate = function (library) {
    var self = this;
    if (library.unifiedDecorated) return;
    library.unifiedDecorated = true;
    var remember = library.remember;
    library.remember = function (card, defer) {
      remember.call(library, card, defer);
      self.observe(card, null, !!defer);
    };
    var many = library.rememberMany;
    library.rememberMany = function (cards) {
      many.call(library, cards);
      self.changed();
    };
    library.has = function (id) {
      return self.has(id);
    };
    library.toggle = function (card) {
      return self.toggle(card);
    };
    library.favorites = function () {
      return self.favorites();
    };
  };
  function Library(hub) {
    this.hub = hub;
    this.playback = hub.playback;
  }
  Library.prototype.get = function (id) {
    return this.hub.card(id);
  };
  Library.prototype.remember = function (c) {
    if (c && c.variants) return;
    this.hub.observe(c);
  };
  Library.prototype.rememberMany = function (cards) {
    var self = this;
    cards.forEach(function (c) {
      self.remember(c);
    });
  };
  Library.prototype.rememberPlayback = function (c) {
    this.hub.observe(c);
  };
  Library.prototype.linkEpisodes = function () {};
  Library.prototype.favorites = function () {
    return this.hub.favorites();
  };
  Library.prototype.has = function (id) {
    return this.hub.has(id);
  };
  Library.prototype.toggle = function (c) {
    return this.hub.toggle(c);
  };
  Library.prototype.season = function (id, value) {
    var key = this.hub.resolveId(id);
    if (value !== undefined) {
      this.hub.data.seasons[key] = value;
      this.hub.changed();
    }
    return this.hub.data.seasons[key] || null;
  };
  Library.prototype.continueWatching = function (entries) {
    return root.CatalogStore.prototype.continueWatching.call(
      this,
      this.hub.canonicalEntries(entries)
    );
  };
  Library.prototype.resumeEpisode = function (detail, entries) {
    return root.CatalogStore.prototype.resumeEpisode.call(
      this,
      detail,
      this.hub.expandEntries(this.hub.canonicalEntries(entries))
    );
  };
  Library.prototype.write = function () {
    this.hub.flush();
  };
  /* A navigation-owned result set survives disposable persistent-cache eviction. */
  function ResultSet() {
    this.ids = [];
    this.cards = map();
    this.aliases = map();
    this.keys = map();
  }
  ResultSet.prototype.remember = function (card) {
    var id = card.contentId,
      self = this;
    this.cards[id] = card;
    if (this.ids.indexOf(id) < 0) this.ids.push(id);
    (card.variants || [card]).forEach(function (v) {
      self.aliases[v.contentId] = id;
      I.keys(v).forEach(function (k) {
        if (!self.keys[k]) self.keys[k] = [];
        if (self.keys[k].indexOf(id) < 0) self.keys[k].push(id);
      });
    });
  };
  ResultSet.prototype.prepare = function (cards, hub) {
    var self = this;
    cards.forEach(function (card) {
      var ids = [],
        known = self.aliases[card.contentId];
      if (known) ids.push(known);
      I.keys(card).forEach(function (k) {
        ids = ids.concat(self.keys[k] || []);
      });
      ids.forEach(function (id) {
        var saved = self.cards[id];
        if (
          saved &&
          !hub.group(id) &&
          !(card.imdbId && saved.imdbId && card.imdbId !== saved.imdbId)
        )
          hub.restore(saved);
      });
    });
  };
  ResultSet.prototype.snapshot = function (hub) {
    var self = this,
      out = [],
      seen = map(),
      old = this.ids.slice();
    old.forEach(function (id) {
      var prior = self.cards[id],
        current = hub.card(id) || prior;
      if (!current) return;
      var canonical = current.contentId;
      self.cards[canonical] = current;
      (current.variants || []).forEach(function (v) {
        self.aliases[v.contentId] = canonical;
      });
      if (!seen[canonical]) {
        seen[canonical] = true;
        out.push(current);
      }
    });
    this.ids = [];
    this.cards = map();
    this.aliases = map();
    this.keys = map();
    out.forEach(function (card) {
      self.remember(card);
    });
    return out;
  };
  Hub.prototype.restore = function (card) {
    var group = this.group(card.canonicalId || card.contentId),
      self = this;
    if (group) return group;
    (card.variants || [card]).forEach(function (v) {
      group = self.observe(v, v.providerId, true) || group;
    });
    if (group && card.firstSeenAt) group.created = Math.min(group.created, card.firstSeenAt);
    return group;
  };
  root.CatalogResultSet = ResultSet;
  root.UnifiedHub = Hub;
  root.UnifiedLibrary = Library;
  root.UnifiedStorage = scoped;
})(window);
