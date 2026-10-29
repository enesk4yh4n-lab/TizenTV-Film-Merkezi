/* Site responses are parsed as inert documents. Only normalized data leaves this module. */
(function (root) {
 'use strict';
 var BASE = 'https://www.hdfilmcehennemi.nl', clean = root.CatalogUtils.clean, languageBadges = root.CatalogUtils.languageBadges, url = root.CatalogUtils.url, envelope = root.CatalogUtils.envelope;
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
 function siteUrl(value, base) { var u = url(value, base); return /^https:\/\/(www\.)?hdfilmcehennemi\.nl\//i.test(u) ? u : ''; }
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
 function list(body, pageUrl, context) {
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
    var page = siteUrl(a.getAttribute('href'), card.pageUrl), m = /\/sezon-(\d+)\/bolum-(\d+)(?:[^/]*)\//.exec(page) || /(\d+)-sezon-(\d+)-bolum/.exec(page);
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
