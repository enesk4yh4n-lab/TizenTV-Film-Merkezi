/* Filmizle/Keremiya data adapter. Site scripts are never evaluated. */
(function (root) {
 'use strict';
 var P = root.CatalogUtils, BASE = 'https://filmizle.ink';
 function text(n, q) { return P.clean(n && (q ? n.querySelector(q) : n) && (q ? n.querySelector(q) : n).textContent); }
 function safe(value, page) { var u = P.url(value, page || BASE + '/'); try { var parsed = new root.URL(u); return parsed.origin === BASE && !parsed.username && !parsed.password ? u : ''; } catch (ignore) { return ''; } }
 function id(page, type) { return 'filmizle:' + (type === 'series' ? 'series:' : type === 'collection' ? 'collection:' : 'movie:') + new root.URL(page).pathname.replace(/^\/+|\/+$/g, ''); }
 function sortValue(url) { var m = /[?&]sort=(date|views|imdb|comments)(?:&|$)/.exec(url); return m ? m[1] : ''; }
 function withSort(url, value) { var parsed = new root.URL(url), fields = parsed.search.replace(/^\?/, '').split('&').filter(function (field) { return field && !/^sort=/.test(field); }); if (value) fields.push('sort=' + encodeURIComponent(value)); return parsed.origin + parsed.pathname + (fields.length ? '?' + fields.join('&') : ''); }
 function image(n, page) { var img = n && n.querySelector('img'); return img ? P.url(img.getAttribute('data-src') || img.getAttribute('data-litespeed-src') || img.getAttribute('data-catalog-src'), page) : ''; }
 function numeric(value) { var m = /\d+(?:[.,]\d+)?/.exec(value); return m ? Number(m[0].replace(',', '.')) : null; }
 function language(n) { var dub = false, sub = false; Array.prototype.forEach.call(n.querySelectorAll('[title]'), function (x) { var flags = P.languageBadges(x.getAttribute('title')); dub = dub || flags.dubbed; sub = sub || flags.subtitled; }); return dub && sub ? 'Dublaj & Altyazılı' : dub ? 'Türkçe Dublaj' : sub ? 'Türkçe Altyazılı' : ''; }
 function series(title, n, hint) { return /\b\d+\s*\.?\s*sezon\b/i.test(title) || /Dizi/i.test(text(n, '.v100-meta-row')) || hint === 'series'; }
 function cards(d, page, hint) {
  var seen = {}, result = [];
  Array.prototype.forEach.call(d.querySelectorAll('a.v100-card, .custom-card-wrapper, .v50-card'), function (box) {
   var a = box.tagName === 'A' ? box : box.querySelector('.movie-title a, a[href]'), u = safe(a && a.getAttribute('href'), page), title = text(box, '.v100-title, .movie-title, .v50-details h3') || P.clean(a && a.getAttribute('title'));
   if (!u || !title || seen[u]) return; seen[u] = true;
   var article=/\/haber\//.test(new root.URL(u).pathname);if(article&&!/(?:kronolojik|izleme s[ıi]ras[ıi]|top\s*\d+|en iyi.+film)/i.test(title))return;var type=article?'collection':series(title,box,hint)?'series':'movie';
   /* The home/search template prints 2026 for old titles: do not treat it as release year. */
   var year = text(box, '.movie-release'), match = /\b(?:19|20)\d{2}\b/.exec(year);
   result.push({ contentId: id(u, type), providerId: 'filmizle', type: type, pageUrl: u, title: title, titleAliases: aliases(title), yearHint: type==='movie'?yearHint(title,u):null, poster: image(box, page), year: match ? Number(match[0]) : null, imdb: numeric(text(box, '.v100-imdb-tag, .v50-imdb-tag, .imdb')), language: language(box) });
  }); return result;
 }
 function parseList(body, page, hint) {
  var d = P.envelope(body).doc, n = d.querySelector('a.loadnavi, a[rel=next], .v50-pagination a.next'), u = safe(n && n.getAttribute('href'), page);
  if (u && sortValue(page) && !sortValue(u)) u = withSort(u, sortValue(page));
  return { cards: cards(d, page, hint), next: u && u !== page ? { kind: 'url', url: u } : null, options: {} };
 }
 function home(body) {
  var d = P.envelope(body).doc, all = cards(d, BASE + '/'), genres = [], seen = {};
  Array.prototype.forEach.call(d.querySelectorAll('a.v100-view-all'), function (a) { var u = safe(a.getAttribute('href')); if (u && /\/Kategori\/tur\//.test(u) && !seen[u]) { seen[u] = true; var section = a.parentNode; genres.push({ value: u, label: text(section, 'h3') || text(a) }); } });
  if (!all.length) throw new Error('Filmizle katalog biçimi tanınamadı.');
  return { hero: all[0], movies: all.filter(function (x) { return x.type === 'movie'; }).slice(0, 30), series: all.filter(function (x) { return x.type === 'series'; }).slice(0, 18), genres: genres, links: { new: BASE + '/Kategori/en-populer-filmler/', recommended: BASE + '/Kategori/en-populer-filmler/?sort=views', rated: BASE + '/Kategori/en-populer-filmler/?sort=imdb', liked: BASE + '/Kategori/en-populer-filmler/?sort=comments' } };
 }
 function aliases(title){var out=[],m=/\(([^()]+)\)/.exec(title),parts=title.split(/\s+[–—-]\s+/);if(m&&!/^\d{4}$/.test(m[1]))out.push(m[1]);if(parts.length===2)parts.forEach(function(part){if(root.ContentIdentity&&/^[0-9 ]*$/.test(root.ContentIdentity.name(part)))return;if(out.indexOf(part)<0)out.push(part);});return out;}
 /* A year in the title/permalink is only a hint; publication timestamps are never release years. */
 function yearHint(title,page){var I=root.ContentIdentity,m=I&&/\s((?:19|20)\d{2})$/.exec(I.name(title));if(m)return Number(m[1]);var years=[],pattern=/(?:^|[-/])((?:19|20)\d{2})(?=[-/]|$)/g,path=new root.URL(page).pathname;while((m=pattern.exec(path)))if(years.indexOf(Number(m[1]))<0)years.push(Number(m[1]));return years.length===1?years[0]:null;}
 function collection(body,card){
  var d=P.envelope(body).doc,scope=d.querySelector('.news-content.article-content'),items=[],heading=text(d,'h1');
  if(!scope)throw new Error('Bu yazıda sıralı film koleksiyonu bulunamadı.');
  Array.prototype.forEach.call(scope.querySelectorAll('h2,h3'),function(h){var label=text(h),m=/^(\d+)\.\s*(.+?)\s*\(((?:19|20)\d{2})\)/.exec(label);if(!m)return;var y=Number(m[3]),t=P.clean(m[2]),parts=t.split(/\s*[-–]\s*/);items.push({ordinal:Number(m[1]),title:t,year:y,titleAliases:parts.length>1?parts:[]});});
  if(items.length<2)throw new Error('Bu yazıda doğrulanabilir sıralı film listesi bulunamadı.');
  return {contentId:id(card.pageUrl,'collection'),legacyContentIds:[id(card.pageUrl,'movie')],providerId:'filmizle',type:'collection',pageUrl:card.pageUrl,title:heading||card.title,poster:card.poster||'',description:'Filmleri bu koleksiyondaki sırayla keşfedin ve izleyin.',collectionItems:items.slice(0,200),genres:[],cast:[],seasons:[],episodes:[],sources:[],subtitles:[]};
 }
 function detail(body, card) {
  if(card.type==='collection'||/\/haber\//.test(new root.URL(card.pageUrl).pathname))return collection(body,card);
  var env = P.envelope(body), d = env.doc, result = root.PlayerCore.copy(card), title = text(d, '.p-v12-main-title');
  if (!title) throw new Error('Filmizle detay biçimi tanınamadı.');
  result.title = title; result.titleAliases=aliases(title); result.description = text(d, '.p-v12-story-content'); result.poster = image(d.querySelector('.p-v12-poster-main'), card.pageUrl) || card.poster;
  result.type = series(title, d, card.type) || !!d.querySelector('.p-v12-meta-info a[href*="/dizi-izle/"]') ? 'series' : 'movie';
  result.contentId = id(card.pageUrl, result.type); result.genres = []; result.cast = []; result.seasons = []; result.episodes = []; result.sources = []; result.subtitles = [];
  if(result.type==='movie')result.yearHint=yearHint(title,card.pageUrl);
  result.imdb = numeric(text(d, '.p-v12-imdb-badge')) || card.imdb;
  Array.prototype.forEach.call(d.querySelectorAll('.p-v12-meta-info a[rel]'), function (a) { var name = text(a); if (name) result.genres.push(name); });
  if (result.type === 'series') {
   /* Numbered pages also exist on movies. Only a verified series detail gets episodes. */
   var m = /(\d+)\s*\.?\s*Sezon/i.exec(title), season = m ? Number(m[1]) : 1, links = [{ page: card.pageUrl, number: 1 }], seen = {};
   Array.prototype.forEach.call(d.querySelectorAll('.p-v12-ep-list a.post-page-numbers'), function (a) { var page = safe(a.getAttribute('href'), card.pageUrl), number = Number(text(a)); if (page && number > 0 && Math.floor(number) === number) links.push({ page: page, number: number }); });
   links.sort(function (a, b) { return a.number - b.number; }).forEach(function (link) { if (seen[link.number]) return; seen[link.number] = true; result.episodes.push({ contentId: result.contentId + ':s' + season + ':e' + link.number, providerId: 'filmizle', pageUrl: link.page, title: title + ' · ' + link.number + '. Bölüm', episodeTitle: link.number + '. Bölüm', type: 'episode', poster: result.poster, seriesTitle: title, seriesPageUrl: card.pageUrl, episode: { seriesId: result.contentId, season: season, number: link.number }, sources: [] }); });
   result.seasons = [season];
  }
  return result;
 }
 root.FilmizleParser = { base: BASE, safe: safe, withSort: withSort, list: parseList, home: home, detail: detail, cards: cards };
})(window);
