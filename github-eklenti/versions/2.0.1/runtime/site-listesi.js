/* Local provider modules, loaded with an independent failure boundary per site. */
(function (root) {
  'use strict';
  var sites = [],
    modules = root.FilmUpdate.modules(),
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
        if (root.FilmPlugins) root.FilmPlugins.registryFinished(sites).then(function (restart) { if (restart) root.location.reload(); else done(); }); else done();
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
        var packageOwner = root.FilmPlugins && root.FilmPlugins.owner(current[0]), packageData = packageOwner && root.FilmPlugins.loaded[packageOwner];
        if (packageData && Object.keys(packageData.bindings || {}).some(function (id) { return !root.ResolverRegistry.has(packageData.bindings[id]); })) {
          root.FilmPlugins.scriptErrors[packageOwner] = 'Resolver dependency failed to start'; abandon('Resolver dependency failed to start'); return;
        }
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
          var owner = root.FilmPlugins && root.FilmPlugins.owner(current[0]), pkg = owner && root.FilmPlugins.loaded[owner];
          if (sites.length === registered && !(pkg && pkg.manifest.type === 'resolver' && root.ResolverRegistry.has(owner))) {
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
        var modulePath = current[index++];
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
        root.FilmUpdate.appendScript(script, modulePath).catch(function (e) { end(e.message); });
      }
      nextGroup();
    },
    register: function (site) {
      if (root.document && root.document.currentScript && activeScript !== root.document.currentScript) return;
      validate(site);
      site.pluginKey = root.FilmPlugins ? root.FilmPlugins.loading : "";
      if (root.SiteAddresses) site.base = root.SiteAddresses.base(site.id, site.base);
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
