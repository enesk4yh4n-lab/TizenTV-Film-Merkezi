/* R002: resolve the current public watch asset; no token is stored in the package. */
(function (root) {
  'use strict';
  var context = root.FilmPlugins.context(), BASE = 'https://puhutv.com';
  function page(v) { var u; try { u = new root.URL(v, BASE + '/'); } catch (e) { return ''; } return u.protocol === 'https:' && u.hostname === 'puhutv.com' && !u.username && !u.password && (!u.port || u.port === '443') ? u.href : ''; }
  function nextData(body) {
    var m = /<script\b[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i.exec(body || ''), p;
    if (!m) throw new Error('P002: izleme sayfası verisi bulunamadı.');
    try { p = JSON.parse(m[1]); } catch (e) { throw new Error('P002: izleme sayfası okunamadı.'); }
    return p.props && p.props.pageProps || {};
  }
  context.registerResolver({ create: function (ctx) {
    var client = ctx.createClient(), generation = 0;
    return {
      cancel: function () { generation++; client.cancel(); },
      resolve: function (input, deadline, notify) {
        var token = generation, asset;
        function check() { if (token !== generation) { var e = new Error('İptal edildi.'); e.cancelled = true; throw e; } if (Date.now() >= deadline) throw new Error('P002: kaynak çözümleme süresi doldu.'); }
        function get(address, json) {
          check(); return client.get(address, BASE + '/', {}, { deadline: deadline, timeoutMs: 15000 }).then(function (r) { check(); if (!json) return r; try { return JSON.parse(r.body); } catch (e) { throw new Error('P002: yayın bilgisi okunamadı.'); } });
        }
        var address = page(input.watchPageUrl || input.pageUrl);
        if (!address) return Promise.reject(new Error('P002: izleme bağlantısı geçersiz.'));
        return get(address).then(function (r) {
          var p = nextData(r.body);
          if (p.movieAssets && p.movieAssets.data) return p;
          var d = (p.details || {}).data, next = d && page(d.to_watch_asset_slug);
          if (!next || next === address) throw new Error('P002: oynatılabilir video kaydı bulunamadı.');
          return get(next).then(function (v) { return nextData(v.body); });
        }).then(function (p) {
          asset = p.movieAssets && p.movieAssets.data;
          if (!asset || !/^(asset_movie|asset_episode)$/.test(asset.type || '') || !/^PUHU_[A-Za-z0-9_-]+$/.test(asset.video_id || '')) throw new Error('P002: film veya bölüm video kimliği bulunamadı.');
          if (input.type === 'episode' && input.episode && Number(asset.meta && asset.meta.episode_number) !== Number(input.episode.number)) throw new Error('P002: bölüm kimliği seçilen bölümle eşleşmiyor.');
          if (input.type === 'episode' && input.episode && Number(asset.meta && asset.meta.season_number) !== Number(input.episode.season)) throw new Error('P002: sezon kimliği seçilen sezonla eşleşmiyor.');
          if (input.episode && /^p002:series:/.test(input.episode.seriesId || '') && input.episode.seriesId !== 'p002:series:' + (p.watchDetails && p.watchDetails.data && p.watchDetails.data.id)) throw new Error('P002: dizi kimliği seçilen içerikle eşleşmiyor.');
          // This client-visible identifier is the official web player's public
          // API parameter, not a Film Merkezi private credential.
          return get('https://dygvideo.dygdigital.com/api/video_info?akamai=true&PublisherId=29&ReferenceId=' + encodeURIComponent(asset.video_id) + '&SecretKey=' + encodeURIComponent('NtvApiSecret2014*'), true);
        }).then(function (reply) {
          if (!reply.success || !reply.data) throw new Error('P002: yayın bu bağlantı veya bölgede kullanılamıyor.');
          var d = reply.data;
          if (d.drm || d.is_drm || d.drm_license_url) throw new Error('P002: bu yayın DRM destekli bir oynatıcı gerektiriyor.');
          var media = d.flavors && d.flavors.hls;
          if (typeof media !== 'string' || !/^https:\/\//i.test(media)) throw new Error('P002: geçerli HLS bağlantısı verilmedi.');
          return get(media).then(function (r) {
            if (!/^\s*#EXTM3U/.test(r.body)) throw new Error('P002: medya yanıtı bir HLS listesi değil.');
            if (/KEYFORMAT\s*=\s*"[^"]*(?:widevine|playready)|METHOD=SAMPLE-AES/i.test(r.body)) throw new Error('P002: bu yayın DRM destekli bir oynatıcı gerektiriyor.');
            // Use the normal HLS/HTML5 route. Emulator-specific native playback
            // must not override the working pipeline on physical Tizen 3 TVs.
            var source = { id: 'r002-hls', label: 'Puhutv', type: 'hls', url: media, referer: BASE + '/', packageKey: ctx.key, status: 'ready', playlist: true, transport: 'native', subtitles: [] };
            (d.tracks || []).forEach(function (t) { if (t && /^https:\/\//i.test(t.file || t.url || t.src || '') && /^(subtitles|captions)$/i.test(t.kind || '')) source.subtitles.push({ id: 'r002-sub-' + source.subtitles.length, url: t.file || t.url || t.src, label: t.label || t.language || '', lang: t.srclang || t.language || '' }); });
            check(); var result = [source]; if (notify) notify(result); return result;
          });
        });
      }
    };
  } });
})(window);
