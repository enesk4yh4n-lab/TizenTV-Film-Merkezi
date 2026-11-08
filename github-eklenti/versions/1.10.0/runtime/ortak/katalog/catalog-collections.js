/* Ordered articles are data, never executable pages or guessed playback URLs. */
(function (root) {
  'use strict';
  function tr(value) {
    return root.FilmI18n ? root.FilmI18n.text(value) : value;
  }
  root.CatalogRuntime.register('collections', function (Base) {
    var P = Object.create(Base.prototype),
      C = root.PlayerCore,
      I = root.ContentIdentity;
    function el(tag, cls, text, raw) {
      var n = document.createElement(tag);
      n.className = cls || '';
      if (text !== undefined) n.textContent = raw || cls === 'catalog-card-title' ? text : tr(text);
      return n;
    }
    function button(text, key, fn) {
      var n = el('button', 'quiet-button', text);
      n.setAttribute('data-focus', key);
      n.onclick = fn;
      return n;
    }
    function candidates(hub, entry, cards) {
      var names = [entry.title].concat(entry.titleAliases || []).map(function (v) {
        return I.name(v, entry.year);
      });
      return hub
        .refreshCards(
          cards ||
            Object.keys(hub.data.items).map(function (id) {
              return hub.card(id);
            })
        )
        .filter(function (c) {
          return (
            c.type === 'movie' &&
            c.year === entry.year &&
            [c.title, c.originalTitle].concat(c.titleAliases || []).some(function (v) {
              return names.indexOf(I.name(v, c.year)) >= 0;
            })
          );
        });
    }
    function match(hub, entry, cards) {
      var found = candidates(hub, entry, cards);
      return found.length === 1 ? found[0] : null;
    }
    var detail = P.renderDetail,
      play = P.play,
      back = P.back,
      navigate = P.navigate,
      select = P.selectSite,
      panel = P.renderPanel;
    P.restoreCollectionProvider = function () {
      if (this.collectionCatalogProvider) {
        this.provider.cancel();
        this.provider = this.collectionCatalogProvider;
        this.collectionCatalogProvider = null;
      }
    };
    P.navigate = function (kind) {
      this.restoreCollectionProvider();
      return navigate.call(this, kind);
    };
    P.selectSite = function (site, landing) {
      this.restoreCollectionProvider();
      return select.call(this, site, landing);
    };
    P.back = function () {
      var result = back.call(this);
      if (this.screen && this.screen.detail && this.screen.detail.type === 'collection')
        this.restoreCollectionProvider();
      return result;
    };
    P.play = function (episode) {
      if (this.screen && this.screen.detail && this.screen.detail.type === 'collection') return;
      return play.call(this, episode);
    };
    P.renderDetail = function (parent, s) {
      var d = s.detail;
      if (!d || d.type !== 'collection') return detail.call(this, parent, s);
      var self = this,
        items = d.collectionItems || [],
        entries = this.collectionEntries(s),
        start = s.collectionStart || 0;
      parent.appendChild(
        button('‹ Geri', 'detail-back', function () {
          self.back();
        })
      );
      parent.appendChild(el('span', 'eyebrow', 'KOLEKSİYON · ' + items.length + ' film'));
      parent.appendChild(el('h1', '', d.title, true));
      parent.appendChild(el('p', 'catalog-note', d.description, true));
      parent.appendChild(
        button(
          this.library.has(d.contentId) ? '✓ Listemden çıkar' : '+ Listeme ekle',
          'detail-favorite',
          function () {
            self.library.toggle(d);
            self.save();
            self.render(true);
          }
        )
      );
      parent.appendChild(
        el(
          'p',
          'catalog-note',
          'Bulunan filmleri açın; diğerlerini seçerek sitelerde arayın. Önceki / sonraki düğmeleri listede bulunmuş filmleri sırayla açar.'
        )
      );
      if (start)
        parent.appendChild(
          button('↑ Önceki filmler', 'collection-before', function () {
            s.collectionStart = Math.max(0, start - 24);
            self.render(true);
            self.focus('collection-item-' + self.collectionEntries(s)[s.collectionStart].index);
          })
        );
      var grid = el('div', 'catalog-grid');
      s.collectionMatches = s.collectionMatches || {};
      for (var row = start; row < Math.min(items.length, start + 48); row += 6) {
        var line = el('div', 'catalog-grid-row');
        entries.slice(row, row + 6).forEach(function (view) {
          var entry = view.item,
            i = view.index,
            known = self.hub.card(s.collectionMatches[i]) || match(self.hub, entry);
          if (known) s.collectionMatches[i] = known.contentId;
          var b = button('', 'collection-item-' + i, function () {
            self.selectCollectionItem(i);
          });
          b.className = 'catalog-card collection-card';
          b.appendChild(self.art(known || { title: entry.title, poster: '' }));
          b.appendChild(el('strong', 'catalog-card-title', entry.ordinal + '. ' + entry.title));
          b.appendChild(
            el(
              'small',
              'catalog-card-meta',
              entry.year +
                ' · ' +
                (s.collectionFinding === i
                  ? 'Aranıyor…'
                  : known
                    ? 'Filmi aç · ' + known.providerCount + ' site'
                    : 'Sitelerde bul')
            )
          );
          line.appendChild(b);
        });
        grid.appendChild(line);
      }
      parent.appendChild(grid);
      if (start + 48 < items.length)
        parent.appendChild(
          button('↓ Sonraki filmler', 'collection-after', function () {
            s.collectionStart = start + 24;
            self.render(true);
            self.focus('collection-item-' + self.collectionEntries(s)[s.collectionStart].index);
          })
        );
      if (s.collectionNote) parent.appendChild(el('p', 'catalog-note', s.collectionNote));
      this.hydrateCollection(s, start);
    };
    P.hydrateCollection = function (s, start) {
      var cacheKey = (s.sort || 'source') + '|' + start,
        self = this,
        site = root.SiteRegistry.sites.filter(function (v) {
          return v.searchMetadata;
        })[0];
      if (
        !site ||
        this.collectionSearch ||
        (s.collectionHydrated && s.collectionHydrated[cacheKey])
      )
        return;
      s.collectionHydrated = s.collectionHydrated || {};
      s.collectionHydrated[cacheKey] = true;
      var provider = new root.UnifiedProvider(this.cache, null, this.hub),
        token = this.generation,
        jobs = [];
      provider.deadline = Date.now() + 24000;
      provider.begin();
      this.collectionSearch = provider;
      self
        .collectionEntries(s)
        .slice(start, start + 6)
        .forEach(function (v) {
          if (!self.hub.card(s.collectionMatches[v.index]))
            jobs.push({ entry: v.item, index: v.index });
        });
      function lane() {
        if (
          !jobs.length ||
          token !== self.generation ||
          self.screen !== s ||
          Date.now() + 1000 >= provider.deadline
        )
          return Promise.resolve();
        var job = jobs.shift(),
          query = job.entry.title.replace(/:.*/, '').slice(0, 100);
        return provider
          .invoke(site, 'search', [query, false])
          .then(
            function (r) {
              if (token !== self.generation || self.screen !== s || self.suspended) return;
              self.hub.observeMany(r.cards, site.id);
              var c = match(self.hub, job.entry, r.cards);
              if (c) s.collectionMatches[job.index] = c.contentId;
              self.save();
              self.render(true);
            },
            function () {}
          )
          .then(lane);
      }
      Promise.all([lane(), lane()]).then(function () {
        if (self.collectionSearch === provider) self.collectionSearch = null;
        provider.cancel();
        if (token === self.generation && self.screen === s && !self.suspended)
          self.hydrateCollection(s, s.collectionStart || 0);
      });
    };
    P.openCollectionMovie = function (index, card) {
      var s = this.screen,
        self = this;
      s.collectionMatches = s.collectionMatches || {};
      s.collectionMatches[index] = card.contentId;
      s.focusKey = 'collection-item-' + index;
      this.focus(s.focusKey);
      this.save();
      var nav = { kind: 'movies', originRail: null, items: [] };
      this.collectionEntries(s).forEach(function (v) {
        var e = v.item,
          i = v.index,
          c = self.hub.card(s.collectionMatches[i]) || match(self.hub, e);
        if (!c) return;
        var raw = self.hub.preferred(c.contentId);
        raw.canonicalId = c.contentId;
        raw.type = 'movie';
        raw.sources = [];
        if (
          !nav.items.some(function (x) {
            return x.contentId === raw.contentId;
          })
        )
          nav.items.push(raw);
      });
      if (!this.site.virtual) {
        this.collectionCatalogProvider = this.provider;
        this.provider = new root.UnifiedProvider(this.cache, null, this.hub);
      }
      this.openDetail(card, false, nav);
    };
    P.selectCollectionItem = function (index) {
      var s = this.screen,
        entry = s.detail.collectionItems[index],
        self = this;
      if (s.collectionFinding !== undefined && s.collectionFinding !== null) return;
      var known = this.hub.card((s.collectionMatches || {})[index]) || match(this.hub, entry);
      if (known) {
        this.openCollectionMovie(index, known);
        return;
      }
      this.save();
      var token = this.begin(),
        provider = new root.UnifiedProvider(this.cache, null, this.hub);
      provider.deadline = Date.now() + 40000;
      s.collectionFinding = index;
      s.collectionNote = 'Seçilen film gerçek katalogda aranıyor…';
      this.render(true);
      /* The independent client is cancelled with the catalog, including player transitions. */
      this.collectionSearch = provider;
      var query = entry.title.replace(/:.*/, '').slice(0, 100);
      provider.search(query, true).then(
        function (result) {
          if (token !== self.generation || self.screen !== s || self.suspended) return;
          s.collectionFinding = null;
          self.collectionSearch = null;
          var found = match(self.hub, entry, result.cards);
          if (found) {
            s.collectionNote = '';
            self.openCollectionMovie(index, found);
            return;
          }
          var choices = result.cards.filter(function (c) {
            return c.type === 'movie' && c.year === entry.year;
          });
          s.collectionNote = choices.length
            ? 'Tam ad eşleşmedi. Doğru filmi başlık ve yılıyla seçin.'
            : 'Bu film sitelerde doğrulanamadı. Daha sonra yeniden deneyebilirsiniz.';
          self.render(true);
          if (choices.length) {
            self.panel = {
              kind: 'collection-match',
              entry: entry,
              index: index,
              choices: choices.slice(0, 30),
              returnKey: 'collection-item-' + index
            };
            self.renderPanel();
          } else self.focus('collection-item-' + index);
        },
        function (e) {
          if (token !== self.generation || self.screen !== s) return;
          s.collectionFinding = null;
          self.collectionSearch = null;
          s.collectionNote = C.safeMessage(e.message);
          self.render(true);
          self.focus('collection-item-' + index);
        }
      );
    };
    var begin = P.begin;
    P.begin = function () {
      if (this.collectionSearch) {
        this.collectionSearch.cancel();
        this.collectionSearch = null;
      }
      if (this.screen) this.screen.collectionFinding = null;
      return begin.call(this);
    };
    document.addEventListener('visibilitychange', function () {
      var cat = root.ChainApp && root.ChainApp.catalog;
      if (document.hidden && cat && cat.collectionSearch) {
        cat.collectionSearch.cancel();
        cat.collectionSearch = null;
      }
    });
    P.renderPanel = function (key) {
      var p = this.panel;
      if (!p || p.kind !== 'collection-match') return panel.call(this, key);
      var self = this,
        host = document.getElementById('catalog-modal'),
        box = document.getElementById('catalog-modal-card');
      host.style.display = 'block';
      box.textContent = '';
      box.appendChild(el('h2', '', p.entry.title + ' (' + p.entry.year + ')'));
      box.appendChild(
        el(
          'p',
          'catalog-note',
          'Tam eşleşme bulunamadı. Bu satıra bağlamak istediğiniz gerçek filmi seçin.'
        )
      );
      p.choices.forEach(function (c, i) {
        box.appendChild(
          button(
            c.title + ' · ' + c.year + ' · ' + c.providerCount + ' site',
            'collection-match-' + i,
            function () {
              self.closePanel(false);
              self.openCollectionMovie(p.index, c);
            }
          )
        );
      });
      box.appendChild(
        button('Vazgeç', 'panel-cancel', function () {
          self.closePanel(true);
        })
      );
      self.focus(key || 'panel-cancel');
    };
    root.CatalogCollections = { candidates: candidates, match: match };
    function App() {
      Base.apply(this, arguments);
    }
    App.prototype = P;
    P.constructor = App;
    return App;
  });
})(window);
