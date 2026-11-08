/* Source menu pages and active embed data only; remote scripts are never evaluated. */
(function (root) {
  'use strict';
  var D = root.WebPlayerData, BASE = (root.SiteAddresses ? root.SiteAddresses.base('lovefilmizle', 'https://lovefilmizle.net') : 'https://lovefilmizle.net');
  function moly(u) {
    return (/^vidmoly\.(?:net|me|biz|to)$/.test(u.hostname) || u.origin === BASE) && (/^\/embed-[a-z0-9]+\.html$/.test(u.pathname) || /^\/bemoly\/bemoly\.php$/.test(u.pathname));
  }
  function allowed(u) {
    return moly(u) || /^(?:ok|odnoklassniki)\.ru$/.test(u.hostname) && /^\/videoembed\/\d+\/?$/.test(u.pathname) || u.hostname === 'videoseyred.in' && /^\/embed\/\d+\/?$/.test(u.pathname) || u.hostname === 'my.mail.ru' && /^\/video\/embed\/\d+\/?$/.test(u.pathname);
  }
  function canonical(page) { return new root.URL(page).pathname.replace(/\/[1-9]\d*\/$/, '/'); }
  function alternatives(body, page) {
    var d = D.doc(body), path = canonical(page), number = Number((/\/([1-9]\d*)\/$/.exec(new root.URL(page).pathname) || [])[1]) || 1;
    var current = d.querySelector('.selected a[aria-label="page"]'), label = root.CatalogUtils.clean(current && current.textContent) || 'Kaynak ' + number;
    var out = [{ sourceId: 'lovefilmizle-page-' + number, label: label, kind: 'page', url: page, body: body }], seen = {};
    seen[page] = true;
    Array.prototype.forEach.call(d.querySelectorAll('a[aria-label="page"][href]'), function (a) {
      var url = D.publicUrl(a.getAttribute('href'), page), u = url && new root.URL(url), n;
      if (!u || u.origin !== BASE || u.search || u.hash || canonical(url) !== path || seen[url]) return;
      n = Number((/\/([1-9]\d*)\/$/.exec(u.pathname) || [])[1]) || 1;
      if (n > 12) return;
      seen[url] = true; out.push({ sourceId: 'lovefilmizle-page-' + n, label: root.CatalogUtils.clean(a.textContent) || 'Kaynak ' + n, kind: 'page', url: url });
    });
    if (out.length === 1) {
      var direct = D.frames(body, page, moly, '#player iframe');
      if (direct.length) return direct.map(function (url, i) { return { sourceId: 'lovefilmizle-vidmoly-' + i, label: 'Vidmoly', url: url }; });
    }
    return out;
  }
  function follow(url, get, depth) {
    if (depth > 3) throw D.fail('decode', 'Oynatıcı yönlendirme sınırı aşıldı.');
    return get(url, BASE + '/', 'embed').then(function (r) {
      var u = new root.URL(url), value;
      if (/^(?:ok|odnoklassniki)\.ru$/.test(u.hostname)) { value = D.ok(r.body, url.replace('://odnoklassniki.ru/', '://ok.ru/')); value.referer = url; return value; }
      if (u.hostname === 'my.mail.ru') {
        var id = (/^\/video\/embed\/(\d+)\/?$/.exec(u.pathname) || [])[1], marker = /"metadataUrl"\s*:\s*/.exec(r.body);
        var meta = marker && D.publicUrl(D.literal(r.body, marker.index + marker[0].length).value, url);
        if (!id || !meta || new root.URL(meta).origin !== u.origin || new root.URL(meta).pathname !== '/+/video/meta/' + id) throw D.fail('decode', 'Mail video metadata kimliği eşleşmiyor.');
        return get(meta, url, 'api').then(function (response) {
          var data; try { data = JSON.parse(response.body); } catch (e) { throw D.fail('decode', 'Mail metadata JSON değil.'); }
          var videos = Array.isArray(data.videos) ? data.videos.slice() : [];
          videos.sort(function (a, b) { function score(v) { var h = parseInt(v.key, 10) || 0; return h > 720 ? 10000 + h : 720 - h; } return score(a) - score(b); });
          var chosen = videos.filter(function (v) { return typeof v.url === 'string' && D.publicUrl(v.url, url); })[0];
          if (!chosen) throw D.fail('unavailable', 'Mail yanıtında erişilebilir video yok.');
          return { url: D.publicUrl(chosen.url, url), type: 'mp4', referer: url, subtitles: [] };
        });
      }
      if (u.hostname === 'videoseyred.in') {
        var videoId = (/^\/embed\/(\d+)\/?$/.exec(u.pathname) || [])[1], playlist = /\bvar\s+playlistUrl\s*=\s*/.exec(r.body);
        var endpoint = playlist && D.publicUrl(D.literal(r.body, playlist.index + playlist[0].length).value, url);
        if (!videoId || !endpoint || new root.URL(endpoint).origin !== u.origin || new root.URL(endpoint).pathname !== '/playlist/' + videoId + '.json') throw D.fail('decode', 'Videoseyred liste kimliği eşleşmiyor.');
        return get(endpoint, url, 'api').then(function (response) {
          var data; try { data = JSON.parse(response.body); } catch (e) { throw D.fail('decode', 'Videoseyred listesi JSON değil.'); }
          var item = Array.isArray(data) && data[0], sources = item && item.sources;
          var source = Array.isArray(sources) && sources.filter(function (s) { return D.publicUrl(s.file, url) && /mpegurl|hls|mp4/i.test(s.type || s.file); })[0];
          if (!source) throw D.fail('unavailable', 'Videoseyred listesinde medya yok.');
          return { url: D.publicUrl(source.file, url), type: /mpegurl|hls/i.test(source.type || '') || /\.m3u8(?:$|[?#])/.test(source.file) ? 'hls' : 'mp4', referer: url, subtitles: [] };
        });
      }
      try { value = D.jw(r.body, url); value.referer = url; return value; }
      catch (error) {
        var frames = D.frames(r.body, url, allowed);
        if (frames.length) return follow(frames[0], get, depth + 1);
        throw error;
      }
    });
  }
  root.LoveFilmizleDecoder = {
    alternatives: alternatives,
    resolve: function (entry, get) {
      if (entry.kind !== 'page' && allowed(new root.URL(entry.url)) && new root.URL(entry.url).origin !== BASE) return follow(entry.url, get, 0);
      if (entry.kind !== 'page' && new root.URL(entry.url).pathname === '/bemoly/bemoly.php') return follow(entry.url, get, 0);
      return (entry.body ? Promise.resolve({ body: entry.body }) : get(entry.url, BASE + '/', 'page')).then(function (r) {
        var frames = D.frames(r.body, entry.url, allowed, '#player iframe');
        if (!frames.length) throw D.fail('unsupported', 'Bu kaynak sayfasındaki aktif oynatıcı henüz desteklenmiyor.');
        return follow(frames[0], get, 0);
      });
    }
  };
})(window);
