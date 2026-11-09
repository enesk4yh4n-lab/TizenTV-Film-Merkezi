/* Generated ES5 provider module. */
(function(shared){'use strict';if(!shared.SitePluginRuntime)throw Error('Update core component to 1.11.1 before installing this module.');var context=shared.FilmPlugins.context(),window=shared.SitePluginRuntime.scope(context,'1.11.1');
var register=window.SiteRegistry.register;window.SiteRegistry.register=function(site){site.name='P012';site.subtitle='P012';site.mark='P012';register(site);};

/* saglayicilar/p012/decoder.js */
/* Literal active player configuration; never executes DDizi, JW or YouTube scripts. */
(function(root){
 'use strict';var U=root.CatalogUtils;
 function fail(message,stage){var e=new Error('DDizi · '+message);e.stage=stage||'decode';return e;}
 function doc(body){if(typeof body!=='string'||body.length>2*1024*1024)throw fail('Oynatıcı yanıtı sınırı aşıldı.');var html=body.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'').replace(/\ssrc\s*=/gi,' data-frame-src=').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,'');return new DOMParser().parseFromString(html,'text/html');}
 /* Tizen3 URL has no searchParams until an optional runtime adds it. */
 function parameter(u,key){var list=u.search.replace(/^\?/,'').split('&'),i,at;for(i=0;i<list.length;i++){at=list[i].indexOf('=');if(decodeURIComponent((at<0?list[i]:list[i].slice(0,at)).replace(/\+/g,' '))===key)return decodeURIComponent((at<0?'':list[i].slice(at+1)).replace(/\+/g,' '));}return '';}
 function youtube(value,page){try{var u=new root.URL(value,page),id;if(u.protocol!=='https:'||u.username||u.password||!/^(?:www\.)?youtube(?:-nocookie)?\.com$/.test(u.hostname))return null;id=u.pathname==='/watch'?parameter(u,'v'):(/^\/embed\/([A-Za-z0-9_-]{11})(?:\/|$)/.exec(u.pathname)||[])[1];return /^[A-Za-z0-9_-]{11}$/.test(id||'')?{type:'youtube',videoId:id,url:'https://www.youtube.com/watch?v='+id,referer:page,subtitles:[]}:null;}catch(ignore){return null;}}
 function allowed(value){try{var u=new root.URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&/^www\.ddizi\.(?:tel|re)$/.test(u.hostname)&&(/^\/player\/oynat\/[a-f0-9]{32}$/.test(u.pathname)||u.pathname==='/player/youtube.php'&&/^[A-Za-z0-9_-]{11}$/.test(parameter(u,'id'))||u.pathname==='/player/telif/index.php'&&!!youtube(parameter(u,'id'),u.href));}catch(ignore){return false;}}
 function frame(body,page){var d=doc(body),node=d.querySelector('.video-g iframe')||d.querySelector('iframe'),url=U.url(node&&node.getAttribute('data-frame-src'),page);if(!allowed(url)&&!youtube(url,page))throw fail('Desteklenen aktif oynatıcı bulunamadı.');return url;}
 function alternatives(body,page){var d=doc(body),out=[];Array.prototype.forEach.call(d.querySelectorAll('.parts a'),function(a){var url=a.getAttribute('href')?root.DdiziParser.episodeUrl(U.url(a.getAttribute('href'),page)):a.className==='active'?page:'',label=U.clean(a.textContent);if(!url||!label||root.DdiziParser.canonical(url)!==root.DdiziParser.canonical(page)||out.some(function(v){return v.url===url;}))return;out.push({url:url,label:label});});return out.length?out:[{url:page,label:'Kaynak 1'}];}
 function stream(body,page){
  var d=doc(body),frame=d.querySelector('iframe[data-frame-src*="youtube.com/embed/"],iframe[data-frame-src*="youtube-nocookie.com/embed/"]'),link=d.querySelector('a.div[href]'),yt;
  if(frame){yt=youtube(U.url(frame.getAttribute('data-frame-src'),page),page);if(!yt)throw fail('Geçersiz YouTube oynatıcı bağlantısı.');return yt;}
  /* Observed DDizi click-through page contains a single official video link, no JW setup. */
  if(link&&/Diziyi izlemek i\S*in t\S*klay\S*n/i.test(U.clean(link.textContent))){yt=youtube(U.url(link.getAttribute('href'),page),page);if(yt)return yt;throw fail('Bu sayfa desteklenmeyen bir dış oynatıcıya yönlendiriyor.','unsupported');}
  if(/<title[^>]*>\s*(?:Just a moment|Attention Required|Access Denied)|cf\x2dbrowser\x2dverification|cf\x2dmitigated/i.test(body))throw fail('Oynatıcı sayfasına erişim engellendi.','access');
  if(/<title[^>]*>\s*404\s+Not Found|<h1[^>]*>\s*404\s*<\/h1>/i.test(body))throw fail('Oynatıcı sayfası video yerine 404 yanıtı döndürdü; kaynak erişimi doğrulanamadı.','access');
  var setup=/\bvar\s+player\s*=\s*jwplayer\(\s*['"]player['"]\s*\)\s*;\s*player\.setup\(\s*\{/.exec(body);if(!setup){if(d.querySelector('iframe'))throw fail('Bu sayfa JW yerine farklı bir dış oynatıcı döndürdü.','unsupported');throw fail('Bu yanıtta JW medya ayarları yok; kaynak sayfası değişmiş veya kullanılamıyor olabilir.');}
  var tail=body.slice(setup.index+setup[0].length),m=/\bsources\s*:\s*\[\s*\{\s*file\s*:\s*("(?:\\.|[^"\\\r\n])*")\s*,\s*label\s*:\s*"[^"\r\n]*"\s*,\s*type\s*:\s*"(hls|mp4)"/.exec(tail);if(!m)throw fail('Aktif medya verisi okunamadı.');
  var raw;try{raw=JSON.parse(m[1]);}catch(ignore){throw fail('Medya adresi okunamadı.');}var url=U.url(raw,page),u;try{u=new root.URL(url);}catch(ignore2){throw fail('Geçersiz medya adresi.');}
  if(u.protocol!=='https:'||u.username||u.password||!(/^(?:video\.twimg\.com|streambox\.xyz|eu1\.tabii\.com|puhu-p3\.mncdn\.com)$/.test(u.hostname)||/(^|\.)googlevideo\.com$/.test(u.hostname)))throw fail('Desteklenmeyen medya sunucusu: '+(u.hostname||'bilinmiyor')+'.','unsupported');
  var noRef=!!d.querySelector('meta[name="referrer"][content="no-referrer"]');return {url:url,type:m[2],referer:noRef?'':page,subtitles:[]};
 }root.DdiziDecoder={allowed:allowed,frame:frame,alternatives:alternatives,stream:stream,youtube:youtube};
})(window);


/* saglayicilar/p012/network.js */
/* P012 owns request lifetime; signed native TLS is supplied by the common client. */
(function (root) {
  'use strict';
  root.DdiziNetwork = { createClient: function (options) { return root.ChainNetwork.createClient(options || {}); } };
})(window);


/* saglayicilar/p012/parser.js */
/* DDizi catalog data only. Remote markup is never inserted into the application. */
(function(root){
 'use strict';var U=root.CatalogUtils,BASE=(root.SiteAddresses ? root.SiteAddresses.base('ddizi', 'https://www.ddizi.tel') : 'https://www.ddizi.tel');
 function text(node,selector){var n=node&&(selector?node.querySelector(selector):node);return U.clean(n&&n.textContent);}
 function safe(value,page){var url=U.url(value,page||BASE+'/');try{var u=new root.URL(url);return u.origin===BASE&&!u.username&&!u.password?url:'';}catch(ignore){return '';}}
 function seriesUrl(value){var u=safe(value),p=u&&new root.URL(u);return p&&!p.search&&/^\/diziler\/\d+\/[a-z0-9.-]+(?:\/sayfa-\d+)?$/.test(p.pathname)?u:'';}
 function episodeUrl(value){var u=safe(value),p=u&&new root.URL(u);return p&&!p.search&&/^\/izle\/\d+\/[a-z0-9.-]+\.htm(?:\/[1-9]\d*)?$/.test(p.pathname)?u:'';}
 function canonical(value){return value.replace(/\/sayfa-\d+$/,'').replace(/(\.htm)\/\d+$/,'$1');}
 function id(value){var m=/\/(diziler|izle)\/(\d+)\//.exec(value);return m?'ddizi:'+(m[1]==='diziler'?'series:':'entry:')+m[2]:'';}
 function img(node,page){var n=node&&node.querySelector('img');return U.url(n&&(n.getAttribute('data-src')||n.getAttribute('data-catalog-src')),page||BASE+'/');}
 function unique(values,key){var seen={};return values.filter(function(v){var k=v[key||'contentId'];if(!k||seen[k])return false;seen[k]=true;return true;});}
 function card(a,page){var u=safe(a.getAttribute('href'),page),title=text(a).replace(/\s+izle$/i,'');if(!seriesUrl(u)&&!episodeUrl(u)||!title)return null;return {contentId:id(u),providerId:'ddizi',type:'series',pageUrl:canonical(u),title:title,poster:img(a,page),language:''};}
 function cards(doc,page){var out=[];Array.prototype.forEach.call(doc.querySelectorAll('.content_ .dizi-boxpost > a,.content_ .dizi-boxpost-cat > a,#ortaicerik .dizi-boxpost > a,.dizi-boxpost > a,.dizi-boxpost-cat > a'),function(a){var c=card(a,page);if(c)out.push(c);});return unique(out);}
 function navCards(doc){var out=[];Array.prototype.forEach.call(doc.querySelectorAll('a[href*="/diziler/"]'),function(a){var c=card(a,BASE+'/');if(c)out.push(c);});return unique(out);}
 function home(body){var d=U.envelope(body).doc,latest=cards(d,BASE+'/'),nav=navCards(d);if(!latest.length&&!nav.length)throw new Error('DDizi katalog biçimi tanınamadı.');return {hero:latest[0]||nav[0],movies:[],series:latest,links:{new:BASE+'/',recommended:BASE+'/yabanci-dizi-izle',liked:BASE+'/eski.diziler'},index:nav};}
 function nextPage(doc,page){
  var u=new root.URL(page),current=/\/sayfa-(\d+)$/.exec(u.pathname),isSeries=!!seriesUrl(page),rootPath=isSeries?canonical(page):u.pathname.replace(/\/\d+$/,''),n=current?Number(current[1]):/\/\d+$/.test(u.pathname)?Number(u.pathname.split('/').pop())-1:0,next=null,best=Infinity;
  Array.prototype.forEach.call(doc.querySelectorAll('.pagination a[href]'),function(a){var link=safe(a.getAttribute('href'),page),m=link&&(isSeries?/\/sayfa-(\d+)$/.exec(link):/\/(\d+)$/.exec(link));if(!m)return;var number=Number(m[1])-(isSeries?0:1),path=isSeries?canonical(link):new root.URL(link).pathname.replace(/\/\d+$/,'');if(path===rootPath&&number>n&&number<best){best=number;next={kind:'url',url:link};}});return next;
 }
 function list(body,page,cursor){if(root.SiteAddresses)page=root.SiteAddresses.resolve(page);var d=U.envelope(body).doc,out={cards:cards(d,page),next:nextPage(d,page)};
  if(page===BASE+'/'||page.indexOf(BASE+'/')===0&&/^\/l\.php\?sayfa=\d+$/.test(page.slice(BASE.length))){
   var max=cursor&&cursor.max||0;Array.prototype.forEach.call(d.querySelectorAll('#listele a[rel]'),function(a){var n=Number(a.getAttribute('rel'));if(n>max&&n<=1000)max=n;});var m=/[?&]sayfa=(\d+)/.exec(page),number=m?Number(m[1]):1;out.next=out.cards.length&&number<max?{kind:'ddizi-recent',url:BASE+'/l.php?sayfa='+(number+1),max:max}:null;
  }return out;
 }
 function search(body){var d=U.envelope(body).doc,heading=text(d,'.content_ .breadcrumbX');if(!/arama/i.test(heading))throw new Error('DDizi arama yanıtı okunamadı.');return {cards:cards(d,BASE+'/arama/'),next:nextPage(d,BASE+'/arama/')};}
 function meta(body,page){var env=U.envelope(body),d=env.doc,schema=env.schema.filter(function(s){return s['@type']==='TVEpisode';})[0],a=d.querySelector('.breadcrumbX a[href*="/diziler/"]'),series=a&&seriesUrl(a.getAttribute('href')),h=d.querySelector('.dizi_content h1');if(!h||!series)throw new Error('DDizi bölüm biçimi tanınamadı.');var language='',dub=false,sub=false;Array.prototype.forEach.call(d.querySelectorAll('.parts a'),function(n){var f=U.languageBadges(text(n));dub=dub||f.dubbed;sub=sub||f.subtitled;});language=dub&&sub?'Dublaj & Altyazılı':dub?'Türkçe Dublaj':sub?'Türkçe Altyazılı':'';
  return {title:text(a),seriesPageUrl:canonical(series),episodePageUrl:canonical(page),episodeTitle:text(h).replace(/\s+izle$/i,''),poster:U.url(schema&&schema.image,BASE+'/'),description:U.clean(schema&&schema.description),language:language};
 }
 function episodeLinks(doc,detail){var out=[];Array.prototype.forEach.call(doc.querySelectorAll('.content_ .dizi-boxpost-cat > a'),function(a){var page=episodeUrl(a.getAttribute('href')),title=text(a),m=/(?:([1-9]\d*)\s*\.\s*Sezon\s*)?([1-9]\d*)\s*\.\s*Bölüm/i.exec(title);if(!page||!m)return;var s=Number(m[1])||1,n=Number(m[2]);out.push({contentId:detail.contentId+':s'+s+':e'+n,providerId:'ddizi',type:'episode',pageUrl:canonical(page),title:detail.title+' · '+s+'×'+n,episodeTitle:title,poster:detail.poster||img(a),seriesTitle:detail.title,seriesPageUrl:detail.pageUrl,episode:{seriesId:detail.contentId,season:s,number:n},sources:[],subtitles:[]});});return unique(out);}
 function detail(body,card){var d=U.envelope(body).doc,crumb=d.querySelector('.content_ .breadcrumbX li:last-child'),title=text(crumb).replace(/\s+son bölüm izle$/i,''),r=root.PlayerCore.copy(card);if(!seriesUrl(card.pageUrl)||!title||!d.querySelector('.content_ .dizi-boxpost-cat'))throw new Error('DDizi dizi biçimi tanınamadı.');r.type='series';r.pageUrl=canonical(card.pageUrl);r.contentId=id(r.pageUrl);r.title=title;r.description='';r.poster=img(d.querySelector('.content_ .dizi-boxpost-cat'))||card.poster||'';r.genres=[];r.cast=[];r.sources=[];r.subtitles=[];r.seasons=[];r.episodes=episodeLinks(d,r);r.next=nextPage(d,card.pageUrl);return r;}
 function episodes(body,detail,page){var d=U.envelope(body).doc;return {episodes:episodeLinks(d,detail),next:nextPage(d,page)};}
 function firstAirYear(body,page,parent){var env=U.envelope(body,true),m=null;env.schema.forEach(function(s){if(s['@type']!=='TVEpisode'||canonical(U.url(s.url,page))!==canonical(page)||!(Number(s.episodeNumber)===1||/(?:^|\s)1\.?\s*B[öo]l[üu]m(?:\s|$)/i.test(U.clean(s.episodeNumber))))return;var found=/(?:^|\s)\d{1,2}\s+(?:Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+((?:19|20)\d{2})\s+tarihli\b/i.exec(U.clean(s.description));if(found)m=Number(found[1]);});if(!m||meta(body,page).seriesPageUrl!==parent)return null;return m;}
 function oldestPage(body,page){var d=U.envelope(body).doc,last='',number=-1;Array.prototype.forEach.call(d.querySelectorAll('.pagination a[href]'),function(a){var link=safe(a.getAttribute('href'),page),m=link&&/\/sayfa-(\d+)$/.exec(link);if(m&&canonical(link)===canonical(page)&&Number(m[1])>number){number=Number(m[1]);last=link;}});return last&&last!==page?last:'';}
 root.DdiziParser={base:BASE,safe:safe,seriesUrl:seriesUrl,episodeUrl:episodeUrl,canonical:canonical,id:id,unique:unique,home:home,list:list,search:search,detail:detail,meta:meta,episodes:episodes,firstAirYear:firstAirYear,oldestPage:oldestPage};
})(window);


/* saglayicilar/p012/provider.js */
(function (root) {
  'use strict';
  var P = root.DdiziParser,
    BASE = P.base;
  function Provider(cache, network) {
    root.CatalogClient.call(
      this,
      cache,
      network || root.ChainNetwork.createClient({ destination: 'downloads' }),
      {
        base: BASE,
        headers: { Accept: 'text/html', 'User-Agent': 'Mozilla/5.0' },
        postHeaders: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }
      }
    );
    this.links = {};
  }
  Provider.prototype = Object.create(root.CatalogClient.prototype);
  Provider.prototype.constructor = Provider;
  Provider.prototype.fetch = function (url, parse, force, scope, body) {
    if (!P.safe(url)) return Promise.reject(new Error('DDizi dışı katalog bağlantısı reddedildi.'));
    var self = this,
      token = this.generation;
    return this.request(url, body || null, parse, force, 'ddizi0100-' + scope).catch(function (e) {
      if (
        body ||
        token !== self.generation ||
        /403|429|ptal|engeli|Dogrulama/.test(e.message) ||
        !/Native|XHR|HTTP 5\d\d|zaman|TLS/.test(e.message) ||
        (self.deadline && self.deadline - Date.now() < 11000)
      )
        throw e;
      return self.request(url, null, parse, true, 'ddizi0100-' + scope);
    });
  };
  Provider.prototype.home = function (force) {
    var self = this;
    return this.fetch(BASE + '/', P.home, force, 'home').then(function (data) {
      self.links = data.links;
      return data;
    });
  };
  Provider.prototype.options = function () {
    return Promise.resolve({});
  };
  Provider.prototype.list = function (query, next, force) {
    query = query || {};
    var f = query.filters || {},
      url = (next && next.url) || query.url || BASE + '/';
    url = P.safe(url);
    if (query.type === 'movie') return Promise.resolve({ cards: [], next: null });
    if (
      Object.keys(f).some(function (k) {
        return !!f[k];
      }) ||
      (query.order && query.order !== 'date')
    )
      return Promise.reject(new Error('DDizi bu filtreyi desteklemiyor.'));
    if (
      !url || !/^\/(?:|yabanci-dizi-izle|eski\.diziler(?:\/\d+)?|l\.php\?sayfa=[1-9]\d*)$/.test(
        url.slice(BASE.length)
      )
    )
      return Promise.reject(new Error('Geçersiz DDizi liste bağlantısı.'));
    if (next && next.kind === 'ddizi-recent' && (!(next.max >= 2) || next.max > 1000))
      return Promise.reject(new Error('Geçersiz DDizi devam sayfası.'));
    return this.fetch(
      url,
      function (body) {
        return P.list(body, url, next);
      },
      force,
      'list'
    );
  };
  Provider.prototype.search = function (query, force) {
    query = root.CatalogUtils.clean(query);
    if (!query || query.length > 100)
      return Promise.reject(new Error('Arama 1–100 karakter olmalı.'));
    var self = this,
      token = this.generation;
    return this.fetch(
      BASE + '/arama/',
      P.search,
      force,
      'search-v2',
      'arama=' + encodeURIComponent(query)
    ).catch(function (e) {
      if (token !== self.generation || /ptal/.test(e.message)) throw e;
      return self.fetch(BASE + '/', P.home, false, 'home').then(function (home) {
        if (token !== self.generation) throw new Error('İptal edildi');
        var values = home.index.concat(home.series),
          items = (self.cache.data && self.cache.data.items) || {};
        Object.keys(items).forEach(function (k) {
          if (k.indexOf('ddizi0100-') !== 0) return;
          var v = items[k].value || {};
          values = values.concat(v.cards || [], v.index || [], v.series || []);
        });
        function key(s) {
          return root.CatalogUtils.clean(s)
            .toLowerCase()
            .replace(/ı/g, 'i')
            .replace(/İ/g, 'i')
            .replace(/\u0307/g, '')
            .replace(/[çğıöşü]/g, function (c) {
              return { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' }[c];
            });
        }
        var q = key(query);
        return {
          cards: P.unique(values).filter(function (c) {
            return key(c.title).indexOf(q) >= 0;
          }),
          next: null,
          searchNotice:
            'Sitenin aramasına ulaşılamadı. Site menüsünde ve bu TV’de yüklenen katalogda arandı; diğer eski diziler için arşiv sekmesini kullanabilirsiniz.'
        };
      });
    });
  };
  Provider.prototype.seriesDetail = function (card, force) {
    var self = this,
      token = this.generation;
    return this.fetch(
      card.pageUrl,
      function (body) {
        return P.detail(body, card);
      },
      force,
      'series'
    ).then(function (detail) {
      var seen = {},
        pages = 0;
      seen[card.pageUrl] = true;
      function more(next) {
        if (token !== self.generation) throw new Error('İptal edildi');
        if (!next) return Promise.resolve();
        if (++pages > 50 || seen[next.url] || P.canonical(next.url) !== detail.pageUrl)
          throw new Error('Dizi sayfalaması doğrulanamadı.');
        seen[next.url] = true;
        return self
          .fetch(
            next.url,
            function (body) {
              return P.episodes(body, detail, next.url);
            },
            force,
            'episodes'
          )
          .then(function (data) {
            if (token !== self.generation) throw new Error('İptal edildi');
            detail.episodes = detail.episodes.concat(data.episodes);
            return more(data.next);
          });
      }
      return more(detail.next).then(function () {
        delete detail.next;
        detail.episodes = P.unique(detail.episodes).sort(function (a, b) {
          return a.episode.season - b.episode.season || a.episode.number - b.episode.number;
        });
        detail.seasons = detail.episodes
          .map(function (e) {
            return e.episode.season;
          })
          .filter(function (n, i, a) {
            return a.indexOf(n) === i;
          });
        if (!detail.episodes.length) throw new Error('Dizi bölüm bağlantıları alınamadı.');
        return detail;
      });
    });
  };
  /* Resolve a recent-episode card to its real parent without enumerating every archive page. */
  Provider.prototype.identity = function (card, force) {if(root.SiteAddresses)card=root.SiteAddresses.content(card);
    var self = this,
      token = this.generation,
      start = P.seriesUrl(card.pageUrl)
        ? Promise.resolve(card)
        : this.fetch(
            card.pageUrl,
            function (body) {
              var m = P.meta(body, card.pageUrl);
              return {
                contentId: P.id(m.seriesPageUrl),
                providerId: 'ddizi',
                type: 'series',
                pageUrl: m.seriesPageUrl,
                title: m.title,
                poster: m.poster,
                selectedEpisodePageUrl: m.episodePageUrl,
                legacyContentIds: [card.contentId]
              };
            },
            force,
            'identity0172-parent'
          );
    return start
      .then(function (parent) {
        if (token !== self.generation) throw new Error('İptal edildi');
        return self
          .fetch(
            parent.pageUrl,
            function (body) {
              var detail = P.detail(body, parent);
              detail.identityOldestPage = P.oldestPage(body, parent.pageUrl);
              return detail;
            },
            force,
            'identity0172-series'
          )
          .then(function (value) {
            var d = root.PlayerCore.copy(value);
            if (parent.legacyContentIds) d.legacyContentIds = parent.legacyContentIds.slice();
            if (parent.selectedEpisodePageUrl)
              d.selectedEpisodePageUrl = parent.selectedEpisodePageUrl;
            return d;
          });
      })
      .then(function (d) {
        if (token !== self.generation) throw new Error('İptal edildi');
        if (d.episodes.some(function (e) { return e.episode.season === 1 && e.episode.number === 1; }) || !d.identityOldestPage) return d;
        return self.fetch(d.identityOldestPage,function (body) { return P.episodes(body,d,d.identityOldestPage); },force,'identity-first-page').then(function (value) {
          if (token !== self.generation) throw new Error('İptal edildi');
          d.episodes = d.episodes.concat(value.episodes);
          return d;
        },function (e) { if(token !== self.generation) throw e; return d; });
      })
      .then(function (d) {
        if (token !== self.generation) throw new Error('İptal edildi');
        var first = d.episodes.filter(function (e) {
          return e.episode.season === 1 && e.episode.number === 1;
        })[0];
        d.episodes = [];
        delete d.next;
        delete d.identityOldestPage;
        d.identityEvidence = {version:2,pageUrl:d.pageUrl,title:d.title,type:'series',typeVerified:true,detailChecked:true};
        if (!first) return d;
        return self
          .fetch(
            first.pageUrl,
            function (body) {
              return { yearHint: P.firstAirYear(body, first.pageUrl, d.pageUrl) };
            },
            force,
            'identity0172-airdate'
          )
          .then(
            function (value) {
              if (token !== self.generation) throw new Error('İptal edildi');
              if (value.yearHint) {
                d.yearHint = value.yearHint;
                d.identityEvidence = {
                  version: 2,
                  pageUrl: d.pageUrl,
                  type: 'series',
                  typeVerified: true,
                  year: value.yearHint,
                  yearVerified: true,
                  detailChecked: true,
                  referencePageUrl: first.pageUrl,
                  verificationReason: 'first-episode-airdate'
                };
              }
              return d;
            },
            function (e) {
              if (token !== self.generation) throw e;
              return d;
            }
          );
      });
  };
  Provider.prototype.detail = function (card, force) {if(root.SiteAddresses)card=root.SiteAddresses.content(card);
    var self = this,
      token = this.generation;
    if (P.seriesUrl(card.pageUrl))
      return this.seriesDetail(card, force).then(function (value) {
        var d = root.PlayerCore.copy(value);
        if (card.selectedEpisodePageUrl) {
          var e = d.episodes.filter(function (v) {
            return v.pageUrl === card.selectedEpisodePageUrl;
          })[0];
          if (e) d.selectedEpisodeId = e.contentId;
        }
        return d;
      });
    if (!P.episodeUrl(card.pageUrl))
      return Promise.reject(new Error('Geçersiz dizi/bölüm bağlantısı.'));
    return this.fetch(
      card.pageUrl,
      function (body) {
        return P.meta(body, card.pageUrl);
      },
      force,
      'episode-detail'
    ).then(function (meta) {
      if (token !== self.generation) throw new Error('İptal edildi');
      return self
        .seriesDetail(
          {
            contentId: P.id(meta.seriesPageUrl),
            providerId: 'ddizi',
            type: 'series',
            title: meta.title,
            pageUrl: meta.seriesPageUrl,
            poster: meta.poster
          },
          force
        )
        .then(function (detail) {
          if (token !== self.generation) throw new Error('İptal edildi');
          detail.description = meta.description;
          detail.poster = meta.poster || detail.poster;
          detail.language = meta.language;
          var selected = detail.episodes.filter(function (e) {
            return e.pageUrl === meta.episodePageUrl;
          })[0];
          if (!selected) throw new Error('Seçilen bölüm dizi listesinde bulunamadı.');
          detail.selectedEpisodeId = selected.contentId;
          detail.episodes.forEach(function (e) {
            e.poster = detail.poster;
          });
          return detail;
        });
    });
  };
  Provider.prototype.seriesLanguage = function (card) {if(root.SiteAddresses)card=root.SiteAddresses.content(card);
    var self = this;
    if (card.language) return Promise.resolve({ language: card.language, languageReference: card.languageReference });
    if (!P.episodeUrl(card.pageUrl)) {
      var token = this.generation;
      return this.detail(card).then(function (detail) {
        if (token !== self.generation) throw new Error('İptal edildi');
        var first = detail.episodes && detail.episodes[0];
        return first && P.episodeUrl(first.pageUrl) ? self.seriesLanguage(first) : { language: '' };
      });
    }
    return this.fetch(
      card.pageUrl,
      function (body) {
        var m = P.meta(body, card.pageUrl);
        return {
          language: m.language,
          languageReference: { pageUrl: card.pageUrl, checkedAt: Date.now() }
        };
      },
      false,
      'language'
    );
  };
  root.DdiziProvider = Provider;
})(window);


/* saglayicilar/p012/resolver.js */
(function (root) {
  'use strict';
  var P = root.DdiziParser,
    D = root.DdiziDecoder;
  function fail(stage, message) {
    var e = new Error('DDizi · ' + message);
    e.stage = stage;
    return e;
  }
  function Resolver(log, now) {
    this.log = log || function () {};
    this.now = now || Date.now;
    this.generation = 0;
    this.clients = [];
  }
  Resolver.prototype.cancel = function () {
    this.generation++;
    this.clients.forEach(function (c) {
      c.cancel();
    });
    this.clients = [];
  };
  Resolver.prototype.resolve = function (content, deadline, onProgress, hints) {
    this.cancel();
    var self = this,
      token = this.generation,
      options = [],
      sources = [],
      last,
      progress = root.SourceProgress && new root.SourceProgress(onProgress, hints);
    function publish() {
      if (progress) progress.publish(sources, options);
    }
    if (!P.episodeUrl(content.pageUrl))
      return Promise.reject(fail('page', 'Geçersiz DDizi bölüm sayfası.'));
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
    function get(url, ref, stage, retried) {
      check();
      var client = (root.DdiziNetwork || root.ChainNetwork).createClient({
        destination: 'downloads',
        deadline: deadline,
      });
      if (progress && progress.client) client = progress.client(client, check, deadline);
      self.clients.push(client);
      function release() {
        var i = self.clients.indexOf(client);
        if (i >= 0) self.clients.splice(i, 1);
      }
      return client.get(url, ref, { 'User-Agent': 'Mozilla/5.0' }).then(
        function (r) {
          release();
          check();
          self.log('DDizi: ' + stage + ' / ' + r.method);
          return r;
        },
        function (e) {
          release();
          check();
          if (
            !retried &&
            !/403|429|engeli|Dogrulama/.test(e.message) &&
            (e.stage === 'timeout' || /Native|XHR|zaman|HTTP 5\d\d/.test(e.message)) &&
            deadline - self.now() > 12000
          )
            return get(url, ref, stage, true);
          e.requestStage = stage;
          e.stage = e.stage || stage;
          throw e;
        }
      );
    }
    return get(content.pageUrl, P.base + '/', 'page')
      .then(function (first) {
        var list = D.alternatives(first.body, content.pageUrl),
          index = 0;
        list.forEach(function (a, i) {
          options.push({
            sourceId: 'ddizi-' + i,
            label: a.label,
            pageUrl: a.url,
            status: 'pending',
            stage: '',
            detail: '',
          });
        });
        var queue = list.map(function (a, i) {
          return { alternative: a, index: i };
        });
        publish();
        if (progress)
          queue = progress.order(queue, function (entry) {
            return {
              id: options[entry.index].sourceId,
              label: entry.alternative.label,
              type: 'hls',
              stability: { autoPriority: /Dublaj/i.test(entry.alternative.label) ? 0 : 1 },
            };
          });
        function worker() {
          check();
          if (!queue.length) return Promise.resolve();
          return (progress ? progress.wait(check) : Promise.resolve().then(check))
            .then(function () {
              var entry = queue.shift();
              if (!entry) return;
              var i = entry.index,
                a = entry.alternative,
                option = options[i];
              return (
                a.url === content.pageUrl
                  ? Promise.resolve(first)
                  : get(a.url, content.pageUrl, 'page')
              )
                .then(function (page) {
                  var embed = D.frame(page.body, a.url), direct = D.youtube ? D.youtube(embed, a.url) : null;
                  return (direct ? Promise.resolve(page) : get(embed, a.url, 'embed')).then(function (response) {
                    var data = direct || D.stream(response.body, embed);
                    if (data.type === 'youtube') {
                      if (!root.YoutubeSource)
                        throw fail('unsupported', 'YouTube çözümleyici modülü pakette bulunamadı.');
                      var youtubeTask = root.YoutubeSource.createTask(
                        data.videoId,
                        deadline,
                        self.log,
                        hints
                      );
                      self.clients.push(youtubeTask);
                      function releaseYoutube() {
                        var at = self.clients.indexOf(youtubeTask);
                        if (at >= 0) self.clients.splice(at, 1);
                      }
                      return youtubeTask.promise.then(
                        function (source) {
                          releaseYoutube();
                          check();
                          source.id = option.sourceId;
                          source.label = a.label + ' · YouTube';
                          source.order = i;
                          source.languagePriority = /Dublaj/i.test(a.label) ? 0 : 1;
                          sources.push(source);
                          option.status = 'ready';
                          option.label = source.label;
                          option.detail = 'YouTube güncel misafir oturumu / H.264-AAC HLS hazır';
                        },
                        function (e) {
                          releaseYoutube();
                          throw e;
                        }
                      );
                    }
                    if (data.type === 'mp4') {
                      /* Observed itag18 H264/AAC progressive path passed actual Tizen3 play/pause/seek. Other formats stay gated. */
                      if (
                        !/(^|\.)googlevideo\.com$/.test(new root.URL(data.url).hostname) ||
                        !/[?&]itag=18(?:&|$)/.test(data.url) ||
                        !/[?&]mime=video(?:\/|%2F)mp4(?:&|$)/i.test(data.url)
                      )
                        throw fail(
                          'unsupported',
                          'Bu MP4 biçimi TV motoru için henüz doğrulanmadı.'
                        );
                      sources.push({
                        id: option.sourceId,
                        label: a.label + ' · MP4 360p',
                        url: data.url,
                        referer: data.referer,
                        type: 'mp4',
                        mp4Verified: true,
                        seekMode: 'media-event',
                        subtitles: [],
                        order: i,
                        languagePriority: 1,
                      });
                      option.status = 'ready';
                      option.label = a.label + ' · MP4 360p';
                      option.detail =
                        'Kaynak sayfasından taze MP4 adresi alındı; erişim oynatılırken sınanır';
                      return;
                    }
                    return get(data.url, data.referer, 'manifest')
                      .catch(function (e) {
                        /* This CDN also publicly serves the same URL over HTTP; only use a validated legacy fallback. */
                        if (
                          new root.URL(data.url).hostname !== 'video.twimg.com' ||
                          data.referer ||
                          /403|429|engeli|Dogrulama/.test(e.message)
                        )
                          throw e;
                        return get(data.url.replace(/^https:/, 'http:'), '', 'manifest').then(
                          function (r) {
                            if (!/^\s*#EXTM3U/.test(r.body))
                              throw fail('manifest', 'Alternatif yayın listesi geçersiz.');
                            data.url = data.url.replace(/^https:/, 'http:');
                            return r;
                          }
                        );
                      })
                      .then(function (manifest) {
                        if (!/^\s*#EXTM3U/.test(manifest.body))
                          throw fail('manifest', 'HLS yerine farklı bir yanıt alındı.');
                        /* Streambox reports a placeholder 1920x1333 for its sole stream; use the actual media playlist. */
                        var entries =
                          manifest.body.match(/#EXT-X-STREAM-INF:[^\r\n]+\r?\n([^\r\n#]+)/g) || [];
                        if (
                          new root.URL(data.url).hostname === 'streambox.xyz' &&
                          entries.length === 1 &&
                          !/#EXT-X-MEDIA:/.test(manifest.body)
                        ) {
                          var child = root.CatalogUtils.url(entries[0].split(/\r?\n/)[1], data.url),
                            parsed;
                          try {
                            parsed = new root.URL(child);
                          } catch (ignore) {
                            throw fail('manifest', 'Alt yayın adresi okunamadı.');
                          }
                          if (
                            parsed.origin !== 'https://streambox.xyz' ||
                            !/^\/m3\//.test(parsed.pathname)
                          )
                            throw fail('manifest', 'Alt yayın adresi desteklenmiyor.');
                          return get(child, data.referer, 'variant').then(function (r) {
                            if (!/^\s*#EXTM3U/.test(r.body) || !/#EXTINF:/.test(r.body))
                              throw fail('manifest', 'Alt HLS yayını alınamadı.');
                            data.url = child;
                            return r;
                          });
                        }
                        return manifest;
                      })
                      .then(function (manifest) {
                        sources.push({
                          id: option.sourceId,
                          label: a.label,
                          url: data.url,
                          referer: data.referer,
                          destination: 'downloads',
                          userAgent: 'Mozilla/5.0',
                          type: 'hls',
                          transport: /^XHR/.test(manifest.method) ? 'xhr' : 'native',
                          seekMode: 'media-event',
                          subtitles: [],
                          order: i,
                          languagePriority: /Dublaj/i.test(a.label) ? 0 : 1,
                        });
                        option.status = 'ready';
                        option.detail = 'HLS erişimi doğrulandı';
                      });
                  });
                })
                .catch(function (e) {
                  check();
                  last = e;
                  option.status = e.stage === 'unsupported' ? 'unsupported' : 'error';
                  option.stage = e.stage || 'decode';
                  option.detail = root.PlayerCore.safeMessage(e.message);
                  self.log('DDizi: ' + a.label + ' / ' + option.stage + ' · ' + option.detail);
                })
                .then(function () {
                  check();
                  publish();
                });
            })
            .then(worker);
        }
        return progress && progress.enabled ? worker() : Promise.all([worker(), worker()]);
      })
      .then(function () {
        check();
        sources.sort(function (a, b) {
          return a.languagePriority - b.languagePriority || a.order - b.order;
        });
        sources.options = options;
        if (!sources.length) {
          var e = last || fail('decode', 'Oynatılabilir DDizi kaynağı bulunamadı.');
          e.sourceOptions = options;
          throw e;
        }
        return sources;
      });
  };
  root.DdiziSourceResolver = Resolver;
})(window);


/* saglayicilar/p012/site.js */
(function(root){'use strict';root.SiteRegistry.register({translations:[["DDizi katalog tür/yıl/IMDb filtresi sunmuyor; arşiv sekmelerini kullanın.","DDizi does not offer genre/year/IMDb filters; use its archive tabs."]],id:'ddizi',name:'DDizi',base:'https://www.ddizi.tel',mark:'DD',subtitle:'Yerli ve yabancı diziler',prefix:'ddizi:',storagePrefix:'site.ddizi.',contentTypes:['series'],supportsSeriesLanguage:true,collectionKeys:['new','recommended','liked'],posterBackground:'linear-gradient(145deg,#c05b32,#331b29)',Provider:root.DdiziProvider,Resolver:root.DdiziSourceResolver,ui:{seriesRail:'Yeni bölümler',recommended:'Yabancı diziler',liked:'Eski dizi arşivi',filterHint:'DDizi katalog tür/yıl/IMDb filtresi sunmuyor; arşiv sekmelerini kullanın.',filterSummary:'Arşiv',defaultOrder:'date'},collectionQuery:function(type,key,links){return {type:'series',url:links&&links[key]||({new:'https://www.ddizi.tel/',recommended:'https://www.ddizi.tel/yabanci-dizi-izle',liked:'https://www.ddizi.tel/eski.diziler'})[key]};},filterFields:function(){return [];}});})(window);


})(window);
