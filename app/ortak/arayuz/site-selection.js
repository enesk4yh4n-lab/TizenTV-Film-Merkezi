/* Open the shared home by default; individual sites remain available on demand. */
(function (root) {
  'use strict';
  function tr(value) {
    return root.FilmI18n ? root.FilmI18n.text(value) : value;
  }
  var sites = root.SiteRegistry.sites;
  var picker,
    app,
    held = {},
    gate = {},
    active = null;
  function node(tag, cls, value) {
    var n = document.createElement(tag);
    n.className = cls || '';
    if (value) n.textContent = tr(value);
    return n;
  }
  function consume(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
  }
  function show() {
    if (!app || app.controller.content) return;
    var cat = app.catalog;
    if (cat) {
      cat.hideKeyboard(true);
      cat.closePanel(false);
      cat.save();
      cat.begin();
      cat.suspended = true;
      cat.images.clear();
    }
    picker.className = sites.length > 8 ? 'site-selection-many' : '';
    picker.textContent = '';
    picker.style.display = 'block';
    picker.setAttribute('aria-hidden', 'false');
    var box = node('div', 'site-selection-inner');
    box.appendChild(node('p', 'eyebrow', 'SİNEMA EVİNİZDE'));
    box.appendChild(node('h1', '', 'Nereden izlemek istersiniz?'));
    box.appendChild(
      node('p', 'site-help', 'Bir site seçin. Filmleriniz ve izleme kayıtlarınız korunur.')
    );
    var all = root.SiteRegistry.get('all');
    if (all) {
      var unified = node('button', 'site-all');
      unified.type = 'button';
      unified.setAttribute('data-site', 'all');
      unified.appendChild(node('strong', '', 'Tüm siteler'));
      unified.appendChild(node('span', '', 'Tek arama · Ortak Listem · Kaldığınız yerden devam'));
      unified.onclick = function () {
        choose('all');
      };
      box.appendChild(unified);
    }
    var grid = node('div', 'site-grid');
    box.appendChild(grid);
    sites.forEach(function (site, i) {
      var b = node('button', 'site-card site-' + site.id);
      b.type = 'button';
      b.setAttribute('data-site', site.id);
      b.setAttribute('aria-label', tr(site.name));
      var poster = node('span', 'site-poster', site.mark);
      if (site.posterBackground) poster.style.background = site.posterBackground;
      b.appendChild(poster);
      b.appendChild(node('strong', '', site.name));
      b.appendChild(node('small', '', site.subtitle));
      b.onclick = function () {
        choose(site.id);
      };
      grid.appendChild(b);
      if (i === 0) b.tabIndex = 0;
    });
    box.appendChild(
      node(
        'p',
        'site-help',
        active ? '↑ ↓ ← → Seç · OK Aç · Geri Kataloğa dön' : '↑ ↓ ← → Seç · OK Aç · Geri Çıkış'
      )
    );
    var exit = node('button', 'quiet-button', 'Uygulamadan çık');
    exit.type = 'button';
    exit.setAttribute('data-site-exit', 'true');
    exit.onclick = function () {
      try {
        root.tizen.application.getCurrentApplication().exit();
      } catch (ignore) {
        app.view.toast('Çıkış işlemi TV üzerinde kullanılabilir.');
      }
    };
    box.appendChild(exit);
    picker.appendChild(box);
    var wanted = active || sites[0].id;
    try {
      wanted = active || root.localStorage.getItem('chainprobe.selected-site') || wanted;
    } catch (ignore) {}
    picker
      .querySelector('[data-site="' + (root.SiteRegistry.get(wanted) ? wanted : sites[0].id) + '"]')
      .focus();
  }
  function choose(id, force, landing) {
    var site = root.SiteRegistry.get(id);
    if (!site || !picker || (picker.style.display === 'none' && !force) || app.controller.content)
      return;
    if (held[13]) gate[13] = true;
    active = id;
    picker.style.display = 'none';
    picker.setAttribute('aria-hidden', 'true');
    try {
      root.localStorage.setItem('chainprobe.selected-site', id);
    } catch (ignore) {}
    app.catalog.selectSite(site, landing);
    document.getElementById('site-change').textContent = tr('Siteler · ' + site.name);
    var brand = document.querySelector('.catalog-brand > div');
    brand.textContent = tr(site.name);
    brand.appendChild(node('small', '', 'SİNEMA EVİNİZDE'));
  }
  document.addEventListener(
    'keydown',
    function (e) {
      var code = e.keyCode || e.which;
      if (gate[code]) {
        consume(e);
        return;
      }
      if (
        !picker ||
        picker.style.display === 'none' ||
        [13, 27, 37, 38, 39, 40, 10009].indexOf(code) < 0
      )
        return;
      var repeat = held[code];
      held[code] = true;
      consume(e);
      if (repeat && [13, 27, 10009].indexOf(code) >= 0) return;
      var buttons = Array.prototype.slice.call(picker.querySelectorAll('button')),
        i = buttons.indexOf(document.activeElement);
      if (code === 13) {
        if (i >= 0) buttons[i].click();
      } else if (code === 27 || code === 10009) {
        if (active && app.catalog.screen) {
          picker.style.display = 'none';
          picker.setAttribute('aria-hidden', 'true');
          app.catalog.suspended = false;
          if (app.catalog.screen.loading) app.catalog.retry();
          else app.catalog.render(true);
          app.catalog.focus('site-change');
          gate[code] = true;
        } else {
          try {
            root.tizen.application.getCurrentApplication().exit();
          } catch (ignore) {
            app.view.toast('Çıkış işlemi TV üzerinde kullanılabilir.');
          }
        }
      } else if (buttons.length) {
        var target = i;
        if (sites.length > 8 && (code === 38 || code === 40)) {
          var rect = buttons[i >= 0 ? i : 0].getBoundingClientRect(),
            best = Infinity;
          buttons.forEach(function (b, index) {
            var r = b.getBoundingClientRect(),
              vertical = r.top - rect.top;
            if (code === 38 ? vertical >= -10 : vertical <= 10) return;
            var distance = Math.abs(vertical) * 4 + Math.abs(r.left - rect.left);
            if (distance < best) {
              best = distance;
              target = index;
            }
          });
        } else target = (i + (code === 37 ? -1 : 1) + buttons.length) % buttons.length;
        buttons[Math.max(0, target)].focus();
      }
    },
    true
  );
  document.addEventListener(
    'keyup',
    function (e) {
      var code = e.keyCode || e.which;
      if (held[code] || gate[code]) {
        delete held[code];
        delete gate[code];
        consume(e);
      }
    },
    true
  );
  root.addEventListener('blur', function () {
    held = {};
    gate = {};
  });
  root.SiteSelection = {
    sites: sites,
    show: show,
    choose: choose,
    current: function () {
      return active;
    },
    refreshLanguage: function () {
      var site = root.SiteRegistry.get(active);
      if (!site) return;
      document.getElementById('site-change').textContent =
        tr('Siteler') + ' · ' + (site.virtual ? tr(site.name) : site.name);
      var brand = document.querySelector('.catalog-brand > div');
      brand.textContent = site.virtual ? tr(site.name) : site.name;
      brand.appendChild(node('small', '', 'SİNEMA EVİNİZDE'));
    },
    init: function (application) {
      app = application;
      picker = document.getElementById('site-selection');
      document.getElementById('site-change').onclick = show;
      choose('all', true, 'home');
    },
    belongs: function (id, siteId) {
      var site = root.SiteRegistry.get(siteId);
      return (
        !!site &&
        (String(id).indexOf(site.prefix) === 0 ||
          (site.virtual && !!root.SiteRegistry.forContent({ contentId: id })))
      );
    },
    storage: function (storage, id) {
      var site = root.SiteRegistry.get(id),
        prefix = site && site.storagePrefix;
      if (!storage || !prefix) return storage;
      if (storage.scope) return storage.scope(prefix);
      return {
        getItem: function (key) {
          return storage.getItem(prefix + key);
        },
        setItem: function (key, value) {
          storage.setItem(prefix + key, value);
        },
        removeItem: function (key) {
          storage.removeItem(prefix + key);
        }
      };
    }
  };
})(window);
