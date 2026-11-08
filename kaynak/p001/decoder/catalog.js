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
