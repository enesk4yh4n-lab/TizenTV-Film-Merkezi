/* Generated ES5 provider module. */
(function(shared){'use strict';if(!shared.SitePluginRuntime)throw Error('Update core component to 1.11.1 before installing this module.');var context=shared.FilmPlugins.context(),window=shared.SitePluginRuntime.scope(context,'1.11.1');
var register=window.SiteRegistry.register;window.SiteRegistry.register=function(site){site.name='P001';site.subtitle='P001';site.mark='P001';register(site);};

/* saglayicilar/p001/catalog-parser.js */
/* Site responses are parsed as inert documents. Only normalized data leaves this module. */
(function (root) {
 'use strict';
 var BASE = (root.SiteAddresses ? root.SiteAddresses.base('hdf', 'https://www.hdfilmcehennemi.nl') : 'https://www.hdfilmcehennemi.nl'), clean = root.CatalogUtils.clean, languageBadges = root.CatalogUtils.languageBadges, url = root.CatalogUtils.url, envelope = root.CatalogUtils.envelope;
 function episodeLanguage(body) {
  return menuLanguage(envelope(body).doc);
 }
 function menuLanguage(doc) {
  var dubbed = false, subtitled = false;
  Array.prototype.forEach.call(doc.querySelectorAll('.language-tab .language-link'), function (option) {
   if (option.disabled || option.getAttribute('aria-disabled') === 'true') return;
   var flags = languageBadges(text(option)); dubbed = dubbed || flags.dubbed; subtitled = subtitled || flags.subtitled;
  });
  return { language: dubbed && subtitled ? 'Dublaj & Altyazılı' : dubbed ? 'Türkçe Dublaj' : subtitled ? 'Türkçe Altyazılı' : '' };
 }
 function siteUrl(value, base) { var u = url(value, base); if(root.SiteAddresses)return root.SiteAddresses.safe('hdf',u,BASE);return /^https:\/\/(www\.)?hdfilmcehennemi\.nl\//i.test(u) ? u : ''; }
 function id(value, type) {
  var path = String(value || '').replace(/^https?:\/\/[^/]+/i, '').replace(/[?#].*$/, '').replace(/^\/+|\/+$/g, '');
  if (type === 'series' || /^dizi\//.test(path)) return 'hdf:series:' + path.replace(/^dizi\//, '').replace(/-izle(?:-\d+)?$/, '');
  return 'hdf:' + path;
 }
 function text(node, selector) { var n = selector ? node.querySelector(selector) : node; return clean(n && n.textContent); }
 function image(node, base) { var img = node && (node.tagName === 'IMG' ? node : node.querySelector('img')); return img ? url(img.getAttribute('data-src') || img.getAttribute('data-catalog-src'), base) : ''; }
 function number(value) { var match = /\d+(?:[.,]\d+)?/.exec(value); return match ? Number(match[0].replace(',', '.')) : null; }
 function cards(doc, selector, base) {
  var seen = {}, result = [];
  Array.prototype.forEach.call(doc.querySelectorAll(selector || 'a.poster, a.mini-poster, a.search-result'), function (a) {
   var page = siteUrl(a.getAttribute('href'), base); if (!page || /\/sezon-\d+\/|\d+-sezon-\d+-bolum/.test(page)) return;
   var type = /\/dizi\//.test(page) || /dizi/i.test(text(a, '.type')) ? 'series' : 'movie', key = id(page, type);
   var img = a.querySelector('img'), title = text(a, '.poster-title, .mini-poster-title, .title') || clean(a.getAttribute('title')) || clean(img && img.getAttribute('alt')).replace(/ izle$/, '');
   if (!title || seen[key]) return; seen[key] = true;
   var year = text(a, '.year') || text(a, '.poster-meta > span:first-child') || text(a, '.mini-poster-meta'), match = /\b(?:19|20)\d{2}\b/.exec(year);
   result.push({ contentId: key, type: type, pageUrl: page, title: title, titleAliases: title.split(' - ').map(clean), poster: image(a, base), year: match ? Number(match[0]) : null,
    imdb: number(text(a, '.imdb, .mini-poster-imdb')), language: text(a, '.poster-lang > span') });
  }); return result;
 }
 function options(doc) {
  var fields = {};
  Array.prototype.forEach.call(doc.querySelectorAll('[data-dropdown-key][data-dropdown-value]'), function (n) {
   var key = n.getAttribute('data-dropdown-key'); if (!/^(type|genres|years|imdb|lang|order)$/.test(key)) return;
   (fields[key] || (fields[key] = [])).push({ value: n.getAttribute('data-dropdown-value'), label: text(n) });
  }); return fields;
 }
 function list(body, pageUrl, context) { if(root.SiteAddresses)pageUrl=root.SiteAddresses.resolve(pageUrl);
  var e = envelope(body), doc = e.doc, paging = doc.querySelector('[data-pages][data-page-action]'), page = context && context.page || 1;
  var result = { cards: cards(doc, doc.querySelector('[data-page-items]') ? '[data-page-items] a.poster' : 'a.poster, a.search-result', pageUrl), next: null, options: options(doc) };
  if (paging) { var total = Number(paging.getAttribute('data-pages')), action = paging.getAttribute('data-page-action');
   if (total > page && /^[a-z0-9_-]+$/.test(action)) result.next = { kind: 'page', page: page + 1, total: total, action: action, url: BASE + '/load/page/' + (page + 1) + '/' + action + '/' };
  } else if (context && context.kind === 'page' && result.cards.length && page < context.total) {
   result.next = { kind: 'page', page: page + 1, total: context.total, action: context.action, url: BASE + '/load/page/' + (page + 1) + '/' + context.action + '/' };
  }
  var next = doc.querySelector('a[rel="next"]'); if (next) { var verified = siteUrl(next.getAttribute('href'), pageUrl); if (verified) result.next = { kind: 'url', page: page + 1, url: verified }; }
  if ((doc.querySelector('[data-discover-more]') || context && context.kind === 'discover') && result.cards.length) result.next = { kind: 'discover', page: page + 1 };
  return result;
 }
 function home(body, pageUrl) {
  var e = envelope(body), all = cards(e.doc, '[data-page-items] a.poster', pageUrl), popular = cards(e.doc, 'a.mini-poster', pageUrl).filter(function (c) { return c.type === 'series'; });
  var hero = cards(e.doc, '.slider a.poster', pageUrl), links = {};
  Array.prototype.forEach.call(e.doc.querySelectorAll('.section-tabs a[href]'), function (a) {
   var title = text(a), key = /Tavsiye/.test(title) ? 'recommended' : /Imdb|IMDb/.test(title) ? 'rated' : /Beğen/.test(title) ? 'liked' : /Yeni/.test(title) ? 'new' : '';
   if (key) links[key] = siteUrl(a.getAttribute('href'), pageUrl);
  });
  return { hero: hero[0] || all[0] || null, movies: all, series: popular, links: links, next: list(body, pageUrl).next };
 }
 function detail(body, card) {
  var e = envelope(body), doc = e.doc, schema = e.schema.filter(function (x) { return x && /^(Movie|TVSeries)$/.test(x['@type']); })[0] || {}, result = {};
  Object.keys(card).forEach(function (k) { result[k] = card[k]; });
  result.title = clean(schema.name) || text(doc, 'h1').replace(/\s*izle\s*(\(\d{4}\))?$/i, '') || card.title;
  result.originalTitle = clean(schema.alternateName) || text(doc, '.post-original-title');
  result.poster = image(doc.querySelector('.post-info-poster'), card.pageUrl) || url(schema.image, card.pageUrl) || card.poster;
  result.description = text(doc, '.post-info-content') || clean(schema.description);
  result.year = number(text(doc, '.post-info-year-country a')) || card.year;
  result.duration = text(doc, '.post-info-duration');
  if (!result.duration && /^PT\d+M$/.test(schema.duration || schema.timeRequired || '')) result.duration = (schema.duration || schema.timeRequired).slice(2, -1) + ' dakika';
  result.genres = Array.prototype.map.call(doc.querySelectorAll('.post-info-genres a'), function (n) { return text(n); });
  if (!result.genres.length) result.genres = Array.isArray(schema.genre) ? schema.genre : schema.genre ? [schema.genre] : [];
  /* The site's aggregateRating is its own score; IMDb is read from the IMDb field. */
  result.imdb = number(text(doc, '.post-info-imdb-rating')) || card.imdb;
  // Recommendation posters and SEO descriptions are not this content's language options.
  result.language = menuLanguage(doc).language || card.language;
  result.cast = (Array.isArray(schema.actor) ? schema.actor : []).map(function (a) { return clean(a.name); }).filter(Boolean);
  result.episodes = []; result.seasons = [];
  if (schema['@type'] === 'TVSeries') result.type = 'series';
  if (result.type === 'series') {
   var seen = {};
   Array.prototype.forEach.call(doc.querySelectorAll('.seasons a[href]'), function (a) {
    var page = siteUrl(a.getAttribute('href'), card.pageUrl), m = /\/sezon-(\d+)\/bolum-(\d+)(?:-[a-z0-9-]+)?\/?(?:\?[^#]*)?$/i.exec(page) || /(\d+)-sezon-(\d+)-bolum/.exec(page);
    if (!m) return; var season = Number(m[1]), episode = Number(m[2]), key = season + ':' + episode; if (seen[key]) return; seen[key] = true;
    result.episodes.push({ contentId: result.contentId + ':s' + season + ':e' + episode, type: 'episode', pageUrl: page,
     title: result.title + ' · ' + season + '. Sezon ' + episode + '. Bölüm', episodeTitle: text(a, '.mini-poster-title') || season + '. Sezon ' + episode + '. Bölüm',
     poster: result.poster, seriesPageUrl: result.pageUrl, seriesTitle: result.title, episode: { seriesId: result.contentId, season: season, number: episode }, sources: [] });
   });
   result.episodes.sort(function (a, b) { return a.episode.season - b.episode.season || a.episode.number - b.episode.number; });
   result.episodes.forEach(function (item) { if (result.seasons.indexOf(item.episode.season) < 0) result.seasons.push(item.episode.season); });
  }
  return result;
 }
 root.CatalogParser = { base: BASE, clean: clean, languageBadges: languageBadges, episodeLanguage: episodeLanguage, url: url, siteUrl: siteUrl, id: id, envelope: envelope, cards: cards, list: list, home: home, detail: detail };
})(window);


/* saglayicilar/p001/catalog-provider.js */
(function (root) {
 'use strict';
 var P = root.CatalogParser, BASE = P.base;
 function Provider(cache, network) { root.CatalogClient.call(this,cache,network || root.ChainNetwork.createClient({platformText:true,destination:'downloads'}),{base:BASE,identitySelectors:'.post-info-imdb a[href]',headers:{Accept:'application/json, text/html','X-Requested-With':'fetch'},postHeaders:{'X-Mofycore-Action':'discover'}}); this.links = { new: BASE + '/', recommended: BASE + '/category/tavsiye-filmler-izle2/', rated: BASE + '/imdb-7-puan-uzeri-filmler-2/', liked: BASE + '/en-cok-begenilen-filmleri-izle-4/' }; this.filterOptions = null; }
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
 /* Earlier parsed series caches can contain empty lists for slashless episode URLs. */
 Provider.prototype.detail = function (card, force) {if(root.SiteAddresses)card=root.SiteAddresses.content(card); return this.request(card.pageUrl, null, function (body) { return P.detail(body, card); }, force, card.type === 'series' ? 'detail-series-v2' : 'detail'); };
 Provider.prototype.seriesLanguage = function (card) {if(root.SiteAddresses)card=root.SiteAddresses.content(card);
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


/* saglayicilar/p001/decoder.js */
/* MIT decoder adaptations; see LICENSE and THIRD_PARTY_NOTICES.md. */
(function(root){var modules={},cache={};
modules['utils']=function(module,exports,require){
'use strict';

function entities(value) {
  return String(value || '').replace(/&#(x[\da-f]+|\d+);|&(amp|quot|apos|lt|gt|nbsp);/gi, function (all, number, named) {
    if (number) return String.fromCharCode(number.charAt(0).toLowerCase() === 'x' ? parseInt(number.slice(1), 16) : parseInt(number, 10));
    return { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' }[named.toLowerCase()];
  });
}

function text(value) {
  return entities(String(value || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function attr(tag, name) {
  var re = new RegExp('(?:^|\\s)' + name + '\\s*=\\s*(?:"([^\"]*)"|\x27([^\x27]*)\x27|([^\\s>]+))', 'i');
  var match = re.exec(tag || '');
  return match ? entities(match[1] !== undefined ? match[1] : match[2] !== undefined ? match[2] : match[3]) : '';
}

function origin(url) {
  var match = /^(https?:\/\/[^/?#]+)/i.exec(url || '');
  return match ? match[1] : '';
}

function absolute(value, base) {
  value = entities(value).trim();
  if (/^https?:\/\//i.test(value)) return value;
  if (/^\/\//.test(value)) return (String(base).split(':')[0] || 'https') + ':' + value;
  if (!value || /^[\w+.-]+:/.test(value)) return '';
  var root = origin(base);
  if (!root) return '';
  var path = String(base).slice(root.length).split(/[?#]/)[0] || '/';
  if (value.charAt(0) === '?') return root + path + value;
  if (value.charAt(0) === '#') return '';
  path = value.charAt(0) === '/' ? value : path.slice(0, path.lastIndexOf('/') + 1) + value;
  var suffix = /[?#].*$/.exec(path);
  var parts = path.split(/[?#]/)[0].split('/');
  var clean = [];
  parts.forEach(function (part) {
    if (part === '..') clean.pop();
    else if (part && part !== '.') clean.push(part);
  });
  return root + '/' + clean.join('/') + (clean.length && /\/$/.test(path.split(/[?#]/)[0]) ? '/' : '') + (suffix ? suffix[0] : '');
}

function siteUrl(value) {
  return /^https:\/\/[a-z0-9.-]+(?::\d+)?\/?$/i.test(String(value || '')) ? String(value).replace(/\/+$/, '') : '';
}

function sameSite(url, base) {
  return origin(url).toLowerCase() === origin(base).toLowerCase();
}

function normalize(value) {
  return text(value).replace(/[ıİ]/g, 'i').replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g').replace(/[çÇ]/g, 'c').replace(/[öÖ]/g, 'o').replace(/[üÜ]/g, 'u').toLowerCase().replace(/\u0307/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function classText(html, className) {
  var re = /<([a-z][\w:-]*)\b([^>]*)>([\s\S]*?)<\/\1\s*>/gi;
  var match;
  // Search only opening tags carrying this class, so outer containers do not swallow descendants.
  var opening = new RegExp('<([a-z][\\w:-]*)\\b([^>]*\\bclass\\s*=\\s*(?:"[^"]*\\b' + className + '\\b[^"]*"|\x27[^\x27]*\\b' + className + '\\b[^\x27]*\x27)[^>]*)>', 'gi');
  match = opening.exec(html);
  if (!match) return '';
  re = new RegExp('^([\\s\\S]*?)<\\/' + match[1] + '\\s*>', 'i');
  var body = re.exec(html.slice(opening.lastIndex));
  return body ? text(body[1]) : '';
}

module.exports = { entities: entities, text: text, attr: attr, origin: origin, absolute: absolute, siteUrl: siteUrl, sameSite: sameSite, normalize: normalize, classText: classText };

};
modules['catalog']=function(module,exports,require){
'use strict';
var u = require('./utils');

function parseResults(data, base) {
  var fragments = data && Array.isArray(data.results) ? data.results : [];
  var result = [];
  fragments.slice(0, 60).forEach(function (html) {
    if (typeof html !== 'string') return;
    var link = /<a\b[^>]*>/i.exec(html);
    var url = link ? u.absolute(u.attr(link[0], 'href'), base) : '';
    if (!url || !u.sameSite(url, base)) return;
    var img = /<img\b[^>]*>/i.exec(html);
    var title = u.classText(html, 'title') || (img ? u.attr(img[0], 'alt') : '');
    var year = /\b(?:19|20)\d{2}\b/.exec(u.classText(html, 'year'));
    var type = u.normalize(u.classText(html, 'type'));
    result.push({ url: url, title: title, year: year ? Number(year[0]) : null, type: type.indexOf('dizi') !== -1 ? 'tv' : type.indexOf('film') !== -1 ? 'movie' : null });
  });
  return result;
}

function rankResults(results, metadata, imdbQuery) {
  var titles = [metadata.title, metadata.originalTitle].filter(Boolean).map(u.normalize);
  return results.map(function (item) {
    if (item.type && item.type !== metadata.type) return null;
    if (!imdbQuery && metadata.year && item.year && Math.abs(metadata.year - item.year) > (metadata.type === 'tv' ? 1 : 0)) return null;
    var exact = titles.indexOf(u.normalize(item.title)) !== -1;
    // An IMDb lookup is exact by identifier; title lookup must match the entire title.
    if (!imdbQuery && !exact) return null;
    return { item: item, score: (imdbQuery ? 100 : 0) + (exact ? 20 : 0) + (item.year === metadata.year ? 5 : 0) };
  }).filter(Boolean).sort(function (a, b) { return b.score - a.score; }).map(function (entry) { return entry.item; });
}

function episodeUrl(html, base, season, episode) {
  var re = /<a\b[^>]*>/gi;
  var match;
  while ((match = re.exec(html)) !== null) {
    var href = u.attr(match[0], 'href');
    var numbers = /(\d+)-sezon-(\d+)-bolum/i.exec(href);
    var s = numbers ? numbers[1] : (/sezon[\/-]?(\d+)/i.exec(href) || [])[1];
    var e = numbers ? numbers[2] : (/bolum[\/-]?(\d+)/i.exec(href) || [])[1];
    var url = u.absolute(href, base);
    if (Number(s) === Number(season) && Number(e) === Number(episode) && u.sameSite(url, base)) return url;
  }
  return '';
}

function players(html, pageUrl, embedBase) {
  var result = [];
  var frames = html.match(/<iframe\b[^>]*>/gi) || [];
  frames.slice(0, 8).forEach(function (tag) {
    var url = u.absolute(u.attr(tag, 'src') || u.attr(tag, 'data-src'), pageUrl);
    // Only follow actual player/embed frames; ignore unrelated advertising iframes.
    if (url && /\/(?:video\/)?embed\//i.test(url)) result.push({ url: url, name: 'Player' });
    else if (url && /\/rplayer\/[^/?#]+\//i.test(url) && /\brapidrame\b/i.test(u.attr(tag, 'class')) && u.sameSite(url, pageUrl)) result.push({ url: url, name: 'Rapidrame' });
  });
  var first = result[0];
  if (first) {
    var id = /\/embed\/([^/?#]+)/i.exec(first.url);
    var re = /<([a-z][\w:-]*)\b([^>]*)>([\s\S]*?)<\/\1\s*>/gi;
    var opening = /<([a-z][\w:-]*)\b([^>]*\bclass\s*=\s*(?:"[^"]*\balternative-link\b[^"]*"|'[^']*\balternative-link\b[^']*')[^>]*)>/gi;
    var match;
    while (id && (match = opening.exec(html)) !== null) {
      re = new RegExp('^([\\s\\S]*?)<\\/' + match[1] + '\\s*>', 'i');
      var body = re.exec(html.slice(opening.lastIndex));
      var name = u.text(body ? body[1] : '') || 'Alternative';
      var videoId = u.attr(match[2], 'data-video');
      if (u.attr(match[2], 'data-active') === '1') { first.name = name; continue; }
      var url = embedBase + '/video/embed/' + encodeURIComponent(id[1]) + '/';
      if (/rapidrame/i.test(name)) {
        if (!videoId) continue;
        url += '?rapidrame_id=' + encodeURIComponent(videoId);
      }
      result.push({ url: url, name: name });
    }
  }
  var seen = {};
  return result.filter(function (item) { if (seen[item.url]) return false; seen[item.url] = true; return true; }).slice(0, 4);
}

module.exports = { parseResults: parseResults, rankResults: rankResults, episodeUrl: episodeUrl, players: players };

};
modules['player']=function(module){if(!root.LiteralMediaDecoder)throw new Error('Shared media decoder missing');module.exports=root.LiteralMediaDecoder;};
function load(n){n=n.replace('./','');if(cache[n])return cache[n].exports;var m={exports:{}};cache[n]=m;modules[n](m,m.exports,load);return m.exports;}root.ChainDecoder={catalog:load('catalog'),player:load('player')};})(window);

/* saglayicilar/p001/site.js */
(function(root){'use strict';var site={"id": "hdf", "name": "HDfilmCehennemi", "base": "https://www.hdfilmcehennemi.nl", "mark": "HD", "subtitle": "Film ve dizi arşivi", "prefix": "hdf:", "storagePrefix": "", "supportsSeriesLanguage":true,"ui": {"movieRail": "Yeni eklenen filmler", "seriesRail": "Popüler diziler", "recommended": "Tavsiyeler", "liked": "Beğenilenler", "filterHint": "Uygula ile Film Robotu’nda arayın.", "filterSummary": "Film Robotu", "defaultOrder": "posts.imdb desc"}};site.Provider=root.CatalogProvider;site.Resolver=root.HdfSourceResolver;site.collectionQuery=function(type,key,links){var q={type:type};if(type==='movie'&&links[key])q.url=links[key];else if(key!=='new'){q.kind='discover';q.order=key==='liked'?'avg desc':'posts.imdb desc';if(key==='recommended')q.filters={imdb:'7-10'};}return q;};site.filterFields=function(){return ['type','genres','years','lang','imdb','order'];};root.SiteRegistry.register(site);})(window);


/* saglayicilar/p001/source-resolver.js */
/* Page resolution has its own lifetime; signed CDN URLs are never storage keys. */
(function (root) {
  'use strict';
  function origin(url) {
    var m = /^(https?:\/\/[^/]+)/i.exec(url);
    return m ? m[1] + '/' : '';
  }
  function Resolver(log, now) {
    this.log = log || function () {};
    this.now = now || Date.now;
    this.generation = 0;
    this.network = root.ChainNetwork.createClient
      ? root.ChainNetwork.createClient({platformText:true,destination:'downloads'})
      : root.ChainNetwork;
  }
  Resolver.prototype.cancel = function () {
    this.generation++;
    this.network.cancel();
  };
  Resolver.prototype.resolve = function (content, deadline, onProgress, hints) {
    this.cancel();
    var self = this,
      token = this.generation,
      sources = [],
      options = [],
      provisional = 0,
      lastError = null,
      progress = root.SourceProgress && new root.SourceProgress(onProgress, hints);
    function failure(stage, message) {
      var e = new Error(message);
      e.stage = stage;
      return e;
    }
    function check() {
      if (self.generation !== token) {
        var e = new Error('İptal edildi');
        e.cancelled = true;
        throw e;
      }
      if (self.now() >= deadline) throw new Error('Kaynak arama süresi doldu.');
    }
    var network =
      progress && progress.client ? progress.client(self.network, check, deadline) : self.network;
    function get(url, ref, stage) {
      check();
      return network.get(url, ref).then(
        function (r) {
          check();
          return r;
        },
        function (e) {
          e.stage = stage;
          throw e;
        }
      );
    }
    function publish() {
      if (progress)
        progress.publish(
          sources.filter(function (s) {
            return s.status === 'ready';
          }),
          options
        );
    }
    function wait() {
      return progress ? progress.wait(check) : Promise.resolve().then(check);
    }
    function key(name, index) {
      return (
        String(name)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-') +
        '-' +
        index
      );
    }
    function add(s, name, ref, subtitles, id) {
      if (!s.url || !/^https?:\/\//i.test(s.url)) return;
      var existing = sources.filter(function (c) {
        return c.url === s.url;
      })[0];
      var subs = (s.subtitles || []).concat(subtitles || []).filter(function (x, i, a) {
        return (
          x.url &&
          /^https?:\/\//i.test(x.url) &&
          a
            .map(function (t) {
              return t.url;
            })
            .indexOf(x.url) === i
        );
      });
      if (existing) {
        existing.subtitles = existing.subtitles.concat(subs);
        return existing;
      }
      var source = {
        id: id,
        label: name,
        name: name,
        url: s.url,
        type: 'hls',
        quality: s.quality || null,
        referer: ref,
        subtitles: subs,
        status: 'unchecked',
      };
      sources.push(source);
      return source;
    }
    function validate(source, option) {
      if (!source) {
        option.status = 'error';
        option.detail = 'Geçerli yayın adresi bulunamadı.';
        publish();
        return Promise.resolve();
      }
      if (source.id !== option.sourceId) {
        option.status = 'unsupported';
        option.detail = 'Bu yayın listede başka kaynak adıyla zaten var.';
        publish();
        return Promise.resolve();
      }
      return get(source.url, source.referer, 'manifest')
        .then(function (r) {
          source.playlist = /^\s*#EXTM3U/.test(r.body);
          source.transport = /^XHR/.test(r.method) ? 'xhr' : 'native';
          source.status = source.playlist ? 'ready' : 'invalid';
          option.status = source.playlist ? 'ready' : 'error';
          option.detail = source.playlist
            ? 'HLS erişimi doğrulandı'
            : 'Yanıt bir HLS yayın listesi değil.';
          if (!source.playlist)
            lastError = failure('manifest', source.label + ': ' + option.detail);
        })
        .catch(function (e) {
          check();
          if (e.status === 404 || e.status === 410 || /\bHTTP\s*(?:404|410)\b/.test(e.message || '')) {
            source.status = 'invalid';
            option.status = 'error';
            option.stage = 'manifest';
            option.detail = 'Kaynak sunucusunda yayın listesi bulunamadı.';
            lastError = failure('manifest', source.label + ': ' + option.detail);
            return;
          }
          source.status = 'unverified';
          option.status = 'candidate';
          option.detail = 'Yayın listesi doğrulanamadı; oynatılırken sınanır.';
          self.log(source.label + ': doğrulama yapılamadı.');
        })
        .then(publish);
    }
    if (!content.pageUrl)
      return Promise.reject(new Error('Bağlantı yenilemek için içerik sayfası gerekli.'));
    self.log('Kaynak sayfası alınıyor.');
    return get(content.pageUrl, origin(content.pageUrl), 'page')
      .then(function (page) {
        var frames = root.ChainDecoder.catalog.players(
          page.body,
          content.pageUrl,
          'https://hdfilmcehennemi.mobi'
        );
        var direct = root.ChainDecoder.player.extractPlayer(page.body, content.pageUrl);
        direct.streams.forEach(function (s, i) {
          options.push({
            sourceId: key('Sayfa kaynağı', i),
            label: 'Sayfa kaynağı',
            status: 'pending',
          });
        });
        frames.forEach(function (f, i) {
          f.sourceId = key(f.name, direct.streams.length + i);
          options.push({ sourceId: f.sourceId, label: f.name, status: 'pending' });
        });
        publish();
        var ordered = progress
          ? progress.order(frames, function (f) {
              return { id: f.sourceId, label: f.name, type: 'hls' };
            })
          : frames;
        function frame(i) {
          check();
          if (i >= ordered.length) return Promise.resolve();
          var f = ordered[i],
            option = options.filter(function (o) {
              return o.sourceId === f.sourceId;
            })[0];
          self.log('Kaynak çözümleniyor: ' + f.name);
          return wait()
            .then(function () {
              return get(f.url, content.pageUrl, 'embed');
            })
            .then(function (r) {
              var result = root.ChainDecoder.player.extractPlayer(r.body, f.url);
              provisional += (result.provisional || []).length;
              if (!result.streams.length)
                throw failure('decode', f.name + ': oynatma adresi çözümlenemedi.');
              return result.streams.reduce(function (promise, s, j) {
                return promise.then(function () {
                  return wait().then(function () {
                    var target = j
                      ? {
                          sourceId: f.sourceId + '-' + j,
                          label: f.name + ' ' + (j + 1),
                          status: 'pending',
                        }
                      : option;
                    if (j) options.push(target);
                    return validate(
                      add(
                        s,
                        target.label,
                        /rapidrame/i.test(f.name) ? origin(content.pageUrl) : origin(f.url),
                        result.subtitles,
                        target.sourceId
                      ),
                      target
                    );
                  });
                });
              }, Promise.resolve());
            })
            .catch(function (e) {
              check();
              lastError = e;
              option.status = 'error';
              option.stage = e.stage || 'decode';
              option.detail = e.message;
              publish();
              self.log(f.name + ': ' + e.message);
            })
            .then(function () {
              return frame(i + 1);
            });
        }
        return direct.streams
          .reduce(function (promise, s, i) {
            return promise.then(function () {
              return wait().then(function () {
                return validate(
                  add(
                    s,
                    'Sayfa kaynağı',
                    origin(content.pageUrl),
                    direct.subtitles,
                    key('Sayfa kaynağı', i)
                  ),
                  options[i]
                );
              });
            });
          }, Promise.resolve())
          .then(function () {
            return frame(0);
          });
      })
      .then(function () {
        check();
        if (provisional) self.log('Doğrulanmamış metadata oynatma listesine alınmadı.');
        sources = sources
          .filter(function (s) {
            return s.status !== 'invalid';
          })
          .sort(function (a, b) {
            return (a.status === 'ready' ? 0 : 1) - (b.status === 'ready' ? 0 : 1);
          });
        if (progress && progress.enabled) sources.options = options;
        if (!sources.length) {
          var e = lastError || failure('decode', 'Sayfada oynatılabilir kaynak bulunamadı.');
          e.sourceOptions = options;
          throw e;
        }
        return sources;
      });
  };
  root.HdfSourceResolver = Resolver;
  if (!root.SourceResolver) root.SourceResolver = Resolver;
})(window);


})(window);
