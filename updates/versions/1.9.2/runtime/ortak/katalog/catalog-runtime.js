/* One explicit composition point; feature factories never alter a shared prototype. */
(function (root) {
  'use strict';
  var features = {},
    installed = false;
  var order = ['unified', 'ordering', 'collections'];
  root.CatalogRuntime = {
    services: function (app) {
      return new root.CatalogExperience(app);
    },
    register: function (name, factory) {
      if (installed || features[name])
        throw new Error('Katalog bileşeni iki kez kurulamaz: ' + name);
      features[name] = factory;
    },
    install: function () {
      if (installed) return root.CatalogApp;
      var App = root.CatalogApp;
      order.forEach(function (name) {
        if (features[name]) App = features[name](App);
      });
      root.CatalogApp = App;
      installed = true;
      return App;
    },
    provider: function (site, cache) {
      try {
        if (!site || typeof site.Provider !== 'function')
          throw new Error('Site sağlayıcısı bulunamadı.');
        return new site.Provider(cache);
      } catch (error) {
        error.providerUnavailable = true;
        var unavailable = { cancel: function () {} };
        ['home', 'list', 'search', 'detail', 'options', 'seriesLanguage'].forEach(
          function (method) {
            unavailable[method] = function () {
              return Promise.reject(error);
            };
          }
        );
        return unavailable;
      }
    },
  };
})(window);
