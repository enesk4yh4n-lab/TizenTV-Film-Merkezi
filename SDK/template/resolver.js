/* Independent ES5 resolver example. Register only during module loading. */
(function (root) {
  'use strict';
  var context = root.FilmPlugins.context();
  context.registerResolver({ create: function (ctx) {
    var client = ctx.createClient(), generation = 0;
    return {
      resolve: function (input, deadline) {
        var token = generation;
        return ctx.readJSON('streams.json').then(function (stream) { return client.get(stream.url, '', {}, { deadline: deadline }).then(function (response) {
          if (token !== generation) { var e = new Error('Cancelled'); e.cancelled = true; throw e; }
          if (!/^\s*#EXTM3U/.test(response.body)) throw new Error('Expected HLS');
          return [{ id: 'sample-hls', type: 'hls', url: stream.url, packageKey: ctx.key, subtitles: [] }];
        }); });
      },
      cancel: function () { generation++; client.cancel(); }
    };
  } });
})(window);
