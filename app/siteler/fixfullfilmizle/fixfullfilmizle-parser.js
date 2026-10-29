/* FixFullFilmIzle catalog data. Site HTML is parsed in an inert document. */
(function (root) {
 'use strict';
 var U = root.CatalogUtils, BASE = 'https://www.fixfullfilmizle.net';
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
 function list(body, page) { var d = U.envelope(body).doc; return { cards: catalogCards(d,page), next: next(d, page) }; }
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
