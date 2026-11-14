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
      if (Date.now() >= job.deadline) {
        job.finish(new Error('Ortak arama süresi doldu.'));
        continue;
      }
      this.running.push(job);
      job.started = true;
      job.run();
    }
  };
  Queue.prototype.request = function (owner, fn, deadline) {
    var self = this;
    return new Promise(function (resolve, reject) {
      var job = {
        owner: owner,
        deadline: deadline || self.deadline,
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
  Queue.prototype.cancel = function (owner, deferPump) {
    this.cancelling = (this.cancelling || 0) + 1;
    try {
      this.pending.concat(this.running).filter(function (j) {
        return !owner || j.owner === owner;
      }).forEach(function (j) { j.finish(cancelled()); });
    } finally {
      this.cancelling--;
      if (!deferPump) this.pump();
    }
  };
  function capture(provider, queue, identity, ownDeadline, site) {
    var originals = [], wrappers = [];
    ['network', 'client'].forEach(function (field) {
      var original = provider[field];
      if (!original || typeof original.get !== 'function') return;
      var found = originals.indexOf(original);
      if (found >= 0) { provider[field] = wrappers[found]; return; }
      var owner = {}, wrapped = {}, generation = 0, tickets = [];
      originals.push(original); wrappers.push(wrapped);
      ['get', 'post'].forEach(function (method) {
        if (typeof original[method] !== 'function') return;
        wrapped[method] = function () {
          var args = Array.prototype.slice.call(arguments), token = generation;
          return queue.request(owner, function () {
            if (token !== generation) throw cancelled();
            var policy = {}, input = args[3] || {}, deadline;
            Object.keys(input).forEach(function (key) { policy[key] = input[key]; });
            deadline = Math.min(ownDeadline ? Infinity : queue.deadline, provider.deadline || Infinity, input.deadline || Infinity);
            if (Date.now() >= deadline) throw new Error('Ortak arama süresi doldu.');
            policy.deadline = deadline;
            policy.timeoutMs = Math.max(1, Math.min(input.timeoutMs || input.timeout || 30000, deadline - Date.now()));
            if (identity.active && identity.counted && queue.validations !== undefined) {
              if (queue.validations >= 12) throw new Error('Kimlik doğrulama bütçesi doldu.');
              queue.validations++;
            }
            args[3] = policy;
            var availability = root.CatalogSiteAvailability,
              ticket = site && availability ? availability.acquire(site.id) : null;
            if (ticket) { ticket.timeoutMs = policy.timeoutMs; ticket.startedAt = Date.now(); ticket.deadline = deadline; tickets.push(ticket); }
            function release() { var i = tickets.indexOf(ticket); if (i >= 0) tickets.splice(i, 1); }
            return Promise.resolve().then(function () {
              if (token !== generation) throw cancelled();
              return original[method].apply(original, args);
            }).then(function (response) {
              release();
              if (token !== generation) throw cancelled();
              if (ticket) availability.success(ticket);
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
            }, function (error) {
              release();
              if (token !== generation) error = cancelled();
              if (ticket) availability.failure(ticket, error);
              throw error;
            });
          }, ownDeadline ? provider.deadline : undefined);
        };
      });
      wrapped.catalogTimedOut = function () {
        var error = new Error('Site yanıtı zamanında alınamadı.');
        error.stage = 'timeout'; error.code = 'site-access-timeout';
        tickets.splice(0).forEach(function (ticket) {
          if (Date.now() - ticket.startedAt >= 3000)
            root.CatalogSiteAvailability.failure(ticket, error);
          else root.CatalogSiteAvailability.failure(ticket, cancelled());
        });
        return error;
      };
      wrapped.cancel = function () {
        generation++;
        tickets.splice(0).forEach(function (ticket) { root.CatalogSiteAvailability.failure(ticket, cancelled()); });
        try {
          if (typeof original.cancel === 'function') original.cancel();
        } finally {
          queue.cancel(owner);
        }
      };
      provider[field] = wrapped;
    });
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
      capture(value, this.queue, identity, false, site);
      this.clients[site.id] = { provider: value, identity: identity };
    }
    return this.clients[site.id];
  };
  Provider.prototype.cancel = function () {
    this.generation++;
    this.identityPending = {};
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
    this.identityPending = {};
    this.identityUsed = {};
    this.identityCount = 0;
    this.queue.validations = 0;
    this.lastAlternateSearchCount = 0;
    this.searchCandidates = {};
    this.metadataPromise = null;
    return this.generation;
  };
  Provider.prototype.isIdle = function () {
    return !this.running.length && !this.queue.running.length && !this.queue.pending.length;
  };
  Provider.prototype.invoke = function (site, method, args, timeoutMs, identityOnly) {
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
      var operationDeadline = Math.min(self.deadline, Date.now() + (timeoutMs || 26000));
      p.deadline = timeoutMs ? operationDeadline : self.deadline;
      var detailOperation = method === 'detail' || method === 'identity',
        identityClient = self.client(site);
      if (detailOperation && args[0]) {
        identityClient.identity.active = (root.SiteAddresses ? root.SiteAddresses.resolve(args[0].pageUrl) : args[0].pageUrl).replace(/#.*$/, '');
        identityClient.identity.value = null;
        identityClient.identity.counted = identityOnly === true;
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
          else try {
            var result = detailOperation ? root.ContentIdentity.attachDetail(v, identityClient.identity.value) : v;
            if (identityOnly && result) {
              delete result.episodes;
              delete result.seasons;
              delete result.selectedEpisodeId;
              delete result.selectedEpisodePageUrl;
            }
            resolve(result);
          } catch (error) { reject(error); }
        };
      self.running.push(end);
      timer = setTimeout(
        function () {
          var timeoutError, seen = [];
          ['network', 'client'].forEach(function (name) {
            var network = p[name];
            if (network && seen.indexOf(network) < 0 && network.catalogTimedOut) {
              seen.push(network);
              var error = network.catalogTimedOut();
              if (!timeoutError || error.cooldownUntil) timeoutError = error;
            }
          });
          try {
            if (typeof p.cancel === 'function') p.cancel();
          } catch (ignore) {}
          end(timeoutError || new Error('Site yanıtı zamanında alınamadı.'));
        },
        Math.max(1, Math.min(26000, operationDeadline - Date.now()))
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
  Provider.prototype.enrich = function (cards, token, update, finalPass, stopAt) {
    if (token !== this.generation || this.hub.merging === false) return Promise.resolve();
    var self = this,
      I = root.ContentIdentity,
      pending = this.identityPending || (this.identityPending = {});
    (cards || []).forEach(function (card) {
      if (card && card.pageUrl) pending[card.providerId + '|' + card.pageUrl.replace(/#.*$/, '')] = card;
    });
    if (finalPass === undefined) finalPass = true;
    // Keep most of the bounded detail budget for conflicts revealed by later sites.
    if (!finalPass && self.identityCount >= 4) return Promise.resolve();
    if (this.metadataPromise)
      return finalPass
        ? this.metadataPromise.then(function () {
            return self.enrich(null, token, update, true, stopAt);
          })
        : this.metadataPromise;
    var used = this.identitySeen || (this.identitySeen = {}),
      busy = {},
      jobs = [];
    cards = Object.keys(pending).map(function (key) { return pending[key]; });
    cards.forEach(function (card) {
      if (!card) return;
      var key = card.providerId + '|' + card.pageUrl.replace(/#.*$/, '');
      if (card.type === 'episode' || used[key]) { delete pending[key]; return; }
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
      if (facts.evidence.checkedAt > Date.now() - 86400000 &&
          (facts.imdbId || (facts.yearVerified && facts.typeVerified))) { delete pending[key]; return; }
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
        (stopAt && Date.now() + 250 >= stopAt) ||
        self.identityCount >= (stopAt ? 8 : 12) || self.queue.validations >= 12
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
        site = root.SiteRegistry.get(card.providerId),
        key = card.providerId + '|' + card.pageUrl.replace(/#.*$/, '');
      if (!site || used[key]) return lane();
      used[key] = true;
      delete pending[key];
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
        .invoke(site, method, [card, !card.identityEvidence], stopAt ? Math.max(1, stopAt - Date.now()) : undefined, true)
        .then(
          function (value) {
            if (token !== self.generation) return;
            Object.keys(value).forEach(function (key) {
              card[key] = value[key];
            });
            used[card.providerId + '|' + card.pageUrl.replace(/#.*$/, '')] = true;
            if (!self.searchText || self.searchCandidates && self.searchCandidates[card.contentId] || I.relevant(cards, self.searchText).indexOf(card) >= 0)
              self.hub.observeDetail(value, site.id);
            return update(true, card);
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
          !s.virtual && (!query.quickQueries || !!query.quickQueries[s.id]) && (!query.type || !s.contentTypes || s.contentTypes.indexOf(query.type) >= 0)
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
      var cards = remote ? remote.filter(snapshotCards, remoteSession.selected) : snapshotCards,
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
      enrichment = false,
      metadataWaiting = {},
      changedIdentities = {};
    this.searchText = query.text || '';
    var remote = kind === 'search' && self.hub.metadata, remoteSession = remote && remote.session(self.queue, self.deadline, query.text, self.selectedMetadataRef);
    self.selectedMetadataRef = null;
    function rememberIdentity(card) {
      var group = self.hub.group(card.contentId), old;
      if (!group) return;
      old = group.variants.filter(function (v) { return v.contentId === card.contentId; })[0];
      if (!old || old.pageUrl !== card.pageUrl) return;
      var e = root.ContentIdentity.evidence(old);
      if (!e.detailChecked || !e.checkedAt || e.checkedAt < Date.now() - 86400000) return;
      if (!root.ContentIdentity.evidence(card).detailChecked) {
        card.identityEvidence = C.copy(e);
        if (!card.originalTitle && old.originalTitle) card.originalTitle = old.originalTitle;
      }
    }
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
      cards.forEach(function (card) {
        var key = card.providerId + '|' + card.pageUrl.replace(/#.*$/, '');
        metadataWaiting[key] = card;
        if (self.hub.merging !== false) self.identityPending[key] = card;
      });
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
        var dirty = Object.keys(changedIdentities),
          work = self.hub.merging === false || !dirty.length ? Promise.resolve() : self.hub.reconcileAsync
          ? self.hub.reconcileAsync(dirty, function () {
              return token === self.generation;
            })
          : Promise.resolve(self.hub.reconcile(dirty));
        work.then(
          function () {
            if (token !== self.generation) {
              settled = true;
              reject(cancelled());
              return;
            }
            var result = snapshot();
            if (remoteSession && remoteSession.selected && !result.cards.length) result.searchNotice = root.FilmI18n && root.FilmI18n.language() === 'en' ? 'Not found on active sites.' : 'Etkin sitelerde bulunamad\u0131.';
            else if (remoteSession && remoteSession.selected && result.cards.some(function (card) { return card.searchMatch === 'possible'; }))
              result.searchNotice = root.FilmI18n && root.FilmI18n.language() === 'en' ? 'Possible matches are also shown; their identity is not confirmed.' : 'Olası eşleşmeler de gösteriliyor; kimlikleri henüz doğrulanmadı.';
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
      function metadataUpdate(immediate, card) {
        if (token !== self.generation || settled) return Promise.resolve();
        if (card && card.contentId) changedIdentities[card.contentId] = true;
        return admitRelevant().then(function () {
          update(immediate);
        });
      }
      function identityUpdate(immediate, card) {
        if (card && card.pageUrl) metadataWaiting[card.providerId + '|' + card.pageUrl.replace(/#.*$/, '')] = card;
        return metadataUpdate(immediate, card);
      }
      function takeMetadata() {
        var cards = Object.keys(metadataWaiting).map(function (key) { return metadataWaiting[key]; });
        metadataWaiting = {};
        return cards;
      }
      function searchAlternatives() {
        if (kind !== 'search' || next || self.hub.merging === false && !(remote && remote.enabled())) return Promise.resolve();
        var I = root.ContentIdentity, seeds = received.slice(), seen = {}, jobs = [], count = 0;
        // Reuse bounded identity-index hits, never scan the whole saved catalog.
        (self.hub.keys['name|' + I.name(query.text)] || []).slice(0, 8).forEach(function (id) {
          var group = self.hub.group(id);
          if (group) seeds = seeds.concat(group.variants);
        });
        if (remote && remote.enabled()) I.referenceSearchNames(remoteSession.references, query.text, remoteSession.selected).forEach(function (alias) {
          sites.forEach(function (site) {
            var state = states.filter(function (s) { return s.id === site.id; })[0];
            if (jobs.length >= 8 || seen[site.id] || !state || state.status === 'blocked' || state.status === 'error' ||
                site.contentTypes && site.contentTypes.indexOf(alias.type) < 0) return;
            if (received.some(function (card) {
              var ref = I.reference(card);
              return card.providerId === site.id && ref && ref.id === alias.reference.id && ref.type === alias.reference.type;
            })) return;
            seen[site.id] = true;
            jobs.push({ site: site, alias: alias.text });
          });
        });
        I.searchNames(seeds, query.text).forEach(function (alias) {
          var group = self.hub.group(alias.contentId);
          sites.forEach(function (site) {
            if (jobs.length >= 8 || seen[site.id] || !group ||
                (site.contentTypes && site.contentTypes.indexOf(group.type) < 0) ||
                group.variants.some(function (v) {
                  return v.providerId === site.id && received.some(function (c) { return c.contentId === v.contentId; });
                })) return;
            var state = states.filter(function (s) { return s.id === site.id; })[0];
            if (state.status === 'blocked' || state.status === 'error') return;
            seen[site.id] = true;
            jobs.push({ site: site, alias: alias.text });
          });
        });
        function lane() {
          if (token !== self.generation || Date.now() + 500 >= self.deadline || !jobs.length) return Promise.resolve();
          var job = jobs.shift(); count++;
          return self.invoke(job.site, 'search', [job.alias, force, null], Math.min(5000, self.deadline - Date.now())).then(function (value) {
            if (token !== self.generation || !value || !Array.isArray(value.cards)) return;
            value.cards.slice(0, 80).forEach(function (card) {
              if (!card || typeof card.contentId !== 'string' || typeof card.title !== 'string' ||
                  received.some(function (v) { return v.contentId === card.contentId; })) return;
              card.providerId = job.site.id;
              rememberIdentity(card);
              received.push(card);
            });
            return metadataUpdate(true);
          }, function () {}).then(lane);
        }
        return Promise.all([lane(), lane()]).then(function () { self.lastAlternateSearchCount = count; });
      }
      function start() {
        if (token !== self.generation) {
          finish();
          return;
        }
        if (!active && !remaining.length) {
          if (!enrichment && (self.hub.merging !== false || remote)) {
            enrichment = true;
            active++;
            update();
            self.enrich(null, token, identityUpdate, true,
              kind === 'search' && !next ? self.deadline - 7000 : undefined).then(function () {
                return remote ? remote.enrich(takeMetadata(), remoteSession, metadataUpdate) : null;
              }).then(function () {
                return searchAlternatives();
              }).then(function () {
                return self.enrich(null, token, identityUpdate, true);
              }).then(function () {
                return remote ? remote.enrich(takeMetadata(), remoteSession, metadataUpdate) : null;
              }).then(
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
                    : [query.quickQueries ? query.quickQueries[site.id] : query, cursors[site.id] || null, force];
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
                  rememberIdentity(c);
                });
                received = received.concat(cards);
                return admitRelevant().then(function () {
                  if (token !== self.generation) return;
                  state.status = value.searchNotice ? 'limited' : value.staleAt ? 'stale' : 'ready';
                  state.count = cards.length;
                  state.message =
                    value.searchNotice || (value.staleAt ? 'Önbellekteki sonuçlar' : '');
                  if (root.CatalogSiteAvailability && root.CatalogSiteAvailability.status(site.id).paused) {
                    state.status = 'paused';
                    state.pauseUntil = root.CatalogSiteAvailability.status(site.id).until;
                    state.message = root.CatalogSiteAvailability.message(site.id) + (value.staleAt ? ' · ' + state.message : '');
                  }
                  results[site.id] = value.next || null;
                  update();
                  if (kind === 'search' && self.hub.merging !== false)
                    self.enrich(null, token, identityUpdate, false).then(
                      function () {},
                      function () {}
                    );
                });
              })
              .then(null, function (error) {
                if (token !== self.generation) return;
                state.status = error.sitePaused || error.cooldownUntil ? 'paused' : /403|429|engell|erisim|erişim|Dogrulama/i.test(error.message)
                  ? 'blocked'
                  : 'error';
                state.message = C.safeMessage(error.message);
                if (error.cooldownUntil) {
                  state.pauseUntil = error.cooldownUntil;
                  if (!error.sitePaused) state.message += ' · ' + root.CatalogSiteAvailability.message(site.id);
                }
                state.failureAt = Date.now(); state.failureStage = error.stage || kind; state.failureCode = error.code || error.type || state.status;
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
  Provider.prototype.completeSeries = function (result, selected, group, force, token) {
    var self = this;
    if (this.hub.merging === false || result.type !== 'series' || group.variants.length < 2)
      return Promise.resolve(result);
    var variants = C.copy(group.variants),
      details = [{ value: selected, providerId: selected.providerId ||
        (root.SiteRegistry.forContent(selected) || {}).id }],
      attempts = [], seen = {}, index = 0;
    seen[(selected.providerId || (root.SiteRegistry.forContent(selected) || {}).id) + '|' + selected.pageUrl] = true;
    function check() { if (token !== self.generation) throw cancelled(); }
    function next() {
      check();
      if (index >= variants.length) return Promise.resolve();
      var raw = variants[index++], site = root.SiteRegistry.get(raw.providerId),
        key = raw.providerId + '|' + raw.pageUrl;
      if (!site || site.virtual || seen[key]) return next();
      seen[key] = true;
      if (Date.now() >= self.deadline - 100) {
        attempts.push({ providerId: raw.providerId, status: 'incomplete' });
        return next();
      }
      var input = C.copy(raw); input.type = input.rawType || input.type;
      return self.invoke(site, 'detail', [input, force], Math.min(10000, self.deadline - Date.now())).then(function (value) {
        check();
        if (Date.now() >= self.deadline) throw new Error('Bölüm kontrolü süresi doldu.');
        if (!value || value.type !== 'series' || value.contentId !== raw.contentId || !value.pageUrl ||
            root.ContentIdentity.decide(raw, value).state === 'different' ||
            variants.some(function (v) { return root.ContentIdentity.decide(v, value).state === 'different'; }))
          throw new Error('Bölüm listesi aynı diziye ait değil.');
        var linked = self.hub.observeDetail(value, site.id);
        if (!linked || self.hub.resolveId(linked.id) !== self.hub.resolveId(group.id))
          throw new Error('Bölüm listesi ortak diziye bağlanamadı.');
        details.push({ value: value, providerId: site.id });
        attempts.push({ providerId: site.id, status: 'ready', count: (value.episodes || []).length });
      }, function (error) {
        check();
        attempts.push({ providerId: site.id, status: 'error', message: C.safeMessage(error.message) });
      }).then(null, function (error) {
        check();
        attempts.push({ providerId: site.id, status: 'error', message: C.safeMessage(error.message) });
      }).then(function () {
        return new Promise(function (resolve) { setTimeout(resolve, 0); });
      }).then(next);
    }
    return next().then(function () {
      check();
      var rows = {}, list = [], seasons = [], unknown = [], primary = selected.contentId;
      details.forEach(function (item) {
        var local = {};
        (item.value.episodes || []).forEach(function (e) {
          var ep = e && e.episode, site = e && root.SiteRegistry.forContent(e), key;
          if (!e || e.type !== 'episode' || !ep || ep.seriesId !== item.value.contentId ||
              !site || site.id !== item.providerId || (e.providerId && e.providerId !== site.id) ||
              !/^https?:\/\//i.test(e.pageUrl || '')) return;
          if (!(ep.season > 0) || ep.season % 1 || !(ep.number > 0) || ep.number % 1) {
            if (item.value.contentId === primary) unknown.push(C.copy(e));
            return;
          }
          key = ep.season + ':' + ep.number;
          if (!local[key]) local[key] = [];
          if (!local[key].some(function (v) { return v.contentId === e.contentId; })) local[key].push(e);
        });
        item.numbers = local;
        Object.keys(local).forEach(function (key) {
          // Conflicting links for one site's episode number are not guessed.
          if (local[key].length !== 1) return;
          var e = local[key][0];
          if (!rows[key]) { rows[key] = C.copy(e); list.push(rows[key]); rows[key].variants = []; }
          if (!rows[key].variants.some(function (v) { return v.contentId === e.contentId; }))
            rows[key].variants.push(C.copy(e));
        });
      });
      list.sort(function (a, b) { return a.episode.season - b.episode.season || a.episode.number - b.episode.number; });
      list.forEach(function (e, i) {
        e.canonicalId = self.hub.resolveId(e.contentId);
        e.providerNames = [];
        e.variants.forEach(function (v) {
          var site = root.SiteRegistry.forContent(v);
          if (site && e.providerNames.indexOf(site.name) < 0) e.providerNames.push(site.name);
        });
        e.providerCount = e.providerNames.length;
        e.episodeSourceExclusions = details.filter(function (item) {
          var found = item.numbers[e.episode.season + ':' + e.episode.number];
          return found ? found.length !== 1 : !item.value.episodePagesIncomplete;
        }).map(function (item) { return item.value.contentId; });
        if (seasons.indexOf(e.episode.season) < 0) seasons.push(e.episode.season);
        e.nextId = list[i + 1] ? list[i + 1].contentId : null;
      });
      result.episodes = list.concat(unknown);
      result.seasons = seasons;
      result.episodeSourceAttempts = attempts;
      result.episodeSourcesIncomplete = attempts.some(function (a) { return a.status !== 'ready'; }) ||
        details.some(function (d) { return d.value.episodePagesIncomplete; });
      if (list.length) result.seasonSourcePlayable = false;
      self.hub.flush();
      return result;
    });
  };
  Provider.prototype.detail = function (card, force, requested) {
    var self = this,
      token = this.begin(),
      group = this.hub.group(card.canonicalId || card.contentId);
    if (!group) return Promise.reject(new Error('Ortak içerik kaydı bulunamadı.'));
    requested = requested || card.requestedVariant ||
      (this.hub.merging === false && !/^unified:/.test(card.contentId) ? card.contentId : null);
    var raw = this.hub.preferred(group, requested),
      resume = card.resumeId && this.hub.group(card.resumeId),
      allowFallback = this.hub.merging !== false && !requested &&
        (group.type === 'movie' || group.type === 'series'),
      candidates = [],
      failures = [],
      visited = {};
    if (!raw) return Promise.reject(new Error('İçeriğin site kaydı bulunamadı.'));
    if (card.resumeId && (!resume || resume.type !== 'episode' ||
      !(resume.season > 0) || !(resume.number > 0) ||
      this.hub.resolveId(resume.parent) !== this.hub.resolveId(group.id)))
      return Promise.reject(new Error('Kaldığınız bölüm doğrulanamadı. Diziyi yeniden açıp bölümü seçin.'));
    if (resume && !requested) {
      var episodeVariant = this.hub.preferred(resume);
      if (episodeVariant) {
        var match = group.variants.filter(function (v) {
          return v.providerId === episodeVariant.providerId &&
            (!v.sourceSeason || Number(v.sourceSeason) === resume.season);
        })[0];
        if (match) raw = C.copy(match);
      }
    }
    var initialProvider = raw.providerId;
    candidates.push(raw);
    if (allowFallback) group.variants.forEach(function (v) {
      if (v.contentId !== raw.contentId &&
        (!resume || !v.sourceSeason || Number(v.sourceSeason) === resume.season))
        candidates.push(C.copy(v));
    });
    function exhausted(timedOut) {
      var prefix = timedOut ? 'İçerik açma süresi doldu.' : 'Eşleşen sitelerden içerik açılamadı.',
        detail = failures.map(function (f) { return f.providerName + ': ' + f.message; }).join(' · '),
        error = new Error(prefix + (detail ? ' ' + detail : ''));
      error.detailAttempts = C.copy(failures);
      return error;
    }
    function next() {
      if (token !== self.generation) return Promise.reject(cancelled());
      if (Date.now() >= self.deadline) return Promise.reject(exhausted(true));
      if (!candidates.length) return Promise.reject(exhausted(false));
      var candidate = candidates.shift(),
        key = candidate.providerId + '|' + candidate.pageUrl;
      if (visited[key]) return next();
      visited[key] = true;
      var site = root.SiteRegistry.get(candidate.providerId),
        work;
      if (!site || site.virtual) work = Promise.reject(new Error('İçeriğin sitesi bulunamadı.'));
      else {
        var sourceCard = C.copy(candidate); sourceCard.type = sourceCard.rawType || sourceCard.type;
        work = self.invoke(site, 'detail', [sourceCard, force], allowFallback && candidates.length ? 10000 : 26000);
      }
      if (self.hub.metadata) work = work.then(function (value) { return self.hub.metadata.detail(value, self.queue, self.deadline); });
      return work.then(function (value) {
        if (token !== self.generation) throw cancelled();
        if (Date.now() >= self.deadline) throw exhausted(true);
        if (!value || !value.contentId || !value.pageUrl)
          throw new Error('Site geçerli içerik detayı döndürmedi.');
        var client = self.client(site);
        if (client.identity.value && client.identity.value.imdbId)
          value.imdbId = client.identity.value.imdbId;
        var target = null;
        if (failures.length || resume) {
          if (value.playbackUnavailableReason) throw new Error(value.playbackUnavailableReason);
          if (value.type !== group.type)
            throw new Error('Sitenin içerik türü ortak kayıttan farklı.');
          if (root.ContentIdentity.decide(candidate, value).state === 'different' ||
            group.variants.some(function (v) {
              return root.ContentIdentity.decide(v, value).state === 'different';
            }))
            throw new Error('Site detayı aynı yapıma ait değil.');
          if (failures.length && !root.ContentIdentity.compatible(value, group.variants))
            throw new Error('Site detayının aynı yapıma ait olduğu doğrulanamadı.');
        }
        if (resume) {
          var matches = (value.episodes || []).filter(function (e) {
            var episodeSite = e && root.SiteRegistry.forContent(e);
            return e && e.type === 'episode' && e.episode &&
              Number(e.episode.season) === resume.season &&
              Number(e.episode.number) === resume.number &&
              e.episode.seriesId === value.contentId &&
              (!e.providerId || e.providerId === site.id) &&
              (!episodeSite || episodeSite.id === site.id) &&
              /^https?:\/\//i.test(e.pageUrl || '');
          });
          if (matches.length !== 1)
            throw new Error(resume.season + '. sezon ' + resume.number + '. bölüm bu sitede doğrulanamadı.');
          target = matches[0];
        }
        var g = self.hub.observeDetail(value, site.id);
        if (!g) throw new Error('Site içeriği ortak kütüphaneye bağlanamadı.');
        if ((failures.length || resume) && self.hub.resolveId(g.id) !== self.hub.resolveId(group.id))
          throw new Error('Site detayı aynı yapıma bağlanamadı.');
        var result = C.copy(value),
          unified = self.hub.card(self.hub.merging === false ? candidate.contentId : g.id);
        result.playback = C.copy(value);
        result.contentId = g.id;
        result.canonicalId = g.id;
        result.providerId = 'all';
        result.variants = unified.variants;
        result.selectedVariant = candidate.contentId;
        result.providerNames = unified.providerNames;
        result.providerCount = unified.providerCount;
        result.type = unified.type;
        result.title = unified.title;
        result.originalTitle = unified.originalTitle || result.originalTitle;
        result.seasonSources = unified.variants.filter(function (v) {
          return Number(v.sourceSeason) > 0;
        });
        result.seasonSourcePlayable =
          result.type === 'series' && (value.rawType || value.type) === 'movie' && Number(candidate.sourceSeason) > 0;
        result.sourceSeason = Number(candidate.sourceSeason) || null;
        result.episodes = result.episodes || [];
        result.episodes.forEach(function (e) {
          e.canonicalId = self.hub.resolveId(e.contentId);
        });
        if (target) result.selectedEpisodeId = target.contentId;
        if (failures.length) {
          result.detailFallback = {
            fromProviderId: initialProvider,
            providerId: site.id,
            providerName: site.name
          };
          result.detailAttempts = C.copy(failures);
        }
        self.hub.flush();
        return self.completeSeries(result, value, g, force, token);
      }).then(null, function (error) {
        error = error || new Error('Site yanıtı alınamadı.');
        if (token !== self.generation || error.cancelled) throw cancelled();
        failures.push({
          providerId: candidate.providerId,
          providerName: site ? site.name : candidate.providerId,
          message: C.safeMessage(error.message || 'Site yanıtı alınamadı.')
        });
        if (!allowFallback) throw error;
        return next();
      });
    }
    return next();
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
  root.CatalogWire = { Queue: Queue, capture: capture };
  root.UnifiedProvider = Provider;
  root.UnifiedSite = site;
})(window);
