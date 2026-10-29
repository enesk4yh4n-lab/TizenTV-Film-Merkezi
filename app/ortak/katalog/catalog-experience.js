/* Explicit catalog UI services. No prototype patching or downloaded UI. */
(function (root) {
  'use strict';
  function tr(value) {
    return root.FilmI18n ? root.FilmI18n.text(value) : value;
  }
  var C = root.PlayerCore;
  function node(tag, cls, text, raw) {
    var n = document.createElement(tag);
    n.className = cls || '';
    if (text !== undefined) n.textContent = raw ? text : tr(text);
    return n;
  }
  function button(label, key, fn, cls, raw) {
    var n = node('button', cls || 'quiet-button', label, raw);
    n.type = 'button';
    n.setAttribute('data-focus', key);
    n.onclick = fn;
    return n;
  }
  function Experience(app) {
    this.app = app;
    this.extraButtons = [];
    this.siteButtons = [];
    this.preferences = new root.CatalogPreferences(app.storage, function (message) {
      app.app.view.toast(message);
    });
    if (root.FilmI18n) root.FilmI18n.init(this.preferences);
    this.recommendations = new root.RecommendationService({
      hub: app.app.hub,
      playback: app.app.store,
      cache: app.cache
    });
    var self = this,
      clear = document.getElementById('search-clear'),
      recent = document.getElementById('search-recent');
    if (clear)
      clear.onclick = function () {
        app.hideKeyboard(false);
        document.getElementById('catalog-search').value = '';
        app.focus('search-activate');
      };
    if (recent)
      recent.onclick = function () {
        app.save();
        app.hideKeyboard(false);
        app.panel = { kind: 'recent-searches', returnKey: 'search-recent' };
        app.renderPanel();
      };
  }
  Experience.prototype.cancel = function () {
    this.recommendations.cancel();
    this.extraButtons = [];
    this.siteButtons = [];
  };
  Experience.prototype.canRecommend = function () {
    var s = this.app.site;
    return s.virtual || !s.contentTypes || s.contentTypes.indexOf('movie') >= 0;
  };
  Experience.prototype.recommendButton = function () {
    var self = this;
    return button(
      'Ne izlesem?',
      'recommendations',
      function () {
        self.openCriteria();
      },
      'gold-button recommendation-entry'
    );
  };
  Experience.prototype.openCriteria = function () {
    var a = this.app;
    a.save();
    a.panel = {
      kind: 'recommendation-prefs',
      values: this.preferences.criteria(),
      returnKey: a.screen.kind === 'recommendations' ? 'recommend-change' : 'recommendations'
    };
    a.renderPanel();
  };
  Experience.prototype.generate = function () {
    var a = this.app,
      self = this,
      criteria = this.preferences.criteria(),
      old = a.screen;
    a.save();
    if (old && old.kind !== 'recommendations') a.history.push(old);
    a.closePanel(false);
    var token = a.begin();
    var s = (a.screen = {
      kind: 'recommendations',
      title: 'Ne izlesem?',
      items: [],
      loading: true,
      scroll: 0,
      focusKey: 'recommend-back',
      criteria: criteria
    });
    a.render();
    a.focus('recommend-back');
    this.recommendations.options.cache = a.cache;
    this.recommendations
      .generate(criteria, a.siteId, function (progress) {
        if (token !== a.generation || a.screen !== s) return;
        s.progress = progress;
        var text = document.getElementById('recommendation-progress');
        if (text)
          text.textContent = tr(
            progress.phase === 'lists'
              ? 'Güncel katalog taranıyor · ' + progress.done + '/' + progress.total + ' site'
              : 'Film bilgileri doğrulanıyor · ' + progress.checked + ' aday'
          );
      })
      .then(
        function (result) {
          if (token !== a.generation || a.screen !== s) return;
          s.items = result.cards;
          s.notice = result.notice;
          s.result = result;
          s.loading = false;
          a.render(true);
          a.focus(s.items.length ? 'card-0' : 'recommend-new');
        },
        function (error) {
          if (token !== a.generation || a.screen !== s || error.cancelled) return;
          s.loading = false;
          s.notice = 'Öneriler alınamadı. Yeniden deneyebilirsiniz.';
          a.render(true);
          a.focus('recommend-new');
        }
      );
  };
  Experience.prototype.renderRecommendations = function (parent, s) {
    var self = this,
      a = this.app,
      head = node('div', 'catalog-list-heading');
    head.appendChild(node('h1', '', 'Ne izlesem?'));
    head.appendChild(
      button('Geri', 'recommend-back', function () {
        a.back();
      })
    );
    parent.appendChild(head);
    var chosen = root.RecommendationService.genres.filter(function (g) {
      return g.value === s.criteria.genre;
    })[0];
    parent.appendChild(
      node(
        'p',
        'catalog-note',
        (chosen ? chosen.label : 'Tüm türler') +
          ' · ' +
          (s.criteria.minImdb ? 'IMDb ' + s.criteria.minImdb + '+' : 'Puan kısıtı yok') +
          ' · Başlanmamış filmler'
      )
    );
    var status = node(
      'p',
      'catalog-note',
      s.loading
        ? 'Güncel katalog taranıyor…'
        : s.notice || 'Üç film adayı. İncelemek için birini seçin.'
    );
    status.id = 'recommendation-progress';
    status.setAttribute('role', 'status');
    parent.appendChild(status);
    var row = node('div', 'recommendation-cards');
    (s.items || []).forEach(function (card, i) {
      row.appendChild(a.card(card, i));
    });
    parent.appendChild(row);
    var actions = node('div', 'recommendation-actions');
    var next = button(
      'Üç yeni öneri',
      'recommend-new',
      function () {
        self.generate();
      },
      'gold-button'
    );
    next.disabled = s.loading;
    actions.appendChild(next);
    actions.appendChild(
      button('Tercihleri değiştir', 'recommend-change', function () {
        self.openCriteria();
      })
    );
    parent.appendChild(actions);
  };
  Experience.prototype.enhanceDetail = function (parent, s) {
    var d = s.detail,
      a = this.app,
      self = this;
    if (!d || d.type === 'collection') return;
    var layout = parent.querySelector('.catalog-detail'),
      body = parent.querySelector('.detail-copy'),
      actions = parent.querySelector('.detail-actions');
    if (!body || !actions) return;
    layout.className += ' ' + (d.type === 'series' ? 'series-detail' : 'movie-detail');
    var description = body.querySelector('.detail-description'),
      cast = body.querySelector('.detail-cast');
    if (description) {
      description.className += ' detail-collapsed';
      if (d.description && d.description.length > 220) {
        var more = button('Devamını oku', 'detail-description', function () {
          a.panel = {
            kind: 'detail-text',
            title: 'Özet',
            text: d.description,
            returnKey: 'detail-description'
          };
          a.renderPanel();
        });
        description.parentNode.insertBefore(more, description.nextSibling);
      }
    }
    if (cast && d.cast && d.cast.length > 8) {
      cast.textContent = tr('Oyuncular: ') + d.cast.slice(0, 8).join(', ');
      cast.parentNode.insertBefore(
        button('Tüm oyuncular', 'detail-cast', function () {
          a.panel = {
            kind: 'detail-text',
            title: 'Oyuncular',
            text: d.cast.join(', '),
            returnKey: 'detail-cast'
          };
          a.renderPanel();
        }),
        cast.nextSibling
      );
    }
    var info = description || cast;
    if (info) body.insertBefore(actions, info);
    this.extraButtons = [];
    Array.prototype.slice.call(actions.querySelectorAll('button')).forEach(function (b) {
      var key = b.getAttribute('data-focus');
      if (key !== 'detail-play' && key !== 'detail-favorite') {
        self.extraButtons.push(b);
        b.parentNode.removeChild(b);
      }
    });
    if (this.extraButtons.length)
      actions.appendChild(
        button('Diğer işlemler', 'detail-more', function () {
          a.panel = { kind: 'detail-more', returnKey: 'detail-more' };
          a.renderPanel();
        })
      );
  };
  Experience.prototype.providers = function (row, s) {
    var a = this.app,
      self = this,
      actions = document.querySelector('.detail-actions');
    if (!actions) return;
    this.siteButtons = Array.prototype.slice.call(row.querySelectorAll('button'));
    row.style.display = 'none';
    actions.appendChild(
      button('Siteler (' + s.detail.variants.length + ')', 'detail-sites', function () {
        a.panel = { kind: 'detail-sites', returnKey: 'detail-sites' };
        a.renderPanel();
      })
    );
  };
  Experience.prototype.renderPanel = function (focusKey) {
    var a = this.app,
      p = a.panel,
      self = this;
    if (
      !p ||
      [
        'recent-searches',
        'recommendation-prefs',
        'detail-text',
        'detail-more',
        'detail-sites',
        'ui-language'
      ].indexOf(p.kind) < 0
    )
      return false;
    var host = document.getElementById('catalog-modal'),
      box = document.getElementById('catalog-modal-card');
    host.style.display = 'block';
    box.textContent = '';
    box.appendChild(
      node(
        'h2',
        '',
        p.kind === 'recent-searches'
          ? 'Son aramalar'
          : p.kind === 'recommendation-prefs'
            ? 'Ne izlesem?'
            : p.kind === 'detail-text'
              ? p.title
              : p.kind === 'ui-language'
                ? 'Arayüz dili'
                : p.kind === 'detail-sites'
                  ? 'İzlenecek site'
                  : 'Diğer işlemler'
      )
    );
    if (p.kind === 'ui-language') {
      box.appendChild(
        node(
          'p',
          'catalog-note',
          'Yalnız arayüz dili değişir. Film bilgileri, TV klavyesi, ses ve altyazı tercihleri korunur.'
        )
      );
      if (this.preferences.blocked || this.preferences.failed)
        box.appendChild(
          node(
            'p',
            'catalog-note',
            'Dil tercihi bu oturumda kullanılacak; kalıcı olarak kaydedilemedi.'
          )
        );
      [
        ['tr', 'Türkçe'],
        ['en', 'English']
      ].forEach(function (row) {
        var selected = root.FilmI18n.language() === row[0],
          choice = button(
            (selected ? '✓ ' : '') + row[1],
            'ui-language-' + row[0],
            function () {
              root.FilmI18n.set(row[0]);
            },
            'filter-field',
            true
          );
        choice.setAttribute('aria-pressed', selected ? 'true' : 'false');
        box.appendChild(choice);
      });
    } else if (p.kind === 'recent-searches') {
      var rows = this.preferences.list();
      box.appendChild(node('p', 'catalog-note', 'Seçtiğiniz sorgu açık katalogda aranır.'));
      rows.forEach(function (query, i) {
        var row = node('div', 'recent-search-row');
        row.appendChild(
          button(
            query,
            'recent-' + i,
            function () {
              a.closePanel(false);
              document.getElementById('catalog-search').value = query;
              a.search();
            },
            '',
            true
          )
        );
        row.appendChild(
          button('Sil', 'recent-remove-' + i, function () {
            self.preferences.remove(query);
            var count = self.preferences.list().length;
            a.renderPanel(count ? 'recent-' + Math.min(i, count - 1) : 'panel-cancel');
          })
        );
        box.appendChild(row);
      });
      if (!rows.length) box.appendChild(node('p', 'catalog-note', 'Henüz arama yapmadınız.'));
      if (rows.length)
        box.appendChild(
          button('Arama geçmişini temizle', 'recent-clear', function () {
            self.preferences.clear();
            a.renderPanel('panel-cancel');
          })
        );
    } else if (p.kind === 'recommendation-prefs') {
      var genre = [{ value: '', label: 'Tümü' }].concat(root.RecommendationService.genres),
        scores = [0, 5, 6, 7, 8, 9];
      var current =
        genre.filter(function (g) {
          return g.value === p.values.genre;
        })[0] || genre[0];
      function field(label, key, values, value) {
        var n = button(
          label,
          'recommend-filter-' + key,
          function () {
            self.cycle(key, 1);
          },
          'filter-field'
        );
        n.setAttribute('data-recommend-field', key);
        box.appendChild(n);
      }
      field('Tür: ' + tr(current.label), 'genre', genre, p.values.genre);
      field(
        'IMDb: ' + (p.values.minImdb ? p.values.minImdb + '+' : 'Kısıt yok'),
        'minImdb',
        scores,
        p.values.minImdb
      );
      box.appendChild(
        node(
          'p',
          'catalog-note',
          'Sol/sağ ile değiştir · İzlenen ve yarım kalan filmler elenir. Üç aday bulunamazsa filtreler değiştirilmez.'
        )
      );
      box.appendChild(
        button(
          'Üç film bul',
          'recommend-apply',
          function () {
            self.preferences.criteria(p.values);
            self.generate();
          },
          'gold-button'
        )
      );
      box.appendChild(
        button('Sıfırla', 'recommend-reset', function () {
          p.values = { genre: '', minImdb: 0 };
          a.renderPanel('recommend-filter-genre');
        })
      );
    } else if (p.kind === 'detail-text') {
      box.appendChild(node('p', 'expanded-detail-text', p.text, true));
    } else
      (p.kind === 'detail-sites' ? this.siteButtons : this.extraButtons).forEach(function (b) {
        if (!b.catalogPanelAction) {
          var returnKey = p.kind === 'detail-sites' ? 'detail-sites' : 'detail-more';
          b.addEventListener(
            'click',
            function () {
              a.closePanel(false);
              if (a.screen) a.screen.focusKey = returnKey;
              Promise.resolve().then(function () {
                if (a.panel && a.panel.returnKey === b.getAttribute('data-focus'))
                  a.panel.returnKey = returnKey;
                else if (!a.panel && a.screen.kind === 'detail') a.focus(returnKey, false);
              });
            },
            true
          );
          b.catalogPanelAction = true;
        }
        box.appendChild(b);
      });
    box.appendChild(
      button('Geri', 'panel-cancel', function () {
        a.closePanel(true);
      })
    );
    a.focus(
      focusKey ||
        ((box.querySelector('button') || {}).getAttribute &&
          box.querySelector('button').getAttribute('data-focus')) ||
        'panel-cancel',
      false
    );
    return true;
  };
  Experience.prototype.cycle = function (field, delta) {
    var a = this.app,
      p = a.panel,
      values =
        field === 'genre'
          ? [''].concat(
              root.RecommendationService.genres.map(function (g) {
                return g.value;
              })
            )
          : [0, 5, 6, 7, 8, 9],
      index = values.indexOf(p.values[field]);
    p.values[field] = values[(index + delta + values.length) % values.length];
    a.renderPanel('recommend-filter-' + field);
  };
  root.CatalogExperience = Experience;
})(window);
