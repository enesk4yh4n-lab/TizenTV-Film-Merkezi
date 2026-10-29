/* Two wire requests at a time across independent provider clients. No resolver requests use this queue. */
(function (root) {
  'use strict';
  var C = root.PlayerCore;
  function cancelled() {
    var e = new Error('İptal edildi');
    e.cancelled = true;
    return e;
  }
  function Queue() {
    this.pending = [];
    this.running = [];
    this.deadline = 0;
  }
  Queue.prototype.pump = function () {
    if (this.paused) return;
    var self = this;
    while (this.running.length < 2 && this.pending.length) {
      var job = this.pending.shift();
      if (job.done) continue;
      if (Date.now() >= this.deadline) {
        job.finish(new Error('Ortak arama süresi doldu.'));
        continue;
      }
      this.running.push(job);
      job.started = true;
      job.run();
    }
  };
  Queue.prototype.request = function (owner, fn) {
    var self = this;
    return new Promise(function (resolve, reject) {
      var job = {
        owner: owner,
        done: false,
        started: false,
        finish: function (error, value) {
          if (job.done) return;
          job.done = true;
          var i = self.running.indexOf(job);
          if (i >= 0) self.running.splice(i, 1);
          i = self.pending.indexOf(job);
          if (i >= 0) self.pending.splice(i, 1);
          if (error) reject(error);
          else resolve(value);
          self.pump();
        },
        run: function () {
          try {
            fn().then(
              function (v) {
                job.finish(null, v);
              },
              function (e) {
                job.finish(e);
              }
            );
          } catch (e) {
            job.finish(e);
          }
        }
      };
      self.pending.push(job);
      self.pump();
    });
  };
  Queue.prototype.cancel = function (owner) {
    this.pending
      .concat(this.running)
      .filter(function (j) {
        return !owner || j.owner === owner;
      })
      .forEach(function (j) {
        j.finish(cancelled());
      });
  };
  function capture(provider, queue, identity) {
    var original = provider.network;
    if (!original || !original.get) return;
    var owner = {},
      wrapped = {};
    ['get', 'post'].forEach(function (method) {
      wrapped[method] = function () {
        var args = arguments;
        return queue.request(owner, function () {
          return original[method].apply(original, args).then(function (response) {
            if (
              method === 'get' &&
              identity.active &&
              String(args[0]).replace(/#.*$/, '') === identity.active
            )
              identity.value = root.ContentIdentity.fromPage(
                response.body,
                identity.active,
                provider.config && provider.config.identitySelectors
              );
            return response;
          });
        });
      };
    });
    wrapped.cancel = function () {
      try {
        original.cancel();
      } finally {
        queue.cancel(owner);
      }
    };
    provider.network = wrapped;
  }
  function Provider(cache, network, hub) {
    this.cache = cache;
    this.hub = hub || (root.ChainApp && root.ChainApp.hub);
    this.queue = new Queue();
    this.clients = {};
    this.generation = 0;
    this.deadline = Date.now() + 45000;
    this.budgetMs = 45000;
    this.timers = [];
    this.running = [];
  }
  Provider.prototype.client = function (site) {
    if (!this.clients[site.id]) {
      var value = new site.Provider(this.cache),
        identity = { active: '', value: null };
      capture(value, this.queue, identity);
      this.clients[site.id] = { provider: value, identity: identity };
    }
    return this.clients[site.id];
  };
  Provider.prototype.cancel = function () {
    this.generation++;
    this.queue.paused = true;
    this.timers.splice(0).forEach(clearTimeout);
    var clients = this.clients;
    Object.keys(clients).forEach(function (id) {
      try {
        if (typeof clients[id].provider.cancel === 'function') clients[id].provider.cancel();
      } catch (ignore) {}
    });
    this.queue.cancel();
    this.running.splice(0).forEach(function (end) {
      end(cancelled());
    });
  };
  Provider.prototype.begin = function () {
    this.cancel();
    this.queue.paused = false;
    this.deadline = Math.max(Date.now() + 1, this.deadline || Date.now() + 45000);
    this.queue.deadline = this.deadline;
    this.identitySeen = {};
    this.identityUsed = {};
    this.identityCount = 0;
    this.seriesHints = [];
    return this.generation;
  };
  Provider.prototype.invoke = function (site, method, args) {
    var self = this;
    return new Promise(function (resolve, reject) {
      var p;
      try {
        p = self.client(site).provider;
        if (typeof p[method] !== 'function')
          throw new Error('Site ' + method + ' işlemini sunmuyor.');
      } catch (error) {
        reject(error);
        return;
      }
      self.queue.deadline = self.deadline;
      p.deadline = self.deadline;
      var done = false,
        timer,
        end = function (e, v) {
          if (done) return;
          done = true;
          clearTimeout(timer);
          var i = self.running.indexOf(end);
          if (i >= 0) self.running.splice(i, 1);
          i = self.timers.indexOf(timer);
          if (i >= 0) self.timers.splice(i, 1);
          if (e) reject(e);
          else resolve(v);
        };
      self.running.push(end);
      timer = setTimeout(
        function () {
          try {
            if (typeof p.cancel === 'function') p.cancel();
          } catch (ignore) {}
          end(new Error('Site yanıtı zamanında alınamadı.'));
        },
        Math.max(1, Math.min(26000, self.deadline - Date.now()))
      );
      self.timers.push(timer);
      try {
        Promise.resolve(p[method].apply(p, args)).then(function (v) {
          end(null, v);
        }, end);
      } catch (e) {
        end(e);
      }
    });
  };
  Provider.prototype.enrich = function (cards, token, update, includeMovies) {
    var self = this,
      jobs = [],
      used = this.identityUsed || (this.identityUsed = {}),
      busy = {},
      names = {};
    this.identitySeen = this.identitySeen || {};
    cards.forEach(function (c) {
      if (c.type === 'series') {
        var n = root.ContentIdentity.seriesName(c.title, c.year);
        names[n] = (names[n] || 0) + 1;
      }
    });
    cards
      .filter(function (c) {
        var series = c.type === 'series',
          need = series
            ? !c.year
            : includeMovies !== false &&
              c.type === 'movie' &&
              (!c.year || (c.titleAliases && c.titleAliases.length > 1));
        return (
          need &&
          root.CatalogSearch &&
          (!self.searchText && series
            ? names[root.ContentIdentity.seriesName(c.title, c.year)] > 1
            : root.CatalogSearch.score(c, self.searchText || '') > 0)
        );
      })
      .sort(function (a, b) {
        return (
          (b.type === 'series' ? 1 : 0) - (a.type === 'series' ? 1 : 0) ||
          root.CatalogSearch.score(b, self.searchText || '') -
            root.CatalogSearch.score(a, self.searchText || '')
        );
      })
      .forEach(function (c) {
        var group = self.hub.group(c.contentId);
        if (
          group &&
          !self.identitySeen[c.contentId] &&
          (group.variants.length === 1 || c.type === 'series') &&
          (used[c.providerId] || 0) < 3 &&
          (self.identityCount || 0) < 12
        ) {
          self.identitySeen[c.contentId] = true;
          used[c.providerId] = (used[c.providerId] || 0) + 1;
          self.identityCount = (self.identityCount || 0) + 1;
          jobs.push(c);
        }
      });
    function lane() {
      if (token !== self.generation || Date.now() + 1500 >= self.deadline || !jobs.length)
        return Promise.resolve();
      var index = -1;
      jobs.some(function (c, i) {
        if (!busy[c.providerId]) {
          index = i;
          return true;
        }
        return false;
      });
      if (index < 0) return Promise.resolve();
      var card = jobs.splice(index, 1)[0],
        site = root.SiteRegistry.get(card.providerId);
      if (!site) return lane();
      busy[site.id] = true;
      var method;
      try {
        method = typeof self.client(site).provider.identity === 'function' ? 'identity' : 'detail';
      } catch (ignore) {
        delete busy[site.id];
        return lane();
      }
      return self
        .invoke(site, method, [card, false])
        .then(
          function (d) {
            if (token !== self.generation) return;
            var verified = self.hub.corroborate(d);
            self.hub.observeDetail(verified, site.id);
            if (!verified.year && d.yearHint) self.seriesHints.push(d);
            self.resolveSeriesHints();
            update(true);
          },
          function () {}
        )
        .then(function () {
          delete busy[site.id];
          return lane();
        });
    }
    return Promise.all([lane(), lane()]);
  };
  Provider.prototype.resolveSeriesHints = function () {
    var self = this;
    this.seriesHints = (this.seriesHints || []).filter(function (d) {
      var verified = self.hub.corroborate(d);
      if (verified.year) {
        self.hub.observeDetail(verified, d.providerId);
        return false;
      }
      return true;
    });
  };
  Provider.prototype.collect = function (kind, query, next, force, notify) {
    var self = this,
      token = this.begin(),
      sites = root.SiteRegistry.sites.filter(function (s) {
        return (
          !s.virtual && (!query.type || !s.contentTypes || s.contentTypes.indexOf(query.type) >= 0)
        );
      }),
      loadErrors = root.SiteRegistry.errors || [],
      states = loadErrors.map(function (error) {
        return {
          id: error.id,
          name: error.name,
          status: 'error',
          count: 0,
          message: error.message
        };
      }),
      view = (next && next.resultSet) || new root.CatalogResultSet(),
      ids = next && Array.isArray(next.ids) ? next.ids.slice() : [],
      cursors = (next && next.cursors) || {},
      remaining = sites.slice(),
      active = 0,
      done = loadErrors.length,
      results = {};
    if (next && next.signature !== JSON.stringify(query))
      return Promise.reject(new Error('Ortak devam bağlantısı bu listeyle eşleşmiyor.'));
    if (next)
      remaining = remaining.filter(function (s) {
        return !!cursors[s.id];
      });
    sites.forEach(function (s) {
      states.push({
        id: s.id,
        name: s.name,
        status: next && !cursors[s.id] ? 'done' : 'pending',
        count: 0
      });
    });
    function snapshot() {
      ids.forEach(function (id) {
        var card = self.hub.card(id);
        if (card) view.remember(card);
      });
      var cards = view.snapshot(self.hub),
        cursor = {},
        hasNext = false;
      Object.keys(results).forEach(function (id) {
        if (results[id]) {
          cursor[id] = results[id];
          hasNext = true;
        }
      });
      var progress = {
          done: done,
          total: next ? remaining.length + active + done : sites.length + loadErrors.length,
          sites: C.copy(states),
          running: active > 0 || remaining.length > 0,
          enriching: !!(enrichment && active)
        },
        r = {
          cards: cards,
          next: hasNext
            ? {
                signature: JSON.stringify(query),
                ids: cards.map(function (c) {
                  return c.contentId;
                }),
                cursors: cursor
              }
            : null,
          unifiedProgress: progress,
          searchNotice: states
            .filter(function (s) {
              return s.status === 'limited';
            })
            .map(function (s) {
              return s.name + ': ' + s.message;
            })
            .join(' ')
        };
      if (r.next) Object.defineProperty(r.next, 'resultSet', { value: view });
      if (kind === 'home') {
        r = {
          hero:
            cards.filter(function (c) {
              return c.type === 'movie';
            })[0] ||
            cards[0] ||
            null,
          movies: cards.filter(function (c) {
            return c.type === 'movie';
          }),
          series: cards.filter(function (c) {
            return c.type === 'series';
          }),
          unifiedProgress: progress
        };
      }
      // Progress-only publications do not change the catalog's data revision.
      // The generation and count also distinguish a new collection/result set.
      r.catalogRevision = token + ':' + self.hub.revision + ':' + cards.length;
      return r;
    }
    var received = [],
      enrichment = false;
    this.searchText = query.text || '';
    return new Promise(function (resolve, reject) {
      var settled = false,
        finishing = false,
        updateTimer = null,
        lastUpdate = 0,
        publishedCards = false;
      function clearUpdate() {
        if (updateTimer === null) return;
        clearTimeout(updateTimer);
        var i = self.timers.indexOf(updateTimer);
        if (i >= 0) self.timers.splice(i, 1);
        updateTimer = null;
      }
      function publish() {
        if (token !== self.generation || settled || !notify) return;
        lastUpdate = Date.now();
        publishedCards = !!ids.length;
        notify(snapshot());
      }
      function finish() {
        if (settled || finishing) return;
        clearUpdate();
        if (token !== self.generation) {
          settled = true;
          reject(cancelled());
          return;
        }
        finishing = true;
        self.resolveSeriesHints();
        var work = self.hub.reconcileAsync
          ? self.hub.reconcileAsync(ids, function () {
              return token === self.generation;
            })
          : Promise.resolve(self.hub.reconcile(ids));
        work.then(
          function () {
            if (token !== self.generation) {
              settled = true;
              reject(cancelled());
              return;
            }
            var result = snapshot();
            result.unifiedProgress.running = false;
            result.unifiedProgress.enriching = false;
            self.hub.flush();
            if (notify) notify(result);
            settled = true;
            if (
              !ids.length &&
              states.length &&
              states.every(function (s) {
                return s.status === 'error' || s.status === 'blocked';
              })
            ) {
              reject(
                new Error(
                  states.every(function (s) {
                    return s.status === 'blocked';
                  })
                    ? 'Siteler erişimi engelledi (403/429).'
                    : 'Sitelerden yanıt alınamadı. Site yanıtları bölümünü inceleyin.'
                )
              );
              return;
            }
            resolve(result);
          },
          function (error) {
            settled = true;
            reject(error);
          }
        );
      }
      function update(immediate) {
        if (token !== self.generation || !notify || settled || finishing || !ids.length) return;
        if (immediate || !publishedCards || Date.now() - lastUpdate >= 160) {
          clearUpdate();
          publish();
          return;
        }
        if (updateTimer === null) {
          updateTimer = setTimeout(function () {
            clearUpdate();
            publish();
          }, 160);
          self.timers.push(updateTimer);
        }
      }
      function start() {
        if (token !== self.generation) {
          finish();
          return;
        }
        if (!active && !remaining.length) {
          if (!enrichment) {
            enrichment = true;
            active++;
            update();
            self.enrich(received, token, update, kind === 'search').then(
              function () {
                active--;
                finish();
              },
              function () {
                active--;
                finish();
              }
            );
            return;
          }
          finish();
          return;
        }
        while (active < 2 && remaining.length) {
          (function (site) {
            active++;
            var state = states.filter(function (s) {
              return s.id === site.id;
            })[0];
            state.status = 'loading';
            var method = kind === 'home' ? 'home' : kind === 'search' ? 'search' : 'list',
              args =
                kind === 'home'
                  ? [force]
                  : kind === 'search'
                    ? [query.text, force, cursors[site.id] || null]
                    : [query, cursors[site.id] || null, force];
            self
              .invoke(site, method, args)
              .then(function (value) {
                if (token !== self.generation) return;
                if (!value || typeof value !== 'object') throw new Error('Geçersiz site yanıtı.');
                var cards =
                  kind === 'home'
                    ? (value.movies || []).concat(value.series || [])
                    : value.cards || [];
                if (!Array.isArray(cards)) throw new Error('Geçersiz katalog listesi.');
                cards = cards.filter(function (c) {
                  return (
                    c &&
                    typeof c === 'object' &&
                    typeof c.contentId === 'string' &&
                    typeof c.title === 'string'
                  );
                });
                cards.forEach(function (c) {
                  if (!c.providerId) c.providerId = site.id;
                });
                received = received.concat(cards);
                view.prepare(cards, self.hub);
                self.hub.observeMany(cards, site.id);
                self.resolveSeriesHints();
                cards.forEach(function (card) {
                  var id = self.hub.resolveId(card.contentId);
                  if (id && ids.indexOf(id) < 0) ids.push(id);
                });
                state.status = value.searchNotice ? 'limited' : value.staleAt ? 'stale' : 'ready';
                state.count = cards.length;
                state.message =
                  value.searchNotice || (value.staleAt ? 'Önbellekteki sonuçlar' : '');
                results[site.id] = value.next || null;
                update();
                if (kind === 'search')
                  return self.enrich(
                    cards.filter(function (c) {
                      return c.type === 'series';
                    }),
                    token,
                    update,
                    false
                  );
              })
              .then(null, function (error) {
                if (token !== self.generation) return;
                state.status = /403|429|engell|erisim|erişim|Dogrulama/i.test(error.message)
                  ? 'blocked'
                  : 'error';
                state.message = C.safeMessage(error.message);
                results[site.id] = cursors[site.id] || null;
              })
              .then(function () {
                active--;
                done++;
                if (token !== self.generation) {
                  finish();
                  return;
                }
                update();
                start();
              });
          })(remaining.shift());
        }
        update();
      }
      start();
    });
  };
  Provider.prototype.home = function (force, notify) {
    return this.collect('home', {}, null, force, notify || this.onupdate);
  };
  Provider.prototype.list = function (query, next, force, notify) {
    return this.collect('list', query || {}, next, force, notify || this.onupdate);
  };
  Provider.prototype.search = function (text, force, next, notify) {
    if (typeof next === 'function') {
      notify = next;
      next = null;
    }
    text = root.CatalogUtils.clean(text);
    if (!text || text.length > 100)
      return Promise.reject(new Error('Arama 1–100 karakter olmalı.'));
    return this.collect('search', { text: text }, next, force, notify || this.onupdate);
  };
  Provider.prototype.options = function () {
    return Promise.resolve({
      type: [
        { value: '1', label: 'Filmler' },
        { value: '2', label: 'Diziler' }
      ],
      genres: [],
      years: [],
      lang: [],
      imdb: []
    });
  };
  Provider.prototype.seriesLanguage = function () {
    return Promise.resolve({ language: '' });
  };
  Provider.prototype.detail = function (card, force, requested) {
    var self = this,
      token = this.begin(),
      group = this.hub.group(card.canonicalId || card.contentId);
    if (!group) return Promise.reject(new Error('Ortak içerik kaydı bulunamadı.'));
    requested = requested || card.requestedVariant;
    var raw = this.hub.preferred(group, requested);
    if (!raw) return Promise.reject(new Error('İçeriğin site kaydı bulunamadı.'));
    if (card.resumeId && !requested) {
      var episode = this.hub.group(card.resumeId),
        episodeVariant = episode && this.hub.preferred(episode);
      if (episodeVariant) {
        var match = group.variants.filter(function (v) {
          return v.providerId === episodeVariant.providerId;
        })[0];
        if (match) raw = C.copy(match);
      }
    }
    var site = root.SiteRegistry.get(raw.providerId);
    if (!site || site.virtual) return Promise.reject(new Error('İçeriğin sitesi bulunamadı.'));
    var client;
    try {
      client = this.client(site);
    } catch (error) {
      return Promise.reject(error);
    }
    client.identity.active = raw.pageUrl.replace(/#.*$/, '');
    client.identity.value = null;
    return this.invoke(site, 'detail', [raw, force]).then(function (value) {
      if (token !== self.generation) throw cancelled();
      if (client.identity.value && client.identity.value.imdbId)
        value.imdbId = client.identity.value.imdbId;
      var g = self.hub.observeDetail(value, site.id);
      if (!g) throw new Error('Site içeriği ortak kütüphaneye bağlanamadı.');
      var result = C.copy(value),
        unified = self.hub.card(g.id);
      result.playback = C.copy(value);
      result.contentId = g.id;
      result.canonicalId = g.id;
      result.providerId = 'all';
      result.variants = unified.variants;
      result.selectedVariant = raw.contentId;
      result.providerNames = unified.providerNames;
      result.providerCount = unified.providerCount;
      result.episodes = result.episodes || [];
      result.episodes.forEach(function (e) {
        e.canonicalId = self.hub.resolveId(e.contentId);
      });
      if (card.resumeId) {
        var target = result.episodes.filter(function (e) {
          return e.canonicalId === self.hub.resolveId(card.resumeId);
        })[0];
        if (target) result.selectedEpisodeId = target.contentId;
      }
      self.hub.flush();
      return result;
    });
  };
  var site = {
    id: 'all',
    name: 'Tüm siteler',
    virtual: true,
    mark: 'TÜM',
    subtitle: 'Tek arama · ortak kütüphane',
    base: 'https://filmmerkezi.invalid',
    prefix: 'unified:',
    storagePrefix: 'unified.',
    contentTypes: ['movie', 'series'],
    collectionKeys: ['new'],
    Provider: Provider,
    Resolver: function () {
      throw new Error('Önce içerik sitesi seçilmeli.');
    },
    ui: {
      movieRail: 'Sitelerden yeni filmler',
      seriesRail: 'Sitelerden diziler',
      filterHint:
        'Ortak katalogda film ve dizi türü seçilir. Siteye özel filtreler kendi kataloglarında kullanılabilir.',
      defaultOrder: 'date'
    },
    collectionQuery: function (type) {
      return { type: type };
    },
    filterFields: function () {
      return ['type'];
    }
  };
  root.UnifiedProvider = Provider;
  root.UnifiedSite = site;
})(window);
