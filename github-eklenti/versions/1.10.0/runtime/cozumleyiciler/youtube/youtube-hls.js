/* Shared YouTube HLS adapter. Generated helpers come from segments.js. */
(function (root) {
  'use strict';
  function mediaUrl(value) {
    try {
      var u = new URL(value);
      return u.protocol === 'https:' &&
        !u.username &&
        !u.password &&
        /(^|\.)googlevideo\.com$/.test(u.hostname)
        ? u.href
        : '';
    } catch (e) {
      return '';
    }
  }
  function filterMaster(text, url) {
    if (
      !/^\s*#EXTM3U/.test(text) ||
      text.length > 1024 * 1024 ||
      /#EXT-X-SESSION-KEY|SAMPLE-AES|KEYFORMAT=/i.test(text)
    )
      throw Error('Desteklenen açık YouTube HLS listesi alınamadı');
    var lines = text.split(/\r?\n/),
      audio = [],
      variants = [],
      groups = {};
    function uri(value) {
      var result = new URL(value, url).href;
      if (!mediaUrl(result)) throw Error('YouTube HLS medya sunucusu doğrulanamadı');
      return result;
    }
    lines.forEach(function (line, i) {
      if (/^#EXT-X-MEDIA:/.test(line) && /(?:[:,])TYPE=AUDIO(?:,|$)/.test(line)) {
        var group = /GROUP-ID="([^"]+)"/.exec(line),
          link = /URI="([^"]+)"/.exec(line);
        if (group && link)
          audio.push({
            group: group[1],
            line: line.replace(link[0], 'URI="' + uri(link[1]) + '"'),
          });
      }
      if (
        !/^#EXT-X-STREAM-INF:/.test(line) ||
        !/CODECS="[^"]*avc1\./i.test(line) ||
        !/mp4a\.40\.2/i.test(line)
      )
        return;
      var size = /RESOLUTION=(\d+)x(\d+)/.exec(line),
        fps = /FRAME-RATE=([\d.]+)/.exec(line),
        track = /AUDIO="([^"]+)"/.exec(line);
      if (
        !size ||
        Number(size[2]) > 720 ||
        (fps && Number(fps[1]) > 30) ||
        !lines[i + 1] ||
        /^#/.test(lines[i + 1])
      )
        return;
      if (track) groups[track[1]] = true;
      variants.push({
        line: line.replace(/,SUBTITLES="[^"]*"|,CLOSED-CAPTIONS="[^"]*"/g, ''),
        url: uri(lines[i + 1].trim()),
        height: Number(size[2]),
      });
    });
    if (!variants.length) throw Error('HLS içinde uygun H.264 yayın bulunamadı');
    var out = ['#EXTM3U', '#EXT-X-VERSION:6'];
    audio.forEach(function (a) {
      if (groups[a.group]) out.push(a.line);
    });
    variants.forEach(function (v) {
      out.push(v.line, v.url);
    });
    return {
      text: out.join('\n') + '\n',
      levels: variants.map(function (v) {
        return v.height;
      }),
    };
  }
  var entries = Object.create(null),
    order = [],
    installed = false,
    serial = 0,
    cacheBytes = 0;
  function cancelled() {
    var e = Error('YouTube isteği iptal edildi');
    e.cancelled = true;
    return e;
  }
  function install() {
    if (installed) return;
    installed = true;
    var request = root.MediaNetwork.request;
    root.MediaNetwork.request = function (url, options) {
      var text = entries[url],
        stopped = false;
      if (typeof text === 'string')
        return {
          cancel: function () {
            stopped = true;
          },
          promise: Promise.resolve().then(function () {
            if (stopped) throw cancelled();
            return {
              data: text,
              url: url,
              method: 'memory',
              code: 200,
              mimeType: 'application/vnd.apple.mpegurl',
            };
          }),
        };
      if (/^https:\/\/ytx\.invalid(?:\/|$)/.test(url))
        return {
          cancel: function () {},
          promise: Promise.reject(Error('YouTube yayın listesi artık geçerli değil')),
        };
      if (options && !options.binary && mediaUrl(url)) {
        var copy = {};
        Object.keys(options).forEach(function (k) {
          copy[k] = options[k];
        });
        copy.byteLimit = 8 * 1024 * 1024;
        options = copy;
      }
      return request(url, options);
    };
  }
  function source(id, data, fetch) {
    var url = data && data.streamingData && data.streamingData.hlsManifestUrl;
    if (!/^[A-Za-z0-9_-]{11}$/.test(id) || !mediaUrl(url))
      return Promise.reject(Error('Bu YouTube videosunda uygun açık HLS kaynağı bulunamadı'));
    return (fetch || root.YoutubeNetwork.fetch)(url)
      .then(function (r) {
        if (!r.ok) throw Error('YouTube HLS HTTP ' + r.status);
        return r.text();
      })
      .then(function (body) {
        var filtered = filterMaster(body, url),
          key = 'https://ytx.invalid/' + ++serial + '/' + id + '/master.m3u8';
        if (filtered.text.length > 512 * 1024)
          throw Error('YouTube ana yayın listesi boyut sınırı');
        install();
        entries[key] = filtered.text;
        cacheBytes += filtered.text.length * 2;
        order.push(key);
        while (order.length > 32 || cacheBytes > 1024 * 1024) {
          var old = order.shift();
          cacheBytes -= entries[old].length * 2;
          delete entries[old];
        }
        return {
          id: 'youtube-' + id,
          label: 'YouTube · H.264/AAC',
          type: 'hls',
          playbackRequirements: { customLoader: true, requiredHeaders: [] },
          url: key,
          transport: 'xhr',
          referer: 'https://www.youtube.com/',
          seekMode: 'media-event',
          subtitles: [],
          youtubeId: id,
        };
      });
  }
  root.YoutubeHls = { source: source, filterMaster: filterMaster };
})(window);
