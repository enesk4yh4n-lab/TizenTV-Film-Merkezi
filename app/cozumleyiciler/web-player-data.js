/* Literal player data only. No downloaded script is evaluated or mounted. */
(function (root) {
  'use strict';
  var U = root.CatalogUtils;
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
  function jw(body, page) {
    var values = [body].concat(unpack(body)),
      result = null;
    values.some(function (s) {
      var m = /\b(?:jwplayer\(\s*['"][^'"]+['"]\s*\)|player|playerInstance)\s*\.setup\(\s*\{/.exec(
        s
      );
      if (!m) return false;
      var active = s.slice(m.index + m[0].length, m.index + m[0].length + 100000),
        file = /\b(?:sources\s*:\s*\[\s*\{\s*)?file\s*:\s*/.exec(active);
      if (!file) return false;
      var u = publicUrl(literal(active, file.index + file[0].length).value, page);
      if (!u || !/\.(?:m3u8|mp4)(?:$|[?#])/i.test(u)) return false;
      result = { url: u, type: /\.mp4(?:$|[?#])/i.test(u) ? 'mp4' : 'hls', subtitles: [] };
      return true;
    });
    if (!result) throw fail('decode', 'Aktif JW medya ayarı bulunamadı.');
    return result;
  }
  function frames(body, page, allowed, selector) {
    var d = doc(body),
      out = [];
    Array.prototype.forEach.call(d.querySelectorAll(selector || 'iframe'), function (n) {
      var value =
          n.getAttribute('data-litespeed-src') ||
          n.getAttribute('data-src') ||
          n.getAttribute('data-frame-src'),
        u = publicUrl(value, page);
      if (u && allowed(new root.URL(u)) && out.indexOf(u) < 0) out.push(u);
    });
    return out;
  }
  function b64(value) {
    try {
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value)) throw Error();
      return root.CryptoJS.enc.Base64.parse(value).toString(root.CryptoJS.enc.Utf8);
    } catch (ignore) {
      throw fail('decode', 'Kodlanmış veri okunamadı.');
    }
  }
  function resolver(P, D) {
    function Resolver(log, now) {
      this.log = log || function () {};
      this.now = now || Date.now;
      this.generation = 0;
      this.network = root.ChainNetwork.createClient({
        destination: 'downloads',
        preferXHR: P.config.preferXHR !== false,
      });
      this.fallbacks = [];
    }
    Resolver.prototype.cancel = function () {
      this.generation++;
      this.network.cancel();
      this.fallbacks.splice(0).forEach(function (n) {
        n.cancel();
      });
    };
    Resolver.prototype.resolve = function (content, deadline, notify, hints) {
      this.cancel();
      var self = this,
        token = self.generation,
        sources = [],
        options = [],
        last,
        progress = new root.SourceProgress(notify, hints),
        base = P.base;
      if (!P.contentUrl(content.pageUrl))
        return Promise.reject(fail('page', 'Geçersiz içerik adresi.'));
      if (self.now() >= deadline)
        return Promise.reject(fail('timeout', 'Kaynak hazırlama süresi doldu.'));
      function check() {
        if (token !== self.generation) {
          var e = fail('cancel', 'İptal edildi');
          e.cancelled = true;
          throw e;
        }
        if (self.now() >= deadline) throw fail('timeout', 'Kaynak hazırlama süresi doldu.');
      }
      var network =
        progress && progress.client ? progress.client(self.network, check, deadline) : self.network;
      function request(url, ref, stage, body, headers) {
        check();
        if (!publicUrl(url))
          return Promise.reject(fail(stage, 'Güvensiz kaynak adresi reddedildi.'));
        return (
          body === undefined
            ? network.get(
                url,
                ref,
                headers || (P.config.userAgent ? { 'User-Agent': P.config.userAgent } : undefined)
              )
            : network.post(url, body, headers)
        )
          .then(function (r) {
            check();
            if (body === undefined && !/\S/.test(r.body) && /^XHR/.test(r.method)) {
              var native = root.ChainNetwork.createClient({
                destination: 'downloads',
                preferXHR: false,
              });
              if (progress && progress.client) native = progress.client(native, check, deadline);
              self.fallbacks.push(native);
              return native
                .get(
                  url,
                  ref,
                  headers || (P.config.userAgent ? { 'User-Agent': P.config.userAgent } : undefined)
                )
                .then(function (value) {
                  check();
                  return value;
                });
            }
            return r;
          })
          .then(
            function (r) {
              check();
              if (!/\S/.test(r.body)) throw fail(stage, 'Kaynak sunucusu boş yanıt verdi.');
              return r;
            },
            function (e) {
              check();
              e.stage = e.stage || stage;
              throw e;
            }
          );
      }
      function get(url, ref, stage) {
        return request(url, ref, stage || 'embed');
      }
      function publish() {
        progress.publish(sources, options);
      }
      return get(content.pageUrl, base + '/', 'page')
        .then(function (page) {
          P.detail(page.body, content);
          var queue = [],
            seen = {};
          function enqueue(entries) {
            check();
            entries.forEach(function (e) {
              e.sourceId = e.sourceId || P.config.id + '-' + options.length;
              if (seen[e.sourceId]) return;
              if (options.length >= 16 || !publicUrl(e.url))
                throw fail('decode', 'Aktif kaynak listesi sınırı aşıldı.');
              seen[e.sourceId] = true;
              e.pageUrl = content.pageUrl;
              queue.push(e);
              options.push({
                sourceId: e.sourceId,
                label: e.label,
                status: 'pending',
                detail: '',
                stage: '',
              });
            });
            publish();
          }
          enqueue(D.alternatives(page.body, content.pageUrl));
          if (!queue.length) throw fail('decode', 'Aktif kaynak listesi bulunamadı.');
          queue = progress.order(queue, function (e) {
            return { id: e.sourceId, label: e.label };
          });
          function worker() {
            check();
            if (!queue.length) return Promise.resolve();
            return progress
              .wait(check)
              .then(function () {
                var entry = queue.shift(),
                  o = options.filter(function (x) {
                    return x.sourceId === entry.sourceId;
                  })[0];
                return D.resolve(entry, get, request, check, enqueue)
                  .then(function (data) {
                    check();
                    var media = publicUrl(data.url);
                    if (!media) throw fail('decode', 'Geçersiz medya adresi.');
                    return (
                      data.type === 'mp4'
                        ? Promise.resolve(null)
                        : get(media, data.referer || entry.url, 'manifest')
                    ).then(function (r) {
                      if (r && !/^\s*#EXTM3U/.test(r.body))
                        throw fail('manifest', 'HLS yerine farklı bir yanıt alındı.');
                      sources.push({
                        id: entry.sourceId,
                        label: entry.label,
                        url: media,
                        type: data.type || 'hls',
                        status: data.type === 'mp4' ? 'candidate' : 'ready',
                        referer: data.referer || entry.url,
                        transport: r && /^XHR/.test(r.method) ? 'xhr' : 'native',
                        destination: 'downloads',
                        userAgent: P.config.userAgent || '',
                        seekMode: 'media-event',
                        subtitles: data.subtitles || [],
                        thumbnails: data.thumbnails || null,
                        preferredEngine: data.preferredEngine || null,
                        fragmentByteLimit: data.fragmentByteLimit || undefined,
                      });
                      o.status = data.type === 'mp4' ? 'candidate' : 'ready';
                      o.detail =
                        data.type === 'mp4'
                          ? 'MP4 medya motorunda sınanacak'
                          : 'HLS erişimi doğrulandı';
                      publish();
                    });
                  })
                  .catch(function (e) {
                    check();
                    last = e;
                    o.status = e.stage === 'unsupported' ? 'unsupported' : 'error';
                    o.stage = e.stage || 'decode';
                    o.detail = root.PlayerCore.safeMessage(e.message);
                    self.log(P.config.name + ' · ' + o.label + ' · ' + o.stage + ' · ' + o.detail);
                    publish();
                  });
              })
              .then(worker);
          }
          return worker();
        })
        .then(function () {
          check();
          sources.options = options;
          if (!sources.length) {
            var e = last || fail('decode', 'Oynatılabilir kaynak bulunamadı.');
            e.sourceOptions = options;
            throw e;
          }
          return sources;
        });
    };
    return Resolver;
  }
  function ok(body, page) {
    var parsed = new root.URL(page),
      id = /^\/videoembed\/(\d+)\/?$/.exec(parsed.pathname);
    if (parsed.hostname !== 'ok.ru' || !id) throw fail('decode', 'Geçersiz OK.ru oynatıcı adresi.');
    if (/copyrightsRestricted/.test(body))
      throw fail('unavailable', 'OK.ru kaynağı telif nedeniyle kaldırılmış veya engellenmiş.');
    var nodes = doc(body).querySelectorAll('[data-options]'),
      metadata = null;
    for (var i = 0; i < nodes.length; i++) {
      try {
        var o = JSON.parse(nodes[i].getAttribute('data-options')),
          v = o.flashvars && o.flashvars.metadata;
        v = typeof v === 'string' ? JSON.parse(v) : v;
        if (v && v.movie && String(v.movie.movieId || v.movie.id) === id[1]) {
          metadata = v;
          break;
        }
      } catch (ignore) {}
    }
    if (!metadata) throw fail('decode', 'Aktif OK.ru video bilgisi bulunamadı.');
    if (
      metadata.movie.notPublished ||
      /blocked|deleted|copyright|restricted/i.test(String(metadata.movie.status || ''))
    )
      throw fail('unavailable', 'OK.ru videosu bu yanıtta kullanılamıyor.');
    var url = publicUrl(
      metadata.hlsManifestUrl || metadata.ondemandHls || metadata.liveHlsManifestUrl
    );
    if (!url || !/(^|\.)(vkuser\.net|okcdn\.ru)$/.test(new root.URL(url).hostname))
      throw fail('unsupported', 'OK.ru yanıtı doğrudan HLS bildirmiyor.');
    return { url: url, type: 'hls', subtitles: [] };
  }
  root.WebPlayerData = {
    fail: fail,
    publicUrl: publicUrl,
    doc: doc,
    literal: literal,
    object: object,
    unpack: unpack,
    jw: jw,
    frames: frames,
    b64: b64,
    ok: ok,
    seeded: function (body, page) {
      if (!/\bjwplayer\(/.test(body)) throw fail('decode', 'Aktif medya oynatıcısı bulunamadı.');
      var r = root.LiteralMediaDecoder.extractPlayer(body, page),
        s = r.streams.filter(function (x) {
          return !!publicUrl(x.url);
        })[0];
      if (!s) throw fail('decode', 'Etkin medya verisi çözülemedi.');
      return {
        url: s.url,
        type: /\.mp4(?:$|[?#])/i.test(s.url) ? 'mp4' : 'hls',
        subtitles: r.subtitles,
      };
    },
    createResolver: resolver,
  };
})(window);
