/* ES5 plugin example. Replace the cached demo data with your site's parser. */
(function (root) {
  'use strict';
  var context = root.FilmPlugins.context(), site = context.site;
  function Provider() { this.generation = 0; this.client = context.createClient(); }
  Provider.prototype.cancel = function () { this.generation++; this.client.cancel(); };
  Provider.prototype.isIdle = function () { return true; };
  Provider.prototype.cards = function () {
    var self = this, token = this.generation;
    return context.readJSON('catalog.json').then(function (data) {
      if (token !== self.generation) { var e = new Error('Cancelled'); e.cancelled = true; throw e; }
      return data.cards.map(function (item) { return { contentId: site.prefix + item.id, siteId: site.id, type: 'movie', title: item.title, pageUrl: site.base + '/plugin-demo/' + item.id + '/', poster: item.poster || '', year: item.year || null, synopsis: item.synopsis || 'Community plugin demonstration.' }; });
    });
  };
  Provider.prototype.home = function () { return this.cards().then(function (cards) { return { hero: cards[0] || null, movies: cards, series: [], genres: [], links: {} }; }); };
  Provider.prototype.list = function (query, next) { if (next || query && query.type === 'series') return Promise.resolve({ cards: [], next: null }); return this.cards().then(function (cards) { return { cards: cards, next: null }; }); };
  Provider.prototype.search = function (query) { query = String(query || '').toLocaleLowerCase(); return this.cards().then(function (cards) { return { cards: cards.filter(function (c) { return c.title.toLocaleLowerCase().indexOf(query) >= 0; }), next: null }; }); };
  Provider.prototype.detail = function (card) { return this.cards().then(function (cards) { var result = cards.filter(function (c) { return c.contentId === card.contentId; })[0]; if (!result) throw new Error('Content not found'); result.episodes = []; result.seasons = []; result.cast = []; result.genres = []; result.description = result.synopsis; return result; }); };
  Provider.prototype.identity = Provider.prototype.detail;
  Provider.prototype.options = function () { return Promise.resolve({ genres: [], order: [{ value: 'date', label: 'Default' }] }); };
  function Resolver(log) { this.resolver = context.createResolver('r101', log); }
  Resolver.prototype.cancel = function () { this.resolver.cancel(); };
  Resolver.prototype.resolve = function (content, deadline, notify, hints) { return this.resolver.resolve(content, deadline, notify, hints); };
  root.SiteRegistry.register({ id: site.id, name: site.name, base: site.base, prefix: site.prefix, storagePrefix: 'site.' + site.id + '.', mark: '＋', subtitle: 'Community plugin', Provider: Provider, Resolver: Resolver, contentTypes: ['movie'], ui: { movieRail: 'Community demo', seriesRail: 'Series', defaultOrder: 'date', filterHint: 'Plugin demonstration', filterSummary: 'Plugin' }, filterFields: function () { return ['order']; }, collectionQuery: function (type) { return { type: type, order: 'date' }; } });
})(window);
