(function (root) {
 'use strict';
 var P = root.CatalogParser, BASE = P.base;
 function Provider(cache, network) { this.cache = cache; this.network = network || root.ChainNetwork.createClient(); this.generation = 0; this.queue = []; this.active = 0; this.timers = []; this.links = { new: BASE + '/', recommended: BASE + '/category/tavsiye-filmler-izle2/', rated: BASE + '/imdb-7-puan-uzeri-filmler-2/', liked: BASE + '/en-cok-begenilen-filmleri-izle-4/' }; this.filterOptions = null; }
 Provider.prototype.cancel = function () { this.generation++; this.network.cancel(); this.timers.forEach(clearTimeout); this.timers = []; this.queue.splice(0).forEach(function (job) { job.reject(new Error('İptal edildi')); }); };
 Provider.prototype.pump = function () { while (this.active < 2 && this.queue.length) this.queue.shift().run(); };
 Provider.prototype.request = function (url, body, parse, force, scope) {
  var self = this, token = this.generation, key = (scope || 'list') + '|' + url + (body ? '|' + JSON.stringify(body) : ''), cached = this.cache.get(key), started = Date.now();
  if (cached && !cached.stale && !force) { cached.value.fetchedAt = cached.at; return Promise.resolve(cached.value); }
  return new Promise(function (resolve, reject) {
   var done = false, timer, job = { reject: function (error) { finish(error); }, run: function () {
    if (done) return; if (token !== self.generation) return finish(new Error('İptal edildi'));
    self.active++; job.running = true;
    var headers = { Accept: 'application/json, text/html', 'X-Requested-With': 'fetch' };
    if (body) headers['X-Mofycore-Action'] = 'discover';
    (body ? self.network.post(url, body, headers) : self.network.get(url, BASE + '/', headers)).then(function (response) {
     if (token !== self.generation) return finish(new Error('İptal edildi')); if (done) return;
     try { var value = parse(response.body); value.fetchedAt = Date.now(); self.cache.put(key, value); finish(null, value); } catch (e) { finish(e); }
    }, function (e) { finish(e); });
   } };
   function finish(error, value) {
    if (done) return; done = true; clearTimeout(timer); var i = self.timers.indexOf(timer); if (i >= 0) self.timers.splice(i, 1);
    if (job.running) self.active--; else { i = self.queue.indexOf(job); if (i >= 0) self.queue.splice(i, 1); }
    if (error && cached && token === self.generation && !/ptal/.test(error.message)) { value = cached.value; value.staleAt = cached.at; value.refreshError = error.message; error = null; }
    if (error) reject(error); else resolve(value); self.pump();
   }
   /* Includes queueing and both transport attempts; one interaction cannot hang indefinitely. */
   timer = setTimeout(function () { if (token === self.generation) self.network.cancel(); finish(new Error('Katalog isteği 30 saniyede tamamlanamadı.')); }, Math.max(1, Math.min(started + 30000, self.deadline || Infinity) - Date.now()));
   self.timers.push(timer); self.queue.push(job); self.pump();
  });
 };
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
