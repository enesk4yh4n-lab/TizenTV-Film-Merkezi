/* Bounded, metadata-only recommendations. Never calls a source resolver or media engine. */
(function (root) {
  'use strict';
  var C = root.PlayerCore;
  var genres = [
    ['action', 'Aksiyon', 'action,aksiyon'],
    ['family', 'Aile', 'family,aile'],
    ['animation', 'Animasyon', 'animation,animasyon'],
    ['documentary', 'Belgesel', 'documentary,belgesel'],
    ['science-fiction', 'Bilim Kurgu', 'science fiction,sci fi,scifi,bilim kurgu,bilimkurgu'],
    ['drama', 'Dram', 'drama,dram'],
    ['fantasy', 'Fantastik', 'fantasy,fantastik'],
    ['thriller', 'Gerilim', 'thriller,gerilim'],
    ['mystery', 'Gizem', 'mystery,gizem'],
    ['comedy', 'Komedi', 'comedy,komedi'],
    ['horror', 'Korku', 'horror,korku'],
    ['adventure', 'Macera', 'adventure,macera'],
    ['romance', 'Romantik', 'romance,romantik,romantic'],
    ['crime', 'Suç', 'crime,suc'],
    ['war', 'Savaş', 'war,savas'],
    ['western', 'Western', 'western'],
  ];
  function normalized(value) {
    return String(value || '')
      .replace(/İ/g, 'i')
      .toLowerCase()
      .replace(/ı/g, 'i')
      .replace(/ş/g, 's')
      .replace(/ç/g, 'c')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ö/g, 'o')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/^\s+|\s+$/g, '');
  }
  function matches(detail, criteria) {
    if (!detail || detail.type !== 'movie' || detail.playbackUnavailableReason) return false;
    if (
      criteria.minImdb &&
      (!(detail.imdb > 0 && detail.imdb <= 10) || detail.imdb < criteria.minImdb)
    )
      return false;
    if (!criteria.genre) return true;
    var spec = genres.filter(function (g) {
      return g[0] === criteria.genre;
    })[0];
    return (
      !!spec &&
      (detail.genres || []).some(function (name) {
        return spec[2].split(',').indexOf(normalized(name)) >= 0;
      })
    );
  }
  function cancelled() {
    var e = Error('Öneri araması iptal edildi');
    e.cancelled = true;
    return e;
  }
  function Service(options) {
    this.options = options || {};
    this.generation = 0;
    this.rotation = 0;
    this.cursors = {};
    this.seen = [];
    this.scopeKey = '';
    this.now = this.options.now || Date.now;
    this.random = this.options.random || Math.random;
  }
  Service.prototype.cancel = function () {
    this.generation++;
    clearTimeout(this.phaseTimer);
    clearTimeout(this.totalTimer);
    if (this.client) this.client.cancel();
    this.client = null;
    if (this.finish) {
      var finish = this.finish;
      this.finish = null;
      finish(cancelled());
    }
  };
  Service.prototype.generate = function (criteria, scope, notify) {
    this.cancel();
    var self = this,
      token = this.generation,
      hub = this.options.hub,
      start = this.now(),
      deadline = start + 30000;
    criteria = { genre: criteria.genre || '', minImdb: Number(criteria.minImdb) || 0 };
    scope = scope || 'all';
    var signature = scope;
    if (this.scopeKey !== signature) {
      this.cursors = {};
      this.seen = [];
      this.scopeKey = signature;
    }
    var sites = root.SiteRegistry.sites.filter(function (s) {
      return (
        !s.virtual &&
        (scope === 'all' || s.id === scope) &&
        (!s.contentTypes || s.contentTypes.indexOf('movie') >= 0)
      );
    });
    if (sites.length) {
      var offset = this.rotation++ % sites.length;
      sites = sites.slice(offset).concat(sites.slice(0, offset));
    }
    var pool = [],
      accepted = [],
      used = Object.create(null),
      checked = 0,
      done = 0,
      errors = [],
      phase = 'lists',
      active = 0,
      nextSite = 0,
      queue = [];
    function canonical(id) {
      return (hub && hub.resolveId(id)) || id;
    }
    function watched(card) {
      function started(row) {
        return row && (row.completed || row.watchState === 'watched' || row.position >= 5);
      }
      var group = hub && hub.group(card.contentId);
      if (
        group &&
        (started(hub.rawGet(group.id)) ||
          group.variants.some(function (v) {
            return started(hub.rawGet(v.contentId));
          }))
      )
        return true;
      return started(
        hub
          ? hub.progress(card.contentId)
          : self.options.playback && self.options.playback.get(card.contentId)
      );
    }
    function excluded(card) {
      return (
        watched(card) ||
        self.seen.some(function (id) {
          return canonical(id) === canonical(card.contentId);
        })
      );
    }
    function client(end) {
      var p = self.options.createClient
        ? self.options.createClient()
        : new root.UnifiedProvider(self.options.cache, null, hub);
      p.deadline = end;
      p.begin();
      return p;
    }
    function progress() {
      if (notify && token === self.generation) {
        try {
          notify({
            phase: phase,
            done: done,
            total: sites.length,
            candidates: pool.length,
            checked: checked,
          });
        } catch (ignore) {}
      }
    }
    return new Promise(function (resolve, reject) {
      var settled = false;
      function finish(error) {
        if (settled) return;
        settled = true;
        clearTimeout(self.phaseTimer);
        clearTimeout(self.totalTimer);
        self.finish = null;
        if (self.client) self.client.cancel();
        self.client = null;
        if (error) {
          reject(error);
          return;
        }
        var result = [],
          ids = Object.create(null);
        accepted.forEach(function (card) {
          var id = canonical(card.contentId);
          if (!ids[id] && !excluded(card) && result.length < 3) {
            ids[id] = true;
            var shown = (scope === 'all' && hub && hub.card(id)) || card;
            shown.imdb = card.imdb;
            if (scope === 'all') shown.requestedVariant = card.contentId;
            result.push(shown);
          }
        });
        self.seen = self.seen
          .concat(
            result.map(function (c) {
              return canonical(c.contentId);
            })
          )
          .slice(-30);
        resolve({
          cards: result,
          partial: result.length < 3,
          checked: checked,
          sitesDone: done,
          sitesTotal: sites.length,
          errors: errors,
          notice:
            result.length < 3
              ? result.length +
                ' uygun film bulundu. Tercihleri değiştirip yeniden deneyebilirsiniz.'
              : '',
        });
      }
      self.finish = finish;
      function alive() {
        return !settled && token === self.generation;
      }
      self.totalTimer = setTimeout(
        function () {
          if (alive()) finish();
        },
        Math.max(1, deadline - self.now())
      );
      function inspect() {
        if (!alive()) return;
        if (accepted.length >= 3 || self.now() >= deadline) {
          finish();
          return;
        }
        while (active < 2 && queue.length && checked < 12) {
          (function (card) {
            checked++;
            active++;
            var site = root.SiteRegistry.get(card.providerId);
            if (!site) {
              active--;
              inspect();
              return;
            }
            self.client
              .invoke(site, 'detail', [card, false])
              .then(function (detail) {
                if (!alive() || phase !== 'details') return;
                if (!matches(detail, criteria)) return;
                if (hub) hub.observeDetail(detail, site.id);
                if (
                  excluded(detail) ||
                  accepted.some(function (c) {
                    return canonical(c.contentId) === canonical(detail.contentId);
                  })
                )
                  return;
                accepted.push(detail);
              })
              .then(null, function (error) {
                if (alive()) errors.push({ site: site.id, message: C.safeMessage(error.message) });
              })
              .then(function () {
                if (!alive()) return;
                active--;
                progress();
                if (!active && (!queue.length || checked >= 12)) finish();
                else inspect();
              });
          })(queue.shift());
        }
        if (!active && (!queue.length || checked >= 12)) finish();
      }
      function details() {
        if (!alive() || phase !== 'lists') return;
        phase = 'details';
        clearTimeout(self.phaseTimer);
        self.client.cancel();
        self.client = client(deadline);
        active = 0;
        var unique = Object.create(null);
        queue = pool.filter(function (c) {
          var id = canonical(c.contentId);
          if (unique[id] || excluded(c)) return false;
          unique[id] = true;
          return true;
        });
        for (var i = queue.length - 1; i > 0; i--) {
          var j = Math.floor(self.random() * (i + 1)),
            swap = queue[i];
          queue[i] = queue[j];
          queue[j] = swap;
        }
        progress();
        inspect();
      }
      var listDeadline = Math.min(deadline, start + 12000);
      self.client = client(listDeadline);
      self.phaseTimer = setTimeout(details, Math.max(1, listDeadline - self.now()));
      function collect() {
        if (!alive() || phase !== 'lists') return;
        while (active < 2 && nextSite < sites.length) {
          (function (site) {
            active++;
            self.client
              .invoke(site, 'list', [{ type: 'movie' }, self.cursors[site.id] || null, true])
              .then(function (result) {
                if (!alive() || phase !== 'lists') return;
                if (!result || !Array.isArray(result.cards)) throw Error('Geçersiz film listesi');
                self.cursors[site.id] = result.next || null;
                if (result.staleAt) {
                  errors.push({ site: site.id, message: 'Güncel katalog alınamadı' });
                  return;
                }
                result.cards.forEach(function (raw) {
                  if (
                    !raw ||
                    raw.type !== 'movie' ||
                    !raw.contentId ||
                    !raw.pageUrl ||
                    !raw.title ||
                    pool.length >= 200
                  )
                    return;
                  var card = C.copy(raw);
                    card.providerId = site.id;
                  if (hub) hub.observe(card, site.id);
                  var id = canonical(card.contentId);
                  if (!used[id]) {
                    used[id] = true;
                    pool.push(card);
                  }
                });
              })
              .then(null, function (error) {
                if (alive() && phase === 'lists')
                  errors.push({ site: site.id, message: C.safeMessage(error.message) });
              })
              .then(function () {
                if (!alive() || phase !== 'lists') return;
                active--;
                done++;
                progress();
                if (!active && nextSite >= sites.length) details();
                else collect();
              });
          })(sites[nextSite++]);
        }
        if (!sites.length) details();
      }
      progress();
      collect();
    });
  };
  Service.genres = genres.map(function (g) {
    return { value: g[0], label: g[1] };
  });
  Service.matches = matches;
  root.RecommendationService = Service;
})(window);
