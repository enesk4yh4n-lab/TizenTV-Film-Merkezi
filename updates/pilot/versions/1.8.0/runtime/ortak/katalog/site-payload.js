/* Bounded inert JSON/Flight and catalog adapters. Never executes website scripts. */
(function (root) {
  'use strict';
  var U = root.CatalogUtils;
  function walk(value, visit) { var count = 0; function next(v, depth) { if (!v || typeof v !== 'object' || depth > 60 || ++count > 60000) return; visit(v); Object.keys(v).forEach(function (k) { next(v[k], depth + 1); }); } next(value, 0); }
  function records(html) {
    if (typeof html !== 'string' || html.length > 2097152) throw Error('Site yanıtı boyut sınırını aşıyor.');
    var wire = '', values = [], re = /<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi, m;
    while ((m = re.exec(html))) { var match = /^\s*self\.__next_f\.push\((\[[\s\S]*\])\);?\s*$/.exec(m[1]); if (!match) continue; try { var c = JSON.parse(match[1]); if (c[0] === 1 && typeof c[1] === 'string') wire += c[1]; } catch (ignore) {} }
    wire.split('\n').forEach(function (line) { var p = /^[a-f0-9]+:([\[{].*)$/.exec(line); if (p) try { values.push(JSON.parse(p[1])); } catch (ignore) {} });
    return values;
  }
  function find(html, predicate) { var found = null; walk(records(html), function (v) { if (!found && !Array.isArray(v) && predicate(v)) found = v; }); return found; }
  function clean(v) { return U.clean(v); }
  function text(n, selector) { n = n && (selector ? n.querySelector(selector) : n); return clean(n && n.textContent); }
  function adapter(c) {
    var base = root.SiteAddresses ? root.SiteAddresses.base(c.id, c.base) : c.base;
    function safe(v, page) { var u = U.url(v, page || base + '/'); if (root.SiteAddresses) u = root.SiteAddresses.resolve(u); if (!u) return ''; var p = new root.URL(u); return p.origin === base && !p.username && !p.password && !p.port ? u : ''; }
    function kind(v) { var u = safe(v); if (!u) return ''; var p = new root.URL(u).pathname; return c.episode && c.episode.test(p) ? 'episode' : c.series && c.series.test(p) ? 'series' : c.movie && c.movie.test(p) ? 'movie' : ''; }
    function id(v) { var u = safe(v), p = u && new root.URL(u).pathname, key = c.numericTailId && p && /-(\d+)\/?$/.exec(p); return u && kind(u) ? c.id + ':' + kind(u) + ':' + (key ? key[1] : p.replace(/^\/+|\/+$/g, '')) : ''; }
    function image(n, page) { var img = n.querySelector('img[data-src], img[data-original], img.lazy') || n.querySelector('img'); return U.url(img && (img.getAttribute('data-src') || img.getAttribute('data-original') || img.getAttribute('data-catalog-src')), page); }
    function cards(body, page) {
      var d = U.envelope(body).doc, out = [], seen = {};
      Array.prototype.forEach.call(d.querySelectorAll(c.cards || 'a[href]'), function (box) {
        var a = box.tagName === 'A' ? box : box.querySelector('a[href]'), url = safe(a && a.getAttribute('href'), page), type = kind(url), img = box.querySelector('img');
        if (!type || !img || seen[id(url)] || type === 'episode' && !c.episodeFeed) return;
        var title = clean(c.title && text(box, c.title) || a.getAttribute('title') || a.getAttribute('aria-label') || img.getAttribute('alt') || text(a)).replace(/\s+izle$/i, '');
        if (!title || /^(?:reklam|sponsor|logo)$/i.test(title)) return;
        var year = /\b((?:19|20)\d{2})\b/.exec(c.year ? text(box, c.year) : ''), row = { contentId: id(url), providerId: c.id, type: type, pageUrl: url, title: title, rawTitle: title, poster: image(box, page), year: year ? Number(year[1]) : null, imdb: null, language: '' };
        seen[row.contentId] = true; out.push(row);
      }); return out;
    }
    function list(body, page) {
      if (c.jsonSearch && /^\s*\{/.test(body)) return jsonSearch(body, page);
      var values = cards(body, page), d = U.envelope(body).doc, next = null;
      Array.prototype.some.call(d.querySelectorAll('a[rel~="next"], .pagination a, .page-numbers'), function (a) { var u = safe(a.getAttribute('href'), page); if (u && u !== page && (/next/.test(a.getAttribute('rel') || '') || /^(?:Sonraki|İleri|Next|›|»)$/i.test(text(a)))) { next = { url: u, from: page }; return true; } return false; });
      if (!values.length && !/sonuç.{0,40}(?:yok|bulunamad)|no results/i.test(text(d.body))) throw Error(c.name + ' katalog alanı bulunamadı veya erişim engellendi.');
      return { cards: values, next: next };
    }
    function jsonSearch(body, page) {
      var data; try { data = JSON.parse(body); } catch (ignore) { throw Error(c.name + ' arama yanıtı JSON değil.'); }
      if (!data || data.success !== true || !Array.isArray(data.data) || data.data.length > 200) throw Error(c.name + ' arama yanıtı doğrulanamadı.');
      var seen = {}, values = [];
      data.data.forEach(function(v) { if (!v || !/^[a-z0-9-]+$/.test(v.slug || '') || !/^(movie|series)$/.test(v.type) || typeof v.title !== 'string' || !clean(v.title)) return; var url = safe(c.jsonSearch.paths[v.type] + v.slug), key = id(url); if (!key || seen[key]) return; seen[key] = true; values.push({ contentId: key, providerId: c.id, type: v.type, pageUrl: url, title: clean(v.title), rawTitle: clean(v.title), poster: U.url(v.poster_url, page), year: typeof v.year === 'number' && v.year >= 1900 && v.year <= 2200 ? v.year : null, imdb: typeof v.imdb_rating === 'number' && v.imdb_rating >= 0 && v.imdb_rating <= 10 ? v.imdb_rating : null, language: '' }); });
      var next = safe(data.next_page_url || data.links && data.links.next, page); if (next && new root.URL(next).pathname !== new root.URL(page).pathname) next = '';
      return { cards: values, next: next ? {url:next,from:page} : null };
    }
    function numbers(url, label) { var p = new root.URL(url).pathname, m = /(?:sezon[-\/]?|s)(\d+).*?(?:bolum[-\/]?|b)(\d+)/i.exec(p) || /-(\d+)-sezon-(\d+)-bolum/i.exec(p) || /(\d+)\.?\s*Sezon\D+(\d+)\.?\s*Bölüm/i.exec(label); if (m) return [Number(m[1]), Number(m[2])]; m = /(?:-|\b)(\d+)[-. ]*b[oö]l[uü]m/i.exec(label || p); return m ? [1, Number(m[1])] : null; }
    function seriesPage(d, url) {
      var candidates = [], own = new root.URL(url).pathname;
      Array.prototype.forEach.call(d.querySelectorAll(c.parentLinks || '.breadcrumb a[href], .breadcrumbs a[href], a[rel="category tag"], a.r-dizi-btn, a.ec, nav a[href]'), function (a) { var u = safe(a.getAttribute('href'), url); if (kind(u) === 'series' && candidates.indexOf(u) < 0) candidates.push(u); });
      if (candidates.length === 1) return candidates[0];
      var matches = candidates.filter(function (u) { var slug = new root.URL(u).pathname.replace(/\/+$/, '').split('/').pop(); return own.indexOf('/' + slug + '-') >= 0 || own.indexOf('/' + slug + '/') >= 0 || own.indexOf('-' + slug + '-') >= 0; });
      return matches.length === 1 ? matches[0] : '';
    }
    function detail(body, card) {
      var page = safe(card.pageUrl), type = kind(page), env = U.envelope(body), d = env.doc, schemas = env.schema.filter(function (s) { return /^(?:Movie|TVSeries|TVEpisode)$/.test(s['@type']); }), schema = schemas[0] || {}, title = clean(schema.name) || text(d, c.heading || 'h1') || clean(card.title), og = d.querySelector('meta[property="og:image"]');
      if (!title && c.titleFromDocument) title = text(d, 'title').replace(/\s+Kategorisindeki Videolar[\s\S]*$/i, '');
      if (!page || !type || !title) throw Error(c.name + ' içerik detayı bulunamadı.');
      var r = { contentId: id(page), providerId: c.id, type: type, pageUrl: page, title: title.replace(/\s+izle$/i, ''), poster: U.url(typeof schema.image === 'string' ? schema.image : og && og.content, page) || card.poster || '', description: clean(schema.description) || text(d, c.description || '[itemprop="description"], .description, .summary, .dizi-aciklama'), originalTitle: clean(schema.alternateName), year: card.year || null, imdb: Number(schema.aggregateRating && schema.aggregateRating.ratingValue) || null, genres: Array.isArray(schema.genre) ? schema.genre : typeof schema.genre === 'string' ? schema.genre.split(',') : [], cast: [], seasons: [], episodes: [], sources: [], subtitles: [], language: card.language || '' };
      var y = /\b((?:19|20)\d{2})\b/.exec(String(schema.startDate || schema.releaseDate || '')); if (y && !r.year) r.year = Number(y[1]);
      if (type === 'episode') { r.seriesPageUrl = seriesPage(d, page); var ns = numbers(page, r.title); if (ns) r.episode = { seriesId: id(r.seriesPageUrl), season: ns[0], number: ns[1] }; }
      if (type === 'series') {
        var seen = {}, slug = new root.URL(page).pathname.replace(/\/+$/, '').split('/').pop(); r.episodePages = [];
        Array.prototype.forEach.call(d.querySelectorAll(c.episodeLinks || 'a[href]'), function (a) { var u = safe(a.getAttribute('href'), page), n = u && numbers(u, text(a)), key = n && n[0] + ':' + n[1]; if (kind(u) !== 'episode' || !n || seen[key]) return; var path = new root.URL(u).pathname; if (!c.boundEpisodeContainer && path.indexOf('/' + slug + '-') < 0 && path.indexOf('/' + slug + '/') < 0) return;
          seen[key] = true; var e = { contentId: id(u), providerId: c.id, type: 'episode', pageUrl: u, title: r.title + ' · ' + n[0] + '. Sezon ' + n[1] + '. Bölüm', episodeTitle: text(a), poster: r.poster, year: r.year, seriesPageUrl: page, episode: { seriesId: r.contentId, season: n[0], number: n[1] }, sources: [], subtitles: [] };r.episodes.push(e);if(r.seasons.indexOf(n[0])<0)r.seasons.push(n[0]);
        });r.episodes.sort(function(a,b){return a.episode.season-b.episode.season||a.episode.number-b.episode.number;});r.seasons.sort(function(a,b){return a-b;});
        Array.prototype.forEach.call(d.querySelectorAll(c.seriesPageLinks || 'a[href]'), function(a) { var u = safe(a.getAttribute('href'), page), p = u && new root.URL(u), own = new root.URL(page); if (!p || u === page) return; if (c.seasonPath && c.seasonPath.test(p.pathname) && p.pathname.indexOf(own.pathname.replace(/\/$/, '') + '/') === 0 || c.paginatedSeries && p.pathname === own.pathname && /^\?page=\d+$/.test(p.search)) { if (r.episodePages.indexOf(u) < 0) r.episodePages.push(u); } });
      }
      return root.ContentIdentity ? root.ContentIdentity.attachDetail(r, root.ContentIdentity.fromPage(body, page)) : r;
    }
    var P = { config: c, base: base, safe: safe, contentUrl: function (v) { return kind(v) ? safe(v) : ''; }, kind: kind, id: id, cards: cards, list: list, detail: detail };
    function Provider(cache, network) { root.CatalogClient.call(this, cache, network || root.ChainNetwork.createClient({ preferXHR: true, destination: 'downloads' }), { base: base, headers: { Accept: 'text/html' } }); }
    Provider.prototype = Object.create(root.CatalogClient.prototype); Provider.prototype.constructor = Provider;
    Provider.prototype.fetch = function (url, parse, force, scope) { url = safe(url); if (!url) return Promise.reject(Error('Site dışı katalog isteği reddedildi.')); return this.request(url, null, parse, force, c.id + '180-' + scope); };
    Provider.prototype.home = function (force) { return this.fetch(base + '/', function (body) { var v = list(body, base + '/').cards; return { hero: v.filter(function(x){return x.type!=='episode';})[0] || null, movies: v.filter(function(x){return x.type==='movie';}), series: v.filter(function(x){return x.type!=='movie';}) }; }, force, 'home'); };
    Provider.prototype.list = function (query, next, force) { var url = next && next.url || query && query.url || base + (query && query.type === 'movie' ? c.movieList || c.listPath || '/' : c.listPath || '/'); return this.fetch(url, function(body){return list(body,url);}, force, 'list'); };
    Provider.prototype.search = function (query, force, next) { query=clean(query);if(!query||query.length>100)return Promise.reject(Error('Arama 1–100 karakter olmalı.'));if(!c.searchPath&&!c.jsonSearch)return Promise.reject(Error(c.name+' arama yolu henüz doğrulanamadı.'));var url=next&&next.url||base+(c.jsonSearch ? c.jsonSearch.path+encodeURIComponent(query)+c.jsonSearch.suffix : c.searchPath+encodeURIComponent(query));return this.fetch(url,function(body){return list(body,url);},force,'search'); };
    Provider.prototype.options = function () { return Promise.resolve({genres:[],years:[],lang:[],imdb:[]}); };
    Provider.prototype.detail = function (card, force) { var self=this, deadline=Date.now()+25000, token=self.generation;return this.fetch(card.pageUrl,function(body){return detail(body,card);},force,'detail').then(function(d){if(d.type!=='episode'||!d.seriesPageUrl)return d;return self.fetch(d.seriesPageUrl,function(body){var parent=detail(body,{pageUrl:d.seriesPageUrl,poster:d.poster,year:d.year,title:card.title});parent.selectedEpisodePageUrl=d.pageUrl;return parent;},force,'series');}).then(function(d){if(d.type!=='series')return d;var queue=(d.episodePages||[]).slice(),visited={},seen={};visited[d.pageUrl]=true;d.episodes.forEach(function(e){seen[e.episode.season+':'+e.episode.number]=e;});function next(){if(token!==self.generation)throw Error('İptal edildi');var url=queue.shift();if(!url)return d;if(visited[url])return next();if(Object.keys(visited).length>=40||Date.now()>=deadline){d.episodePagesIncomplete=true;return d;}visited[url]=true;return self.fetch(url,function(body){return detail(body,{pageUrl:d.pageUrl,poster:d.poster,year:d.year,title:d.title});},force,'episode-page').then(function(extra){extra.episodes.forEach(function(e){seen[e.episode.season+':'+e.episode.number]=e;});(extra.episodePages||[]).forEach(function(u){if(!visited[u]&&queue.indexOf(u)<0)queue.push(u);});return next();});}return Promise.resolve().then(next).then(function(){d.episodes=Object.keys(seen).map(function(k){return seen[k];}).sort(function(a,b){return a.episode.season-b.episode.season||a.episode.number-b.episode.number;});d.seasons=[];d.episodes.forEach(function(e){if(d.seasons.indexOf(e.episode.season)<0)d.seasons.push(e.episode.season);});return d;});}); };
    return { parser: P, Provider: Provider };
  }
  root.SitePayload = { records: records, walk: walk, find: find, adapter: adapter };
})(window);
