/* Generated ES5 provider module. */
(function(shared){'use strict';if(!shared.SitePluginRuntime)throw Error('Update core component to 1.10.0 before installing this module.');var context=shared.FilmPlugins.context(),window=shared.SitePluginRuntime.scope(context,'1.10.0');
var register=window.SiteRegistry.register;window.SiteRegistry.register=function(site){site.name='P014';site.subtitle='P014';site.mark='P014';register(site);};

/* saglayicilar/p014/decoder.js */
(function(root){
 'use strict';var U=root.CatalogUtils,BASE=root.SiteAddresses?root.SiteAddresses.base('dizibox','https://www.dizibox.live'):'https://www.dizibox.live';
 function failure(message){var e=new Error('Dizibox · '+message);e.stage='decode';return e;}
 function unwrap(body){for(var i=0;i<3;i++){var m=/^\s*(?:<script\b[^>]*>\s*)?document\.write\s*\(\s*atob\s*\(\s*unescape\s*\(\s*(['"])((?:%[0-9a-fA-F]{2}|[A-Za-z0-9+/=]){1,2097152})\1\s*\)\s*\)\s*\)/.exec(body);if(!m)return body;try{var encoded=decodeURIComponent(m[2]);if(!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)||encoded.length%4!==0)throw new Error();body=root.CryptoJS.enc.Base64.parse(encoded).toString(root.CryptoJS.enc.Utf8);if(!body||body.length>2*1024*1024)throw new Error();}catch(ignore){throw failure('Kodlanmış oynatıcı verisi okunamadı.');}}throw failure('Oynatıcı veri katmanı sınırı aşıldı.');}
 function documentData(body){var html=unwrap(body).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'').replace(/\ssrc\s*=/gi,' data-frame-src=').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,'');return new DOMParser().parseFromString(html,'text/html');}
 function allowed(url){try{var p=new root.URL(root.SiteAddresses?root.SiteAddresses.resolve(url):url);return p.protocol==='https:'&&!p.username&&!p.password&&(p.origin===BASE&&/^\/player\//.test(p.pathname)||p.hostname==='dbx.molystream.org'&&/^\/embed\//.test(p.pathname)||p.hostname==='vidmoly.biz'&&/^\/embed-[a-z0-9]+\.html$/.test(p.pathname)||p.hostname==='ok.ru'&&/^\/videoembed\/\d+\/?$/.test(p.pathname));}catch(ignore){return false;}}
 function frames(body,page){var d=documentData(body),out=[];Array.prototype.forEach.call(d.querySelectorAll('iframe'),function(n){var u=U.url(n.getAttribute('data-frame-src'),page);if(allowed(u)&&out.indexOf(u)<0)out.push(u);});return out;}
 function alternatives(body,page){var d=documentData(body),out=[];Array.prototype.forEach.call(d.querySelectorAll('.woca-linkpages-dd option'),function(n){var current=n.hasAttribute('selected')||/woca-current-page/.test(n.className),u=root.DiziboxParser.safe(n.getAttribute('value')||n.getAttribute('href')||(current?page:''),page),label=U.clean(n.textContent).replace(/\s*\+\s*/g,'+');if(!u||!label)return;if(out.every(function(x){return x.url!==u;}))out.push({url:u,label:label});});if(!out.length)out.push({url:page,label:'Kaynak 1'});return out;}
 function storyboard(movie){var s=movie&&movie.collageInfo,u;try{if(!s||s.imageType!=='COLLAGE')return null;u=new root.URL(s.url);if(u.protocol!=='https:'||u.username||u.password||u.hash||!/(^|\.)okcdn\.ru$/.test(u.hostname))return null;var count=Number(s.count),cols=Number(s.tileWidth),rows=Number(s.tileHeight),width=Number(s.width),height=Number(s.height),interval=Number(s.frequency);if(![count,cols,rows,width,height,interval].every(function(v){return isFinite(v)&&v>0;})||count%1||cols%1||rows%1||count<1||count>3600||cols<1||rows<1||cols>100||rows>100||cols*rows<count||width<1||height<1||width*cols>8192||height*rows>8192||width*cols*height*rows>16000000||!(interval>0))return null;return{type:'grid',url:u.href,count:count,cols:cols,rows:rows,width:width,height:height,interval:interval};}catch(ignore){return null;}}
 function stream(body,page){
  body=unwrap(body);
  if(/^https:\/\/ok\.ru\/videoembed\/\d+/.test(page)){
   if(/Видео заблокировано из-за нарушений авторских прав|["']copyrightsRestricted["']\s*:\s*true/.test(body)){var blocked=failure('OK.ru videosu telif nedeniyle engellenmiş.');blocked.stage='unavailable';throw blocked;}
   var nodes=documentData(body).querySelectorAll('[data-options]'),id=/\/videoembed\/(\d+)/.exec(page)[1],metadata=null;
   for(var i=0;i<nodes.length;i++){try{var options=JSON.parse(nodes[i].getAttribute('data-options')),value=options.flashvars&&options.flashvars.metadata;value=typeof value==='string'?JSON.parse(value):value;if(value&&value.movie&&String(value.movie.movieId||value.movie.id)===id){metadata=value;break;}}catch(ignoreMetadata){}}
   if(metadata){
    if(metadata.movie.notPublished||/blocked|deleted|copyright|restricted/i.test(String(metadata.movie.status||''))){var unavailable=failure('OK.ru videosu bu yanıtta kullanılamıyor.');unavailable.stage='unavailable';throw unavailable;}
    var media=metadata.hlsManifestUrl||metadata.ondemandHls||metadata.liveHlsManifestUrl,parsed;
    try{parsed=new root.URL(media,page);}catch(ignoreUrl){}
    if(parsed&&parsed.protocol==='https:'&&!parsed.username&&!parsed.password&&!parsed.hash&&/(^|\.)(vkuser\.net|okcdn\.ru)$/.test(parsed.hostname))return {url:parsed.href,subtitles:[],thumbnails:storyboard(metadata.movie)};
    // Some real legacy-TV responses expose only the active movie's MP4 field.
    // This is a candidate for media preparation, never generic JSON-LD/poster data.
    var videos=Array.isArray(metadata.videos)?metadata.videos:[],direct=null;
    videos.some(function(video){if(!video||video.disallowed||!/^(full|hd|sd|low|lowest|mobile)$/.test(String(video.name||'')))return false;try{var u=new root.URL(video.url,page);if(u.protocol!=='https:'||u.username||u.password||u.hash||!/(^|\.)(vkuser\.net|okcdn\.ru)$/.test(u.hostname))return false;direct=u.href;return true;}catch(ignoreVideo){return false;}});
    if(direct)return {url:direct,type:'mp4',subtitles:[],thumbnails:storyboard(metadata.movie),mediaProfile:{height:Number(metadata.movie.height)||0,width:Number(metadata.movie.width)||0}};
   }
   var unsupported=failure('Bu OK.ru yanıtı desteklenen doğrudan HLS verisi bildirmiyor.');unsupported.stage='unsupported';throw unsupported;
  }
  var m=/\bCryptoJS\.AES\.decrypt\(\s*"([A-Za-z0-9+/=]{16,1048576})"\s*,\s*"([A-Za-z0-9+/=]{1,512})"\s*\)/.exec(body);
  if(m){try{body=root.CryptoJS.AES.decrypt(m[1],m[2]).toString(root.CryptoJS.enc.Utf8);if(!body||body.length>2*1024*1024)throw new Error();}catch(ignore){throw failure('DBX Pro veri şifresi çözülemedi.');}}
  /* Only the actual JW setup source, never arbitrary metadata or thumbnails. */
  m=/\bjwplayer\(\s*['"][^'"]+['"]\s*\)\.setup\(\s*\{\s*file\s*:\s*(['"])([^'"\r\n]+)\1/.exec(body);
  if(!m&&/\bvar\s+player\s*=\s*jwplayer\(['"]vplayer['"]\)/.test(body))m=/\bplayer\.setup\(\s*\{\s*sources\s*:\s*\[\s*\{\s*file\s*:\s*(['"])([^'"\r\n]+)\1/.exec(body);
  var u=m&&U.url(m[2],page);if(!u)throw failure('Desteklenen aktif HLS kaynağı bulunamadı.');
  var p=new root.URL(u);if(p.protocol!=='https:'||p.username||p.password)throw failure('Geçersiz medya adresi.');return {url:u,subtitles:[]};
 }
 root.DiziboxDecoder={frames:frames,alternatives:alternatives,stream:stream,allowed:allowed};
})(window);


/* saglayicilar/p014/parser.js */
/* Dizibox HTML is read as inert data; page scripts are never evaluated. */
(function (root) {
 'use strict';
 var U = root.CatalogUtils, BASE = (root.SiteAddresses ? root.SiteAddresses.base('dizibox', 'https://www.dizibox.live') : 'https://www.dizibox.live');
 function text(n,q) { var el=n&&(q?n.querySelector(q):n);return U.clean(el&&el.textContent); }
 function safe(value,page) { var u=U.url(value,page||BASE+'/');try {var p=new root.URL(u);return p.origin===BASE&&!p.username&&!p.password?u:'';}catch(ignore){return '';}}
 function id(page) { var u=new root.URL(page);return 'dizibox:series:'+u.pathname.replace(/^\/+|\/+$/g,''); }
 function number(value) { var m=/\d+(?:[.,]\d+)?/.exec(value||'');return m?Number(m[0].replace(',','.')):null; }
 function image(box,page) { var n=box&&box.querySelector('img.afis,img.main-cover,img');return n?U.url(n.getAttribute('data-src')||n.getAttribute('data-catalog-src'),page):''; }
 function doc(body) { if(/VPN veya Server ip|CLOUDFLARE_ERROR_1000S_BOX|Lütfen dizileri dizibox/i.test(body))throw new Error('Dizibox erişimi site tarafından engellendi.');return U.envelope(body).doc; }
 function cards(d,page) {
  var out=[],seen={};Array.prototype.forEach.call(d.querySelectorAll('.article-series-poster,.article-series-small-grid,.detailed-article'),function(box){
   var a=box.querySelector('a.poster-title,a.series-details,h3 a,a[href*="/diziler/"]'),url=safe(a&&a.getAttribute('href'),page),title=text(box,'.poster-title,.tv-title,h3')||U.clean(a&&a.getAttribute('title'));
   if(!url||!/\/diziler\/[^/]+\/?$/.test(new root.URL(url).pathname)||!title||seen[url])return;seen[url]=true;title=title.replace(/ izle$/i,'');
   var year=/\b(?:19|20)\d{2}\b/.exec(text(box,'.release,.custom-fields-container'));
   out.push({contentId:id(url),providerId:'dizibox',type:'series',pageUrl:url,title:title,poster:image(box,page),year:year?Number(year[0]):null,imdb:number(text(box,'.imdb,.label-imdb b')),language:''});
  });return out;
 }
 function list(body,page) {if(root.SiteAddresses)page=root.SiteAddresses.resolve(page);var d=doc(body),n=d.querySelector('.woca-pagination a.next'),next=safe(n&&n.getAttribute('href'),page);return {cards:cards(d,page),next:next&&next!==page?{kind:'url',url:next}:null};}
 function home(body) {var d=doc(body),all=cards(d,BASE+'/');if(!all.length)throw new Error('Dizibox katalog biçimi tanınamadı.');return {hero:all[0],movies:[],series:all,links:{new:BASE+'/dizi-arsivi/',recommended:BASE+'/efsane-diziler/',rated:BASE+'/dizi-arsivi/?orderby=imdb',liked:BASE+'/dizi-arsivi/?orderby=yorum'}};}
 function index(body) {var d=doc(body),out=[],seen={};Array.prototype.forEach.call(d.querySelectorAll('.alphabetical-category-list a[href]'),function(a){var u=safe(a.getAttribute('href')),title=text(a);if(!u||!title||seen[u]||!/\/diziler\/[^/]+\/?$/.test(new root.URL(u).pathname))return;seen[u]=true;out.push({contentId:id(u),providerId:'dizibox',type:'series',pageUrl:u,title:title,poster:'',language:''});});if(!out.length)throw new Error('Dizibox alfabetik dizi dizini alınamadı.');return out;}
 function options(body) {
  var d=doc(body),genres=[],years=[],imdb=[],input=d.querySelector('#was-form input[name=yil]'),min=input&&Number(input.getAttribute('min')),max=input&&Number(input.getAttribute('max'));
  Array.prototype.forEach.call(d.querySelectorAll('#was-tur input'),function(n){var label=d.querySelector('label[for="'+n.id+'"]');if(n.value&&label)genres.push({value:n.value,label:text(label)});});
  if(min>=1900&&max<=2100)for(var y=max;y>=min;y--)years.push({value:String(y),label:String(y)});
  input=d.querySelector('#was-form input[name=imdb]');if(input)for(var i=Number(input.getAttribute('min'));i<=10;i++)imdb.push({value:i+'-10',label:i+'+'});
  return {genres:genres,years:years,imdb:imdb,order:[{value:'date',label:'Yeni eklenenler'},{value:'imdb',label:'IMDb puanı'},{value:'yorum',label:'Yorum sayısı'}]};
 }
 function episodeList(d,series) {
  var out=[],seen={};Array.prototype.forEach.call(d.querySelectorAll('a.season-episode'),function(a){var u=safe(a.getAttribute('href'),series.pageUrl),m=/(\d+)\s*\.\s*Sezon\s*(\d+)\s*\.\s*Bölüm/i.exec(text(a));if(!u||!m||seen[u])return;seen[u]=true;var s=Number(m[1]),e=Number(m[2]);out.push({contentId:series.contentId+':s'+s+':e'+e,providerId:'dizibox',type:'episode',pageUrl:u,title:series.title+' · '+s+'. Sezon '+e+'. Bölüm',episodeTitle:s+'. Sezon '+e+'. Bölüm',poster:series.poster,seriesTitle:series.title,seriesPageUrl:series.pageUrl,episode:{seriesId:series.contentId,season:s,number:e},sources:[],subtitles:[]});});return out;
 }
 function episodes(body,series) {return episodeList(doc(body),series);}
 function detail(body,card) {
  var d=doc(body),title=text(d,'.tv-overview h1'),r=root.PlayerCore.copy(card);if(!title)throw new Error('Dizibox dizi detayı biçimi tanınamadı.');
  r.title=title;r.type='series';r.contentId=id(card.pageUrl);r.description=text(d,'.tv-story');r.poster=image(d.querySelector('#main-cover'),card.pageUrl)||card.poster;r.imdb=number(text(d,'.title-terms .label-imdb b'));r.genres=[];r.cast=[];r.sources=[];r.subtitles=[];
  var year=text(d,'.title-terms a[href*="/yil/"]');r.year=/^(19|20)\d{2}$/.test(year)?Number(year):null;
  Array.prototype.forEach.call(d.querySelectorAll('.title-terms a[href*="/tur/"]'),function(a){r.genres.push(text(a));});Array.prototype.forEach.call(d.querySelectorAll('.title-terms a[href*="/oyuncu/"]'),function(a){r.cast.push(text(a));});
  r.seasonLinks=[];Array.prototype.forEach.call(d.querySelectorAll('#seasons-list a'),function(a){var u=safe(a.getAttribute('href'),card.pageUrl),s=number(text(a));if(u&&s>0)r.seasonLinks.push({url:u,season:s});});r.episodes=episodeList(d,r);r.seasons=r.seasonLinks.map(function(x){return x.season;});return r;
 }
 function episodeLanguage(body) {var d=doc(body),dub=false,sub=false;Array.prototype.forEach.call(d.querySelectorAll('.language img,img.language-flag'),function(n){var path=U.url(n.getAttribute('data-catalog-src'),BASE+'/');dub=dub||/\/(?:dublaj|dub)\.png$/.test(path);sub=sub||/\/altyazi\.png$/.test(path);});return {language:dub&&sub?'Dublaj & Altyazılı':dub?'Türkçe Dublaj':sub?'Türkçe Altyazılı':''};}
 root.DiziboxParser={base:BASE,safe:safe,id:id,home:home,index:index,list:list,options:options,detail:detail,episodes:episodes,episodeLanguage:episodeLanguage};
})(window);


/* saglayicilar/p014/provider.js */
(function(root){
 'use strict';var P=root.DiziboxParser,BASE=P.base;
 function Provider(cache,network){root.CatalogClient.call(this,cache,network||root.ChainNetwork.createClient({destination:'downloads',platformText:true}),{base:BASE,headers:{Accept:'text/html'}});this.links={};}
 Provider.prototype=Object.create(root.CatalogClient.prototype);Provider.prototype.constructor=Provider;
 Provider.prototype.fetch=function(url,parse,force,scope){if(!P.safe(url))return Promise.reject(new Error('Dizibox dışı katalog bağlantısı reddedildi.'));return this.request(url,null,parse,force,'dizibox-'+scope);};
 Provider.prototype.home=function(force){var self=this;return this.fetch(BASE+'/',function(body){self.searchIndex=P.index(body);return P.home(body);},force,'home').then(function(v){self.links=v.links;return v;});};
 Provider.prototype.options=function(){return this.fetch(BASE+'/dizi-arsivi/',P.options,false,'options');};
 Provider.prototype.list=function(query,next,force){
  query=query||{};var f=query.filters||{},parts=[],url=next&&next.url;
  if(query.type==='movie')return Promise.resolve({cards:[],next:null});
  if(f.language)return Promise.reject(new Error('Dizibox dil filtresi sunmuyor.'));
  if(!url){url=query.url||BASE+'/dizi-arsivi/';if(f.genre)parts.push('tur%5B%5D='+encodeURIComponent(f.genre));if(f.year)parts.push('yil='+encodeURIComponent(f.year));if(f.imdb)parts.push('imdb='+encodeURIComponent(String(f.imdb).split('-')[0]));if(query.order&&query.order!=='date'){if(!/^(imdb|yorum)$/.test(query.order))return Promise.reject(new Error('Geçersiz Dizibox sıralaması.'));parts.push('orderby='+query.order);}if(parts.length)url=url.split('?')[0]+'?'+parts.join('&');}
  return this.fetch(url,function(body){return P.list(body,url);},force,'list');
 };
 /* The site's GET search times out here. Its full alphabetical menu is real site data. */
 Provider.prototype.search=function(query,force){var self=this;query=root.CatalogUtils.clean(query);if(!query||query.length>100)return Promise.reject(new Error('Arama 1–100 karakter olmalı.'));var key=query.toLocaleLowerCase().replace(/İ/g,'i').replace(/ı/g,'i').replace(/\u0307/g,''),token=this.generation;
  function select(index){if(token!==self.generation)throw new Error('İptal edildi');return {cards:index.filter(function(c){return c.title.toLocaleLowerCase().replace(/ı/g,'i').replace(/\u0307/g,'').indexOf(key)>=0;}),next:null};}
  if(this.searchIndex&&!force)return Promise.resolve(select(this.searchIndex));
  return this.fetch(BASE+'/',function(body){self.searchIndex=P.index(body);return select(self.searchIndex);},force,'search-'+query);
 };
 Provider.prototype.identity=function(card,force){if(root.SiteAddresses)card=root.SiteAddresses.content(card);return this.fetch(card.pageUrl,function(body){return P.detail(body,card);},force,'identity0170-detail');};
 Provider.prototype.detail=function(card,force){if(root.SiteAddresses)card=root.SiteAddresses.content(card);
  var self=this,token=this.generation;return this.fetch(card.pageUrl,function(body){return P.detail(body,card);},force,'detail').then(function(detail){
   var present={};detail.episodes.forEach(function(e){present[e.episode.season]=true;});
   return Promise.all(detail.seasonLinks.filter(function(s){return !present[s.season];}).map(function(s){return self.fetch(s.url,function(body){var episodes=P.episodes(body,detail);if(!episodes.length)throw new Error(s.season+'. sezon bölümleri alınamadı.');return {episodes:episodes};},force,'season').then(function(v){if(token!==self.generation)throw new Error('İptal edildi');return v.episodes;});})).then(function(groups){if(token!==self.generation)throw new Error('İptal edildi');var seen={};detail.episodes=[].concat.apply(detail.episodes,groups).filter(function(e){if(seen[e.contentId])return false;seen[e.contentId]=true;return true;}).sort(function(a,b){return a.episode.season-b.episode.season||a.episode.number-b.episode.number;});detail.seasons=detail.episodes.map(function(e){return e.episode.season;}).filter(function(n,i,a){return a.indexOf(n)===i;});return detail;});
  });
 };
 Provider.prototype.seriesLanguage=function(){return Promise.resolve({language:''});};
 root.DiziboxProvider=Provider;
})(window);


/* saglayicilar/p014/resolver.js */
(function (root) {
  'use strict';
  var P = root.DiziboxParser,
    D = root.DiziboxDecoder;
  function fail(stage, message) {
    var e = new Error('Dizibox · ' + message);
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
    this.clients.slice().forEach(function (client) {
      client.cancel();
    });
    this.clients = [];
  };
  Resolver.prototype.resolve = function (content, deadline, onProgress, hints) {
    this.cancel();
    var self = this,
      token = this.generation,
      sources = [],
      options = [],
      last,
      progress = root.SourceProgress && new root.SourceProgress(onProgress, hints);
    function publish() {
      if (progress) progress.publish(sources, options);
    }
    function check(job) {
      if (token !== self.generation) {
        var e = fail('cancel', 'İptal edildi');
        e.cancelled = true;
        throw e;
      }
      if ((job && job.expired) || self.now() >= deadline)
        throw fail('timeout', 'Kaynak hazırlama süresi doldu.');
    }
    /* A successful XHR page must not force XHR on the next Referer-protected embed. */
    function get(url, ref, stage, job) {
      check(job);
      var browserManifest =
        stage === 'manifest' &&
        /(^|\.)(vmpx\.online|vkuser\.net|okcdn\.ru)$/.test(new root.URL(url).hostname);
      var client = root.ChainNetwork.createClient({
        destination: 'downloads',
        platformText: !!P.safe(url),
        preferXHR: !P.safe(url) && (stage === 'page' || browserManifest),
      });
      if (progress && progress.client)
        client = progress.client(
          client,
          function () {
            check(job);
          },
          deadline
        );
      self.clients.push(client);
      if (job) job.clients.push(client);
      function release() {
        var i = self.clients.indexOf(client);
        if (i >= 0) self.clients.splice(i, 1);
        if (job) {
          i = job.clients.indexOf(client);
          if (i >= 0) job.clients.splice(i, 1);
        }
      }
      return client.get(url, ref).then(
        function (r) {
          release();
          check(job);
          self.log('Dizibox: ' + stage + ' / ' + r.method);
          return r;
        },
        function (e) {
          release();
          check(job);
          e.stage = stage;
          throw e;
        }
      );
    }
    function walk(body, page, label, depth, job) {
      check(job);
      var frames = D.frames(body, page);
      if (frames.length && depth < 3)
        return get(frames[0], page, 'embed', job).then(function (r) {
          return walk(r.body, frames[0], label, depth + 1, job);
        });
      var data = D.stream(body, page);
      if (data.type === 'mp4')
        return Promise.resolve({
          label: label,
          url: data.url,
          referer: page,
          type: 'mp4',
          status: 'candidate',
          stability: { autoPriority: 20 },
          mp4Verified: false,
          engineSupport: { html5: 'unknown', avplay: 'unknown' },
          mediaProfile: data.mediaProfile,
          thumbnails: data.thumbnails,
          subtitles: data.subtitles,
          playbackRequirements: { requiredHeaders: [] },
        });
      return get(data.url, page, 'manifest', job).then(function (r) {
        check(job);
        if (!/^\s*#EXTM3U/.test(r.body))
          throw fail('manifest', 'HLS yerine farklı bir yanıt alındı.');
        return {
          label: label,
          url: data.url,
          referer: page,
          type: 'hls',
          status: 'ready',
          stability:
            new root.URL(data.url).hostname === 'dbx.molystream.org'
              ? { initialBufferSeconds: 10, maxBufferSeconds: 25, autoPriority: 50 }
              : /(^|\.)(vkuser\.net|okcdn\.ru)$/.test(new root.URL(data.url).hostname)
                ? { autoMaxHeight: 360 }
                : null,
          playbackRequirements: {
            requiredHeaders: /^dbx\.molystream\.org$/i.test(new root.URL(data.url).hostname)
              ? ['Referer']
              : [],
          },
          transport: /^XHR/.test(r.method) ? 'xhr' : 'native',
          destination: 'downloads',
          seekMode: 'media-event',
          subtitles: data.subtitles,
        };
      });
    }
    if (!P.safe(content.pageUrl)) return Promise.reject(fail('page', 'Geçersiz bölüm sayfası.'));
    if (self.now() >= deadline)
      return Promise.reject(fail('timeout', 'Kaynak hazırlama süresi doldu.'));
    self.log('Dizibox: bölüm sayfası alınıyor.');
    return get(content.pageUrl, P.base + '/', 'page')
      .then(function (r) {
        var first = r.body,
          alternatives = D.alternatives(first, content.pageUrl),
          queue = [];
        alternatives.forEach(function (a, i) {
          var option = {
            sourceId: 'dizibox-' + i,
            label: a.label,
            pageUrl: a.url,
            status: 'pending',
            stage: '',
            detail: '',
          };
          options.push(option);
          if (!/^(DBX Pro|Moly\+|Odnok|Kaynak 1)$/i.test(a.label)) {
            option.status = 'unsupported';
            option.detail = 'Bu oynatıcı henüz desteklenmiyor.';
          } else queue.push({ alternative: a, option: option, index: i });
        });
        publish();
        if (progress)
          queue = progress.order(queue, function (entry) {
            return {
              id: entry.option.sourceId,
              label: entry.option.label,
              type: 'hls',
              stability: {
                autoPriority: /DBX Pro/i.test(entry.option.label)
                  ? 50
                  : /Odnok/i.test(entry.option.label)
                    ? 20
                    : 0,
              },
            };
          });
        function attempt(entry) {
          check();
          var a = entry.alternative,
            o = entry.option,
            job = { expired: false, clients: [] },
            ms = Math.max(
              1,
              Math.min(
                hints && hints.mediaActive && hints.mediaActive() ? 45000 : 30000,
                deadline - self.now() - 15000
              )
            );
          return new Promise(function (resolve) {
            var done = false,
              timer = setTimeout(function () {
                job.expired = true;
                job.clients.slice().forEach(function (client) {
                  client.cancel();
                });
                finish(fail('timeout', 'Bu kaynak zamanında çözümlenemedi.'));
              }, ms);
            function finish(error, source) {
              if (done) return;
              done = true;
              clearTimeout(timer);
              if (error) {
                last = error;
                o.status = error.stage === 'unsupported' ? 'unsupported' : 'error';
                o.stage = error.stage || 'decode';
                o.detail = root.PlayerCore
                  ? root.PlayerCore.safeMessage(error.message)
                  : String(error.message).slice(0, 180);
                self.log('Dizibox: ' + a.label + ' / ' + o.stage + ' · ' + o.detail);
              } else {
                source.id = o.sourceId;
                source.order = entry.index;
                sources.push(source);
                o.status = source.status || 'ready';
                o.detail =
                  source.type === 'mp4'
                    ? 'Aktif MP4 adayı; oynatma motorunda hazırlık doğrulaması bekliyor'
                    : 'HLS erişimi doğrulandı';
              }
              resolve();
            }
            self.log('Dizibox: ' + a.label + ' çözümleniyor.');
            (a.url === content.pageUrl
              ? Promise.resolve({ body: first })
              : get(a.url, content.pageUrl, 'page', job)
            )
              .then(function (page) {
                return walk(page.body, a.url, a.label, 0, job);
              })
              .then(function (source) {
                check(job);
                finish(null, source);
              })
              .catch(function (e) {
                finish(e);
              });
          });
        }
        function worker() {
          check();
          if (!queue.length) return Promise.resolve();
          return (progress ? progress.wait(check) : Promise.resolve().then(check)).then(
            function () {
              var entry = queue.shift();
              return entry
                ? attempt(entry)
                    .then(function () {
                      check();
                      publish();
                    })
                    .then(worker)
                : undefined;
            }
          );
        }
        return progress && progress.enabled ? worker() : Promise.all([worker(), worker()]);
      })
      .then(function () {
        check();
        sources.sort(function (a, b) {
          return a.order - b.order;
        });
        sources.options = options;
        if (!sources.length) {
          var error = last || fail('embed', 'Oynatılabilir kaynak bulunamadı.');
          error.sourceOptions = options;
          throw error;
        }
        return sources;
      });
  };
  root.DiziboxSourceResolver = Resolver;
})(window);


/* saglayicilar/p014/site.js */
(function(root){
 'use strict';
 root.SiteRegistry.register({translations:[["Dizibox dizileri","Dizibox series"],["Dizibox arşivi: tür, yıl, IMDb ve sıralama. Arama sitenin alfabetik dizi dizinini kullanır.","Dizibox archive: genre, year, IMDb and sorting. Search uses the site’s alphabetical series index."]],id:'dizibox',name:'Dizibox',base:'https://www.dizibox.live',mark:'DBX',subtitle:'dizibox.live · Yabancı diziler',prefix:'dizibox:',storagePrefix:'site.dizibox.',contentTypes:['series'],posterBackground:'linear-gradient(145deg,#14678b,#10243c)',Provider:root.DiziboxProvider,Resolver:root.DiziboxSourceResolver,
  ui:{movieRail:'Filmler',seriesRail:'Dizibox dizileri',recommended:'Efsane diziler',liked:'En çok yorumlananlar',filterHint:'Dizibox arşivi: tür, yıl, IMDb ve sıralama. Arama sitenin alfabetik dizi dizinini kullanır.',filterSummary:'Dizi filtresi',defaultOrder:'date'},
  collectionQuery:function(type,key){return {type:'series',url:key==='recommended'?'https://www.dizibox.live/efsane-diziler/':null,order:{new:'date',recommended:'date',rated:'imdb',liked:'yorum'}[key]};},
  filterFields:function(){return ['genres','years','imdb','order'];}
 });
})(window);


})(window);
