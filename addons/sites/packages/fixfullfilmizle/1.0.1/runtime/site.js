/* Generated from canonical site sources; edit deneme/siteler, then rebuild. */
(function(shared){'use strict';if(!shared.SitePluginRuntime)throw Error('Update core component to 1.8.0 before installing this site.');var context=shared.FilmPlugins.context(),window=shared.SitePluginRuntime.scope(context,'1.8.0');

/* siteler/fixfullfilmizle/fixfullfilmizle-parser.js */
/* FixFullFilmIzle catalog data. Site HTML is parsed in an inert document. */
(function (root) {
 'use strict';
 var U = root.CatalogUtils, BASE = (root.SiteAddresses ? root.SiteAddresses.base('fixfullfilmizle', 'https://www.fixfullfilmizle.net') : 'https://www.fixfullfilmizle.net');
 function text(node, query) { var n = node && (query ? node.querySelector(query) : node); return U.clean(n && n.textContent); }
 function safe(value, page) { var url = U.url(value, page || BASE + '/'), u; try { u = new root.URL(url); } catch (ignore) {} return u && u.origin === BASE && !u.username && !u.password ? url : ''; }
 function seriesUrl(value) { var url = safe(value), u = url && new root.URL(url); return u && !u.search && /^\/diziler\/[a-z0-9-]+\/$/.test(u.pathname) ? url : ''; }
 function genreUrl(value) { var url = safe(value), u = url && new root.URL(url); return u && !u.search && /^\/[a-z0-9-]+-(?:filmleri|filmler)\/$/.test(u.pathname) ? url : ''; }
 function sourcePage(value) {
  var url = safe(value), u = url && new root.URL(url);
  if (!u || u.search || !/^\/[a-z0-9-]+\/(?:[1-9]\d*\/)?$/.test(u.pathname)) return '';
  var slug = u.pathname.split('/')[1], part = u.pathname.split('/')[2];
  if (/^(?:page|diziler|uye-ol|uye-girisi|bize-yazin|hukuksal-dmca|en-cok-izlenenler|en-cok-yorumlananlar|en-cok-begenilenler)$/.test(slug) || genreUrl(BASE + '/' + slug + '/') || part && Number(part) > 12) return '';
  return url;
 }
 function movieUrl(value) { var url = sourcePage(value); return url ? BASE + '/' + new root.URL(url).pathname.split('/')[1] + '/' : ''; }
 function id(value, type) { var url = type === 'series' ? seriesUrl(value) : movieUrl(value); if (!url) return ''; return 'fixfullfilmizle:' + (type === 'series' ? 'series:' + new root.URL(url).pathname.split('/')[2] : 'movie:' + new root.URL(url).pathname.split('/')[1]); }
 function title(value) { return U.clean(value).replace(/\s+(?:Full\s+(?:HD\s+)?Film(?:\s+HD)?|Full\s+HD|HD\s+Film|Türkçe\s+Dublaj|Türkçe\s+Altyazılı)\s+izle$/i, '').replace(/\s+izle$/i, ''); }
 function number(value) { var m = /\d+(?:[.,]\d+)?/.exec(value); return m ? Number(m[0].replace(',', '.')) : null; }
 function image(node, page) { var img = node && node.querySelector('img'); return img ? U.url(img.getAttribute('data-src') || img.getAttribute('data-litespeed-src') || img.getAttribute('data-catalog-src'), page) : ''; }
 function language(node) { var dub = !!node.querySelector('.tr-dublaj'), sub = !!node.querySelector('.tr-altyazi'); return dub && sub ? 'Dublaj & Altyazılı' : dub ? 'Türkçe Dublaj' : sub ? 'Türkçe Altyazılı' : ''; }
 function episodeNumbers(label, url) { var m = /(\d+)\.?\s*Sezon\s+(\d+)\.?\s*Bölüm/i.exec(label) || /-(\d+)-sezon-(\d+)-bolum(?:-|\/)/.exec(url); return m && Number(m[1]) > 0 && Number(m[2]) > 0 ? { season: Number(m[1]), number: Number(m[2]) } : null; }
 function cards(d, page) {
  var out = [], seen = {}, scope = d.querySelector('.leftC');
  if (!scope) throw new Error('FixFullFilmİzle katalog biçimi tanınamadı.');
  Array.prototype.forEach.call(scope.querySelectorAll('.moviefilm'), function (box) {
   var a = box.querySelector('.movief a[href]'), url = movieUrl(safe(a && a.getAttribute('href'), page)), label = text(a);
   if (!url || !label || seen[url]) return; seen[url] = true;
   var ep = episodeNumbers(label, url), c = { contentId: ep ? 'fixfullfilmizle:entry:' + new root.URL(url).pathname.split('/')[1] : id(url), providerId: 'fixfullfilmizle', type: ep ? 'series' : 'movie', pageUrl: url, title: title(label), poster: image(box, page), year: null, imdb: number(text(box, '.imdbpoint')), language: language(box) };
   if (ep) c.episodeNumbers = ep;
   out.push(c);
  });
  return out;
 }
 function next(d, page) {
  var a = d.querySelector('.wp-pagenavi a[rel="next"]') || d.querySelector('.wp-pagenavi a.nextpostslink'), url = safe(a && a.getAttribute('href'), page);
  if (!url || url === page) return null;
  var current = new root.URL(page), target = new root.URL(url), old = /\/page\/(\d+)\/$/.exec(current.pathname), more = /\/page\/(\d+)\/$/.exec(target.pathname);
  if (!more || Number(more[1]) !== (old ? Number(old[1]) : 1) + 1 || current.pathname.replace(/page\/\d+\/$/, '') !== target.pathname.replace(/page\/\d+\/$/, '')) return null;
  return { kind: 'url', url: url };
 }
 function list(body, page) { if(root.SiteAddresses)page=root.SiteAddresses.resolve(page); var d = U.envelope(body).doc; return { cards: catalogCards(d,page), next: next(d, page) }; }
 function catalogCards(d,page){
  var index=seriesIndex(d),out=[],seen={};
  cards(d,page).forEach(function(c){if(c.episodeNumbers){var base=U.clean(c.title.replace(/\s+\d+\.?\s*Sezon[\s\S]*$/i,'')),key=base.toLocaleLowerCase(),parent=index.filter(function(x){return x.title.toLocaleLowerCase()===key;})[0];
   if(parent){var legacy=c.contentId;c=root.PlayerCore.copy(parent);c.poster=c.poster||imageFor(base);c.legacyContentIds=[legacy];}else{c.title=base;}
   var existing=out.filter(function(x){return parent?x.contentId===c.contentId:x.type==='series'&&x.title.toLocaleLowerCase()===key;})[0];if(existing){existing.legacyContentIds=(existing.legacyContentIds||[]).concat(c.legacyContentIds||[c.contentId]);return;}
  }if(!seen[c.contentId]){seen[c.contentId]=true;out.push(c);}});return out;
  function imageFor(base){var raw=cards(d,page).filter(function(x){return x.title.indexOf(base)===0;})[0];return raw&&raw.poster||'';}
 }
 function genres(d) {
  var out = [], seen = {};
  Array.prototype.forEach.call(d.querySelectorAll('.cat-item a[href]'), function (a) { var url = genreUrl(a.getAttribute('href')); if (url && !seen[url]) { seen[url] = true; out.push({ value: url, label: text(a).replace(/\s+Filmler[i]?$/i, '') }); } });
  return out;
 }
 function seriesIndex(d) {
  var out = [], seen = {};
  Array.prototype.forEach.call(d.querySelectorAll('select option[value]'), function (option) { var url = seriesUrl(option.getAttribute('value')), label = text(option); if (!url || !label || seen[url]) return; seen[url] = true; out.push({ contentId: id(url, 'series'), providerId: 'fixfullfilmizle', type: 'series', pageUrl: url, title: label, poster: '', language: '' }); });
  return out;
 }
 function home(body) {
  var d = U.envelope(body).doc, all = cards(d, BASE + '/');
  if (!all.length) throw new Error('FixFullFilmİzle ana kataloğu boş veya tanınmıyor.');
  return { hero: all[0], movies: all.filter(function (c) { return c.type === 'movie'; }), series: seriesIndex(d), genres: genres(d), links: { new: BASE + '/', recommended: BASE + '/en-cok-izlenenler/', rated: BASE + '/en-cok-yorumlananlar/', liked: BASE + '/en-cok-begenilenler/' } };
 }
 function meta(body, original) {
  var page = movieUrl(original.pageUrl), d = U.envelope(body).doc, info = d.querySelector('.filmaltiaciklama'), heading = text(d, '.leftC h1');
  if (!page || !info || !heading) throw new Error('FixFullFilmİzle film/bölüm detayı tanınamadı.');
  var fields = {}, gs = [], series = '';
  Array.prototype.forEach.call(info.querySelectorAll('p'), function (p) { var key = text(p, 'span'); if (key) fields[key] = U.clean(text(p).slice(key.length).replace(/^\s*:\s*/, '')); });
  Array.prototype.forEach.call(info.querySelectorAll('a[rel~="category"]'), function (a) { var url = safe(a.getAttribute('href'), page); if (genreUrl(url)) gs.push(text(a).replace(/\s+Filmler[i]?$/i, '')); else if (seriesUrl(url)) series = url; });
  var labelLanguage = /Türkçe\s+Dublaj\s+izle$/i.test(heading) ? 'Türkçe Dublaj' : /Türkçe\s+Altyazılı\s+izle$/i.test(heading) ? 'Türkçe Altyazılı' : '';
  return { contentId: id(page), providerId: 'fixfullfilmizle', type: 'movie', pageUrl: page, title: title(heading), poster: image(d.querySelector('.filmaltiimg'), page) || original.poster || '', description: text(info, '.konuozet'), year: number(fields['Yapım'] || ''), imdb: number(fields['IMDB Puanı'] || ''), cast: (fields['Oyuncular'] || '').split(',').map(U.clean).filter(Boolean), genres: gs, language: original.language || labelLanguage, episodes: [], seasons: [], sources: [], subtitles: [], seriesPageUrl: series, episodeNumbers: episodeNumbers(heading, page) };
 }
 function seriesArchive(body, page) {
  var d = U.envelope(body).doc, all = cards(d, page), episodes = all.filter(function (c) { return !!c.episodeNumbers; });
  if (all.length && !episodes.length) throw new Error('Dizi arşivinde bölüm bilgisi bulunamadı.');
  return { title: title(text(d, '.leftC h1')), cards: episodes, next: next(d, page) };
 }
 root.FixFullParser = { base: BASE, safe: safe, sourcePage: sourcePage, movieUrl: movieUrl, seriesUrl: seriesUrl, genreUrl: genreUrl, id: id, home: home, list: list, meta: meta, seriesArchive: seriesArchive };
})(window);


/* siteler/fixfullfilmizle/fixfullfilmizle-provider.js */
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
 Provider.prototype.identity=function(card,force){if(root.SiteAddresses)card=root.SiteAddresses.content(card);
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
 Provider.prototype.detail = function (card, force) {if(root.SiteAddresses)card=root.SiteAddresses.content(card);
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


/* siteler/fixfullfilmizle/fixfullfilmizle-decoder.js */
/* Inert DOM and literal FirePlayer/JW data only; no remote JavaScript execution. */
(function (root) {
  'use strict';
  var U = root.CatalogUtils;
  function failure(message) {
    var e = new Error('FixFullFilmİzle · ' + message);
    e.stage = 'decode';
    return e;
  }
  function literal(input, start) {
    var quote = input.charAt(start),
      out = '',
      i = start + 1;
    if (quote !== "'" && quote !== '"') throw failure('Veri dizesi bekleniyordu.');
    for (; i < input.length; i++) {
      var c = input.charAt(i);
      if (c === quote) return { value: out, end: i + 1 };
      if (c === '\\') {
        c = input.charAt(++i);
        var escapes = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v' };
        if (c === 'x' || c === 'u') {
          var size = c === 'x' ? 2 : 4,
            hex = input.substr(i + 1, size);
          if (!new RegExp('^[0-9a-fA-F]{' + size + '}$').test(hex))
            throw failure('Geçersiz veri kaçışı.');
          out += String.fromCharCode(parseInt(hex, 16));
          i += size;
        } else if (c === '\\' || c === '/' || c === "'" || c === '"') out += c;
        else if (escapes[c]) out += escapes[c];
        else throw failure('Desteklenmeyen veri kaçışı.');
      } else out += c;
      if (out.length > 1024 * 1024) throw failure('Veri dizesi sınırı aşıldı.');
    }
    throw failure('Eksik veri dizesi.');
  }
  function documentData(body) {
    if (typeof body !== 'string' || body.length > 2 * 1024 * 1024)
      throw failure('Oynatıcı yanıtı sınırı aşıldı.');
    var html = body
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
      .replace(/<link\b[^>]*>/gi, '')
      .replace(/\ssrc\s*=/gi, ' data-frame-src=')
      .replace(/\ssrcset\s*=/gi, ' data-frame-srcset=')
      .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
    return new DOMParser().parseFromString(html, 'text/html');
  }
  function publicMedia(value, page) {
    var url = U.url(value, page),
      u;
    try {
      u = new root.URL(url);
    } catch (ignore) {
      return '';
    }
    if (
      u.protocol !== 'https:' ||
      u.username ||
      u.password ||
      !/\./.test(u.hostname) ||
      /^(?:localhost|127\.|10\.|192\.168\.|169\.254\.|0\.)|(?:^|\.)local$|^172\.(?:1[6-9]|2\d|3[01])\./i.test(
        u.hostname
      )
    )
      return '';
    return url;
  }
  function alternatives(body, page) {
    var P = root.FixFullParser,
      canonical = P.movieUrl(page),
      d = documentData(body),
      menu = d.querySelector('.keremiya_part'),
      out = [],
      seen = {},
      tabs = menu && menu.querySelector('a[data-keremiya-part][aria-controls]');
    if (!canonical || !menu) throw failure('Kaynak seçim alanı bulunamadı.');
    Array.prototype.forEach.call(menu.children, function (node) {
      var label = U.clean(node.textContent),
        url;
      if (tabs) {
        if (node.tagName !== 'A') return;
        var part = node.getAttribute('data-keremiya-part'),
          panelId = node.getAttribute('aria-controls'),
          panel = d.getElementById(panelId),
          container = d.querySelector('.filmicerik #vast'),
          iframe,
          wrapper;
        if (
          !/^[1-9]\d*$/.test(part || '') ||
          panelId !== 'keremiya-part-' + part ||
          !panel ||
          !container ||
          panel.parentNode !== container ||
          panel.getAttribute('data-keremiya-panel') !== part ||
          seen[panelId] ||
          !label
        )
          return;
        iframe = panel.querySelector('iframe');
        try {
          wrapper = playerFrame(
            iframe &&
              (iframe.getAttribute('data-frame-src') || iframe.getAttribute('data-keremiya-src')),
            page
          );
        } catch (invalidFrame) {
          return;
        }
        seen[panelId] = true;
        out.push({ url: canonical, label: label, panelId: panelId, frameUrl: wrapper });
        return;
      }
      if (node.tagName === 'A') url = P.sourcePage(U.url(node.getAttribute('href'), page));
      else if (node.tagName === 'SPAN' && !/^\(/.test(label)) url = P.sourcePage(page);
      if (!url || !label || P.movieUrl(url) !== canonical || seen[url]) return;
      seen[url] = true;
      out.push({ url: url, label: label });
    });
    if (!out.length || out.length > 12) throw failure('Kaynak seçim listesi tanınamadı.');
    return out;
  }
  function playerFrame(value, page) {
    var url = U.url(value, page),
      u;
    try {
      u = new root.URL(url);
    } catch (ignore) {}
    if (
      !u ||
      u.origin !== 'https://oynat.fixfullfilmizle.net' ||
      !/^\/url\/[a-f0-9]{32}$/.test(u.pathname) ||
      u.search ||
      u.username ||
      u.password
    )
      throw failure('Aktif Fix Video oynatıcısı bulunamadı.');
    return url;
  }
  function frame(body, page) {
    var d = documentData(body),
      n = d.querySelector('.filmicerik #vast iframe');
    return playerFrame(n && n.getAttribute('data-frame-src'), page);
  }
  function wrappedFrame(body) {
    var d = documentData(body),
      m =
        /\bvar\s+iframe\s*=\s*document\.getElementById\(\s*(['"])HivePlayer\1\s*\)\s*;[\s\S]*?\biframe\.src\s*=\s*/.exec(
          body
        );
    if (!d.querySelector('iframe#HivePlayer') || !m)
      throw failure('Oynatıcı yönlendirme verisi bulunamadı.');
    var url = literal(body, m.index + m[0].length).value,
      u;
    try {
      u = new root.URL(url);
    } catch (ignore) {}
    if (
      !u ||
      u.origin !== 'https://myplayersvideo.xyz' ||
      !/^\/fireplayer\/video\/[a-f0-9]{32}$/.test(u.pathname) ||
      u.search ||
      u.username ||
      u.password
    )
      throw failure('Desteklenmeyen alt oynatıcı adresi.');
    return url;
  }
  function unpackAll(body) {
    var marker = /\beval\(function\(p,a,c,k,e,d\)[\s\S]*?return p\}\(/g,
      match,
      out = [];
    while ((match = marker.exec(body))) {
      if (out.length >= 8) throw failure('Oynatıcı veri katmanı sınırı aşıldı.');
      var payload = literal(body, match.index + match[0].length),
        tail = /^\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*/.exec(body.slice(payload.end));
      if (!tail) throw failure('Oynatıcı sözlüğü eksik.');
      var radix = Number(tail[1]),
        count = Number(tail[2]);
      if (radix < 2 || radix > 62 || count < 1 || count > 4096)
        throw failure('Oynatıcı sözlüğü sınırı aşıldı.');
      var dictionary = literal(body, payload.end + tail[0].length),
        keys = dictionary.value.split('|');
      if (
        !/^\.split\(['"]\|['"]\),0,\{\}\)\)/.test(body.slice(dictionary.end)) ||
        keys.length !== count
      )
        throw failure('Geçersiz oynatıcı sözlüğü.');
      function index(word) {
        var n = 0;
        for (var i = 0; i < word.length; i++) {
          var c = word.charCodeAt(i),
            v = c >= 97 ? c - 87 : c >= 65 ? c - 29 : c - 48;
          if (v < 0 || v >= radix) return -1;
          n = n * radix + v;
          if (n >= count) return -1;
        }
        return n;
      }
      out.push(
        payload.value.replace(/\b[0-9A-Za-z]+\b/g, function (word) {
          var i = index(word);
          return i >= 0 && keys[i] ? keys[i] : word;
        })
      );
      marker.lastIndex = dictionary.end;
    }
    return out;
  }
  function settings(body, page) {
    documentData(body);
    var jw = /\bjwplayer\(\s*['"]playerbase['"]\s*\)\s*\.setup\(\s*\{/.exec(body);
    if (jw) {
      var file = /\bfile\s*:\s*/.exec(body.slice(jw.index + jw[0].length));
      if (!file) throw failure('BRONZ medya verisi bulunamadı.');
      var media = publicMedia(
        literal(body, jw.index + jw[0].length + file.index + file[0].length).value,
        page
      );
      if (!media || !/\.mp4$/i.test(new root.URL(media).pathname))
        throw failure('BRONZ MP4 adresi doğrulanamadı.');
      return { kind: 'mp4', url: media, subtitles: [] };
    }
    var values = unpackAll(body),
      result = null;
    values.some(function (data) {
      var m = /\bFirePlayer\(\s*(['"])([a-f0-9]{32})\1\s*,\s*/.exec(data);
      if (!m) return false;
      var start = m.index + m[0].length,
        depth = 0,
        quoted = false,
        escaped = false,
        end = -1;
      for (var i = start; i < data.length; i++) {
        var c = data.charAt(i);
        if (quoted) {
          if (escaped) escaped = false;
          else if (c === '\\') escaped = true;
          else if (c === '"') quoted = false;
        } else if (c === '"') quoted = true;
        else if (c === '{') depth++;
        else if (c === '}' && --depth === 0) {
          end = i + 1;
          break;
        }
      }
      var config;
      try {
        config = JSON.parse(data.slice(start, end));
      } catch (ignore) {
        throw failure('FirePlayer ayarı JSON değil.');
      }
      if (!config || !Array.isArray(config.tracks)) throw failure('FirePlayer ayarı eksik.');
      var subtitles = [];
      config.tracks.forEach(function (t) {
        var url = t.kind === 'captions' && publicMedia(t.file, page);
        if (url)
          subtitles.push({
            url: url,
            label: U.clean(t.label) || 'Altyazı',
            language: t.language || '',
            type: 'vtt',
          });
      });
      var parsed;
      try {
        parsed = new root.URL(page);
      } catch (ignore2) {}
      var prefix =
        parsed && parsed.origin === 'https://myplayersvideo.xyz'
          ? '/fireplayer/video/'
          : parsed && parsed.origin === 'https://matrudas.com'
            ? '/video/'
            : '';
      if (
        !parsed ||
        !prefix ||
        parsed.pathname !== prefix + m[2] ||
        parsed.username ||
        parsed.password
      )
        throw failure('FirePlayer kimliği sayfa adresiyle eşleşmiyor.');
      result = {
        kind: 'fireplayer',
        hash: m[2],
        api:
          parsed.origin === 'https://matrudas.com'
            ? parsed.origin + '/player/index.php?data=' + m[2] + '&do=getVideo'
            : parsed.origin + parsed.pathname + '?do=getVideo',
        subtitles: subtitles,
      };
      return true;
    });
    if (!result) throw failure('Aktif FirePlayer ayarı bulunamadı.');
    return result;
  }
  function host(value) {
    var url = publicMedia(value),
      u = url && new root.URL(url);
    return u &&
      !u.search &&
      ((u.origin === 'https://vidara.to' && /^\/e\/[A-Za-z0-9]{8,24}$/.test(u.pathname)) ||
        (u.origin === 'https://matrudas.com' && /^\/video\/[a-f0-9]{32}$/.test(u.pathname)) ||
        (u.origin === 'https://vevocloud.com' && /^\/play\/index\/[a-f0-9]{24}$/.test(u.pathname)))
      ? url
      : '';
  }
  function media(body) {
    var data;
    try {
      data = JSON.parse(body);
    } catch (ignore) {
      throw failure('Oynatıcı API yanıtı JSON değil.');
    }
    if (data && typeof data.videoSrc === 'string') {
      var embed = host(data.videoSrc);
      if (!embed) throw failure('Desteklenmeyen video sunucusu.');
      return { kind: 'embed', url: embed };
    }
    var url = data && publicMedia(data.videoSource);
    if (!url || data.hls !== true) throw failure('Desteklenen HLS kaynağı bulunamadı.');
    if (data.securedLink) {
      var signed = publicMedia(data.securedLink),
        source = new root.URL(url),
        target = signed && new root.URL(signed);
      if (
        source.origin !== 'https://matrudas.com' ||
        !/^\/cdn\/hls\/[a-f0-9]{32}\/master\.txt$/.test(source.pathname) ||
        !target ||
        target.origin !== source.origin ||
        target.pathname !== source.pathname.replace(/master\.txt$/, 'master.m3u8') ||
        !/[?&]md5=[A-Za-z0-9_-]+(?:&|$)/.test(target.search) ||
        !/[?&]expires=\d+(?:&|$)/.test(target.search)
      )
        throw failure('İmzalı HLS adresi aktif yayınla eşleşmiyor.');
      url = signed;
    }
    return { kind: 'hls', url: url };
  }
  function vidaraSettings(body, page) {
    return root.VidaraDecoder.settings(body, page);
  }
  function vidaraMedia(body) {
    return root.VidaraDecoder.media(body);
  }
  function mp4Header(buffer) {
    var bytes = new Uint8Array(buffer),
      value = '';
    for (var i = 0; i < Math.min(bytes.length, 64); i++) value += String.fromCharCode(bytes[i]);
    return (
      bytes.length >= 32 && value.substr(4, 4) === 'ftyp' && value.slice(8, 32).indexOf('avc1') >= 0
    );
  }
  root.FixFullDecoder = {
    alternatives: alternatives,
    frame: frame,
    wrappedFrame: wrappedFrame,
    settings: settings,
    media: media,
    host: host,
    vidaraSettings: vidaraSettings,
    vidaraMedia: vidaraMedia,
    mp4Header: mp4Header,
    literal: literal,
  };
})(window);


/* siteler/fixfullfilmizle/fixfullfilmizle-resolver.js */
(function (root) {
  'use strict';
  var P = root.FixFullParser,
    D = root.FixFullDecoder;
  function error(stage, message) {
    var e = new Error('FixFullFilmİzle · ' + message);
    e.stage = stage;
    return e;
  }
  function Resolver(log, now) {
    this.log = log || function () {};
    this.now = now || Date.now;
    this.generation = 0;
    this.clients = [];
  }
  Resolver.prototype.cancel = function () {
    this.generation++;
    this.clients.slice().forEach(function (client) {
      client.cancel();
    });
    this.clients = [];
  };
  // The TV's Download API rejects these servers' MP4 range responses. A paused,
  // short-lived HTML5 probe verifies an actual decoded first frame on this device.
  function mp4Probe(url, timeout) {
    var stop = function () {},
      promise = new Promise(function (resolve, reject) {
        var video = document.createElement('video'),
          done = false,
          timer;
        function finish(error) {
          if (done) return;
          done = true;
          clearTimeout(timer);
          video.removeEventListener('loadeddata', ready);
          video.removeEventListener('canplay', ready);
          video.removeEventListener('error', failed);
          try {
            video.pause();
            video.removeAttribute('src');
            video.load();
            if (video.parentNode) video.parentNode.removeChild(video);
          } catch (ignore) {}
          if (error) reject(error);
          else resolve();
        }
        function ready() {
          if (
            video.readyState >= 2 &&
            video.videoWidth > 0 &&
            video.videoHeight > 0 &&
            isFinite(video.duration) &&
            video.duration > 0
          )
            finish();
        }
        function failed() {
          var e = error(
            'media',
            'BRONZ MP4 medya hazırlığı başarısız (kod ' +
              ((video.error && video.error.code) || 0) +
              ').'
          );
          finish(e);
        }
        stop = function () {
          var e = error('cancel', 'İptal edildi');
          e.cancelled = true;
          finish(e);
        };
        timer = setTimeout(
          function () {
            finish(error('media', 'BRONZ MP4 ilk karesi zamanında hazırlanmadı.'));
          },
          Math.max(1, timeout)
        );
        try {
          video.preload = 'auto';
          video.muted = true;
          video.style.cssText = 'position:absolute;left:-10000px;width:2px;height:2px;opacity:0';
          video.addEventListener('loadeddata', ready);
          video.addEventListener('canplay', ready);
          video.addEventListener('error', failed);
          document.body.appendChild(video);
          video.src = url;
          video.load();
        } catch (e) {
          finish(error('media', 'BRONZ MP4 hazırlığı başlatılamadı.'));
        }
      });
    return {
      promise: promise,
      cancel: function () {
        stop();
      },
    };
  }
  Resolver.prototype.resolve = function (content, deadline, onProgress, hints) {
    this.cancel();
    var self = this,
      token = this.generation,
      sources = [],
      options = [],
      last = null,
      progress = root.SourceProgress && new root.SourceProgress(onProgress, hints);
    function publish() {
      if (progress) progress.publish(sources, options);
    }
    var page = P.movieUrl(content.pageUrl);
    if (!page) return Promise.reject(error('page', 'Geçersiz film/bölüm adresi.'));
    function check() {
      if (token !== self.generation) {
        var e = error('cancel', 'İptal edildi');
        e.cancelled = true;
        throw e;
      }
      if (self.now() >= deadline) throw error('timeout', 'Kaynak hazırlama süresi doldu.');
    }
    function request(url, ref, stage, body, json, end, preferXHR) {
      check();
      var client = root.ChainNetwork.createClient({
        destination: 'downloads',
        preferXHR: preferXHR === true || stage === 'page',
      });
      if (progress && progress.client)
        client = progress.client(client, check, Math.min(deadline, end || deadline));
      self.clients.push(client);
      return new Promise(function (resolve, reject) {
        var done = false,
          timer = setTimeout(
            function () {
              if (done) return;
              done = true;
              client.cancel();
              release();
              reject(error(stage, 'Kaynak isteği zamanında yanıt vermedi.'));
            },
            Math.max(
              1,
              Math.min(
                hints && hints.mediaActive && hints.mediaActive() ? 45000 : 12000,
                deadline - self.now(),
                (end || deadline) - self.now()
              )
            )
          );
        function release() {
          var i = self.clients.indexOf(client);
          if (i >= 0) self.clients.splice(i, 1);
        }
        var headers =
          body !== undefined
            ? {
                'Content-Type': json
                  ? 'application/json'
                  : 'application/x-www-form-urlencoded; charset=UTF-8',
              }
            : { 'User-Agent': 'Mozilla/5.0' };
        if (body !== undefined && !json) headers['X-Requested-With'] = 'XMLHttpRequest';
        var task =
          body === undefined ? client.get(url, ref, headers) : client.post(url, body, headers);
        task.then(
          function (response) {
            if (done) return;
            done = true;
            clearTimeout(timer);
            release();
            try {
              check();
              self.log('FixFull: ' + stage + ' / ' + response.method);
              resolve(response);
            } catch (e) {
              reject(e);
            }
          },
          function (e) {
            if (done) return;
            done = true;
            clearTimeout(timer);
            release();
            try {
              check();
              e.stage = stage;
              reject(e);
            } catch (cancel) {
              reject(cancel);
            }
          }
        );
      });
    }
    function hls(data, ref, label, option, order, end) {
      return request(
        data.url,
        ref,
        'manifest',
        undefined,
        false,
        end,
        new root.URL(ref).hostname === 'vidara.to'
      ).then(function (manifest) {
        if (!/^\s*#EXTM3U/.test(manifest.body))
          throw error('manifest', 'HLS yerine farklı bir yanıt alındı.');
        sources.push({
          id: option.sourceId,
          label: label,
          url: data.url,
          referer: ref,
          destination: 'downloads',
          userAgent: 'Mozilla/5.0',
          type: 'hls',
          preferredEngine: data.preferredEngine || null,
          transport: /^XHR/.test(manifest.method) ? 'xhr' : 'native',
          seekMode: 'media-event',
          subtitles: data.subtitles || [],
          order: order,
        });
        option.status = 'ready';
        option.detail = 'HLS erişimi doğrulandı';
      });
    }
    function mp4(data, ref, label, option, order, end) {
      check();
      var http = 'unknown',
        lastProbe;
      function add(verified, probed) {
        sources.push({
          id: option.sourceId,
          label: label,
          url: data.url,
          referer: ref,
          type: 'mp4',
          mp4Verified: verified,
          engineSupport: {
            html5: verified ? 'verified' : probed ? 'failed' : 'unknown',
            avplay: 'unknown',
          },
          validation: { http: http },
          subtitles: [],
          order: order,
        });
        option.status = verified ? 'ready' : 'candidate';
        option.detail = verified
          ? 'MP4 ilk karesi HTML5 motorunda doğrulandı'
          : probed
            ? 'Aktif MP4 adayı; HTML5 hazırlığı doğrulanmadı, uygun motorla sınanacak'
            : 'Aktif MP4 adayı; oynayan videoyu kesmemek için medya hazırlığı kaynak seçimine bırakıldı';
      }
      function range() {
        if (!root.MediaNetwork) return Promise.resolve();
        var job = root.MediaNetwork.request(data.url, {
          only: 'xhr',
          binary: true,
          kind: 'mp4-header',
          rangeStart: 0,
          rangeEnd: 4096,
          byteLimit: 8192,
          timeoutMs: Math.max(1, Math.min(3000, deadline - self.now(), end - self.now())),
        });
        self.clients.push(job);
        return job.promise
          .then(
            function () {
              check();
              http = 'verified';
            },
            function (e) {
              check();
              if ([403, 404, 410].indexOf(e.code) >= 0) {
                var failed = error('http', 'MP4 HTTP ' + e.code);
                failed.code = e.code;
                throw failed;
              }
              if (/HTML hata|yerine HTML/i.test(e.message))
                throw error('http', 'MP4 yerine HTML hata sayfası alındı.');
            }
          )
          .then(
            function (v) {
              var i = self.clients.indexOf(job);
              if (i >= 0) self.clients.splice(i, 1);
              return v;
            },
            function (e) {
              var i = self.clients.indexOf(job);
              if (i >= 0) self.clients.splice(i, 1);
              throw e;
            }
          );
      }
      if (progress && progress.enabled && hints && hints.mediaActive && hints.mediaActive()) {
        add(false, false);
        return Promise.resolve();
      }
      return range().then(function () {
        check();
        var job = mp4Probe(
          data.url,
          Math.max(1, Math.min(12000, deadline - self.now(), end - self.now()))
        );
        self.clients.push(job);
        return job.promise
          .then(
            function () {
              check();
              add(true, true);
            },
            function (e) {
              check();
              lastProbe = e;
              add(false, true);
            }
          )
          .then(
            function (v) {
              var i = self.clients.indexOf(job);
              if (i >= 0) self.clients.splice(i, 1);
              return v;
            },
            function (e) {
              var i = self.clients.indexOf(job);
              if (i >= 0) self.clients.splice(i, 1);
              throw e;
            }
          );
      });
    }
    function player(body, url, ref, label, option, order, depth, end) {
      check();
      if (depth > 3) return Promise.reject(error('decode', 'Oynatıcı yönlendirme sınırı aşıldı.'));
      var parsed = new root.URL(url);
      if (parsed.hostname === 'vidara.to') {
        var settings = D.vidaraSettings(body, url);
        return request(
          settings.api,
          url,
          'api',
          JSON.stringify({ filecode: settings.filecode, device: 'web', codecs: [] }),
          true,
          end
        ).then(function (response) {
          return hls(D.vidaraMedia(response.body), url, label, option, order, end);
        });
      }
      if (parsed.hostname === 'vevocloud.com')
        throw error('unsupported', 'Bu Vevocloud yanıt biçimi henüz doğrulanmadı.');
      var data = D.settings(body, url);
      if (data.kind === 'mp4') return mp4(data, url, label, option, order, end);
      var referer = new root.URL(ref).origin + '/';
      return request(
        data.api,
        url,
        'api',
        'hash=' + data.hash + '&r=' + encodeURIComponent(referer),
        false,
        end
      ).then(function (response) {
        var next = D.media(response.body);
        if (next.kind === 'hls') {
          next.subtitles = data.subtitles;
          return hls(next, url, label, option, order, end);
        }
        return request(next.url, url, 'host', undefined, false, end).then(function (remote) {
          return player(remote.body, next.url, url, label, option, order, depth + 1, end);
        });
      });
    }
    return request(page, P.base + '/', 'page')
      .then(function (first) {
        var list = D.alternatives(first.body, page),
          index = 0;
        list.forEach(function (item, i) {
          options.push({
            sourceId: 'fixfull-' + i,
            label: item.label,
            pageUrl: item.url,
            status: 'pending',
            stage: '',
            detail: '',
          });
        });
        var queue = list.map(function (item, i) {
          return { item: item, index: i };
        });
        publish();
        if (progress)
          queue = progress.order(queue, function (entry) {
            var o = options[entry.index];
            return {
              id: o.sourceId,
              label: o.label,
              type: 'hls',
              stability: { autoPriority: /bronz/i.test(o.label) ? 20 : 0 },
            };
          });
        function worker() {
          check();
          if (!queue.length) return Promise.resolve();
          return (progress ? progress.wait(check) : Promise.resolve().then(check))
            .then(function () {
              var entry = queue.shift();
              if (!entry) return;
              var i = entry.index,
                item = entry.item,
                option = options[i],
                end = Math.min(
                  deadline,
                  self.now() + (hints && hints.mediaActive && hints.mediaActive() ? 45000 : 28000)
                );
              return (
                item.url === page
                  ? Promise.resolve(first)
                  : request(item.url, page, 'page', undefined, false, end)
              )
                .then(function (response) {
                  var wrapper = item.frameUrl || D.frame(response.body, item.url);
                  return request(wrapper, item.url, 'embed', undefined, false, end).then(
                    function (remote) {
                      var inner = D.wrappedFrame(remote.body);
                      return request(inner, wrapper, 'player', undefined, false, end).then(
                        function (remote) {
                          return player(remote.body, inner, wrapper, item.label, option, i, 0, end);
                        }
                      );
                    }
                  );
                })
                .catch(function (e) {
                  check();
                  last = e;
                  option.status = e.stage === 'unsupported' ? 'unsupported' : 'error';
                  option.stage = e.stage || 'decode';
                  option.detail = root.PlayerCore.safeMessage(e.message);
                  self.log('FixFull: ' + item.label + ' / ' + option.stage + ' · ' + option.detail);
                })
                .then(function () {
                  check();
                  publish();
                });
            })
            .then(worker);
        }
        return progress && progress.enabled ? worker() : Promise.all([worker(), worker()]);
      })
      .then(function () {
        check();
        sources.sort(function (a, b) {
          return a.order - b.order;
        });
        sources.options = options;
        if (!sources.length) {
          var e = last || error('decode', 'Oynatılabilir kaynak bulunamadı.');
          e.sourceOptions = options;
          throw e;
        }
        return sources;
      });
  };
  root.FixFullSourceResolver = Resolver;
})(window);


/* siteler/fixfullfilmizle/site.js */
(function (root) {
 'use strict';
 var BASE = root.FixFullParser.base;
 root.SiteRegistry.register({
  id: 'fixfullfilmizle', name: 'FixFullFilmİzle', base: BASE, mark: 'FX', subtitle: 'Film ve dizi arşivi', prefix: 'fixfullfilmizle:', storagePrefix: 'site.fixfullfilmizle.',
  posterBackground: 'linear-gradient(145deg,#c58e24,#29201b)', Provider: root.FixFullProvider, Resolver: root.FixFullSourceResolver,
  collectionKeys: function (type) { return type === 'series' ? ['new'] : ['new', 'recommended', 'rated', 'liked']; },
  ui: { movieRail: 'Yeni filmler', seriesRail: 'Dizi arşivi', recommended: 'En çok izlenenler', rated: 'En çok yorumlananlar', liked: 'En çok beğenilenler', filterHint: 'Filmlerde gerçek tür arşivleri; genel listede site sıralamaları kullanılır.', filterSummary: 'Tür', defaultOrder: 'date' },
  filterFields: function (type) { return type === 'series' ? [] : ['genres']; },
  collectionQuery: function (type, key, links) { return { type: type, url: links && links[key] || ({ new: BASE + '/', recommended: BASE + '/en-cok-izlenenler/', rated: BASE + '/en-cok-yorumlananlar/', liked: BASE + '/en-cok-begenilenler/' })[key] }; }
 });
})(window);


})(window);
