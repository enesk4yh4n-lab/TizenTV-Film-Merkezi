/* Integrates the optional central library with the existing site catalogs and player contract. */
(function (root) {
  'use strict';
  function tr(value) {
    return root.FilmI18n ? root.FilmI18n.text(value) : value;
  }
  root.CatalogRuntime.register('unified', function (Base) {
    var C = root.PlayerCore,
      P = Object.create(Base.prototype);
    function n(tag, cls, value) {
      var e = document.createElement(tag);
      e.className = cls || '';
      if (value !== undefined) e.textContent = tr(value);
      return e;
    }
    function b(label, key, action, cls) {
      var e = n('button', cls || 'quiet-button', label);
      e.type = 'button';
      e.setAttribute('data-focus', key);
      e.onclick = action;
      return e;
    }
    function Series(hub) {
      this.hub = hub;
      this.data = hub.series.data;
    }
    Series.prototype.canonical = function (detail) {
      var hub = this.hub,
        c = C.copy(detail);
      c.contentId = hub.resolveId(detail.canonicalId || detail.contentId) || detail.contentId;
      c.episodes = (detail.episodes || []).map(function (e) {
        return hub.card(e.contentId) || e;
      });
      return c;
    };
    Series.prototype.get = function (id) {
      return this.hub.series.get(this.hub.resolveId(id) || id);
    };
    Series.prototype.entries = function (entries) {
      return this.hub.entries(entries);
    };
    Series.prototype.record = function (card, entry) {
      if (card) this.hub.series.record(this.hub.card(card.contentId) || card, entry);
    };
    Series.prototype.captureProgress = function (card) {
      return card ? this.hub.series.captureProgress(this.hub.card(card.contentId) || card) : null;
    };
    Series.prototype.following = function () {
      var hub = this.hub;
      return hub.series.following().map(function (c) {
        var row = hub.card(c.contentId) || c;
        row.newCount = c.newCount;
        row.checkedAt = c.checkedAt;
        return row;
      });
    };
    ['observe', 'follow', 'reset', 'acknowledge'].forEach(function (method) {
      Series.prototype[method] = function (detail, arg) {
        return this.hub.series[method](this.canonical(detail), arg);
      };
    });
    Series.prototype.mark = function (detail, episode, completed) {
      return this.hub.series.mark(
        this.canonical(detail),
        this.hub.card(episode.contentId) || episode,
        completed
      );
    };
    Series.prototype.clearMarks = function (ids) {
      var hub = this.hub;
      hub.series.clearMarks(
        ids
          ? ids.map(function (id) {
              return hub.resolveId(id) || id;
            })
          : null
      );
    };
    function App(app, storage) {
      var self = this;
      app.hub =
        app.hub ||
        new root.UnifiedHub(storage, app.store, function (m) {
          app.view.toast(m);
        });
      this.hub = app.hub;
      Base.call(this, app, storage);
      this.hub.decorate(this.library);
      this.decorateProvider();
      app.controller.on('open', function (content) {
        self.freezeUnified();
        if (content.referenceTrial) return;
        self.hub.observe(content);
        self.hub.choose(content.contentId, content.contentId);
        self.hub.flush();
      });
      app.controller.on('source', function (source) {
        var content = app.controller.content;
        if (!source || !content || !source.providerContentId) return;
        self.hub.choose(content.canonicalId || content.contentId, source.providerContentId);
        var d = self.screen && self.screen.detail;
        if (
          d &&
          d.variants &&
          d.variants.some(function (v) {
            return v.contentId === source.providerVariantId;
          })
        )
          d.selectedVariant = source.providerVariantId;
        self.hub.flush();
      });
      app.controller.on('close', function () {
        self.hub.flush();
      });
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
          self.freezeUnified();
          self.hub.flush();
        }
      });
      root.addEventListener('beforeunload', function () {
        self.hub.flush(true);
      });
    }
    App.prototype = P;
    App.prototype.constructor = App;
    var begin = P.begin,
      selectSite = P.selectSite,
      navigate = P.navigate,
      openDetail = P.openDetail,
      render = P.render,
      renderDetail = P.renderDetail,
      renderHome = P.renderHome,
      card = P.card,
      art = P.art,
      play = P.play,
      movieNavigation = P.movieNavigation,
      returnMovie = P.returnMovie,
      hydrateContinue = P.hydrateContinue,
      loadList = P.loadList,
      renderGrid = P.renderGrid;
    P.freezeUnified = function () {
      var s = this.screen,
        p = s && (s.unifiedProgress || (s.data && s.data.unifiedProgress));
      if (p && p.running) {
        p.running = false;
        p.cancelled = true;
        p.sites.forEach(function (site) {
          if (site.status === 'pending' || site.status === 'loading') site.status = 'cancelled';
        });
        s.loading = false;
      }
    };
    P.begin = function () {
      clearTimeout(this.unifiedDrawTimer);
      this.unifiedDrawTimer = null;
      this.freezeUnified();
      var token = begin.call(this),
        self = this;
      this.provider.deadline = Date.now() + (this.provider.budgetMs || 30000);
      if (this.site && this.site.virtual)
        this.provider.onupdate = function (value) {
          if (token === self.generation && !self.suspended) self.unifiedUpdate(value);
        };
      return token;
    };
    P.selectSite = function (site, landing) {
      this.unifiedLanding = landing || null;
      selectSite.call(this, site);
    };
    P.navigate = function (kind) {
      if (this.unifiedLanding) {
        kind = this.unifiedLanding;
        this.unifiedLanding = null;
      }
      if (this.hub) this.series = new Series(this.hub);
      if (this.hub && this.site.virtual) {
        this.library = new root.UnifiedLibrary(this.hub);
        this.provider.hub = this.hub;
      } else if (this.hub) {
        this.hub.decorate(this.library);
        this.decorateProvider();
        if (
          (kind === 'watchlist' || kind === 'following' || kind === 'history') &&
          root.SiteSelection
        ) {
          root.SiteSelection.choose('all', true, kind);
          return;
        }
      }
      if (kind === 'history' && this.hub) {
        this.hideKeyboard(false);
        this.closePanel(false);
        this.save();
        this.begin();
        this.history = [];
        this.screen = {
          kind: 'history',
          title: 'İzleme geçmişi',
          items: this.hub.history(),
          startRow: 0,
          scroll: 0,
          focusKey: 'nav-history'
        };
        this.render();
        return;
      }
      return navigate.call(this, kind);
    };
    P.decorateProvider = function () {
      var p = this.provider,
        hub = this.hub,
        site = this.site;
      if (!hub || site.virtual || p.unifiedObserved) return;
      p.unifiedObserved = true;
      var detail = p.detail;
      p.detail = function (card, force) {
        return detail.call(p, card, force).then(function (value) {
          hub.observeDetail(value, site.id);
          return value;
        });
      };
    };
    P.watchEntries = function () {
      var entries = this.hub ? this.hub.entries(this.app.store.list()) : this.app.store.list(),
        self = this;
      if (!this.site.virtual)
        entries = entries.filter(function (e) {
          return root.SiteSelection.belongs(e.contentId, self.siteId);
        });
      return entries;
    };
    P.hydrateContinue = function (screen, token) {
      if (!this.site.virtual) return hydrateContinue.call(this, screen, token);
      var self = this,
        missing = this.library
          .continueWatching(this.watchEntries())
          .filter(function (c) {
            return !c.poster && c.pageUrl;
          })
          .slice(0, 2);
      function next() {
        if (
          token !== self.generation ||
          self.screen !== screen ||
          self.suspended ||
          !missing.length ||
          Date.now() >= self.provider.deadline
        )
          return;
        self.provider.detail(missing.shift()).then(function () {
          if (token !== self.generation || self.screen !== screen || self.suspended) return;
          self.save();
          self.render(true);
          next();
        }, next);
      }
      next();
    };
    P.loadList = function (more, force) {
      if (this.screen && this.screen.kind === 'search') return this.search(force, more);
      if (!this.site.virtual) return loadList.call(this, more, force);
      var self = this,
        s = this.screen,
        previous = more ? s.next : null;
      if ((more && !previous) || s.kind !== 'list') return;
      this.save();
      var token = this.begin(),
        oldIds = (more ? s.items : []).map(function (c) {
          return c.contentId;
        });
      s.loading = true;
      s.error = null;
      if (!more) {
        s.items = [];
        s.next = null;
        s.startRow = 0;
        s.scroll = 0;
      }
      this.render(true);
      this.provider.list(s.query, previous, force).then(
        function (result) {
          if (token !== self.generation || self.screen !== s) return;
          s.items = result.cards;
          s.next = result.next;
          s.loading = false;
          s.unifiedProgress = result.unifiedProgress;
          var first = -1;
          s.items.some(function (c, i) {
            if (oldIds.indexOf(c.contentId) < 0) {
              first = i;
              return true;
            }
            return false;
          });
          if (more && first >= 0) {
            s.startRow = Math.max(0, Math.floor(first / 6) - 2);
            s.focusKey = 'card-' + first;
          }
          self.render(true);
          if (more && first >= 0) self.focus(s.focusKey);
        },
        function (e) {
          self.failure(e, s, token);
        }
      );
    };
    P.renderGrid = function (parent, s) {
      renderGrid.call(this, parent, s);
      if (this.site.virtual && s.unifiedProgress && s.unifiedProgress.running) {
        var end = parent.querySelector('.list-end');
        if (end) end.parentNode.removeChild(end);
      }
    };
    P.unifiedUpdate = function (value) {
      var s = this.screen;
      if (
        !s ||
        s.kind === 'detail' ||
        s.kind === 'watchlist' ||
        s.kind === 'following' ||
        s.kind === 'lab'
      )
        return;
      var self = this,
        first = s.kind === 'home' ? !s.data : !(s.items && s.items.length),
        scroll = document.getElementById('catalog-scroll').scrollTop,
        token = this.generation;
      if (s.kind === 'home') {
        if (!value.movies) return;
        s.data = value;
      } else {
        if (!value.cards) return;
        s.items = value.cards;
        s.searchNotice = value.searchNotice;
        s.next = value.unifiedProgress.running ? null : value.next;
      }
      s.unifiedProgress = value.unifiedProgress;
      s.catalogRevision = value.catalogRevision;
      s.loading = !!(
        value.unifiedProgress &&
        value.unifiedProgress.running &&
        !(s.kind === 'home' ? value.movies.length + value.series.length : value.cards.length)
      );
      s.scroll = scroll;
      function draw() {
        self.unifiedDrawTimer = null;
        if (self.screen !== s || self.generation !== token || self.suspended) return;
        if (
          (s.kind === 'search' || s.kind === 'list') &&
          s.catalogRevision &&
          s.catalogRevision === s.renderedCatalogRevision &&
          s.loading === s.renderedLoading &&
          s.searchNotice === s.renderedSearchNotice &&
          s.unifiedProgress &&
          s.unifiedProgress.running &&
          !s.error
        )
          self.renderUnifiedStatus();
        else self.render(true);
      }
      if (first && value.unifiedProgress.running) {
        clearTimeout(this.unifiedDrawTimer);
        draw();
      } else if (!this.unifiedDrawTimer) this.unifiedDrawTimer = setTimeout(draw, 120);
    };
    P.refreshUnifiedScreen = function () {
      var s = this.screen;
      if (!this.site || !this.site.virtual || !s) return;
      var active = document.activeElement,
        wanted = active && active.catalogCard,
        match = /^card-(\d+)$/.exec(s.focusKey || ''),
        visible = s.items && this.gridItems(s);
      if (!wanted && match && visible) wanted = visible[Number(match[1])];
      if (s.items) s.items = this.hub.refreshCards(s.items);
      if (s.kind === 'home' && s.data) {
        s.data.movies = this.hub.refreshCards(s.data.movies);
        s.data.series = this.hub.refreshCards(s.data.series);
        if (s.data.hero) s.data.hero = this.hub.card(s.data.hero.contentId) || s.data.hero;
      }
      this.unifiedFocusAfterRender =
        active && active.catalogCard && wanted ? this.hub.resolveId(wanted.contentId) : null;
      if (wanted && s.items) {
        var hub = this.hub,
          items = this.gridItems(s),
          id = hub.resolveId(wanted.contentId),
          index = items
            .map(function (c) {
              return hub.resolveId(c.contentId);
            })
            .indexOf(id);
        if (index >= 0) s.focusKey = 'card-' + index;
      }
    };
    P.render = function (restore) {
      if (this.suspended) return;
      clearTimeout(this.unifiedDrawTimer);
      this.unifiedDrawTimer = null;
      this.refreshUnifiedScreen();
      if (this.screen && this.screen.kind === 'history') this.screen.items = this.hub.history();
      render.call(this, restore);
      if (this.unifiedFocusAfterRender && !this.editing && !this.panel) {
        var nodes = document.querySelectorAll('.catalog-card');
        for (var fi = 0; fi < nodes.length; fi++)
          if (
            nodes[fi].catalogCard &&
            this.hub.resolveId(nodes[fi].catalogCard.contentId) === this.unifiedFocusAfterRender
          ) {
            this.focus(nodes[fi], false);
            break;
          }
      }
      if (!this.site || !this.site.virtual || !this.screen || this.suspended) return;
      var parent = document.getElementById('catalog-content'),
        s = this.screen,
        progress = s.unifiedProgress || (s.data && s.data.unifiedProgress);
      if (s.kind === 'history') {
        var tab = document.querySelector('[data-nav="history"]');
        if (tab) tab.className = 'nav-tab active';
        var empty = parent.querySelector('.catalog-empty');
        if (empty) empty.textContent = tr('İzleme geçmişiniz henüz boş.');
      }
      s.renderedCatalogRevision = s.catalogRevision;
      s.renderedLoading = s.loading;
      s.renderedSearchNotice = s.searchNotice;
      this.renderUnifiedStatus();
    };
    P.renderUnifiedStatus = function () {
      var s = this.screen,
        parent = document.getElementById('catalog-content'),
        progress = s && (s.unifiedProgress || (s.data && s.data.unifiedProgress));
      if (!this.site || !this.site.virtual || !progress || !parent || this.suspended) return;
      var status = parent.querySelector('.unified-status');
      if (!status) {
        status = n('section', 'unified-status');
        status.setAttribute('aria-live', 'polite');
        status.appendChild(n('span', ''));
        var self = this;
        status.appendChild(
          b('Site yanıtları', 'unified-status', function () {
            self.panel = {
              kind: 'unified-status',
              progress:
                self.screen.unifiedProgress ||
                (self.screen.data && self.screen.data.unifiedProgress),
              returnKey: 'unified-status'
            };
            self.renderPanel();
          })
        );
        parent.insertBefore(status, parent.firstChild);
      }
      status.firstChild.textContent = tr(
        progress.enriching
          ? 'Sonuçlar birleştiriliyor…'
          : progress.running
            ? 'Sitelerden sonuçlar geliyor · ' + progress.done + '/' + progress.total
            : progress.cancelled
              ? 'Arama durduruldu · ' + progress.done + '/' + progress.total + ' site'
              : 'Site yanıtları tamamlandı · ' + progress.total + ' site'
      );
    };
    P.renderHome = function (parent, s) {
      renderHome.call(this, parent, s);
      if (this.site.virtual && s.data && s.data.unifiedProgress && s.data.unifiedProgress.running)
        Array.prototype.forEach.call(parent.querySelectorAll('p.catalog-note'), function (e) {
          if (/alınamadı/.test(e.uiSourceText || e.textContent)) e.parentNode.removeChild(e);
        });
    };
    P.card = function (value, index, rail) {
      var e = card.call(this, value, index, rail);
      if (value.providerCount) {
        var badge = n('span', 'catalog-provider-badge', value.providerCount + ' site');
        e.appendChild(badge);
        e.setAttribute(
          'aria-label',
          tr(e.getAttribute('aria-label') + ' · ' + value.providerNames.join(', '))
        );
      }
      if (value.historyAt) {
        var meta = e.querySelector('.catalog-card-meta');
        meta.textContent = tr(
          meta.textContent +
            ' · ' +
            (value.historyCompleted ? 'İzlendi · ' : '') +
            (value.resumeLabel ? value.resumeLabel + ' · ' : '') +
            new Date(value.historyAt).toLocaleDateString('tr-TR')
        );
      }
      return e;
    };
    P.art = function (value, cls) {
      var e = art.call(this, value, cls),
        img = e.querySelector('img[data-art]');
      if (img && value.pageUrl) img.setAttribute('data-art-referer', value.pageUrl);
      return e;
    };
    P.movieNavigation = function (value, rail) {
      var nav = movieNavigation.call(this, value, rail),
        hub = this.hub;
      if (!this.site.virtual || !nav) return nav;
      var screen = this.screen,
        loaded =
          screen.kind === 'home' && screen.rails && screen.rails[rail]
            ? screen.rails[rail].items
            : this.gridItems(screen) || [],
        byId = Object.create(null);
      loaded.forEach(function (card) {
        byId[card.contentId] = card;
      });
      nav.items = nav.items
        .map(function (item) {
          var saved = byId[item.contentId],
            raw =
              hub.preferred(item.contentId) ||
              (saved &&
                saved.variants &&
                C.copy(
                  saved.variants.filter(function (v) {
                    return !!root.SiteRegistry.get(v.providerId);
                  })[0]
                ));
          if (!raw) return null;
          raw.canonicalId = hub.resolveId(item.contentId) || item.contentId;
          raw.type = 'movie';
          raw.sources = [];
          return raw;
        })
        .filter(Boolean);
      return nav;
    };
    P.openDetail = function (value, force, navigation) {
      if (this.site.virtual) {
        if (!this.hub.group(value.canonicalId || value.contentId)) {
          if (value.variants) this.hub.observeMany(value.variants);
          else this.hub.observe(value);
        }
        var canonical =
          this.hub.card(value.canonicalId || value.contentId) ||
          (value.variants && value.variants[0] && this.hub.card(value.variants[0].contentId));
        if (canonical) {
          if (value.resumeId) canonical.resumeId = value.resumeId;
          if (value.requestedVariant) canonical.requestedVariant = value.requestedVariant;
          else if (!/^unified:/.test(value.contentId)) canonical.requestedVariant = value.contentId;
          value = canonical;
        }
      }
      return openDetail.call(this, value, force, navigation);
    };
    P.renderDetail = function (parent, s) {
      renderDetail.call(this, parent, s);
      var d = s.detail,
        self = this;
      if (!d || !d.variants) return;
      s.card = this.hub.card(d.contentId) || s.card;
      var actions = parent.querySelector('.detail-actions'),
        row = n('section', 'detail-providers');
      row.appendChild(n('h2', '', 'İzlenecek site'));
      d.variants.forEach(function (v, i) {
        var site = root.SiteRegistry.get(v.providerId),
          label =
            (site ? site.name : v.providerId + ' · Kullanılamıyor') +
            (v.language ? ' · ' + v.language : '') +
            (d.selectedVariant === v.contentId ? ' · Seçili' : ''),
          button = b(
            label,
            'detail-provider-' + i,
            function () {
              self.changeUnifiedProvider(v.contentId);
            },
            d.selectedVariant === v.contentId ? 'tab selected' : 'tab'
          );
        button.disabled = !site;
        row.appendChild(button);
      });
      row.appendChild(
        b(
          s.findingSites ? 'Sitelerde aranıyor…' : 'Diğer sitelerde de bul',
          'detail-find-sites',
          function () {
            if (!s.findingSites) self.findUnifiedSites();
          }
        )
      );
      if (s.discoveryProgress)
        row.appendChild(
          n(
            'p',
            'catalog-note',
            s.findingSites
              ? 'Aranan siteler: ' + s.discoveryProgress.done + '/' + s.discoveryProgress.total
              : 'Eşleşen siteler güncellendi.'
          )
        );
      if (actions) actions.parentNode.insertBefore(row, actions);
      else parent.appendChild(row);
      if (d.playbackUnavailableReason && root.UnifiedPlayback) {
        var sample = (d.type === 'series' && d.episodes && d.episodes[0]) || d.playback,
          prepared = sample && root.UnifiedPlayback.prepare(sample, this.hub);
        if (prepared && prepared.sourceContext) {
          var pooledButton = this.findFocus('detail-play');
          if (pooledButton) {
            pooledButton.disabled = false;
            pooledButton.textContent = tr('Diğer sitelerden izle');
          }
        }
      }
      if (s.loading) {
        var playButton = this.findFocus('detail-play');
        if (playButton) playButton.disabled = true;
      }
    };
    P.changeUnifiedProvider = function (rawId) {
      var s = this.screen;
      if (!s || !s.detail) return;
      var self = this,
        token = this.begin(),
        card = C.copy(s.card);
      card.requestedVariant = rawId;
      s.loading = true;
      s.error = null;
      s.findingSites = false;
      s.focusKey = 'detail-play';
      this.render(true);
      this.provider.detail(card, false, rawId).then(
        function (d) {
          if (token !== self.generation || self.screen !== s) return;
          s.detail = d;
          s.card = self.hub.card(d.contentId);
          s.loading = false;
          s.season = d.seasons.indexOf(s.season) >= 0 ? s.season : d.seasons[0];
          self.render(true);
          self.focus('detail-play');
        },
        function (e) {
          self.failure(e, s, token);
        }
      );
    };
    P.findUnifiedSites = function () {
      var s = this.screen,
        self = this,
        token = this.begin();
      if (!s || !s.detail) return;
      s.findingSites = true;
      function update(value) {
        if (token !== self.generation || self.screen !== s || self.suspended) return;
        var unified = self.hub.card(s.detail.contentId);
        if (unified) {
          s.detail.contentId = unified.contentId;
          s.detail.canonicalId = unified.contentId;
          s.detail.variants = unified.variants;
          s.card = unified;
        }
        s.discoveryProgress = value.unifiedProgress;
        s.findingSites = !!value.unifiedProgress.running;
        self.save();
        self.render(true);
      }
      this.provider.search(s.detail.title, true, update).then(update, function (e) {
        if (token !== self.generation) return;
        s.findingSites = false;
        s.error = e.message;
        self.render(true);
      });
    };
    P.play = function (episode) {
      var s = this.screen,
        d = s && s.detail;
      if (!d || !d.playback) return play.call(this, episode);
      if (s.loading) return;
      var content;
      if (d.type === 'series') {
        var target =
          episode ||
          this.selectedEpisode(d) ||
          this.library.resumeEpisode(d, this.watchEntries()) ||
          d.episodes[0];
        if (!target) return;
        content = C.copy(target);
        content.episodes = C.copy(d.episodes);
        this.library.season(d.contentId, target.episode.season);
      } else {
        content = C.copy(d.playback);
        content.type = 'movie';
        content.sources = [];
        if (s.navigation) content.navigation = C.copy(s.navigation);
      }
      if (d.playbackUnavailableReason) {
        var prepared = root.UnifiedPlayback && root.UnifiedPlayback.prepare(content, this.hub);
        if (!prepared || !prepared.sourceContext) return;
        content.playbackUnavailableReason = d.playbackUnavailableReason;
      }
      content.canonicalId = this.hub.resolveId(content.contentId);
      this.hub.choose(d.contentId, d.selectedVariant);
      this.app.open(content);
    };
    P.returnMovie = function (content) {
      if (!this.site.virtual && !this.collectionCatalogProvider)
        return returnMovie.call(this, content);
      var s = this.screen,
        nav = content.navigation;
      if (content.type !== 'movie' || !nav || !s || s.kind !== 'detail') return false;
      var target = this.hub.card(content.contentId);
      if (!target || this.hub.resolveId(s.card.contentId) === target.contentId) return false;
      var parent = this.history.pop();
      if (parent) {
        this.screen = parent;
        var items =
          parent.kind === 'home' && parent.rails && parent.rails[nav.originRail]
            ? parent.rails[nav.originRail].items
            : this.gridItems(parent) || [];
        var index = items
          .map(function (x) {
            return x.contentId;
          })
          .indexOf(target.contentId);
        if (index >= 0) {
          if (parent.kind === 'home') {
            parent.focusKey = 'rail-' + nav.originRail + '-' + index;
            parent.railOffsets[nav.originRail] = Math.max(0, index - 2);
          } else {
            parent.focusKey = 'card-' + index;
            parent.startRow = Math.max(0, Math.floor(index / 6) - 2);
            parent.scroll = Math.floor(index / 6) * 430;
          }
        }
      }
      var wantedFocus = parent && parent.focusKey,
        wantedScroll = parent && parent.scroll;
      target.requestedVariant = content.contentId;
      this.openDetail(target, false, nav);
      if (parent) {
        parent.focusKey = wantedFocus;
        parent.scroll = wantedScroll;
      }
      return true;
    };
    var renderPanel = P.renderPanel;
    P.renderPanel = function (focusKey) {
      var p = this.panel;
      if (!p || p.kind !== 'unified-status') return renderPanel.call(this, focusKey);
      var self = this,
        host = document.getElementById('catalog-modal'),
        box = document.getElementById('catalog-modal-card');
      host.style.display = 'block';
      box.textContent = '';
      box.appendChild(n('h2', '', 'Site yanıtları'));
      p.progress.sites.forEach(function (s) {
        var label = {
          pending: 'Sırada',
          cancelled: 'Arama durduruldu',
          loading: 'Aranıyor',
          ready: s.count + ' sonuç',
          limited: 'Sınırlı arama · ' + s.count + ' sonuç',
          stale: 'Önbellekteki sonuçlar',
          blocked: 'Erişim engeli',
          error: 'Yanıt alınamadı',
          done: 'Bu listede yeni sayfa yok'
        }[s.status];
        box.appendChild(
          n(
            'p',
            'unified-site-response',
            s.name + ' · ' + label + (s.message ? ' · ' + s.message : '')
          )
        );
      });
      box.appendChild(
        b('Kapat', 'panel-cancel', function () {
          self.closePanel(true);
        })
      );
      this.focus(focusKey || 'panel-cancel');
    };
    return App;
  });
})(window);
