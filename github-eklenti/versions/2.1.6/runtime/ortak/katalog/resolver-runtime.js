/* API v2 registry. Package namespaces are not a JavaScript security sandbox. */
(function (root) {
  'use strict';
  var resolvers = {}, loaders = {};
  function owner() {
    var manager = root.FilmPlugins, key = manager.loading, p = manager.loaded[key];
    if (!p || p.manifest.type !== 'resolver') throw new Error('Resolver registration outside resolver package');
    return { key: key, package: p };
  }
  function register(definition) {
    var p = owner();
    if (resolvers[p.key] || !definition || typeof definition.create !== 'function') throw new Error('Invalid or duplicate resolver registration');
    resolvers[p.key] = definition;
  }
  function registerLoader(id, factory) {
    var p = owner(), key = p.key + '/' + id;
    if (!/^[a-z][a-z0-9-]{0,63}$/.test(id) || loaders[key] || typeof factory !== 'function') throw new Error('Invalid or duplicate loader registration');
    loaders[key] = factory;
  }
  function create(siteKey, dependencyId, log, now) {
    var manager = root.FilmPlugins, p = manager.loaded[siteKey], key = p && p.bindings && p.bindings[dependencyId];
    if (!key || !resolvers[key]) throw new Error('Resolver dependency unavailable: ' + dependencyId);
    var context = manager.contextFor(key), instance = resolvers[key].create(context, log, now);
    if (!instance || typeof instance.resolve !== 'function' || typeof instance.cancel !== 'function') throw new Error('Invalid resolver instance');
    return { key: key, resolve: function (input, deadline, notify, hints) { return Promise.resolve().then(function () { return instance.resolve(input, deadline, notify, hints); }).then(function (result) { var rows = Array.isArray(result) ? result : result && result.streams; if (Array.isArray(rows)) rows.forEach(function (source) { source.packageKey = key; if (source.loaderId) { source.playbackRequirements = source.playbackRequirements || {}; source.playbackRequirements.customLoader = true; } }); return result; }); }, cancel: function () { instance.cancel(); } };
  }
  function has(key) { return !!resolvers[key]; }
  function clear(key) {
    delete resolvers[key];
    Object.keys(loaders).forEach(function (id) { if (id.indexOf(key + '/') === 0) delete loaders[id]; });
  }
  function factory(key) { if (!loaders[key]) throw new Error('Media loader not registered: ' + key); return loaders[key]; }
  root.ResolverRegistry = { register: register, registerLoader: registerLoader, create: create, has: has, clear: clear, loader: factory };
})(window);
