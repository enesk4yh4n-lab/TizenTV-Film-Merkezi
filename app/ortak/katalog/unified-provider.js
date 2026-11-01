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
    if (this.paused || this.cancelling) return;
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
    this.cancelling = (this.cancelling || 0) + 1;
    try {
      this.pending.concat(this.running).filter(function (j) {
        return !owner || j.owner === owner;
      }).forEach(function (j) { j.finish(cancelled()); });
    } finally {
      this.cancelling--;
      this.pump();
    }
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
    this.deadline = Date.now() + 30000;
    this.budgetMs = 30000;
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
    this.deadline = Math.max(Date.now() + 1, this.deadline || Date.now() + 30000);
    this.queue.deadline = this.deadline;
    this.identitySeen = {};
    this.identityUsed = {};
    this.identityCount = 0;
    this.searchCandidates = {};
    this.metadataPromise = null;
    return this.generation;
  };
  Provider.prototype.isIdle = function () {
    return !this.running.length && !this.queue.running.length && !this.queue.pending.length;
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
      var detailOperation = method === 'detail' || method === 'identity',
        identityClient = self.client(site);
      if (detailOperation && args[0]) {
        identityClient.identity.active = args[0].pageUrl.replace(/#.*$/, '');
        identityClient.identity.value = null;
      }
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
          else
            resolve(
              detailOperation
                ? root.ContentIdentity.attachDetail(v, identityClient.identity.value)
                : v
            );
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
  Provider.prototype.enrich = function (cards, token, update, finalPass) {
    if (this.hub.merging === false) return Promise.resolve();
    var self = this,
      I = root.ContentIdentity;
    if (finalPass === undefined) finalPass = true;
    // Keep most of the bounded detail budget for conflicts revealed by later sites.
    if (!finalPass && self.identityCount >= 4) return Promise.resolve();
    if (this.metadataPromise)
      return finalPass
        ? this.metadataPromise.then(function () {
            return self.enrich(cards, token, update, true);
          })
        : this.metadataPromise;
    var used = this.identitySeen || (this.identitySeen = {}),
      busy = {},
      jobs = [];
    cards.forEach(function (card) {
      if (!card || card.type === 'episode' || used[card.pageUrl]) return;
      if (
        self.searchText &&
        card.type !== 'collection' &&
        !I.score(card, self.searchText) &&
        !self.searchCandidates[card.contentId]
      )
        return;
      var group = self.hub.group(card.contentId),
        facts = I.analyze(card),
        candidates = {},
        collision = 0;
      I.keys(card).forEach(function (k) {
        (self.hub.keys[k] || []).forEach(function (id) {
          candidates[id] = true;
        });
      });
      collision = Object.keys(candidates).length;
      // Numberless names nominate detail checks only; they never decide a merge.
      var numberedSplit = false;
      facts.names.forEach(function (n) {
        var plain = n.key.replace(/(?:^| )[1-9]\d*(?= |$)/g, ' ').replace(/\s+/g, ' ').replace(/^ | $/g, '');
        if (plain && plain !== n.key)
          (self.hub.keys['name|' + plain] || []).forEach(function (id) {
            if (!group || id !== group.id) numberedSplit = true;
          });
      });
      var priority =
        (self.searchText &&
        facts.names.some(function (n) {
          return n.key === I.name(self.searchText);
        })
          ? 60
          : 0) +
        (card.type === 'collection' ? 40 : 0) +
        (collision > 1 ? 30 : 0) +
        (numberedSplit ? 80 : 0) -
        (group && group.variants.length > 1 && !numberedSplit ? 35 : 0) -
        (facts.evidence.detailChecked && facts.imdbId && facts.year && facts.typeVerified && collision < 2 ? 60 : 0) +
        (!facts.year ? 12 : 0) +
        (!facts.year && facts.type === 'series' ? 20 : 0) +
        (facts.type === 'series' && /\b\d+\s*\.?\s*(?:bolum|episode)\b/.test(I.name(card.title)) ? 45 : 0) +
        (facts.seriesHint ? 10 : 0) +
        (facts.names.some(function (n) {
          return n.kind === 'brand';
        })
          ? 8
          : 0) +
        (/\b\d+\b/.test(I.name(facts.title)) || facts.names.length > 1 ? 3 : 0) +
        (/\b1\b/.test(I.name(facts.title)) && !facts.imdbId ? 20 : 0) +
        (!facts.imdbId ? 1 : 0);
      if ((group || card.type === 'collection') && priority > 1)
        jobs.push({ card: card, priority: priority });
    });
    jobs.sort(function (a, b) {
      return b.priority - a.priority;
    });
    if (!finalPass) jobs = jobs.slice(0, 1);
    if (!jobs.length) return Promise.resolve();
    function lane() {
      if (
        token !== self.generation ||
        Date.now() + 250 >= self.deadline ||
        self.identityCount >= 12
      )
        return Promise.resolve();
      var index = -1;
      jobs.some(function (j, i) {
        if (!busy[j.card.providerId]) {
          index = i;
          return true;
        }
        return false;
      });
      if (index < 0) return Promise.resolve();
      var card = jobs.splice(index, 1)[0].card,
        site = root.SiteRegistry.get(card.providerId);
      if (!site || used[card.pageUrl]) return lane();
      used[card.pageUrl] = true;
      self.identityCount++;
      busy[site.id] = true;
      var method;
      try {
        method = typeof self.client(site).provider.identity === 'function' ? 'identity' : 'detail';
      } catch (ignore) {
        delete busy[site.id];
        return lane();
      }
      return self
        .invoke(site, method, [card, !card.identityEvidence])
        .then(
          function (value) {
            if (token !== self.generation) return;
            Object.keys(value).forEach(function (key) {
              card[key] = value[key];
            });
            if (!self.searchText || I.relevant(cards, self.searchText).indexOf(card) >= 0)
              self.hub.observeDetail(value, site.id);
            return update(true);
          },
          function () {}
        )
        .then(function () {
          delete busy[site.id];
          return lane();
        });
    }
    this.metadataPromise = Promise.all(finalPass ? [lane(), lane()] : [lane()]);
    return this.metadataPromise.then(
      function () {
        if (token === self.generation) self.metadataPromise = null;
      },
      function () {
        if (token === self.generation) self.metadataPromise = null;
      }
    );
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
      view = (next && next.resultSet) || new root.CatalogResultSet(this.hub.merging),
      ids = next && Array.isArray(next.ids) ? next.ids.slice() : [],
      cursors = (next && next.cursors) || {},
      remaining = sites.slice(),
      active = 0,
      done = loadErrors.length,
      results = {},
      snapshotCards = null,
      snapshotRevision = -1,
      snapshotIdCount = -1;
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
      if (kind === 'search')
        states.forEach(function (state) {
          state.count = received.filter(function (c) {
            return c.providerId === state.id && self.searchCandidates[c.contentId];
          }).length;
        });
      // Provider status changes do not require copying/indexing every card again.
      // This cache belongs only to this collection; identity mutations invalidate it.
      if (!snapshotCards || snapshotRevision !== self.hub.revision || snapshotIdCount !== ids.length) {
        var projected = Object.create(null);
        ids.forEach(function (id) {
          var card = self.hub.card(id);
          if (card) {
            projected[id] = projected[card.contentId] = card;
            view.remember(card);
          }
        });
        snapshotCards = view.snapshot(self.hub, projected);
        snapshotRevision = self.hub.revision;
        snapshotIdCount = ids.length;
      }
      var cards = snapshotCards,
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
      observedSources = {},
      admission = Promise.resolve(),
      enrichment = false;
    this.searchText = query.text || '';
    function admitRelevant() {
      var cards = (
        kind === 'search' ? root.ContentIdentity.relevant(received, query.text) : received
      ).filter(function (card) {
        self.searchCandidates[card.contentId] = true;
        if (observedSources[card.contentId]) return false;
        observedSources[card.contentId] = true;
        return true;
      });
      if (!cards.length) return admission;
      admission = admission
        .then(null, function () {})
        .then(function () {
          return new Promise(function (resolve, reject) {
            var index = 0;
            function step() {
              if (token !== self.generation) {
                resolve();
                return;
              }
              try {
                var chunk = cards.slice(index, index + 8);
                view.prepare(chunk, self.hub);
                self.hub.observeMany(chunk);
                chunk.forEach(function (card) {
                  var id = self.hub.merging === false ? card.contentId : self.hub.resolveId(card.contentId);
                  if (id && ids.indexOf(id) < 0) ids.push(id);
                });
                index += chunk.length;
                if (index < cards.length) setTimeout(step, 0);
                else resolve();
              } catch (error) {
                reject(error);
              }
            }
            step();
          });
        });
      return admission;
    }
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
        var work = self.hub.merging === false ? Promise.resolve() : self.hub.reconcileAsync
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
      function metadataUpdate(immediate) {
        if (token !== self.generation || settled) return Promise.resolve();
        return admitRelevant().then(function () {
          update(immediate);
        });
      }
      function start() {
        if (token !== self.generation) {
          finish();
          return;
        }
        if (!active && !remaining.length) {
          if (!enrichment && self.hub.merging !== false) {
            enrichment = true;
            active++;
            update();
            self.enrich(received, token, metadataUpdate, true).then(
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
                return admitRelevant().then(function () {
                  if (token !== self.generation) return;
                  state.status = value.searchNotice ? 'limited' : value.staleAt ? 'stale' : 'ready';
                  state.count = cards.length;
                  state.message =
                    value.searchNotice || (value.staleAt ? 'Önbellekteki sonuçlar' : '');
                  results[site.id] = value.next || null;
                  update();
                  if (kind === 'search' && self.hub.merging !== false)
                    self.enrich(received, token, metadataUpdate, false).then(
                      function () {},
                      function () {}
                    );
                });
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
  Provider.prototype.seriesLanguage = function (card) {
    var self = this, token = this.generation,
      group = card && this.hub.group(card.contentId),
      selected = this.hub.merging === false && card && (card.variants && card.variants[0] ? card.variants[0].contentId : card.contentId),
      preferred = group && this.hub.preferred(group, selected),
      variants = group ? group.variants.filter(function (v) {
        var site = root.SiteRegistry.get(v.providerId);
        return site && site.supportsSeriesLanguage && (!selected || v.contentId === selected);
      }).slice() : [];
    variants.sort(function (a, b) {
      return (b.providerId === (preferred && preferred.providerId) ? 1 : 0) -
        (a.providerId === (preferred && preferred.providerId) ? 1 : 0);
    });
    function next() {
      if (token !== self.generation || Date.now() >= self.deadline || !variants.length)
        return Promise.resolve({ language: '' });
      var raw = variants.shift(), site = root.SiteRegistry.get(raw.providerId);
      return self.invoke(site, 'seriesLanguage', [raw]).then(function (value) {
        if (token !== self.generation) throw cancelled();
        if (!value || !value.language || !value.languageReference) return next();
        var updated = C.copy(raw);
        updated.language = value.language;
        updated.languageReference = C.copy(value.languageReference);
        self.hub.observe(updated, site.id);
        return value;
      }, function (error) {
        if (token !== self.generation) throw cancelled();
        return next();
      });
    }
    return next();
  };
  Provider.prototype.detail = function (card, force, requested) {
    var self = this,
      token = this.begin(),
      group = this.hub.group(card.canonicalId || card.contentId);
    if (!group) return Promise.reject(new Error('Ortak içerik kaydı bulunamadı.'));
    requested = requested || card.requestedVariant ||
      (this.hub.merging === false && !/^unified:/.test(card.contentId) ? card.contentId : null);
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
        unified = self.hub.card(self.hub.merging === false ? raw.contentId : g.id);
      result.playback = C.copy(value);
      result.contentId = g.id;
      result.canonicalId = g.id;
      result.providerId = 'all';
      result.variants = unified.variants;
      result.selectedVariant = raw.contentId;
      result.providerNames = unified.providerNames;
      result.providerCount = unified.providerCount;
      result.type = unified.type;
      result.title = unified.title;
      result.originalTitle = unified.originalTitle || result.originalTitle;
      result.seasonSources = unified.variants.filter(function (v) {
        return Number(v.sourceSeason) > 0;
      });
      result.seasonSourcePlayable =
        result.type === 'series' && value.type === 'movie' && Number(raw.sourceSeason) > 0;
      result.sourceSeason = Number(raw.sourceSeason) || null;
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
