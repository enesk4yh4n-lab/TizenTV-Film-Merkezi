/* Literal player data only. No downloaded script is evaluated or mounted. */
(function (root) {
  'use strict';
  function fail(stage, message) {
    var e = new Error(message);
    e.stage = stage;
    return e;
  }
  function publicUrl(value, page) {
    if (typeof value !== 'string' || !value.replace(/\s/g, '')) return '';
    var u;
    try {
      u = new root.URL(value, page || 'https://invalid.local/');
      if (root.SiteAddresses) u = new root.URL(root.SiteAddresses.resolve(u.href));
    } catch (ignore) {
      return '';
    }
    if (
      u.protocol !== 'https:' ||
      u.username ||
      u.password ||
      !u.hostname.match(/\./) ||
      /^(?:localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|\[)|(?:^|\.)local$|^172\.(?:1[6-9]|2\d|3[01])\./i.test(
        u.hostname
      )
    )
      return '';
    return u.href;
  }
  function doc(body) {
    if (typeof body !== 'string' || body.length > 2097152)
      throw fail('decode', 'Oynatıcı yanıtı sınırı aşıldı.');
    return new DOMParser().parseFromString(
      body
        .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
        .replace(/<link\b[^>]*>/gi, '')
        .replace(/\ssrc\s*=/gi, ' data-frame-src=')
        .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, ''),
      'text/html'
    );
  }
  function literal(input, start) {
    var q = input.charAt(start),
      out = '',
      i = start + 1;
    if (q !== "'" && q !== '"') throw fail('decode', 'Veri dizesi bekleniyordu.');
    for (; i < input.length; i++) {
      var c = input.charAt(i);
      if (c === q) return { value: out, end: i + 1 };
      if (c === '\\') {
        c = input.charAt(++i);
        if (c === 'x' || c === 'u') {
          var size = c === 'x' ? 2 : 4,
            hex = input.substr(i + 1, size);
          if (!new RegExp('^[a-f0-9]{' + size + '}$', 'i').test(hex))
            throw fail('decode', 'Geçersiz veri kaçışı.');
          out += String.fromCharCode(parseInt(hex, 16));
          i += size;
        } else if (c === '\\' || c === '/' || c === "'" || c === '"') out += c;
        else if (c === 'n') out += '\n';
        else if (c === 'r') out += '\r';
        else if (c === 't') out += '\t';
        else throw fail('decode', 'Desteklenmeyen veri kaçışı.');
      } else out += c;
      if (out.length > 1048576) break;
    }
    throw fail('decode', 'Eksik veya büyük veri dizesi.');
  }
  function object(body, pattern) {
    var m = pattern.exec(body);
    if (!m) throw fail('decode', 'Aktif oynatıcı verisi bulunamadı.');
    var start = m.index + m[0].length,
      depth = 0,
      quoted = false,
      esc = false;
    for (var i = start; i < body.length && i < start + 1048576; i++) {
      var c = body.charAt(i);
      if (quoted) {
        if (esc) esc = false;
        else if (c === '\\') esc = true;
        else if (c === '"') quoted = false;
      } else if (c === '"') quoted = true;
      else if (c === '{') depth++;
      else if (c === '}' && --depth === 0) {
        try {
          return JSON.parse(body.slice(start, i + 1));
        } catch (ignore) {
          throw fail('decode', 'Oynatıcı JSON verisi geçersiz.');
        }
      }
    }
    throw fail('decode', 'Eksik oynatıcı JSON verisi.');
  }
  function unpack(body) {
    var marker = /\beval\(function\(p,a,c,k,e,[dr]\)[\s\S]*?return p\}\(/g,
      m,
      out = [];
    while ((m = marker.exec(body))) {
      if (out.length >= 8) throw fail('decode', 'Veri katmanı sınırı aşıldı.');
      var p = literal(body, m.index + m[0].length),
        tail = /^\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*/.exec(body.slice(p.end));
      if (!tail) continue;
      var radix = Number(tail[1]),
        count = Number(tail[2]),
        dict = literal(body, p.end + tail[0].length),
        keys = dict.value.split('|');
      if (
        radix < 2 ||
        radix > 62 ||
        count > 4096 ||
        count < 1 ||
        keys.length !== count ||
        !/^\.split\(['"]\|['"]\)/.test(body.slice(dict.end))
      )
        throw fail('decode', 'Oynatıcı sözlüğü geçersiz.');
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
        p.value.replace(/\b[0-9A-Za-z]+\b/g, function (word) {
          var i = index(word);
          return i >= 0 && keys[i] ? keys[i] : word;
        })
      );
      marker.lastIndex = dict.end;
    }
    return out;
  }
  root.InertPlayerData = { fail: fail, publicUrl: publicUrl, doc: doc, literal: literal, object: object, unpack: unpack };
})(window);
