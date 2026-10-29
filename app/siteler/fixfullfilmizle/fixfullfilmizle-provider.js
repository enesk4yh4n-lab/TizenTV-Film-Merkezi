(function (root) {
 'use strict';
 var P = root.FixFullParser, C = root.CatalogClient, BASE = P.base;
 function Provider(cache, network) { C.call(this, cache, network || root.ChainNetwork.createClient({ destination: 'downloads' }), { base: BASE, headers: { Accept: 'text/html', 'User-Agent': 'Mozilla/5.0' } }); this.base = BASE; this.links = { new: BASE + '/', recommended: BASE + '/en-cok-izlenenler/', rated: BASE + '/en-cok-yorumlananlar/', liked: BASE + '/en-cok-begenilenler/' }; }
 Provider.prototype = Object.create(C.prototype); Provider.prototype.constructor = Provider;
 Provider.prototype.fetch = function (url, parse, force, scope, deadline) {
  if (!P.safe(url)) return Promise.reject(new Error('FixFullFilmİzle dışı katalog adresi reddedildi.'));
  var old = this.deadline; this.deadline = deadline || Date.now() + 30000;
  var request = this.request(url, null, parse, force, 'fixfull0160-' + scope); this.deadline = old; return request;
 };
 Provider.prototype.home = function (force) {
  var self = this;
  return this.fetch(BASE + '/', P.home, force, 'home').then(function (data) {
   self.links = data.links; self.filterOptions = { genres: data.genres };
   data.series.forEach(function (card) { var known = self.cache.get('fixfull0160-seriesmeta|' + card.contentId); if (known) { card.poster = known.value.poster || ''; card.language = known.value.language || ''; } });
   return data;
  });
 };
 Provider.prototype.options = function () { var self = this; return this.filterOptions ? Promise.resolve(this.filterOptions) : this.home().then(function () { return self.filterOptions; }); };
 Provider.prototype.list = function (query, next, force) {
  query = query || {}; var self = this, f = query.filters || {};
  if (f.year || f.language || f.imdb) return Promise.reject(new Error('Bu site yıl/dil/IMDb birleşik filtresi sunmuyor.'));
  if (query.type === 'series') return this.home(force).then(function (data) { return { cards: data.series, next: null }; });
  if (f.genre && !P.genreUrl(f.genre)) return Promise.reject(new Error('Geçersiz film türü.'));
  var url = next && next.url || f.genre || query.url || this.links.new;
  return self.fetch(url, function (body) { var data = P.list(body, url); data.cards = data.cards.filter(function (c) { return c.type === 'movie'; }); return data; }, force, 'list');
 };
 Provider.prototype.search = function (query, force,next) {
  query = root.CatalogUtils.clean(query);
  if (!query || query.length > 100) return Promise.reject(new Error('Arama 1–100 karakter olmalı.'));
  var first = BASE + '/?s=' + encodeURIComponent(query), url = root.CatalogSearch.pageUrl(first,next);
  return this.fetch(url, function (body) { return root.CatalogSearch.pageResult(P.list(body,url),first,url); }, force, 'search');
 };
 Provider.prototype.identity=function(card,force){
  if(card.type!=='series'||!P.seriesUrl(card.pageUrl))return this.detail(card,force);
  var self=this,token=this.generation,page=P.seriesUrl(card.pageUrl),deadline=this.deadline||Date.now()+30000;
  return this.fetch(page,function(body){return P.seriesArchive(body,page);},force,'identity0170-series',deadline).then(function(data){
   if(token!==self.generation)throw new Error('İptal edildi');var first=data.cards.filter(function(c){return c.episodeNumbers.season===1&&c.episodeNumbers.number===1;})[0];if(!first)return card;
   return self.fetch(first.pageUrl,function(body){return P.meta(body,first);},force,'identity0170-detail',deadline).then(function(meta){
    if(token!==self.generation)throw new Error('İptal edildi');if(meta.seriesPageUrl!==page||!meta.episodeNumbers||meta.episodeNumbers.season!==1||meta.episodeNumbers.number!==1)return card;
    var result=root.PlayerCore.copy(card);result.year=meta.year;result.poster=result.poster||meta.poster;result.language=result.language||meta.language;return result;
   });
  });
 };
 Provider.prototype.seriesDetail = function (card, force, deadline) {
  var self = this, token = this.generation, page = P.seriesUrl(card.pageUrl), visited = {}, pages = 0, all = [], title = card.title;
  if (!page) return Promise.reject(new Error('Geçersiz dizi adresi.'));
  function read(url) {
   if (token !== self.generation) return Promise.reject(new Error('İptal edildi'));
   if (visited[url] || ++pages > 50 || Date.now() >= deadline) return Promise.reject(new Error('Dizi bölüm listesi istek sınırına ulaştı.'));
   visited[url] = true;
   return self.fetch(url, function (body) { return P.seriesArchive(body, url); }, force, 'series', deadline).then(function (data) {
    if (token !== self.generation) throw new Error('İptal edildi');
    title = title || data.title; all = all.concat(data.cards); return data.next ? read(data.next.url) : null;
   });
  }
  return read(page).then(function () {
   var seen = {}, seriesId = P.id(page, 'series'), episodes = [], poster = card.poster || all[0] && all[0].poster || '', lang = card.language || all[0] && all[0].language || '';
   all.forEach(function (c) { var n = c.episodeNumbers, key = n.season + ':' + n.number; if (seen[key]) return; seen[key] = true; episodes.push({ contentId: seriesId + ':s' + n.season + ':e' + n.number, providerId: 'fixfullfilmizle', type: 'episode', pageUrl: c.pageUrl, title: title + ' · ' + n.season + '×' + n.number, episodeTitle: n.number + '. Bölüm', seriesTitle: title, seriesPageUrl: page, poster: c.poster || poster, language: c.language || lang, episode: { seriesId: seriesId, season: n.season, number: n.number }, sources: [] }); });
   episodes.sort(function (a, b) { return a.episode.season - b.episode.season || a.episode.number - b.episode.number; });
   if (!episodes.length) throw new Error('Dizinin gerçek bölüm bağlantıları bulunamadı.');
   var seasons = []; episodes.forEach(function (e) { if (seasons.indexOf(e.episode.season) < 0) seasons.push(e.episode.season); });
   self.cache.put('fixfull0160-seriesmeta|' + seriesId, { poster: poster, language: lang });
   return { contentId: seriesId, providerId: 'fixfullfilmizle', type: 'series', pageUrl: page, title: title, poster: poster, description: '', genres: [], cast: [], language: lang, episodes: episodes, seasons: seasons, sources: [], subtitles: [] };
  });
 };
 Provider.prototype.detail = function (card, force) {
  var self = this, token = this.generation, deadline = Date.now() + 30000;
  if (P.seriesUrl(card.pageUrl)) return this.seriesDetail(card, force, deadline);
  var url = P.movieUrl(card.pageUrl);
  if (!url) return Promise.reject(new Error('Geçersiz film/bölüm adresi.'));
  return this.fetch(url, function (body) { return P.meta(body, card); }, force, 'detail', deadline).then(function (meta) {
   if (token !== self.generation) throw new Error('İptal edildi');
   if (!meta.seriesPageUrl || !meta.episodeNumbers) return meta;
   return self.seriesDetail({ pageUrl: meta.seriesPageUrl, poster: meta.poster, language: meta.language }, force, deadline).then(function (detail) {
    if (token !== self.generation) throw new Error('İptal edildi');
    var chosen = detail.episodes.filter(function (e) { return e.pageUrl === meta.pageUrl; })[0];
    if (!chosen) throw new Error('Seçilen bölüm gerçek dizi listesinde bulunamadı.');
    detail.selectedEpisodeId = chosen.contentId; detail.description = meta.description; return detail;
   });
  });
 };
 Provider.prototype.seriesLanguage = function () { return Promise.resolve({ language: '' }); };
 root.FixFullProvider = Provider;
})(window);
