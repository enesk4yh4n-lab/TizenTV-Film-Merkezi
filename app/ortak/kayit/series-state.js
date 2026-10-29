/* Persistent series watch marks and opt-in episode tracking. No background service. */
(function (root) {
  'use strict';
  var C = root.PlayerCore,
    KEY = 'chainprobe.catalog.series.v1';
  function own(o, k) {
    return Object.prototype.hasOwnProperty.call(o, k);
  }
  function ids(detail) {
    return (detail.episodes || []).map(function (e) {
      return e.contentId;
    });
  }
  function card(detail) {
    var c = {};
    ['contentId', 'pageUrl', 'title', 'poster', 'type'].forEach(function (k) {
      if (detail[k] !== undefined) c[k] = detail[k];
    });
    return c;
  }
  function State(storage, notify, clock) {
    this.storage = storage;
    this.notify = notify || function () {};
    this.now = clock || Date.now;
    this.limit = 1024 * 1024;
    this.data = { version: 1, items: {} };
    this.failed = false;
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
    var items = this.data.items;
    Object.keys(items).forEach(function (id) {
      var s = items[id];
      if (
        !s ||
        !s.card ||
        s.card.contentId !== id ||
        typeof s.card.pageUrl !== 'string' ||
        !s.marks ||
        typeof s.marks !== 'object' ||
        Array.isArray(s.marks)
      ) {
        delete items[id];
        return;
      }
      s.card.title = String(s.card.title || 'Dizi').slice(0, 500);
      s.card.type = 'series';
      s.follow = s.follow === true;
      s.known = Array.isArray(s.known)
        ? s.known.filter(function (x, i, all) {
            return typeof x === 'string' && all.indexOf(x) === i;
          })
        : [];
      s.pending = Array.isArray(s.pending)
        ? s.pending.filter(function (x, i, all) {
            return s.known.indexOf(x) >= 0 && all.indexOf(x) === i;
          })
        : [];
      s.checkedAt = C.finite(s.checkedAt) ? s.checkedAt : 0;
      Object.keys(s.marks).forEach(function (key) {
        var m = s.marks[key];
        if (!m || typeof m.completed !== 'boolean' || !C.finite(m.updated) || m.updated < 0)
          delete s.marks[key];
      });
    });
  }
  State.prototype.get = function (id) {
    return own(this.data.items, id) ? C.copy(this.data.items[id]) : null;
  };
  State.prototype.change = function (detail, update) {
    if (!detail || !detail.contentId || !detail.pageUrl) return false;
    var id = detail.contentId,
      s = this.get(id) || {
        card: card(detail),
        follow: false,
        known: [],
        pending: [],
        checkedAt: 0,
        marks: {},
      };
    s.card = card(detail);
    update(s);
    var next = C.copy(this.data);
    Object.defineProperty(next.items, id, {
      value: s,
      enumerable: true,
      writable: true,
      configurable: true,
    });
    if (Object.keys(next.items).length > 100 || JSON.stringify(next).length * 2 > this.limit) {
      if (!this.full)
        this.notify('Dizi kayıt alanı dolu. Yeni kayıt eklenemedi; mevcut kayıtlar korunuyor.');
      this.full = true;
      return false;
    }
    this.full = false;
    this.data = next;
    this.flush();
    return true;
  };
  State.prototype.flush = function () {
    try {
      if (this.storage) this.storage.setItem(KEY, JSON.stringify(this.data));
      this.failed = false;
    } catch (ignore) {
      if (!this.failed)
        this.notify('Dizi kayıtları bu oturumda korunuyor; depolama kullanılamıyor.');
      this.failed = true;
    }
  };
  State.prototype.follow = function (detail, enabled) {
    if (enabled && (!detail.episodes || !detail.episodes.length)) {
      this.notify('Takibi başlatmak için önce bölüm listesini yenileyin.');
      return false;
    }
    var self = this,
      ok = this.change(detail, function (s) {
        s.follow = enabled === true;
        s.known = enabled ? ids(detail) : [];
        s.pending = [];
        s.checkedAt = enabled && !detail.staleAt ? detail.fetchedAt || self.now() : 0;
      });
    if (ok && !enabled) this.clearMarks([]);
    return ok;
  };
  State.prototype.observe = function (detail) {
    var s = this.get(detail.contentId);
    if (!s || !s.follow || detail.staleAt || !detail.episodes || !detail.episodes.length)
      return false;
    var at = detail.fetchedAt || this.now();
    if (at < s.checkedAt) return false;
    return this.change(detail, function (next) {
      var current = ids(detail);
      next.pending = next.pending.filter(function (id) {
        return current.indexOf(id) >= 0;
      });
      current.forEach(function (id) {
        if (next.known.indexOf(id) < 0) {
          next.known.push(id);
          if (!(own(next.marks, id) && next.marks[id].completed)) next.pending.push(id);
        }
      });
      next.checkedAt = at;
    });
  };
  State.prototype.following = function () {
    var self = this;
    return Object.keys(this.data.items)
      .map(function (id) {
        var s = self.get(id),
          c = s.card;
        c.newCount = s.pending.length;
        c.checkedAt = s.checkedAt;
        return s.follow ? c : null;
      })
      .filter(Boolean)
      .sort(function (a, b) {
        return b.newCount - a.newCount || a.title.localeCompare(b.title);
      });
  };
  State.prototype.mark = function (detail, episode, completed) {
    var self = this;
    return this.change(detail, function (s) {
      Object.defineProperty(s.marks, episode.contentId, {
        value: { completed: completed === true, updated: self.now(), manual: true },
        enumerable: true,
        writable: true,
        configurable: true,
      });
      if (completed)
        s.pending = s.pending.filter(function (id) {
          return id !== episode.contentId;
        });
    });
  };
  State.prototype.captureProgress = function (episode) {
    if (!episode || !episode.episode || !episode.episode.seriesId) return null;
    var self = this,
      seriesId = episode.episode.seriesId,
      episodeId = episode.contentId,
      before = this.get(seriesId),
      mark = before && own(before.marks, episodeId) ? C.copy(before.marks[episodeId]) : null,
      pendingIndex = before ? before.pending.indexOf(episodeId) : -1;
    return function () {
      var current = own(self.data.items, seriesId) && self.data.items[seriesId];
      if (!current) return;
      if (mark)
        Object.defineProperty(current.marks, episodeId, {
          value: C.copy(mark),
          enumerable: true,
          writable: true,
          configurable: true,
        });
      else delete current.marks[episodeId];
      current.pending = current.pending.filter(function (id) {
        return id !== episodeId;
      });
      if (pendingIndex >= 0 && current.known.indexOf(episodeId) >= 0)
        current.pending.splice(Math.min(pendingIndex, current.pending.length), 0, episodeId);
      self.flush();
    };
  };
  State.prototype.record = function (episode, entry) {
    if (!episode || !episode.episode || !entry) return;
    var id = episode.episode.seriesId,
      s = this.get(id),
      old = s && own(s.marks, episode.contentId) && s.marks[episode.contentId],
      meaningful = entry.completed || entry.watchState === 'unwatched';
    var pending =
      s && s.pending.indexOf(episode.contentId) >= 0 && (entry.position >= 5 || entry.completed);
    if (
      ((!old && !meaningful) ||
        (old && old.completed === entry.completed) ||
        (old && old.updated > entry.updated)) &&
      !pending
    )
      return;
    this.change(
      s
        ? s.card
        : {
            contentId: id,
            type: 'series',
            title: episode.seriesTitle || 'Dizi',
            pageUrl: episode.seriesPageUrl,
            poster: episode.poster || '',
          },
      function (next) {
        if (!old || entry.updated >= old.updated)
          Object.defineProperty(next.marks, episode.contentId, {
            value: {
              completed: entry.completed,
              updated: entry.updated,
              manual: !!entry.watchState,
            },
            enumerable: true,
            writable: true,
            configurable: true,
          });
        if (pending)
          next.pending = next.pending.filter(function (key) {
            return key !== episode.contentId;
          });
      }
    );
  };
  State.prototype.entries = function (entries) {
    var byId = Object.create(null);
    entries.forEach(function (entry) {
      byId[entry.contentId] = C.copy(entry);
    });
    var self = this;
    Object.keys(this.data.items).forEach(function (id) {
      var marks = self.data.items[id].marks;
      Object.keys(marks).forEach(function (key) {
        var m = marks[key],
          e = byId[key];
        if (e && e.updated > m.updated) return;
        if (!e) e = { contentId: key, position: 0, duration: 0, bookmarks: [], prefs: {} };
        e.completed = m.completed;
        e.updated = m.updated;
        if (!m.completed && m.manual) {
          e.position = 0;
          e.watchState = 'unwatched';
        }
        byId[key] = e;
      });
    });
    return Object.keys(byId)
      .map(function (key) {
        return byId[key];
      })
      .sort(function (a, b) {
        return b.updated - a.updated;
      });
  };
  State.prototype.clearMarks = function (selected) {
    var self = this;
    Object.keys(this.data.items).forEach(function (id) {
      var s = self.data.items[id],
        marks = s.marks;
      Object.keys(marks).forEach(function (key) {
        if (!selected || selected.indexOf(key) >= 0) delete marks[key];
      });
      if (!s.follow && !Object.keys(marks).length) delete self.data.items[id];
    });
    this.flush();
  };
  State.prototype.reset = function (detail) {
    var s = this.get(detail.contentId);
    if (!s) return true;
    if (!s.follow) {
      delete this.data.items[detail.contentId];
      this.flush();
      return true;
    }
    return this.change(detail, function (next) {
      next.marks = {};
    });
  };
  State.prototype.acknowledge = function (detail) {
    return this.change(detail, function (s) {
      s.pending = [];
    });
  };
  root.SeriesState = State;
})(window);
