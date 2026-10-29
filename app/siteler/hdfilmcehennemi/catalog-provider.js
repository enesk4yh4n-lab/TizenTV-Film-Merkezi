(function (root) {
 'use strict';
 var P = root.CatalogParser, BASE = P.base;
 function Provider(cache, network) { root.CatalogClient.call(this,cache,network,{base:BASE,identitySelectors:'.post-info-imdb a[href]',headers:{Accept:'application/json, text/html','X-Requested-With':'fetch'},postHeaders:{'X-Mofycore-Action':'discover'}}); this.links = { new: BASE + '/', recommended: BASE + '/category/tavsiye-filmler-izle2/', rated: BASE + '/imdb-7-puan-uzeri-filmler-2/', liked: BASE + '/en-cok-begenilen-filmleri-izle-4/' }; this.filterOptions = null; }
 Provider.prototype=Object.create(root.CatalogClient.prototype);Provider.prototype.constructor=Provider;
 Provider.prototype.home = function (force) { var self = this; return this.request(BASE + '/', null, function (body) { return P.home(body, BASE + '/'); }, force, 'home').then(function (value) { Object.keys(value.links || {}).forEach(function (key) { self.links[key] = value.links[key]; }); return value; }); };
 Provider.prototype.options = function (force) { var self = this; if (this.filterOptions && !force) return Promise.resolve(this.filterOptions); return this.request(BASE + '/film-robotu-1/', null, function (body) { return { options: P.list(body, BASE + '/film-robotu-1/').options }; }, force, 'options').then(function (value) { self.filterOptions = value.options; return value.options; }); };
 Provider.prototype.list = function (query, next, force) {
  query = query || {}; var filters = query.filters || {}, discover = next && next.kind === 'discover' || query.kind === 'discover' || filters.genre || filters.year || filters.language || filters.imdb;
  var page = next && next.page || 1, body = null, url = next && next.url;
  if (discover) {
   url = BASE + '/film-robotu-1/'; body = { type: query.type === 'series' ? '2' : '1', genres: JSON.stringify(filters.genre ? [filters.genre] : []), years: filters.year || '', imdb: filters.imdb || '', lang: JSON.stringify(filters.language ? [filters.language] : []), order: query.order || 'posts.imdb desc', page: String(page) };
  } else if (!url) url = query.url || (query.type === 'series' ? BASE + '/yabancidiziizle-2/' : BASE + '/');
  var context = discover ? { kind: 'discover', page: page } : next || { page: 1 };
  return this.request(url, body, function (response) { return P.list(response, url, context); }, force);
 };
 Provider.prototype.search = function (query, force) {
  query = P.clean(query); if (!query || query.length > 100) return Promise.reject(new Error('Arama 1–100 karakter olmalı.'));
  var url = BASE + '/search/?q=' + encodeURIComponent(query); return this.request(url, null, function (body) { var result = P.list(body, url); result.next = null; return result; }, force, 'search');
 };
 Provider.prototype.detail = function (card, force) { return this.request(card.pageUrl, null, function (body) { return P.detail(body, card); }, force, 'detail'); };
 Provider.prototype.seriesLanguage = function (card) {
  var self = this, token = this.generation;
  return this.detail(card).then(function (detail) {
   if (token !== self.generation) throw new Error('İptal edildi');
   var episode = detail.episodes[0]; if (!episode) return { language: '' };
   return self.request(episode.pageUrl, null, P.episodeLanguage, false, 'episode-language').then(function (value) {
    if (token !== self.generation) throw new Error('İptal edildi');
    return { language: value.language, languageReference: { pageUrl: episode.pageUrl, title: episode.title, checkedAt: value.fetchedAt, stale: !!(detail.staleAt || value.staleAt) } };
   });
  });
 };
 root.CatalogProvider = Provider;
})(window);
