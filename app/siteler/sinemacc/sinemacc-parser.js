/* Sinemacc catalog data from an inert document; page scripts never enter the app. */
(function (root) {
 'use strict'; var U = root.CatalogUtils, BASE = 'https://sinemacc.com';
 function text(node, selector) { var n = node && (selector ? node.querySelector(selector) : node); return U.clean(n && n.textContent); }
 function safe(value, page) { var url = U.url(value, page || BASE + '/'), u; try { u = new root.URL(url); } catch (ignore) {} return u && u.origin === BASE && !u.username && !u.password ? url : ''; }
 function movieUrl(value) { var url = safe(value), u = url && new root.URL(url); return u && !u.search && /^\/film\/[a-z0-9-]+\/$/.test(u.pathname) ? url : ''; }
 function catalogUrl(value) { var url = safe(value), u = url && new root.URL(url); return u && /^(?:\/|\/(?:populer-filmler|imdb-top-250|en-cok-yorumlanan-filmler|film-arsivi|arama)\/|\/tur\/[a-z0-9-]+\/)(?:page\/[1-9]\d*\/)?$/.test(u.pathname) ? url : ''; }
 function id(url) { var value = movieUrl(url); return value ? 'sinemacc:movie:' + new root.URL(value).pathname.split('/')[2] : ''; }
 function number(value) { var m = /\d+(?:[.,]\d+)?/.exec(String(value || '')); return m ? Number(m[0].replace(',', '.')) : null; }
 function image(node, page) { var n = node && node.querySelector('img'); return U.url(n && (n.getAttribute('data-src') || n.getAttribute('data-catalog-src')), page); }
 function language(node) {
  var dub = false, sub = false;
  Array.prototype.forEach.call(node.querySelectorAll('use'), function (u) { var icon = u.getAttribute('href') || u.getAttribute('xlink:href') || ''; if (/#icon_flag_tr$/.test(icon)) dub = true; if (/#icon_subtitle$/.test(icon)) sub = true; });
  Array.prototype.forEach.call(node.querySelectorAll('.type'), function (n) { var s = text(n); if (/Dublaj/i.test(s)) dub = true; if (/Altyaz/i.test(s)) sub = true; });
  return dub && sub ? 'Dublaj & Altyazılı' : dub ? 'Türkçe Dublaj' : sub ? 'Türkçe Altyazılı' : '';
 }
 function unwrap(body) { if (/^\s*\{/.test(body)) { var json = JSON.parse(body); if (typeof json.ajaxpagi_filmler !== 'string') throw new Error('Sinemacc liste yanıtı değişti.'); return json.ajaxpagi_filmler; } return body; }
 function cards(doc, page) {
  var out = [], seen = {};
  Array.prototype.forEach.call(doc.querySelectorAll('.film_kutusu, .film_uzun_kutu'), function (box) {
   var a = box.querySelector('a[href]'), url = movieUrl(safe(a && a.getAttribute('href'), page)), title = text(box, '.title .text, .detay > .baslik'), year = /\b((?:19|20)\d{2})\b/.exec(text(box, '.years'));
   if (!url || !title || seen[url]) return; seen[url] = true;
   out.push({ contentId: id(url), providerId: 'sinemacc', type: 'movie', pageUrl: url, title: title, poster: image(box, page), year: year ? Number(year[1]) : null, imdb: number(text(box, '.imdb')), language: language(box) });
  }); return out;
 }
 function literalNumber(body, name) { var m = new RegExp('\\b(?:let|var|const)\\s+' + name + '\\s*=\\s*["\']?(\\d+)["\']?\\s*;').exec(body); return m ? Number(m[1]) : null; }
 function next(doc, body, page, archivePage) {
  var a = doc.querySelector('.pagination a.next'), rel = a && Number(a.getAttribute('rel')), target = a && catalogUrl(U.url(a.getAttribute('href'), page));
  if (archivePage) return rel === archivePage + 1 ? { kind: 'sinemacc-archive', page: rel } : null;
  var current = literalNumber(body, 'currentPage'), total = literalNumber(body, 'totalpages'), m = /\b(?:let|var|const)\s+load_adres\s*=\s*(['"])(https:\/\/sinemacc\.com\/[^'"\s]*)\1/.exec(body), base = m && catalogUrl(m[2]);
  if (target && target !== page) return { kind: 'url', url: target };
  if (!base || !current || !total || current >= total || total > 100000) return null;
  var parsed = new root.URL(page), b = new root.URL(base), rootPath = parsed.pathname.replace(/page\/\d+\/$/, '');
  if (b.pathname !== rootPath) return null;
  return { kind: 'url', url: BASE + rootPath + 'page/' + (current + 1) + '/' + parsed.search };
 }
 function list(body, page, archivePage) {
  body = unwrap(body); var doc = U.envelope(body).doc, all = cards(doc, page);
  if (!all.length && !doc.querySelector('#iceri_cek, #jcontent, #arsiv_ust') && !/sonu[çc].{0,50}(?:bulunamad|yok)|bulunamad[ıi]/i.test(text(doc.body))) throw new Error('Sinemacc katalog biçimi tanınamadı.');
  return { cards: all, next: next(doc, body, page, archivePage) };
 }
 function home(body) { var data = list(body, BASE + '/'); if (!data.cards.length) throw new Error('Sinemacc ana kataloğu boş.'); return { hero: data.cards[0], movies: data.cards, series: [], next: data.next }; }
 function options(body) {
  var d = U.envelope(body).doc, result = {};
  [['genres','rcat'],['years','rdate'],['lang','rdil'],['imdb','rimdb']].forEach(function (pair) {
   var select = d.querySelector('select[name="' + pair[1] + '"]'); if (!select) throw new Error('Sinemacc filtre alanı bulunamadı.');
   result[pair[0]] = Array.prototype.map.call(select.querySelectorAll('option[value]'), function (o) { var v = o.getAttribute('value'); return { value: pair[0] === 'imdb' && v ? v + '-10' : v, label: text(o) }; }).filter(function (o) { return /^\d+(?:-10)?$/.test(o.value) && !(pair[0] === 'lang' && o.value === '76'); });
  }); return result;
 }
 function detail(body, original) {
  var page = movieUrl(original.pageUrl), env = U.envelope(body), d = env.doc, heading = d.querySelector('h1.baslik'), schema = env.schema.filter(function (s) { return s['@type'] === 'Movie'; })[0];
  if (!page || !heading || !schema) throw new Error('Sinemacc film detayı tanınamadı.');
  // Bind the schema's WatchAction to the requested film.
  var target = schema.potentialAction && schema.potentialAction.target, entry = Array.isArray(target) && target[0], bound = entry && movieUrl(entry.urlTemplate);
  if (bound && bound !== page) throw new Error('Sinemacc film kimliği yanıtla eşleşmiyor.');
  var meta = heading.parentNode.parentNode, result = { contentId: id(page), providerId: 'sinemacc', type: 'movie', pageUrl: page, title: text(heading).replace(/\s+İzle$/i, ''), originalTitle: '', poster: U.url(typeof schema.image === 'string' ? schema.image : '', page) || original.poster || '', description: text(meta, '.kategori_aciklama'), year: Number(String(schema.dateCreated || schema.datePublished || '').slice(0,4)) || original.year || null, imdb: number(schema.aggregateRating && schema.aggregateRating.ratingValue) || original.imdb || null, duration: '', cast: [], genres: [], language: original.language || '', episodes: [], seasons: [], sources: [], subtitles: [] };
  var alt = U.clean(schema.alternateName || text(meta, 'h2.orj')), minutes = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(schema.duration || ''); if (alt.length > 1 && alt !== result.title) result.originalTitle = alt;
  if (minutes) result.duration = (Number(minutes[1] || 0) * 60 + Number(minutes[2] || 0)) + ' dk';
  if (!result.description && schema.description) result.description = text(U.envelope(schema.description).doc.body);
  (Array.isArray(schema.actor) ? schema.actor : []).slice(0,60).forEach(function (a) { var name = U.clean(a.name); if (name) result.cast.push(name); });
  Array.prototype.forEach.call(meta.querySelectorAll('a[href]'), function (a) { var url = safe(a.getAttribute('href')), label = text(a); if (url && /\/tur\//.test(url) && label && result.genres.indexOf(label) < 0) result.genres.push(label); if (url && /\/dil\//.test(url) && /Türkçe\s+(?:Dublaj|Altyaz)/i.test(label)) { if (/Dublaj/i.test(label)) result.language = /Altyaz/.test(result.language) ? 'Dublaj & Altyazılı' : 'Türkçe Dublaj'; else result.language = /Dublaj/.test(result.language) ? 'Dublaj & Altyazılı' : 'Türkçe Altyazılı'; } });
  return result;
 }
 root.SinemaccParser = { base: BASE, safe: safe, movieUrl: movieUrl, catalogUrl: catalogUrl, id: id, home: home, list: list, detail: detail, options: options };
})(window);
