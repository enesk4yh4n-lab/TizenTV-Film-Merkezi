/* Device-local, bounded playback evidence. Never stores media URLs or headers. */
(function (root) {
  'use strict';
  var C = root.PlayerCore,
    KEY = 'filmmerkezi.playback.compatibility.v1',
    LIMIT = 262144,
    MAX = 200;
  function hash(value) {
    var s = String(value || ''),
      a = 2166136261,
      b = 5381;
    for (var i = 0; i < s.length; i++) {
      a ^= s.charCodeAt(i);
      a = (a + (a << 1) + (a << 4) + (a << 7) + (a << 8) + (a << 24)) >>> 0;
      b = ((b << 5) + b) ^ s.charCodeAt(i);
    }
    return a.toString(16) + '-' + (b >>> 0).toString(16);
  }
  function base(content, source, engine) {
    return (
      hash(content.contentId) +
      '/' +
      hash(source.id || source.sourceId || source.label) +
      '/' +
      engine
    );
  }
  function profile(source, quality, codec) {
    var p = source.mediaProfile || {};
    function clean(value) {
      var s = String(value || '').toLowerCase();
      return /^[a-z0-9._,-]{0,70}$/.test(s) ? s : '';
    }
    return [
      source.type === 'mp4' ? 'mp4' : 'hls',
      quality || 0,
      clean(codec || p.videoCodec),
      clean(p.audioCodec),
      ['SDR', 'PQ', 'HLG'].indexOf(p.range) >= 0 ? p.range : 'SDR',
      [1, 2, 6, 8].indexOf(Number(p.audioChannels)) >= 0 ? Number(p.audioChannels) : '',
      ['main', 'main10'].indexOf(p.videoProfile) >= 0 ? p.videoProfile : ''
    ].join('|');
  }
  function Store(storage, notify, clock) {
    this.storage = storage;
    this.notify = notify || function () {};
    this.now = clock || Date.now;
    this.data = { version: 1, entries: [] };
    this.failed = false;
    try {
      var raw = storage && storage.getItem(KEY);
      if (raw && raw.length * 2 <= LIMIT) {
        var d = JSON.parse(raw);
        if (d && d.version === 1 && Array.isArray(d.entries)) this.data = d;
      }
    } catch (ignore) {}
    this.trim();
  }
  Store.prototype.trim = function () {
    var now = this.now();
    this.data.entries = this.data.entries
      .filter(function (e) {
        return (
          e &&
          /^[a-f0-9-]+\/[a-f0-9-]+\/(html5|avplay)$/.test(e.key) &&
          C.finite(e.at) &&
          C.finite(e.until) &&
          e.until > now &&
          ['success', 'source', 'quality'].indexOf(e.kind) >= 0 &&
          C.finite(e.height) &&
          e.height >= 0 &&
          e.height <= 4320 &&
          typeof e.profile === 'string' &&
          e.profile.length < 160
        );
      })
      .sort(function (a, b) {
        return b.at - a.at;
      })
      .slice(0, MAX);
    while (JSON.stringify(this.data).length * 2 > LIMIT && this.data.entries.length)
      this.data.entries.pop();
  };
  Store.prototype.flush = function () {
    this.trim();
    try {
      if (this.storage) this.storage.setItem(KEY, JSON.stringify(this.data));
      this.failed = false;
    } catch (ignore) {
      if (!this.failed) this.notify('Uyumluluk kaydı bu oturumda bellekte tutuluyor.');
      this.failed = true;
    }
  };
  Store.prototype.put = function (content, source, engine, kind, height, codec, ttl, reason) {
    if (
      !content ||
      !source ||
      ['html5', 'avplay'].indexOf(engine) < 0 ||
      /:qa\d*:|^fixture:|^compat:/.test(content.contentId)
    )
      return;
    var key = base(content, source, engine),
      sig = profile(source, height, codec),
      now = this.now();
    this.data.entries = this.data.entries.filter(function (e) {
      return !(e.key === key && e.kind === kind && e.profile === sig);
    });
    this.data.entries.unshift({
      key: key,
      kind: kind,
      height: height || 0,
      profile: sig,
      at: now,
      until: now + ttl,
      reason:
        reason === 'network'
          ? 'network'
          : reason === 'http'
            ? 'http'
            : reason === 'media'
              ? 'media'
              : 'progress'
    });
    this.flush();
  };
  Store.prototype.success = function (content, source, engine, height, codec) {
    this.put(content, source, engine, 'success', height, codec, 30 * 86400000, 'progress');
    var key = base(content, source, engine);
    this.data.entries = this.data.entries.filter(function (e) {
      return !(e.key === key && e.kind === 'source');
    });
    this.flush();
  };
  Store.prototype.failure = function (content, source, engine, error, height, codec) {
    var quality = height !== undefined,
      media = quality || (error && ['media', 'unsupported'].indexOf(error.type) >= 0);
    this.put(
      content,
      source,
      engine,
      quality ? 'quality' : 'source',
      quality ? height : 0,
      codec,
      media ? 86400000 : 600000,
      media ? 'media' : error && error.code ? 'http' : 'network'
    );
  };
  Store.prototype.entries = function (content, source, engine) {
    this.trim();
    var key = base(content, source, engine);
    return this.data.entries.filter(function (e) {
      return e.key === key;
    });
  };
  Store.prototype.profileMatches = function (entry, source) {
    var a = entry.profile.split('|'),
      p = source.mediaProfile || {};
    return (
      a[0] === (source.type === 'mp4' ? 'mp4' : 'hls') &&
      (!p.videoCodec || !a[2] || a[2] === String(p.videoCodec).toLowerCase()) &&
      (!p.audioCodec || !a[3] || a[3] === String(p.audioCodec).toLowerCase()) &&
      (!p.range || a[4] === p.range) &&
      (!p.audioChannels || !a[5] || a[5] === String(p.audioChannels)) &&
      (!p.videoProfile || !a[6] || a[6] === p.videoProfile)
    );
  };
  Store.prototype.sourceFailed = function (content, source, engine) {
    var self = this;
    return this.entries(content, source, engine).some(function (e) {
      return e.kind === 'source' && self.profileMatches(e, source);
    });
  };
  Store.prototype.engineFailed = function (content, source, engine) {
    var self = this;
    return this.entries(content, source, engine).some(function (e) {
      return e.kind === 'source' && e.reason === 'media' && self.profileMatches(e, source);
    });
  };
  Store.prototype.failedHeights = function (content, source, engine, levels) {
    return this.entries(content, source, engine)
      .filter(function (e) {
        return (
          e.kind === 'quality' &&
          e.height > 0 &&
          (!levels ||
            levels.some(function (l) {
              return (
                l.height === e.height &&
                e.profile === profile(source, e.height, l.codec || l.videoCodec)
              );
            }))
        );
      })
      .map(function (e) {
        return e.height;
      })
      .filter(function (h, i, a) {
        return a.indexOf(h) === i;
      });
  };
  Store.prototype.preferred = function (content, source, engine) {
    var list = this.entries(content, source, engine);
    for (var i = 0; i < list.length; i++)
      if (
        list[i].kind === 'success' &&
        this.profileMatches(list[i], source) &&
        !list.some(function (e) {
          return e.kind === 'quality' && e.height === list[i].height && e.at >= list[i].at;
        })
      )
        return list[i];
    return null;
  };
  Store.prototype.choose = function (content, sources, engineFor) {
    var self = this,
      best = -1,
      score = -Infinity;
    sources.forEach(function (source, index) {
      var engine = engineFor(source),
        pref = self.preferred(content, source, engine),
        priority = source.stability && source.stability.autoPriority,
        value =
          (self.sourceFailed(content, source, engine) ? -1000000 : 0) +
          (pref ? 100000 : 0) -
          (C.finite(priority) ? C.clamp(priority, 0, 100) * 100 : 0) -
          index;
      if (value > score) {
        score = value;
        best = index;
      }
    });
    return Math.max(0, best);
  };
  Store.prototype.retry = function (content, source, engine, height) {
    var key = base(content, source, engine);
    this.data.entries = this.data.entries.filter(function (e) {
      return !(
        e.key === key &&
        (height === undefined ? e.kind !== 'success' : e.kind === 'quality' && e.height === height)
      );
    });
    this.flush();
  };
  Store.prototype.clear = function () {
    this.data = { version: 1, entries: [] };
    this.flush();
  };
  Store.profile = profile;
  root.PlaybackCompatibilityStore = Store;
})(window);
