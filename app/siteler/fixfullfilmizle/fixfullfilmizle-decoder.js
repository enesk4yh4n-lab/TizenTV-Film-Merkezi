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
      seen = {};
    if (!canonical || !menu) throw failure('Kaynak seçim alanı bulunamadı.');
    Array.prototype.forEach.call(menu.children, function (node) {
      var label = U.clean(node.textContent),
        url;
      if (node.tagName === 'A') url = P.sourcePage(U.url(node.getAttribute('href'), page));
      else if (node.tagName === 'SPAN' && !/^\(/.test(label)) url = P.sourcePage(page);
      if (!url || !label || P.movieUrl(url) !== canonical || seen[url]) return;
      seen[url] = true;
      out.push({ url: url, label: label });
    });
    if (!out.length || out.length > 12) throw failure('Kaynak seçim listesi tanınamadı.');
    return out;
  }
  function frame(body, page) {
    var d = documentData(body),
      n = d.querySelector('.filmicerik #vast iframe'),
      url = U.url(n && n.getAttribute('data-frame-src'), page),
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
