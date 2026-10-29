/* Shared catalog ordering; original provider arrays and episode chronology stay intact. */
(function (root) {
  'use strict';
  function tr(value) {
    return root.FilmI18n ? root.FilmI18n.text(value) : value;
  }
  root.CatalogRuntime.register('ordering', function (Base) {
    var P = Object.create(Base.prototype),
      I = root.ContentIdentity,
      C = root.PlayerCore,
      KEY = 'filmmerkezi.catalog.order.v1';
    var orders = [
      ['source', 'Varsayılan sıra'],
      ['relevance', 'Alaka'],
      ['added', 'Yeni eklenenler · bu TV'],
      ['release-desc', 'Çıkış tarihi / yılı ↓'],
      ['release-asc', 'Çıkış tarihi / yılı ↑'],
      ['rating', 'IMDb puanı'],
      ['title', 'A–Z']
    ];
    function score(card, query) {
      var q = I.name(query),
        best = 0;
      [card.title, card.originalTitle].concat(card.titleAliases || []).forEach(function (v) {
        var t = card.type === 'series' ? I.seriesName(v) : I.name(v);
        if (!t) return;
        var n = t === q ? 100 : t.indexOf(q) === 0 ? 80 : t.indexOf(q) >= 0 ? 60 : 0;
        best = Math.max(best, n);
      });
      return best;
    }
    function compare(a, b) {
      var x = I.name(a.title),
        y = I.name(b.title);
      return x < y
        ? -1
        : x > y
          ? 1
          : (a.year || 9999) - (b.year || 9999) ||
            String(a.contentId || '').localeCompare(String(b.contentId || ''));
    }
    function ordered(items, mode, query) {
      if (
        !mode ||
        mode === 'source' ||
        !orders.some(function (v) {
          return v[0] === mode;
        })
      )
        return items.slice();
      return items.slice().sort(function (a, b) {
        var n = 0,
          x,
          y;
        if (mode === 'relevance') n = score(b, query) - score(a, query);
        else if (mode === 'title') return compare(a, b);
        else if (mode === 'added') n = (b.firstSeenAt || 0) - (a.firstSeenAt || 0);
        else if (mode === 'rating') n = (b.imdb || 0) - (a.imdb || 0);
        else {
          if (!a.year || !b.year) n = (!a.year ? 1 : 0) - (!b.year ? 1 : 0);
          else {
            x = a.releaseDate || a.year + '-00-00';
            y = b.releaseDate || b.year + '-00-00';
            n = x < y ? -1 : x > y ? 1 : 0;
            if (mode === 'release-desc') n = -n;
          }
        }
        return n || compare(a, b);
      });
    }
    function context(s) {
      return s.kind === 'detail' && s.detail && s.detail.type === 'collection'
        ? 'collection'
        : s.kind === 'list'
          ? s.title === 'Keşfet' || (s.query && s.query.kind === 'discover')
            ? 'discover'
            : s.type === 'series'
              ? 'series'
              : 'movies'
          : s.kind;
    }
    function enabled(s) {
      return (
        s &&
        (['home', 'list', 'search', 'watchlist', 'following', 'history'].indexOf(s.kind) >= 0 ||
          context(s) === 'collection')
      );
    }
    function choices(s) {
      return orders.filter(function (pair) {
        return pair[0] !== 'relevance' || s.kind === 'search';
      });
    }
    function equal(app, a, b) {
      if (!a || !b) return false;
      if (!app.site || !app.site.virtual) return a === b;
      return ((app.hub && app.hub.resolveId(a)) || a) === ((app.hub && app.hub.resolveId(b)) || b);
    }
    P.catalogOrderPrefs = function () {
      if (!this.orderPrefs) {
        this.orderPrefs = { version: 1, values: {} };
        try {
          var d = this.storage && JSON.parse(this.storage.getItem(KEY));
          if (
            d &&
            d.version === 1 &&
            d.values &&
            typeof d.values === 'object' &&
            !Array.isArray(d.values)
          )
            this.orderPrefs = d;
        } catch (ignore) {}
      }
      return this.orderPrefs;
    };
    P.catalogOrderMode = function (s) {
      s = s || this.screen;
      var values = choices(s),
        valid = function (mode) {
          return values.some(function (v) {
            return v[0] === mode;
          });
        };
      if (valid(s.sort)) return s.sort;
      var saved = this.catalogOrderPrefs().values[(this.siteId || 'all') + ':' + context(s)];
      s.sort = valid(saved) ? saved : s.kind === 'search' ? 'relevance' : 'source';
      return s.sort;
    };
    P.orderCards = function (items, s) {
      var mode = this.catalogOrderMode(s),
        hub = this.hub;
      if (mode === 'added' && hub)
        items = items.map(function (c) {
          var g = hub.group(c.canonicalId || c.contentId);
          if (c.firstSeenAt || !g) return c;
          var copy = C.copy(c);
          copy.firstSeenAt = g.created;
          return copy;
        });
      return ordered(items, mode, s.query);
    };
    P.gridItems = function (screen) {
      var s = screen || this.screen,
        items = s.items || [];
      if (s.kind === 'search' && s.tab && s.tab !== 'all')
        items = items.filter(function (c) {
          return c.type === s.tab;
        });
      return enabled(s) ? this.orderCards(items, s) : items;
    };
    P.collectionEntries = function (s) {
      var items = s.detail.collectionItems || [],
        self = this,
        entries = items.map(function (item, index) {
          var c = self.hub && self.hub.card((s.collectionMatches || {})[index]),
            value = C.copy(item);
          value.contentId = String(index);
          value.collectionIndex = index;
          value.imdb = (c && c.imdb) || null;
          value.firstSeenAt = (c && c.firstSeenAt) || 0;
          return value;
        });
      return ordered(entries, this.catalogOrderMode(s)).map(function (v) {
        return { item: items[v.collectionIndex], index: v.collectionIndex };
      });
    };
    P.setCatalogOrder = function (mode) {
      var s = this.screen;
      if (
        !choices(s).some(function (v) {
          return v[0] === mode;
        })
      )
        return;
      this.save();
      s.sort = mode;
      s.startRow = 0;
      s.scroll = 0;
      s.collectionStart = 0;
      s.railOffsets = {};
      s.focusKey = s.kind === 'search' ? 'search-sort' : 'catalog-sort';
      var prefs = this.catalogOrderPrefs();
      prefs.values[(this.siteId || 'all') + ':' + context(s)] = mode;
      try {
        if (this.storage) this.storage.setItem(KEY, JSON.stringify(prefs));
      } catch (ignore) {
        this.app.view.toast('Sıralama bu oturumda korunuyor.');
      }
      this.closePanel(false);
      this.render(true);
      this.focus(s.focusKey);
    };
    var render = P.render,
      renderPanel = P.renderPanel,
      rail = P.rail;
    P.rail = function (title, items, index) {
      var s = this.screen,
        sorted = this.orderCards(items, s),
        wanted = this.orderRenderFocus;
      s.rails[index].items = sorted;
      if (wanted && wanted.railTitle === title) {
        var self = this,
          position = -1;
        sorted.some(function (c, i) {
          if (equal(self, c.contentId, wanted.id)) {
            position = i;
            return true;
          }
          return false;
        });
        if (position >= 0) {
          var first = s.railOffsets[index] || 0;
          if (position < first || position >= first + 12)
            s.railOffsets[index] = Math.max(0, position - 4);
          s.focusKey = 'rail-' + index + '-' + position;
        }
      }
      return rail.call(this, title, sorted, index);
    };
    P.render = function (restore) {
      if (this.suspended) return;
      var intent = this.renderFocusIntent;
      this.renderFocusIntent = null;
      var s = this.screen,
        active = document.activeElement,
        key = active && active.getAttribute('data-focus'),
        card = active && active.catalogCard,
        oldIndex = active && Number(active.getAttribute('data-card-index')),
        railIndex = active && active.getAttribute('data-rail');
      this.orderRenderFocus =
        restore && card && !intent
          ? {
              id: card.contentId,
              railTitle:
                railIndex !== null &&
                s &&
                s.rails &&
                s.rails[Number(railIndex)] &&
                s.rails[Number(railIndex)].title
            }
          : null;
      if (s && enabled(s) && this.orderRenderFocus && railIndex === null && s.items) {
        var self = this,
          items = this.gridItems(s),
          position = -1;
        items.some(function (c, i) {
          if (equal(self, c.contentId, card.contentId)) {
            position = i;
            return true;
          }
          return false;
        });
        if (position >= 0) {
          s.focusKey = 'card-' + position;
          if (position < (s.startRow || 0) * 6 || position >= ((s.startRow || 0) + 10) * 6)
            s.startRow = Math.max(0, Math.floor(position / 6) - 3);
          if (isFinite(oldIndex))
            s.scroll = Math.max(
              0,
              (s.scroll || 0) + (Math.floor(position / 6) - Math.floor(oldIndex / 6)) * 430
            );
        }
      }
      render.call(this, restore);
      s = this.screen;
      if (!s || !enabled(s) || this.suspended) {
        this.orderRenderFocus = null;
        return;
      }
      var self = this,
        parent = document.getElementById('catalog-content'),
        heading = parent.querySelector('.catalog-list-heading'),
        button = document.createElement('button'),
        mode = this.catalogOrderMode(s),
        focusKey = s.kind === 'search' ? 'search-sort' : 'catalog-sort';
      if (!heading) {
        heading = document.createElement('div');
        heading.className = 'catalog-list-heading catalog-order-heading';
        parent.insertBefore(heading, parent.firstChild);
      }
      button.className = 'quiet-button';
      button.setAttribute('data-focus', focusKey);
      button.textContent = tr(
        'Sırala: ' +
          choices(s).filter(function (v) {
            return v[0] === mode;
          })[0][1]
      );
      button.onclick = function () {
        self.save();
        self.panel = { kind: 'catalog-order', returnKey: focusKey };
        self.renderPanel();
      };
      heading.appendChild(button);
      if (restore && !this.panel && !this.editing) {
        if (intent) {
          s.focusKey = intent;
          this.focus(intent, false);
        } else if (key === focusKey) this.focus(focusKey, false);
        else if (this.orderRenderFocus) this.focus(s.focusKey, false);
      }
      this.orderRenderFocus = null;
    };
    P.renderPanel = function (key) {
      if (!this.panel || ['catalog-order', 'search-sort'].indexOf(this.panel.kind) < 0)
        return renderPanel.call(this, key);
      var self = this,
        s = this.screen,
        host = document.getElementById('catalog-modal'),
        box = document.getElementById('catalog-modal-card'),
        mode = this.catalogOrderMode(s);
      host.style.display = 'block';
      box.textContent = '';
      var h = document.createElement('h2');
      h.textContent = tr(s.kind === 'search' ? 'Arama sonuçlarını sırala' : 'İçerikleri sırala');
      box.appendChild(h);
      choices(s).forEach(function (pair) {
        var b = document.createElement('button');
        b.className = mode === pair[0] ? 'tab selected' : 'tab';
        b.textContent = tr(pair[1]);
        b.setAttribute('data-focus', 'sort-' + pair[0]);
        b.onclick = function () {
          self.setCatalogOrder(pair[0]);
        };
        box.appendChild(b);
      });
      var note = document.createElement('p');
      note.className = 'catalog-note';
      note.textContent = tr(
        'Yüklenmiş içerikler sıralanır; yeni sayfalar geldikçe sıra güncellenir. Yeni eklenenler bu TV’de ilk bulunma sırasıdır. Tam çıkış tarihi yoksa yapım yılı kullanılır; bilinmeyenler sona gelir.' +
          (context(s) === 'collection'
            ? ' Varsayılan sıra koleksiyonun kendi izleme sırasıdır.'
            : '')
      );
      box.appendChild(note);
      var back = document.createElement('button');
      back.className = 'quiet-button';
      back.textContent = tr('Vazgeç');
      back.setAttribute('data-focus', 'panel-cancel');
      back.onclick = function () {
        self.closePanel(true);
      };
      box.appendChild(back);
      self.focus(key || 'sort-' + mode);
    };
    root.CatalogSearch.score = score;
    root.CatalogSearch.ordered = ordered;
    root.CatalogOrder = {
      ordered: ordered,
      context: context,
      enabled: enabled,
      choices: choices
    };
    function App() {
      Base.apply(this, arguments);
    }
    App.prototype = P;
    P.constructor = App;
    return App;
  });
})(window);
