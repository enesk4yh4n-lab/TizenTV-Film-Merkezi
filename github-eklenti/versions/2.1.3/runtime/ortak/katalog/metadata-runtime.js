/* Shared optional metadata orchestration; provider and media contracts stay unchanged. */
(function (root) {
  'use strict';
  function Runtime(app, preferences) {
    this.app = app; this.preferences = preferences; this.tasks = []; this.owners = []; this.selected = null;
    var self = this;
    var nativeAvailable = root.FilmNativeTLS && (!root.FilmNativeTLS.supported || root.FilmNativeTLS.supported());
    var fallback = !nativeAvailable && root.ChainNetwork.createClient({ preferXHR: true });
    var transport = { get: function (url, referer, force, options) {
      if (fallback) return fallback.get(url, '', null, options);
      options.repositoryId = 'core-runtime'; options.pluginId = 'core';
      var task = root.FilmNativeTLS.request(url, '', options); self.tasks.push(task);
      function done() { var i = self.tasks.indexOf(task); if (i >= 0) self.tasks.splice(i, 1); }
      task.promise.then(done, done); return task.promise;
    }, cancel: function () { self.tasks.splice(0).forEach(function (task) { task.cancel(); }); if (fallback) fallback.cancel(); } };
    this.service = new root.MetadataService({ apiKey: (root.FilmMetadataConfig || {}).apiKey,
      storage: app.storage, enabled: this.enabled(), client: transport });
    this.suggestionService = { enabled: preferences.suggestions(), cancel: function () { self.cancel(); },
      search: function (query, type, context) {
        if (!preferences.suggestions()) return Promise.reject(new Error('Suggestions disabled'));
        var token = self.generation;
        return preferences.suggestionSource && preferences.suggestionSource().indexOf('site:') === 0 ?
          Promise.resolve().then(function () {
            if (token !== self.generation || !preferences.suggestions()) throw new Error('Suggestions cancelled');
            return self.siteSuggestions(query, type, context);
          }) : self.service.search(query, type, context);
      } };
    this.generation = 0;
  }
  Runtime.prototype.cancel = function () {
    this.generation++; this.service.cancel();
    if (this.siteSuggestionProvider && this.siteSuggestionProvider.cancel) this.siteSuggestionProvider.cancel();
    this.owners.splice(0).forEach(function (entry) { entry.queue.cancel(entry.owner, true); });
  };
  Runtime.prototype.context = function (queue, deadline, verification) {
    var self = this, token = this.generation, owner = {}, entry = { queue: queue, owner: owner };
    this.owners.push(entry);
    return { deadline: deadline, schedule: function (fn) { return queue.request(owner, fn, deadline); },
      take: function () {
        if (token !== self.generation) return false;
        if (!verification) return true;
        if (queue.validations >= 12) return false;
        queue.validations++; return true;
      } };
  };
  Runtime.prototype.suggestionContext = function () {
    var queue = this.app.provider && this.app.provider.queue;
    if (!queue) return { deadline: Date.now() + 5000 };
    if (!queue.running.length && !queue.pending.length) queue.paused = false;
    return this.context(queue, Date.now() + 5000, false);
  };
  Runtime.prototype.enabled = function () { return this.preferences.suggestions() &&
    (!this.preferences.suggestionSource || this.preferences.suggestionSource() === 'tmdb'); };
  Runtime.prototype.suggestionSources = function () {
    return [{ value: 'tmdb', label: 'TMDB' }].concat(root.SiteRegistry.sites.filter(function (site) {
      return site.suggestions === true && typeof site.Provider === 'function' && typeof site.Provider.prototype.suggest === 'function';
    }).map(function (site) { return { value: 'site:' + site.id, label: site.name, site: true }; }));
  };
  Runtime.prototype.configure = function () { this.cancel(); this.service.setEnabled(this.enabled()); this.suggestionService.enabled = this.preferences.suggestions(); };
  Runtime.prototype.siteSuggestions = function (query, type, context) {
    var self = this, selected = this.preferences.suggestionSource(), site = root.SiteRegistry.get(selected.slice(5)), token = this.generation, queue = this.app.provider && this.app.provider.queue;
    function unavailable(code) { var error = new Error(code); error.code = code; return Promise.reject(error); }
    if (!site || site.suggestions !== true || root.SiteRegistry.sites.indexOf(site) < 0 || !queue)
      return unavailable('suggestion-site-unavailable');
    if (!this.siteSuggestionProvider || this.siteSuggestionQueue !== queue || this.siteSuggestionId !== site.id) {
      if (this.siteSuggestionProvider && this.siteSuggestionProvider.cancel) this.siteSuggestionProvider.cancel();
      this.siteSuggestionProvider = new site.Provider(this.app.cache); this.siteSuggestionQueue = queue;
      this.siteSuggestionId = site.id;
      root.CatalogWire.capture(this.siteSuggestionProvider, queue, { active: '', counted: false }, true, site);
    }
    var provider = this.siteSuggestionProvider;
    if (typeof provider.suggest !== 'function') return unavailable('suggestion-site-update');
    provider.deadline = context && context.deadline || Date.now() + 5000;
    return Promise.resolve().then(function () { return provider.suggest(query); }).then(function (value) {
      if (token !== self.generation || !self.preferences.suggestions()) throw new Error('Suggestions cancelled');
      return (value.cards || []).filter(function (card) { return card && card.title &&
        (card.type === 'movie' || card.type === 'series') && (type === 'all' || !type || card.type === type); }).slice(0, 6).map(function (card) {
        var queryText = typeof card.searchQuery === 'string' && card.searchQuery.replace(/^\s+|\s+$/g, '');
        return { source: selected, title: card.title, year: card.year, type: card.type, sourceCard: card,
          searchQuery: queryText && queryText.length <= 100 ? queryText : query };
      });
    });
  };
  Runtime.prototype.suggestionCard = function (reference) {
    var site = reference.source && reference.source.indexOf('site:') === 0 && root.SiteRegistry.get(reference.source.slice(5)), card = reference.sourceCard;
    if (!site || root.SiteRegistry.sites.indexOf(site) < 0 || !card || typeof card.contentId !== 'string' ||
        card.contentId.indexOf(site.prefix) !== 0 || !/^https?:\/\//.test(card.pageUrl || '') ||
        !card.title || ['movie', 'series'].indexOf(card.type) < 0) return null;
    var copy = {};
    ['contentId', 'pageUrl', 'title', 'originalTitle', 'type', 'year', 'poster', 'imdb', 'language', 'titleAliases'].forEach(function (key) {
      if (card[key] !== undefined) copy[key] = root.PlayerCore.copy(card[key]);
    });
    copy.providerId = site.id;
    return copy;
  };
  Runtime.prototype.session = function (queue, deadline, query, selected) {
    var token = this.generation, session = { queue: queue, token: token, deadline: deadline, references: [], selected: selected };
    queue.validations = queue.validations || 0;
    session.context = this.context(queue, deadline, true);
    session.seed = !this.enabled() ? Promise.resolve([]) : selected ? Promise.resolve([selected]) :
      this.service.search(query, 'all', session.context).catch(function () { return []; });
    return session;
  };
  Runtime.prototype.enrich = function (cards, session, notify) {
    var self = this, I = root.ContentIdentity, seen = {}, rows = cards.slice();
    if (!this.enabled()) return Promise.resolve();
    function valid() { return self.enabled() && session.token === self.generation && Date.now() < session.deadline; }
    function apply(card, refs) {
      if (!valid()) return;
      var bound = I.bindReference(card, refs);
      if (!bound) return;
      Object.keys(bound).forEach(function (key) { card[key] = bound[key]; });
      self.app.hub.observe(card, card.providerId);
      if (notify) return notify(true);
    }
    function step() {
      if (!valid() || !rows.length || session.queue.validations >= 12) return Promise.resolve();
      var card = rows.shift(), facts = I.analyze(card), key = card.providerId + '|' + card.pageUrl;
      if (seen[key] || facts.type === 'episode' || facts.type === 'collection') return step();
      seen[key] = true;
      var cached = self.app.hub.group(card.contentId), prior;
      if (cached) prior = cached.variants.filter(function (v) { return v.contentId === card.contentId; })[0];
      if (prior && prior.metadataRef && prior.metadataRef.binding !== 'flexible' && prior.pageUrl === card.pageUrl &&
          I.evidence(prior).checkedAt > Date.now() - 86400000 &&
          I.name(prior.rawTitle || prior.title) === I.name(card.rawTitle || card.title)) {
        card.identityEvidence = root.PlayerCore.copy(prior.identityEvidence); card.metadataRef = I.reference(prior);
        ['title', 'originalTitle', 'type', 'year'].forEach(function (k) { if (prior.identityEvidence[k]) card[k] = prior.identityEvidence[k]; });
        self.app.hub.observe(card, card.providerId);
        return Promise.resolve(notify ? notify(true) : null).then(step);
      }
      var refs = facts.imdbId ? self.service.find(facts.imdbId, session.context) : Promise.resolve(session.references);
      return refs.then(function (values) {
        if (!valid()) return;
        var bound = I.bindReference(card, values);
        if (!bound && !facts.imdbId) return self.service.search(facts.title, 'all', session.context);
        return values;
      }).then(function (values) {
        if (!valid() || !values) return;
        var bound = I.bindReference(card, values);
        if (!bound) return;
        if (bound.metadataRef.binding === 'flexible') return apply(card, values);
        return self.service.detail(bound.metadataRef, session.context).then(function (detail) {
          return apply(card, detail);
        }, function () { return apply(card, values); });
      }).catch(function () {}).then(step);
    }
    return session.seed.then(function (refs) { session.references = refs; return step(); });
  };
  Runtime.prototype.detail = function (value, queue, deadline) {
    var self = this;
    if (!this.enabled() || !this.app.screen || this.app.screen.kind !== 'detail') return Promise.resolve(value);
    var selected = this.selected, session = this.session(queue, deadline, value.title, selected);
    return this.enrich([value], session).then(function () {
      if (value.type === 'series' && value.rawType === 'movie' && Number(value.sourceSeason) > 0 && !(value.episodes || []).length)
        value.seasonSourcePlayable = true;
      return value;
    });
  };
  Runtime.prototype.filter = function (cards, selected) {
    if (!selected) return cards;
    var I = root.ContentIdentity;
    return cards.filter(function (card) {
      var exact = false, possible = false;
      (card.variants || [card]).forEach(function (v) {
        var state = I.referenceMatch(v, selected);
        if (state === 'same') exact = true;
        else if (state !== 'different' && (I.score(v, selected.title) || I.score(v, selected.originalTitle))) possible = true;
      });
      card.searchMatch = exact ? 'confirmed' : 'possible';
      return exact || possible;
    }).map(function (card, index) { return { card: card, index: index }; }).sort(function (a, b) {
      return (a.card.searchMatch === 'possible' ? 1 : 0) - (b.card.searchMatch === 'possible' ? 1 : 0) || a.index - b.index;
    }).map(function (row) { return row.card; });
  };
  function Single(provider, site, runtime, hub) {
    this.base = provider; this.site = site; this.runtime = runtime; this.hub = hub;
    this.queue = new root.CatalogWire.Queue(); this.generation = 0; this.unifiedObserved = true;
    this.identity = { active: '', value: null }; this.timer = null; this.background = null;
    root.CatalogWire.capture(provider, this.queue, this.identity, false, site);
  }
  Single.prototype.cancel = function () {
    this.generation++; clearTimeout(this.timer); this.timer = null;
    this.identity.active = ''; this.identity.counted = false;
    this.queue.paused = true; this.queue.cancel();
    if (this.base.cancel) this.base.cancel();
    this.background = null;
  };
  Single.prototype.isIdle = function () { return !this.background && !this.queue.running.length && !this.queue.pending.length; };
  Single.prototype.verify = function (cards, session, token, query, update) {
    var self = this, I = root.ContentIdentity, rows = cards.slice(), seen = session.identitySeen || (session.identitySeen = {}),
      method = typeof this.base.identity === 'function' ? 'identity' : 'detail';
    if (!this.runtime.enabled() || typeof this.base[method] !== 'function') return Promise.resolve();
    function priority(card) { return I.score(card, query) + (session.selected ?
      I.score(card, session.selected.title) + I.score(card, session.selected.originalTitle) : 0); }
    rows.sort(function (a, b) { return priority(b) - priority(a); });
    function step() {
      if (token !== self.generation || !self.runtime.enabled() || Date.now() + 250 >= session.deadline ||
          self.queue.validations >= 10 || !rows.length) return Promise.resolve();
      var card = rows.shift(), facts = I.analyze(card);
      if (seen[card.pageUrl] || facts.type === 'episode' || facts.type === 'collection' ||
          facts.evidence.checkedAt > Date.now() - 86400000 && (facts.imdbId || facts.yearVerified && facts.typeVerified)) return step();
      seen[card.pageUrl] = true;
      var raw = root.PlayerCore.copy(card);
      raw.type = raw.rawType || raw.type;
      self.identity.active = raw.pageUrl; self.identity.value = null; self.identity.counted = true;
      return Promise.resolve().then(function () { return self.base[method](raw, true); }).then(function (value) {
        if (token !== self.generation) return;
        value = I.attachDetail(value, self.identity.value);
        delete value.episodes; delete value.seasons; delete value.selectedEpisodeId; delete value.selectedEpisodePageUrl;
        Object.keys(value).forEach(function (key) { card[key] = value[key]; });
        self.hub.observe(card, self.site.id); update();
        return self.runtime.enrich([card], session, update);
      }, function () {}).then(function () {
        if (token !== self.generation) return;
        self.identity.active = ''; self.identity.counted = false;
        return step();
      });
    }
    return Promise.resolve(session.seed).then(step);
  };
  ['home', 'list', 'options', 'seriesLanguage'].forEach(function (method) {
    Single.prototype[method] = function () {
      this.queue.paused = false; this.queue.deadline = this.deadline || Date.now() + 30000;
      this.base.deadline = this.queue.deadline;
      return this.base[method].apply(this.base, arguments);
    };
  });
  Single.prototype.search = function (query, force, next) {
    var self = this, token = this.generation;
    this.queue.paused = false; this.queue.deadline = this.deadline || Date.now() + 30000; this.queue.validations = 0;
    this.base.deadline = this.queue.deadline;
    var session = this.runtime.session(this.queue, this.queue.deadline, query, this.selectedMetadataRef);
    this.selectedMetadataRef = null;
    return this.base.search(query, force, next).then(function (value) {
      if (token !== self.generation) throw new Error('İptal edildi');
      self.hub.observeMany(value.cards || [], self.site.id);
      var originals = (value.cards || []).slice();
      value.cards = self.runtime.filter(originals, session.selected);
      function update() {
        var app = self.runtime.app;
        if (token === self.generation && app.screen && app.screen.kind === 'search' && app.screen.query === query && !app.suspended) {
          app.screen.items = self.runtime.filter(originals, session.selected);
          if (app.searchResultCards) app.screen.items = app.searchResultCards(app.screen.items, app.screen);
          app.screen.catalogRevision = (app.screen.catalogRevision || 0) + 1; app.render(true);
        }
      }
      self.timer = setTimeout(function () {
        self.timer = null;
        self.background = self.verify(originals, session, token, query, update).then(function () {
          return self.runtime.enrich(originals, session, update);
        }).then(function () {
          if (next || token !== self.generation || !self.runtime.enabled() || Date.now() + 500 >= session.deadline) return;
          var aliases = root.ContentIdentity.referenceSearchNames(session.references, query, session.selected);
          if (!aliases.length || self.site.contentTypes && self.site.contentTypes.indexOf(aliases[0].type) < 0) return;
          return self.base.search(aliases[0].text, force, null).then(function (extra) {
            if (token !== self.generation || Date.now() >= session.deadline) return;
            (extra.cards || []).slice(0, 80).forEach(function (card) {
              if (!originals.some(function (old) { return old.contentId === card.contentId; })) originals.push(card);
            });
            self.hub.observeMany(originals, self.site.id); update();
            return self.verify(originals, session, token, query, update).then(function () {
              return self.runtime.enrich(originals, session, update);
            });
          }, function () {});
        }).then(function () {
          self.background = null;
          var app = self.runtime.app;
          if (session.selected && token === self.generation && app.screen.kind === 'search' && app.screen.query === query && !app.screen.items.length) {
            app.screen.searchNotice = root.FilmI18n.language() === 'en' ? 'Not found on active sites.' : 'Etkin sitelerde bulunamadı.'; app.render(true);
          }
          else if (session.selected && token === self.generation && app.screen.kind === 'search' && app.screen.query === query) {
            app.screen.searchNotice = app.screen.items.some(function (card) { return card.searchMatch === 'possible'; }) ?
              (root.FilmI18n.language() === 'en' ? 'Possible matches are also shown; their identity is not confirmed.' : 'Olası eşleşmeler de gösteriliyor; kimlikleri henüz doğrulanmadı.') : '';
            app.render(true);
          }
        }, function () { self.background = null; });
      }, 0);
      return value;
    });
  };
  Single.prototype.detail = function (card, force) {
    var self = this, token = this.generation, raw = root.PlayerCore.copy(card);
    raw.type = raw.rawType || raw.type;
    this.queue.paused = false; this.queue.validations = 0;
    this.queue.deadline = this.deadline || Date.now() + 30000; this.base.deadline = this.queue.deadline;
    this.identity.active = raw.pageUrl; this.identity.value = null; this.identity.counted = false;
    return this.base.detail(raw, force).then(function (value) {
      if (token !== self.generation) throw new Error('İptal edildi');
      value = root.ContentIdentity.attachDetail(value, self.identity.value);
      return self.runtime.detail(value, self.queue, self.queue.deadline);
    }).then(function (value) {
      if (token !== self.generation) throw new Error('İptal edildi');
      self.identity.active = ''; self.hub.observeDetail(value, self.site.id); return value;
    }).then(null, function (error) { if (token === self.generation) self.identity.active = ''; throw error; });
  };
  root.CatalogMetadataSingle = Single;
  root.CatalogMetadata = Runtime;
})(window);
