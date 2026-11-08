/* Generated ES5 provider module. */
(function(shared){'use strict';if(!shared.SitePluginRuntime)throw Error('Update core component to 1.10.0 before installing this module.');var context=shared.FilmPlugins.context(),window=shared.SitePluginRuntime.scope(context,'1.10.0');
var register=window.SiteRegistry.register;window.SiteRegistry.register=function(site){site.name='P011';site.subtitle='P011';site.mark='P011';register(site);};

/* saglayicilar/p011/data.js */
/* Reads literal Next Flight data. No component or page script is executed. */
(function(root){
 'use strict';
 function walk(value,visit){var count=0;function next(v,depth){if(!v||typeof v!=='object'||depth>80||++count>60000)return;visit(v);Object.keys(v).forEach(function(k){next(v[k],depth+1);});}next(value,0);}
 function records(html){
  if(typeof html!=='string'||html.length>4*1024*1024)throw new Error('Site verisi çok büyük.');
  var wire='',re=/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi,m,match;
  while((m=re.exec(html))){match=/^\s*self\.__next_f\.push\((\[[\s\S]*\])\);?\s*$/.exec(m[1]);if(!match)continue;try{var chunk=JSON.parse(match[1]);if(chunk[0]===1&&typeof chunk[1]==='string')wire+=chunk[1];}catch(ignore){}}
  if(wire.length>3*1024*1024)throw new Error('Site verisi çok büyük.');
  var values=[],i=0,end,head,size,used,c,width;
  while(i<wire.length){
   if(wire.charAt(i)==='\n'){i++;continue;}
   head=/^([0-9a-f]+):/.exec(wire.slice(i,i+20));if(!head){end=wire.indexOf('\n',i);if(end<0)break;i=end+1;continue;}i+=head[0].length;
   head=/^T([0-9a-f]+),/.exec(wire.slice(i,i+20));
   if(head){size=parseInt(head[1],16);i+=head[0].length;used=0;while(i<wire.length&&used<size){c=wire.charCodeAt(i);width=c<128?1:c<2048?2:c>=55296&&c<=56319?4:3;used+=width;i+=width===4?2:1;}if(used!==size)throw new Error('Site metin çerçevesi bozuk.');continue;}
   end=wire.indexOf('\n',i);if(end<0)end=wire.length;
   if(/^[\[{\"]/.test(wire.charAt(i))){try{values.push(JSON.parse(wire.slice(i,end)));}catch(ignore2){}}
   i=end+1;
  }return values;
 }
 function find(values,predicate){var found=null;walk(values,function(v){if(!found&&!Array.isArray(v)&&predicate(v))found=v;});return found;}
 function player(html){
  var guard=find(records(html),function(v){return Object.prototype.hasOwnProperty.call(v,'accessLevel')&&Object.prototype.hasOwnProperty.call(v,'requireAuthForWatch');});
  if(!guard)throw new Error('HDFilmDelisi oynatıcı verisi bulunamadı.');
  if(guard.accessLevel!=='public'||guard.requireAuthForWatch!==false)throw new Error('Bu içerik üye girişi gerektiriyor.');
  var data=find(guard.children,function(v){return typeof v.videoUrl==='string'&&Object.prototype.hasOwnProperty.call(v,'isCopyrighted');});
  if(!data||data.isCopyrighted)throw new Error('Bu içerik için herkese açık oynatıcı bulunmuyor.');
  if(!/^https:\/\/pl\.vixolity\.com\/[A-Za-z0-9_=-]+$/.test(data.videoUrl))throw new Error('Oynatıcı biçimi desteklenmiyor.');
  return {url:data.videoUrl,poster:data.posterUrl||''};
 }
 root.HdfilmDelisiData={records:records,find:find,player:player};
})(window);


/* saglayicilar/p011/parser.js */
(function(root){
 'use strict';var U=root.CatalogUtils,D=root.HdfilmDelisiData,BASE=(root.SiteAddresses ? root.SiteAddresses.base('hdfilmdelisi', 'https://hdfilmdelisi.one') : 'https://hdfilmdelisi.one');
 function text(node,selector){var n=node&&(selector?node.querySelector(selector):node);if(n&&n.nodeType===9)n=n.body;return U.clean(n&&n.textContent);}
 function safe(value){var url=U.url(value,BASE+'/');try{var u=new root.URL(url);return u.origin===BASE&&!u.username&&!u.password?url:'';}catch(ignore){return '';}}
 function contentUrl(value){var u=safe(value),p=u&&new root.URL(u);return p&&!p.search&&/^\/(film|dizi)\/[a-z0-9-]+(?:\/sezon-[1-9]\d*\/bolum-[1-9]\d*)?$/.test(p.pathname)?u:'';}
 function genre(value){var u=safe(value),p=u&&new root.URL(u);return p&&!p.search&&/^\/tur\/[a-z0-9-]+$/.test(p.pathname)?u:'';}
 function param(url,key){var m=new RegExp('[?&]'+key+'=([^&#]*)').exec(url);try{return m?decodeURIComponent(m[1]):null;}catch(ignore){return null;}}
 function pageUrl(url,number){var u=new root.URL(url),parts=u.search.slice(1).split('&').filter(function(s){return s&&!/^page=/.test(s);});parts.push('page='+number);return u.origin+u.pathname+'?'+parts.join('&');}
 function id(page,type){return 'hdfilmdelisi:'+type+':'+new root.URL(page).pathname.split('/')[2];}
 function language(value){return {'dublaj':'Türkçe Dublaj','altyazi':'Türkçe Altyazılı','dublaj-altyazi':'Dublaj & Altyazılı'}[value]||'';}
 function unique(cards){var seen={};return cards.filter(function(c){if(!c||seen[c.contentId])return false;seen[c.contentId]=true;return true;});}
 function dto(v,type){
  if(!v||!v.baslik||!/^[a-z0-9-]+$/.test(v.slug)||v.accessLevel&&v.accessLevel!=='public')return null;
  var page=BASE+(type==='series'?'/dizi/':'/film/')+v.slug;
  return {contentId:id(page,type),providerId:'hdfilmdelisi',type:type,pageUrl:page,title:U.clean(v.baslik),originalTitle:U.clean(v.orijinalBaslik),imdbId:/^tt\d{7,10}$/.test(v.imdbId||'')?v.imdbId:'',poster:U.url(v.afis,BASE+'/'),year:Number(v.yayinYili)||null,imdb:Number(v.imdbPuani)||null,language:language(v.dublajDurumu)};
 }
 function cards(doc){var result=[];Array.prototype.forEach.call(doc.querySelectorAll('a.poster[href]'),function(a){var page=contentUrl(a.getAttribute('href'));if(!page||/\/sezon-/.test(page))return;var type=/\/dizi\//.test(page)?'series':'movie',title=text(a,'h2,h3'),img=a.querySelector('img'),meta=text(a),year=/\b((?:19|20)\d{2})\b/.exec(meta),rating=/★\s*(\d+(?:\.\d+)?)/.exec(meta),dub=false,sub=false;
   Array.prototype.forEach.call(a.querySelectorAll('svg'),function(svg){if(svg.querySelector('rect[fill="#E30A17"]'))dub=true;if(/lucide-captions|lucide-subtitles/.test(svg.getAttribute('class')||''))sub=true;});
   if(title)result.push({contentId:id(page,type),providerId:'hdfilmdelisi',type:type,pageUrl:page,title:title,poster:U.url(img&&img.getAttribute('data-catalog-src'),BASE+'/'),year:year?Number(year[1]):null,imdb:rating?Number(rating[1]):null,language:dub&&sub?'Dublaj & Altyazılı':dub?'Türkçe Dublaj':sub?'Türkçe Altyazılı':''});
  });return unique(result);}
 function options(body){var d=U.envelope(body).doc,seen={},genres=[];Array.prototype.forEach.call(d.querySelectorAll('a[href]'),function(a){var u=genre(a.getAttribute('href')),label=text(a);if(u&&label&&!seen[u]){seen[u]=true;genres.push({value:u,label:label});}});return genres;}
 function home(body){var all=cards(U.envelope(body).doc);if(!all.length)throw new Error('HDFilmDelisi katalog biçimi tanınamadı.');return {hero:all[0],movies:all.filter(function(c){return c.type==='movie';}),series:all.filter(function(c){return c.type==='series';}),next:null};}
 function list(body,page,type){
  var json,films,parsed,pages,number=param(page,'page')||1,next=null;
  if(/^\s*\{/.test(body)){json=JSON.parse(body);if(json.error)throw new Error('Katalog: '+U.clean(json.error));films=type==='series'?json.series:json.films;if(!Array.isArray(films))throw new Error('Katalog liste biçimi değişti.');pages=Number(json.totalPages);if(type==='series'?json.hasMore===true:Number(number)<pages)next={kind:'url',url:pageUrl(page,Number(number)+1)};return {cards:unique(films.map(function(v){return dto(v,type);})),next:next};}
  parsed=D.find(D.records(body),function(v){return Array.isArray(v.initialFilms)&&v.category;});
  if(parsed)return {cards:unique(parsed.initialFilms.map(function(v){return dto(v,'movie');})),next:null};
  return {cards:cards(U.envelope(body).doc).filter(function(c){return c.type===type;}),next:null};
 }
 function search(body){var data=JSON.parse(body);if(!Array.isArray(data.results)||!Array.isArray(data.series))throw new Error('Arama yanıtı biçimi değişti.');return {cards:unique(data.results.map(function(v){return dto(v,'movie');}).concat(data.series.map(function(v){return dto(v,'series');}))),next:null};}
 function detail(body,card){
  if(!contentUrl(card.pageUrl))throw new Error('Geçersiz içerik bağlantısı.');
  var env=U.envelope(body),d=env.doc,type=/\/dizi\//.test(card.pageUrl)?'series':'movie',schema=env.schema.filter(function(s){return s['@type']===(type==='series'?'TVSeries':'Movie');})[0],result=root.PlayerCore.copy(card),titleNode=null;
  Array.prototype.some.call(d.querySelectorAll('h1'),function(h){if(text(h)&&text(h)!=='Film izle'){titleNode=h;return true;}return false;});
  if(!titleNode||!schema)throw new Error('HDFilmDelisi detay biçimi tanınamadı.');
  result.type=type;result.contentId=id(card.pageUrl,type);result.title=text(titleNode);result.originalTitle=schema.alternateName||text(titleNode.parentNode,'p');result.poster=U.url(typeof schema.image==='string'?schema.image:schema.image&&schema.image.url,BASE+'/')||card.poster;
  result.description=text(U.envelope(schema.description||'').doc).replace(/\\[rn]/g,' ');result.year=Number(String(schema.datePublished||'').slice(0,4))||card.year;result.imdb=Number(schema.aggregateRating&&schema.aggregateRating.ratingValue)||card.imdb;
  result.duration=schema.duration?String(schema.duration).replace(/^PT/,'').replace(/H/,' sa ').replace(/M/,' dk'):'';
  result.genres=Array.isArray(schema.genre)?schema.genre.slice():schema.genre?[schema.genre]:[];result.cast=(schema.actor||[]).map(function(v){return U.clean(v.name);}).filter(Boolean);result.seasons=[];result.episodes=[];result.sources=[];result.subtitles=[];
  var header=titleNode.parentNode.parentNode.parentNode,meta=text(header,'.meta-x-scroll'),dub=/Türkçe Dublaj/.test(meta),sub=/Türkçe Altyazı/.test(meta);
  if(dub||sub)result.language=dub&&sub?'Dublaj & Altyazılı':dub?'Türkçe Dublaj':'Türkçe Altyazılı';
  if(!result.genres.length)Array.prototype.forEach.call(header.querySelectorAll('a[href]'),function(a){if(genre(a.getAttribute('href'))&&result.genres.indexOf(text(a))<0)result.genres.push(text(a));});
  if(type==='movie'){try{D.player(body);}catch(e){result.playbackUnavailableReason=e.message;}}
  else{
   var data=D.find(D.records(body),function(v){return typeof v.seriesTitle==='string'&&Array.isArray(v.seasons)&&typeof v.slug==='string';});
   if(!data||!(/^[a-z0-9-]+$/).test(data.slug)||BASE+'/dizi/'+data.slug!==card.pageUrl)throw new Error('Dizi sezon verisi bulunamadı.');
   data.seasons.forEach(function(s){if(!Array.isArray(s.episodes))return;s.episodes.forEach(function(e){var sn=Number(e.sezonNo),en=Number(e.bolumNo);if(sn<1||en<1||Math.floor(sn)!==sn||Math.floor(en)!==en)return;var page=card.pageUrl+'/sezon-'+sn+'/bolum-'+en;result.episodes.push({contentId:result.contentId+':s'+sn+':e'+en,providerId:'hdfilmdelisi',type:'episode',pageUrl:page,title:result.title+' · '+sn+'×'+en,episodeTitle:U.clean(e.ad)||en+'. Bölüm',description:U.clean(e.aciklama),poster:result.poster,seriesTitle:result.title,seriesPageUrl:card.pageUrl,language:language(e.dublajDurumu),episode:{seriesId:result.contentId,season:sn,number:en},sources:[],subtitles:[]});});});
   result.episodes=unique(result.episodes).sort(function(a,b){return a.episode.season-b.episode.season||a.episode.number-b.episode.number;});result.seasons=result.episodes.map(function(e){return e.episode.season;}).filter(function(v,i,a){return a.indexOf(v)===i;});
  }return result;
 }
 root.HdfilmDelisiParser={base:BASE,safe:safe,contentUrl:contentUrl,genre:genre,param:param,id:id,home:home,list:list,search:search,detail:detail,options:options};
})(window);


/* saglayicilar/p011/provider.js */
(function(root){
 'use strict';var P=root.HdfilmDelisiParser,BASE=P.base;
 function Provider(cache,network){root.CatalogClient.call(this,cache,network||root.ChainNetwork.createClient({destination:'downloads'}),{base:BASE,headers:{Accept:'text/html,application/json','User-Agent':'Mozilla/5.0'}});}
 Provider.prototype=Object.create(root.CatalogClient.prototype);Provider.prototype.constructor=Provider;
 Provider.prototype.fetch=function(url,parse,force,scope){if(!P.safe(url))return Promise.reject(new Error('HDFilmDelisi dışı katalog bağlantısı reddedildi.'));return this.request(url,null,parse,force,'hdfilmdelisi0160-'+scope);};
 Provider.prototype.home=function(force){var self=this;return this.fetch(BASE+'/',function(body){self.genres=P.options(body);return P.home(body);},force,'home');};
 Provider.prototype.options=function(){var self=this;return (this.genres?Promise.resolve():this.fetch(BASE+'/',function(body){self.genres=P.options(body);return {};},false,'options')).then(function(){return {genres:self.genres,order:[{value:'date',label:'Yeni eklenenler'},{value:'views',label:'Çok izlenenler'},{value:'imdb',label:'IMDb puanı'},{value:'year_desc',label:'Yayın yılı'}]};});};
 Provider.prototype.list=function(query,next,force){
  query=query||{};var f=query.filters||{},type=query.type==='series'?'series':'movie',url,sort={date:'newest',views:'views',imdb:'imdb',year_desc:'year_desc'}[query.order||'date'];
  if(f.year||f.language||f.imdb||type==='series'&&f.genre||f.genre&&!P.genre(f.genre)||!sort)return Promise.reject(new Error('Bu katalog filtresi desteklenmiyor.'));
  if(type==='series')url=BASE+'/api/series/new?page=1';
  else if(f.genre)url=BASE+'/api/films/category/'+new root.URL(f.genre).pathname.split('/')[2]+'?page=1&sort='+sort+'&limit=20';
  else{if(query.order&&query.order!=='date')return Promise.reject(new Error('Sıralama için önce bir film türü seçin.'));url=BASE+'/';}
  if(next){var expected=new root.URL(url),actual;try{actual=new root.URL(next.url);}catch(ignore){return Promise.reject(new Error('Geçersiz devam bağlantısı.'));}if(!P.safe(next.url)||actual.pathname!==expected.pathname||!/^\d+$/.test(P.param(next.url,'page')||'')||Number(P.param(next.url,'page'))<2||P.param(next.url,'sort')!==P.param(url,'sort')||P.param(next.url,'limit')!==P.param(url,'limit'))return Promise.reject(new Error('Geçersiz devam bağlantısı.'));url=actual.href;}
  return this.fetch(url,function(body){return P.list(body,url,type);},force,'list');
 };
 Provider.prototype.search=function(query,force){query=root.CatalogUtils.clean(query);if(query.length<2||query.length>100)return Promise.reject(new Error('Arama en az 2, en fazla 100 karakter olmalı.'));return this.fetch(BASE+'/api/search?q='+encodeURIComponent(query),P.search,force,'search');};
 Provider.prototype.detail=function(card,force){if(root.SiteAddresses)card=root.SiteAddresses.content(card);if(!P.contentUrl(card.pageUrl)||/\/sezon-/.test(card.pageUrl))return Promise.reject(new Error('Geçersiz detay bağlantısı.'));return this.fetch(card.pageUrl,function(body){return P.detail(body,card);},force,'detail');};
 Provider.prototype.seriesLanguage=function(card){if(root.SiteAddresses)card=root.SiteAddresses.content(card);return Promise.resolve({language:card.language||''});};root.HdfilmDelisiProvider=Provider;
})(window);


/* saglayicilar/p011/decoder.js */
/* Vixolity's literal encoding is decoded as text, never as JavaScript. */
(function(root){
 'use strict';
 function literal(s){return s.replace(/\\(x[0-9a-f]{2}|u[0-9a-f]{4}|[\\/'"])/gi,function(all,v){return v.charAt(0)==='x'||v.charAt(0)==='u'?String.fromCharCode(parseInt(v.slice(1),16)):v;});}
 function media(html){
  var re=/\(function\([^)]*\)\{([\s\S]*?)\}\)\('([0-9a-f]+)',\s*(\d{1,3})\);/gi,m,call,text,hex,shift,ascii,i,decoded,match;
  while((m=re.exec(html))){
   text=m[1];if(m[0].length>1024*1024||!text.match(/charCodeAt/)||!text.match(/reverse\(/)||!text.match(/atob\(/))continue;
   call=[m[0],m[2],m[3]];if(call[1].length%2)continue;
   hex=call[1];shift=Number(call[2]);if(shift>255)continue;ascii='';for(i=0;i<hex.length;i+=2)ascii+=String.fromCharCode(parseInt(hex.substr(i,2),16));ascii=ascii.split('').reverse().join('');
   if(!/^[A-Za-z0-9+/]+={0,2}$/.test(ascii)||ascii.length%4)continue;
   try{decoded=root.CryptoJS.enc.Base64.parse(ascii).toString(root.CryptoJS.enc.Latin1);}catch(ignore){continue;}
   text='';for(i=0;i<decoded.length;i++)text+=String.fromCharCode((decoded.charCodeAt(i)-shift+256)%256);
   match=/^\s*setupJWPlayer\(\s*['"]playerArea['"]\s*,\s*\{\s*file\s*:\s*'((?:\\(?:x[0-9a-f]{2}|u[0-9a-f]{4}|[\\/'"])|[^'\\\r\n])*)'\s*,/i.exec(text);
   if(!match)continue;var url=literal(match[1]);if(/^https:\/\/ha\.vixolity\.com\/vs\/[A-Za-z0-9_-]+(?:\/s[1-9]\d*\/e0*[1-9]\d*)?$/.test(url))return url;
  }throw new Error('Vixolity kaynak verisi çözümlenemedi.');
 }
 root.HdfilmDelisiDecoder={media:media};
})(window);


/* saglayicilar/p011/resolver.js */
(function (root) {
  'use strict';
  function fail(stage, message) {
    var e = new Error('HDFilmDelisi · ' + message);
    e.stage = stage;
    return e;
  }
  function Resolver(log, now) {
    this.log = log || function () {};
    this.now = now || Date.now;
    this.generation = 0;
    this.network = root.ChainNetwork.createClient({ destination: 'downloads' });
  }
  Resolver.prototype.cancel = function () {
    this.generation++;
    this.network.cancel();
  };
  Resolver.prototype.resolve = function (content, deadline, onProgress, hints) {
    this.cancel();
    var self = this,
      token = this.generation,
      P = root.HdfilmDelisiParser,
      embed,
      media;
    if (!P.contentUrl(content.pageUrl))
      return Promise.reject(fail('scope', 'Geçersiz film/bölüm adresi.'));
    if (this.now() >= deadline)
      return Promise.reject(fail('timeout', 'Kaynak hazırlama süresi doldu.'));
    function check() {
      if (token !== self.generation) {
        var e = fail('cancel', 'İptal edildi');
        e.cancelled = true;
        throw e;
      }
      if (self.now() >= deadline) throw fail('timeout', 'Kaynak hazırlama süresi doldu.');
    }
    var progress = root.SourceProgress && new root.SourceProgress(onProgress, hints),
      network =
        progress && progress.client ? progress.client(self.network, check, deadline) : self.network;
    function get(url, ref, stage, parse) {
      check();
      self.log('HDFilmDelisi: ' + stage);
      return network.get(url, ref, { 'User-Agent': 'Mozilla/5.0' }).then(
        function (r) {
          check();
          try {
            return parse(r);
          } catch (e) {
            e.stage = stage;
            throw e;
          }
        },
        function (e) {
          check();
          e.stage = stage;
          throw e;
        }
      );
    }
    return get(content.pageUrl, P.base + '/', 'page', function (r) {
      embed = root.HdfilmDelisiData.player(r.body).url;
      return embed;
    })
      .then(function () {
        return get(embed, content.pageUrl, 'embed', function (r) {
          media = root.HdfilmDelisiDecoder.media(r.body);
          return media;
        });
      })
      .then(function () {
        return get(media, embed, 'manifest', function (r) {
          if (!/^\s*#EXTM3U/.test(r.body))
            throw fail('manifest', 'Geçerli HLS manifesti alınamadı.');
          return [
            {
              id: 'hdfilmdelisi-vixolity',
              label: 'Vixolity',
              url: media,
              referer: embed,
              userAgent: 'Mozilla/5.0',
              destination: 'downloads',
              type: 'hls',
              status: 'ready',
              transport: /^XHR/.test(r.method) ? 'xhr' : 'native',
              seekMode: 'media-event',
              subtitles: [],
            },
          ];
        });
      });
  };
  root.HdfilmDelisiSourceResolver = Resolver;
})(window);


/* saglayicilar/p011/site.js */
(function(root){'use strict';root.SiteRegistry.register({id:'hdfilmdelisi',searchMetadata:true,name:'HDFilmDelisi',base:'https://hdfilmdelisi.one',mark:'FD',subtitle:'Film ve dizi kataloğu',prefix:'hdfilmdelisi:',storagePrefix:'site.hdfilmdelisi.',collectionKeys:['new'],posterBackground:'linear-gradient(145deg,#7444aa,#1b163d)',Provider:root.HdfilmDelisiProvider,Resolver:root.HdfilmDelisiSourceResolver,ui:{movieRail:'HDFilmDelisi filmleri',seriesRail:'HDFilmDelisi dizileri',filterHint:'Filmlerde tür; tür seçildiğinde sıralama kullanılabilir.',filterSummary:'Site filtresi',defaultOrder:'date'},collectionQuery:function(type){return {type:type,order:'date'};},filterFields:function(type,query){return type==='series'?[]:query&&query.filters&&query.filters.genre?['genres','order']:['genres'];}});})(window);


})(window);
