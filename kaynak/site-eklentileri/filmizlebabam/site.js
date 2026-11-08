/* Generated from canonical site sources; edit deneme/siteler, then rebuild. */
(function(shared){'use strict';if(!shared.SitePluginRuntime)throw Error('Update core component to 1.8.0 before installing this site.');var context=shared.FilmPlugins.context(),window=shared.SitePluginRuntime.scope(context,'1.8.0');

/* siteler/filmizlebabam/filmizlebabam-parser.js */
(function(root){'use strict';root.FilmizleBabamParser=root.CatalogSiteKit.createParser({id:'filmizlebabam',name:'Film İzle Babam',base:'https://filmizlebabam.icu',aliases:['https://www.filmizlebabam.com','https://filmizlebabam.com','http://www.filmizlebabam.com','http://filmizlebabam.com','https://www.filmizlebabam.icu','http://filmizlebabam.icu','http://www.filmizlebabam.icu'],movie:/^\/[a-z0-9-]+\/$/,series:/^\/dizi\/[a-z0-9-]+\/$/,episode:/^\/bolum\/[a-z0-9-]+\/$/,episodeNumbers:/-(\d+)-sezon-(\d+)-bolum\/$/,episodeLinks:'a.group[href*="/bolum/"]',cards:'a.group.block',title:'h3',year:'p',imdb:'.badge-rating',language:'.badge-language',description:'[itemprop="description"]',listPath:'/film-izle/',seriesPath:'/yabanci-dizi-izle/',optionsPath:'/kesfet',filterPath:'/kesfet',enrich:function(r,env){if(r.type!=='series')return;r.seasonLinks=[];Array.prototype.forEach.call(env.doc.querySelectorAll('a[href*="?sezon="]'),function(a){var u=root.FilmizleBabamParser.safe(a.getAttribute('href'),r.pageUrl),parsed=u&&new root.URL(u),m=parsed&&/^\?sezon=(\d+)$/.exec(parsed.search);if(parsed&&m&&parsed.pathname===new root.URL(r.pageUrl).pathname&&Number(m[1])>0&&Number(m[1])<=100&&!r.seasonLinks.some(function(x){return x.season===Number(m[1]);}))r.seasonLinks.push({season:Number(m[1]),url:u});});},fields:{},searchPath:'/ara?q='});})(window);


/* siteler/filmizlebabam/filmizlebabam-provider.js */
(function(root){
 'use strict';var P=root.FilmizleBabamParser,Provider=root.CatalogSiteKit.createProvider(P),detail=Provider.prototype.detail;
 Provider.prototype.detail=function(card,force){if(root.SiteAddresses)card=root.SiteAddresses.content(card);var self=this,token=self.generation;return detail.call(self,card,force).then(function(result){if(result.type!=='series')return result;var known={},links=result.seasonLinks||[];result.seasons.forEach(function(s){known[s]=true;});return Promise.all(links.filter(function(l){return !known[l.season];}).map(function(l){return self.fetch(l.url,function(body){return P.detail(body,card);},force,'season-'+l.season);})).then(function(seasons){if(token!==self.generation)throw new Error('İptal edildi');var seen={};result.episodes.concat.apply(result.episodes,seasons.map(function(s){return s.episodes;})).forEach(function(e){seen[e.contentId]=e;});result.episodes=Object.keys(seen).map(function(k){return seen[k];}).sort(function(a,b){return a.episode.season-b.episode.season||a.episode.number-b.episode.number;});result.seasons=[];result.episodes.forEach(function(e){if(result.seasons.indexOf(e.episode.season)<0)result.seasons.push(e.episode.season);});return result;});});};
 root.FilmizleBabamProvider=Provider;
})(window);


/* siteler/filmizlebabam/filmizlebabam-decoder.js */
(function (root) {
  'use strict';
  var D = root.WebPlayerData,
    U = root.CatalogUtils,
    HOST = 'https://pilavyerplay.top';
  function pilavyerOrigin(value) {
    var url = D.publicUrl(value),
      u = url && new root.URL(url);
    return u && !u.port && /^(?:play[1-9][0-9]{0,2}\.)?pilavyerplay\.top$/.test(u.hostname)
      ? u.origin
      : '';
  }
  function playerDocument(body) {
    // Keep only the declared core URL as inert data at its original DOM position.
    // D.doc removes every remaining script; no downloaded script is executed.
    return D.doc(
      body.replace(/<script\b([^>]*)>[\s\S]*?<\/script\s*>/gi, function (script, attrs) {
        var src = /(?:^|\s)src\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs),
          url = src && D.publicUrl(src[1] || src[2] || src[3], root.FilmizleBabamParser.base + '/'),
          parsed = url && new root.URL(url),
          origin = url && pilavyerOrigin(url);
        return origin && parsed.pathname === '/assets/js/core.js'
          ? '<span data-pilavyer-origin="' + origin + '"></span>'
          : script;
      })
    );
  }
  function entry(url) {
    var u = new root.URL(url);
    return {
      sourceId: 'filmizlebabam-' + u.hostname.split('.')[0] + '-' + u.pathname.split('/')[2],
      label: u.hostname === 'gasobni.com' ? 'Gasobni' : u.hostname === 'as9u7bgh9.com' ? 'AS9' : 'Vidara',
      kind: 'vidara',
      url: url,
    };
  }
  function alternatives(body) {
    var d = playerDocument(body),
      out = [];
    Array.prototype.forEach.call(d.querySelectorAll('[data-player] [data-pv]'), function (n) {
      var slug = n.getAttribute('data-pv'),
        player = n.parentNode,
        origins = [];
      if (!slug || !/^[A-Za-z0-9_-]{8,100}$/.test(slug)) return;
      while (player && !(player.hasAttribute && player.hasAttribute('data-player')))
        player = player.parentNode;
      if (player)
        Array.prototype.forEach.call(
          player.querySelectorAll('[data-pilavyer-origin]'),
          function (script) {
            var origin = pilavyerOrigin(script.getAttribute('data-pilavyer-origin'));
            if (origin && origins.indexOf(origin) < 0) origins.push(origin);
          }
        );
      if (origins.length > 1) throw D.fail('decode', 'Aktif Pilavyer sunucusu belirsiz.');
      var origin = origins[0] || HOST,
        server = origin === HOST ? '' : new root.URL(origin).hostname.split('.')[0];
      out.push({
        sourceId: 'filmizlebabam-pv-' + (server ? server + '-' : '') + slug,
        label:
          'Pilavyer' +
          (server ? ' (' + server.charAt(0).toUpperCase() + server.slice(1) + ')' : ''),
        kind: 'pilavyer',
        url: origin + '/assets/js/s.php?s=' + encodeURIComponent(slug),
      });
    });
    Array.prototype.forEach.call(
      d.querySelectorAll('[data-player] iframe[data-player-frame]'),
      function (frame) {
        var url = D.publicUrl(
          frame.getAttribute('data-frame-src') || frame.getAttribute('data-src'),
          root.FilmizleBabamParser.base + '/'
        );
        var parsed = url && new root.URL(url), ok = parsed && parsed.hostname === 'ok.ru' && /^\/videoembed\/\d+\/?$/.test(parsed.pathname);
        if (ok && !out.some(function (e) { return e.url === url; })) {
          out.push({ sourceId: 'filmizlebabam-ok-' + parsed.pathname.split('/')[2], label: 'OK.ru', kind: 'okru', url: url });
          return;
        }
        url = root.VidaraDecoder.host(url);
        if (
          url &&
          !out.some(function (e) {
            return e.url === url;
          })
        )
          out.push(entry(url));
      }
    );
    if (!out.length)
      throw D.fail('decode', 'Desteklenen aktif Pilavyer/Vidara/OK oynatıcısı bulunamadı.');
    return out;
  }
  function settings(body, embedUrl) {
    var origin = embedUrl ? pilavyerOrigin(embedUrl) : HOST;
    if (!origin || (embedUrl && new root.URL(embedUrl).pathname !== '/assets/js/s.php'))
      throw D.fail('decode', 'Geçersiz Pilavyer oynatıcı sunucusu.');
    var v = D.object(body, /\bwindow\.__PLAYER__\s*=\s*/),
      u = D.publicUrl(v.stream);
    if (
      !u ||
      new root.URL(u).origin !== origin ||
      new root.URL(u).pathname !== '/api/stream.php' ||
      root.CatalogSiteKit.param(u, 'v') !== v.v
    )
      throw D.fail('decode', 'Pilavyer medya kimliği eşleşmiyor.');
    // Observed valid encrypted Pilavyer fragments exceed the legacy 8 MiB limit.
    // This allowance is source-scoped; keys/playlists and other sites keep theirs.
    var result = { url: u, type: 'hls', subtitles: [], fragmentByteLimit: 12 * 1024 * 1024 };
    (Array.isArray(v.subs) ? v.subs : []).forEach(function (s, i) {
      var url = D.publicUrl(s.src);
      if (
        url &&
        new root.URL(url).origin === origin &&
        new root.URL(url).pathname === '/api/sub.php' &&
        root.CatalogSiteKit.param(url, 'v') === v.v
      )
        result.subtitles.push({
          id: 'pilav-sub-' + i,
          url: url,
          label: U.clean(s.label) || s.lang || 'Altyazı',
          language: s.lang || '',
          format: 'vtt',
        });
    });
    var b = v.sb;
    if (
      b &&
      b.count > 0 &&
      b.count <= 3600 &&
      b.cols > 0 &&
      b.cols <= 100 &&
      b.rows > 0 &&
      b.rows <= 100 &&
      b.tileW > 0 &&
      b.tileH > 0 &&
      b.cols * b.rows >= b.count &&
      b.interval > 0 &&
      b.cols * b.tileW <= 8192 &&
      b.rows * b.tileH <= 8192
    ) {
      var sprite = D.publicUrl(b.sprite);
      if (sprite && new root.URL(sprite).origin === origin)
        result.thumbnails = {
          type: 'grid',
          url: sprite,
          count: b.count,
          cols: b.cols,
          rows: b.rows,
          width: b.tileW,
          height: b.tileH,
          interval: b.interval,
        };
    }
    return result;
  }
  root.FilmizleBabamDecoder = {
    alternatives: alternatives,
    settings: settings,
    resolve: function (e, get, request, check, enqueue) {
      return get(e.url, e.pageUrl || root.FilmizleBabamParser.base + '/', 'embed').then(function (r) {
        if (e.kind === 'okru') { var ok = D.ok(r.body, e.url); ok.referer = e.url; return ok; }
        if (e.kind === 'vidara') {
          var config = root.VidaraDecoder.settings(r.body, e.url);
          if (config.mirror && enqueue) enqueue([entry(config.mirror)]);
          return request(
            config.api,
            e.url,
            'api',
            JSON.stringify({ filecode: config.filecode, device: 'web', codecs: [] }),
            { 'Content-Type': 'application/json' }
          ).then(function (response) {
            var data = root.VidaraDecoder.media(response.body, config.filecode);
            data.referer = config.referer;
            return data;
          });
        }
        var v = settings(r.body, e.url);
        v.referer = e.url;
        return v;
      });
    },
  };
})(window);


/* siteler/filmizlebabam/filmizlebabam-resolver.js */
(function(root){'use strict';root.FilmizleBabamSourceResolver=root.WebPlayerData.createResolver(root.FilmizleBabamParser,root.FilmizleBabamDecoder);})(window);


/* siteler/filmizlebabam/site.js */
(function(root){'use strict';var P=root.FilmizleBabamParser;root.SiteRegistry.register({id:P.config.id,name:P.config.name,base:P.base,mark:"BB",subtitle:"Film ve dizi arşivi",prefix:P.config.id+':',storagePrefix:'site.'+P.config.id+'.',contentTypes:['movie','series'],collectionKeys:['new'],posterBackground:'linear-gradient(145deg,#337d73,#172135)',Provider:root.FilmizleBabamProvider,Resolver:root.FilmizleBabamSourceResolver,ui:{movieRail:'Yeni filmler',seriesRail:'Diziler',filterHint:'Sitenin sunduğu alanlarla katalogda ara.',defaultOrder:'date'},collectionQuery:function(type){return {type:type,url:P.base+(type==='series'?P.config.seriesPath:P.config.listPath)};},filterFields:function(){return [];}});})(window);


})(window);
