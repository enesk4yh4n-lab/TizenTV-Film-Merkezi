(function (root) {
 'use strict';
 var P = root.FilmizleParser, BASE = P.base, Client = root.CatalogClient;
 function Provider(cache, network) { Client.call(this,cache,network,{base:BASE,headers:{Accept:'text/html','User-Agent':'Mozilla/5.0'}}); this.base = BASE; this.links = { new: BASE + '/Kategori/en-populer-filmler/', recommended: BASE + '/Kategori/en-populer-filmler/?sort=views', rated: BASE + '/Kategori/en-populer-filmler/?sort=imdb', liked: BASE + '/Kategori/en-populer-filmler/?sort=comments' }; }
 Provider.prototype = Object.create(Client.prototype); Provider.prototype.constructor = Provider;
 Provider.prototype.fetch = function (url, parse, force, scope) { if (!P.safe(url)) return Promise.reject(new Error('Filmizle dışı katalog bağlantısı reddedildi.')); return this.request(url, null, parse, force, 'filmizle0172-' + scope); };
 Provider.prototype.home = function (force) { var self = this; return this.fetch(BASE + '/', P.home, force, 'home').then(function (data) { self.links = data.links; self.filterOptions = { genres: data.genres, order: [{ value: 'date', label: 'Yeni eklenenler' }, { value: 'views', label: 'En çok izlenenler' }, { value: 'imdb', label: 'IMDb puanı' }, { value: 'comments', label: 'En çok yorumlananlar' }] }; return data; }); };
 Provider.prototype.options = function () { var self = this; return this.filterOptions ? Promise.resolve(this.filterOptions) : this.home().then(function () { return self.filterOptions; }); };
 Provider.prototype.list = function (query, next, force) {
  query = query || {}; var filters = query.filters || {}, hint = query.type === 'series' ? 'series' : null;
  if (filters.year || filters.language || filters.imdb) return Promise.reject(new Error('Bu site yıl/dil/IMDb birleşik filtre isteği sunmuyor.'));
  var url = next && next.url || filters.genre || query.url || (hint ? BASE + '/Kategori/dizi-izle/' : this.links.new), parsed;
  if (hint && filters.genre) return Promise.reject(new Error('Bu sitede dizi ve tür birleşimi doğrulanmadı.'));
  if (!next && query.order) url = P.withSort(url, /^(date|views|imdb|comments)$/.test(query.order) ? query.order : /avg/.test(query.order) ? 'comments' : 'imdb');
  return this.fetch(url, function (body) { var value = P.list(body, url, hint); if (!hint) value.cards = value.cards.filter(function (c) { return c.type !== 'series'; }); return value; }, force, 'list');
 };
 Provider.prototype.search = function (query, force,next) { query = root.CatalogUtils.clean(query); if (!query || query.length > 100) return Promise.reject(new Error('Arama 1–100 karakter olmalı.')); var first = BASE + '/?s=' + encodeURIComponent(query), url = root.CatalogSearch.pageUrl(first,next); return this.fetch(url, function (body) { return root.CatalogSearch.pageResult(P.list(body,url),first,url); }, force, 'search'); };
 Provider.prototype.identity = function(card,force){return this.fetch(card.pageUrl,function(body){var d=P.detail(body,card);if(d.type==='series'&&/\b1\.?\s*Sezon\b/i.test(d.title)){var doc=root.CatalogUtils.envelope(body).doc,n=doc.querySelector('.p-v12-meta-info > .meta-item'),value=root.CatalogUtils.clean(n&&n.textContent);if(/^(?:19|20)\d{2}$/.test(value))d.yearHint=Number(value);}return d;},force,'identity0170-detail');};
 Provider.prototype.detail = function (card, force) { return this.fetch(card.pageUrl, function (body) { return P.detail(body, card); }, force, 'detail'); };
 Provider.prototype.seriesLanguage = function () { return Promise.resolve({ language: '' }); };
 root.FilmizleProvider = Provider;
})(window);
