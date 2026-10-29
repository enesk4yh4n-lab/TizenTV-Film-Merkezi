/* Local provider modules, loaded with an independent failure boundary per site. */
(function (root) {
  'use strict';
  var sites = [],
    modules = [
      [
        'siteler/hdfilmcehennemi/decoder.js',
        'siteler/hdfilmcehennemi/catalog-parser.js',
        'siteler/hdfilmcehennemi/catalog-provider.js',
        'siteler/hdfilmcehennemi/source-resolver.js',
        'siteler/hdfilmcehennemi/site.js'
      ],
      [
        'siteler/filmcibaba/filmizle-parser.js',
        'siteler/filmcibaba/filmizle-provider.js',
        'siteler/filmcibaba/filmizle-resolver.js',
        'siteler/filmcibaba/site.js'
      ],
      [
        'siteler/dizibox/dizibox-parser.js',
        'siteler/dizibox/dizibox-provider.js',
        'siteler/dizibox/dizibox-decoder.js',
        'siteler/dizibox/dizibox-resolver.js',
        'siteler/dizibox/site.js'
      ],
      [
        'siteler/turkcefilmler/turkcefilmler-parser.js',
        'siteler/turkcefilmler/turkcefilmler-provider.js',
        'siteler/turkcefilmler/turkcefilmler-decoder.js',
        'siteler/turkcefilmler/turkcefilmler-resolver.js',
        'siteler/turkcefilmler/site.js'
      ],
      [
        'siteler/hdfilmdelisi/hdfilmdelisi-data.js',
        'siteler/hdfilmdelisi/hdfilmdelisi-parser.js',
        'siteler/hdfilmdelisi/hdfilmdelisi-provider.js',
        'siteler/hdfilmdelisi/hdfilmdelisi-decoder.js',
        'siteler/hdfilmdelisi/hdfilmdelisi-resolver.js',
        'siteler/hdfilmdelisi/site.js'
      ],
      [
        'siteler/ddizi/ddizi-parser.js',
        'siteler/ddizi/ddizi-provider.js',
        'siteler/ddizi/ddizi-decoder.js',
        'siteler/ddizi/ddizi-network.js',
        'siteler/ddizi/ddizi-resolver.js',
        'siteler/ddizi/site.js'
      ],
      [
        'siteler/fixfullfilmizle/fixfullfilmizle-parser.js',
        'siteler/fixfullfilmizle/fixfullfilmizle-provider.js',
        'siteler/fixfullfilmizle/fixfullfilmizle-decoder.js',
        'siteler/fixfullfilmizle/fixfullfilmizle-resolver.js',
        'siteler/fixfullfilmizle/site.js'
      ],
      [
        'siteler/sinemacc/sinemacc-parser.js',
        'siteler/sinemacc/sinemacc-provider.js',
        'siteler/sinemacc/sinemacc-decoder.js',
        'siteler/sinemacc/sinemacc-resolver.js',
        'siteler/sinemacc/site.js'
      ],
      [
        'siteler/filmizlebabam/filmizlebabam-parser.js',
        'siteler/filmizlebabam/filmizlebabam-provider.js',
        'siteler/filmizlebabam/filmizlebabam-decoder.js',
        'siteler/filmizlebabam/filmizlebabam-resolver.js',
        'siteler/filmizlebabam/site.js'
      ],
      [
        'siteler/filmifullizle/filmifullizle-parser.js',
        'siteler/filmifullizle/filmifullizle-provider.js',
        'siteler/filmifullizle/filmifullizle-decoder.js',
        'siteler/filmifullizle/filmifullizle-resolver.js',
        'siteler/filmifullizle/site.js'
      ],
      [
        'siteler/filmizlehell/filmizlehell-parser.js',
        'siteler/filmizlehell/filmizlehell-provider.js',
        'siteler/filmizlehell/filmizlehell-decoder.js',
        'siteler/filmizlehell/filmizlehell-resolver.js',
        'siteler/filmizlehell/site.js'
      ],
      [
        'siteler/lovefilmizle/lovefilmizle-parser.js',
        'siteler/lovefilmizle/lovefilmizle-provider.js',
        'siteler/lovefilmizle/lovefilmizle-decoder.js',
        'siteler/lovefilmizle/lovefilmizle-resolver.js',
        'siteler/lovefilmizle/site.js'
      ],
      [
        'siteler/fullhdfilmizlesene/fullhdfilmizlesene-parser.js',
        'siteler/fullhdfilmizlesene/fullhdfilmizlesene-provider.js',
        'siteler/fullhdfilmizlesene/fullhdfilmizlesene-decoder.js',
        'siteler/fullhdfilmizlesene/fullhdfilmizlesene-resolver.js',
        'siteler/fullhdfilmizlesene/site.js'
      ],
      [
        'siteler/filmmakinesi/filmmakinesi-parser.js',
        'siteler/filmmakinesi/filmmakinesi-provider.js',
        'siteler/filmmakinesi/filmmakinesi-decoder.js',
        'siteler/filmmakinesi/filmmakinesi-resolver.js',
        'siteler/filmmakinesi/site.js'
      ]
    ],
    errors = [],
    activeScript = null;
  function validate(site) {
    if (
      !site ||
      typeof site.id !== 'string' ||
      !site.id ||
      typeof site.prefix !== 'string' ||
      !site.prefix ||
      typeof site.Provider !== 'function' ||
      typeof site.Resolver !== 'function' ||
      !/^https:\/\//.test(site.base || '') ||
      sites.some(function (x) {
        return x.id === site.id || x.prefix === site.prefix;
      })
    )
      throw new Error('Invalid site registration');
  }
  root.SiteRegistry = {
    sites: sites,
    modules: modules,
    errors: errors,
    load: function (done) {
      var group = 0,
        current = null,
        failed = '',
        index = 0,
        registered = 0;
      function capture(event) {
        if (!activeScript) return;
        failed = event.message || 'Site module failed';
        if (event.preventDefault) event.preventDefault();
      }
      if (root.addEventListener) root.addEventListener('error', capture);
      function complete() {
        activeScript = null;
        if (root.removeEventListener) root.removeEventListener('error', capture);
        if (sites.length) {
          done();
          return;
        }
        var panel = document.getElementById('site-selection');
        panel.style.display = 'block';
        panel.setAttribute('aria-hidden', 'false');
        panel.textContent =
          'Site bile\u015fenleri y\u00fcklenemedi. Uygulamay\u0131 yeniden ba\u015flat\u0131n.';
      }
      function nextGroup() {
        if (group >= modules.length) {
          complete();
          return;
        }
        current = modules[group++];
        index = 0;
        registered = sites.length;
        failed = '';
        next();
      }
      function abandon(message) {
        errors.push({
          id: 'load:' + current[0].split('/')[1],
          name: current[0].split('/')[1],
          message: message
        });
        sites.splice(registered);
        nextGroup();
      }
      function next() {
        if (index >= current.length) {
          if (sites.length === registered) {
            abandon('Site registration missing');
            return;
          }
          nextGroup();
          return;
        }
        var script = document.createElement('script'),
          ended = false,
          timer;
        activeScript = script;
        script.src = current[index++];
        function end(error) {
          if (ended) return;
          ended = true;
          clearTimeout(timer);
          activeScript = null;
          script.onload = script.onerror = null;
          if (error || failed) {
            if (script.parentNode) script.parentNode.removeChild(script);
            abandon(error || failed);
          } else next();
        }
        script.onload = function () {
          end();
        };
        script.onerror = function () {
          end('Site file could not be loaded: ' + script.src);
        };
        timer = setTimeout(function () {
          end('Site file timed out: ' + script.src);
        }, 10000);
        document.head.appendChild(script);
      }
      nextGroup();
    },
    register: function (site) {
      if (root.document && root.document.currentScript && activeScript !== root.document.currentScript) return;
      validate(site);
      sites.push(site);
    },
    get: function (id) {
      if (id === 'all') return root.UnifiedSite || null;
      return (
        sites.filter(function (site) {
          return site.id === id;
        })[0] || null
      );
    },
    forContent: function (content) {
      return (
        sites.filter(function (site) {
          return String(content.contentId || '').indexOf(site.prefix) === 0;
        })[0] || null
      );
    }
  };
})(window);
