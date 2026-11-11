/* Optional resolver-package module. Requests retain this package's signed origins. */
(function (root) {
  'use strict';
  var context = root.FilmPlugins.context();
  context.registerLoader('sample', function (session) {
    var closed = false;
    return {
      load: function (url, options) {
        if (closed) throw new Error('Loader closed');
        return session.request(url, options);
      },
      destroy: function () { closed = true; }
    };
  });
})(window);
