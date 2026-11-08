/* Generated from canonical site sources; edit deneme/siteler, then rebuild. */
(function(shared){'use strict';if(!shared.SitePluginRuntime)throw Error('Update core component to 1.8.0 before installing this site.');var context=shared.FilmPlugins.context(),window=shared.SitePluginRuntime.scope(context,'1.8.0');

/* siteler/turkcefilmler/turkcefilmler-parser.js */
/* General films only. No remote scripts are executed or inserted into the UI. */
(function(root){
 'use strict';var U=root.CatalogUtils,BASE=(root.SiteAddresses ? root.SiteAddresses.base('turkcefilmler', 'https://turkcefilmler.to') : 'https://turkcefilmler.to');
 var genres=['aksiyon','animasyon','belgesel','bilim-kurgu','dram','fantastik','gerilim','gizem','komedi','korku','macera','muzikal','romantik','savas','suc','tarih','western','aile','biyografi','spor'];
 function clean(v){return U.clean(v);}
 function text(n,q){var v=n&&(q?n.querySelector(q):n);return clean(v&&v.textContent);}
 function blocked(v){return /(?:erotik|porno|porn|seks|sex|xxx|seduction|step[- ]?mom|babysitter-16)/i.test(String(v||''));}
 function safe(value,page){var u=U.url(value,page||BASE+'/');try{var p=new root.URL(u);return p.origin===BASE&&!p.username&&!p.password&&!blocked(decodeURIComponent(p.pathname))?u:'';}catch(ignore){return '';}}
 function movieUrl(value){var u=safe(value);return u&&/^\/[a-z0-9-]+\/$/.test(new root.URL(u).pathname)&&!/^\/(arama|page|izle|yapim)\/$/.test(new root.URL(u).pathname)?u:'';}
 function id(url){return 'turkcefilmler:movie:'+new root.URL(url).pathname.replace(/^\/+|\/+$/g,'');}
 function number(v){var m=/\d+(?:[.,]\d+)?/.exec(v);return m?Number(m[0].replace(',','.')):null;}
 function image(n,page){var i=n&&n.querySelector('img');return i?U.url(i.getAttribute('data-src')||i.getAttribute('data-catalog-src'),page):'';}
 function genreUrl(value){var u=safe(value),m=u&&/^\/izle\/([a-z-]+)-filmleri-izle\/$/.exec(new root.URL(u).pathname);return m&&genres.indexOf(m[1])>=0?u:'';}
 function card(box,page){var a=box.querySelector('a.image[href]'),u=movieUrl(a&&U.url(a.getAttribute('href'),page)),title=text(box,'h2');if(!u||!title||blocked(title))return null;return {contentId:id(u),providerId:'turkcefilmler',type:'movie',pageUrl:u,title:title,poster:image(box,page),year:number(text(box,'.year')),imdb:number(text(box,'.imdb')),language:text(box,'.box.type')};}
 function list(body,page){var d=U.envelope(body).doc,seen={},cards=[],scope=d.querySelector('main .lists')||d.querySelector('main');if(!scope)throw new Error('Türkçe Filmler katalog biçimi tanınamadı.');Array.prototype.forEach.call(scope.querySelectorAll('.move_k'),function(n){var c=card(n,page);if(c&&!seen[c.contentId]){seen[c.contentId]=true;cards.push(c);}});var current=Number((/\/page\/(\d+)\//.exec(page)||[])[1]||1),next=null;Array.prototype.forEach.call(d.querySelectorAll('a[href]'),function(a){var u=safe(a.getAttribute('href'),page),p=u&&new root.URL(u),m=p&&/\/page\/(\d+)\/$/.exec(p.pathname),base=new root.URL(page).pathname.replace(/page\/\d+\/$/,'');if(m&&Number(m[1])===current+1&&p.pathname===base+'page/'+(current+1)+'/'){var ord=/[?&]ord=([234])(?:&|$)/.exec(page);next={kind:'url',url:p.origin+p.pathname+(ord?'?ord='+ord[1]:'')};}});return {cards:cards,next:next};}
 function options(body){var d=U.envelope(body).doc,out=[],seen={};Array.prototype.forEach.call(d.querySelectorAll('a[href]'),function(a){var u=genreUrl(a.getAttribute('href'));if(u&&!seen[u]){seen[u]=true;out.push({value:u,label:text(a).replace(/\s+filmleri\s+izle/i,'')});}});return out;}
 function detail(body,original){var url=movieUrl(original.pageUrl);if(!url)throw new Error('Bu içerik genel film kapsamı dışında.');var d=U.envelope(body).doc,info=d.querySelector('#video_infos'),title=text(d,'h1 [itemprop="name"]').replace(/\s+izle$/i,''),links=info?info.querySelectorAll('.detail a[href*="/izle/"]'):[],gs=[],allowed=links.length>0;if(!info||!title||blocked(title))allowed=false;Array.prototype.forEach.call(links,function(a){if(!genreUrl(a.getAttribute('href')))allowed=false;else gs.push(text(a).replace(/\s+filmleri\s+izle/i,''));});if(!allowed){var e=new Error('Yalnız tür bilgisi doğrulanmış genel filmler destekleniyor.');e.stage='scope';throw e;}var result={contentId:id(url),providerId:'turkcefilmler',type:'movie',pageUrl:url,title:title,poster:image(info,url),year:number(text(info,'.year')),imdb:number(text(info,'.imdb')),language:text(info,'.box.type'),description:text(info,'[itemprop="description"]'),originalTitle:text(info,'.titles .orj').replace(/\s+izle$/i,''),genres:gs,cast:[],seasons:[],episodes:[],sources:[],subtitles:[]};Array.prototype.forEach.call(info.querySelectorAll('[itemprop="actor"]'),function(a){result.cast.push(text(a));});Array.prototype.forEach.call(info.querySelectorAll('.detail > span'),function(n){if(text(n,'small')==='Film Süresi')result.duration=text(n,'p');});return result;}
 function home(body){var d=U.envelope(body).doc,scope=d.querySelector('main .own-carousel'),seen={},cards=[];if(!scope)return list(body,BASE+'/');Array.prototype.forEach.call(scope.querySelectorAll('.move_k'),function(n){var c=card(n,BASE+'/');if(c&&!seen[c.contentId]&&cards.length<12){seen[c.contentId]=true;cards.push(c);}});return {cards:cards,next:null};}
 root.TurkceFilmlerParser={base:BASE,safe:safe,movieUrl:movieUrl,id:id,blocked:blocked,genreUrl:genreUrl,list:list,home:home,options:options,detail:detail};
})(window);


/* siteler/turkcefilmler/turkcefilmler-provider.js */
(function(root){
 'use strict';var P=root.TurkceFilmlerParser,Client=root.CatalogClient,BASE=P.base;
 function Provider(cache,network){Client.call(this,cache,network||root.ChainNetwork.createClient({destination:'downloads'}),{base:BASE,headers:{Accept:'text/html','User-Agent':'Mozilla/5.0'}});}
 Provider.prototype=Object.create(Client.prototype);Provider.prototype.constructor=Provider;
 Provider.prototype.fetch=function(url,parse,force,scope){if(!P.safe(url))return Promise.reject(new Error('Genel film kapsamı dışında bağlantı.'));return this.request(url,null,parse,force,'turkcefilmler-v081-'+scope);};
 Provider.prototype.detail=function(card,force){if(root.SiteAddresses)card=root.SiteAddresses.content(card);if(!P.movieUrl(card.pageUrl))return Promise.reject(new Error('Genel film kapsamı dışında içerik.'));return this.fetch(card.pageUrl,function(body){return P.detail(body,card);},force,'detail');};
 /* Nothing is exposed to cards/poster loading until its actual detail genres pass the gate. */
 Provider.prototype.verify=function(data,force){var self=this,token=this.generation,index=0,lastError=null,result=new Array(data.cards.length);function worker(){if(token!==self.generation)return Promise.reject(new Error('İptal edildi'));if(index>=data.cards.length)return Promise.resolve();var i=index++;return self.detail(data.cards[i],force).then(function(v){result[i]=v;},function(e){if(token!==self.generation)throw e;if(e.stage!=='scope')lastError=e;}).then(worker);}return Promise.all([worker(),worker()]).then(function(){if(token!==self.generation)throw new Error('İptal edildi');data.cards=result.filter(function(c){return !!c;});if(!data.cards.length&&lastError)throw lastError;return data;});};
 Provider.prototype.home=function(force){var self=this,url=BASE+'/';return this.fetch(url,function(body){self.genres=P.options(body);return P.home(body);},force,'home').then(function(data){return self.verify(data,force);}).then(function(data){return {hero:data.cards[0]||null,movies:data.cards,series:[],next:data.next};});};
 Provider.prototype.options=function(){var self=this;return (this.genres?Promise.resolve():this.fetch(BASE+'/',function(body){self.genres=P.options(body);return {genres:self.genres};},false,'options')).then(function(){return self.filterOptions={genres:self.genres,order:[{value:'date',label:'Yeni eklenenler'},{value:'views',label:'En çok izlenenler'},{value:'comments',label:'En çok yorumlananlar'},{value:'imdb',label:'IMDb puanı'}]};});};
 Provider.prototype.list=function(query,next,force){query=query||{};var self=this,f=query.filters||{},url=next&&next.url||f.genre||query.url||BASE+'/';if(query.type==='series'||f.year||f.language||f.imdb||f.genre&&!P.genreUrl(f.genre))return Promise.reject(new Error('Bu filtre genel film kataloğunda desteklenmiyor.'));if(query.order&&query.order!=='date'&&!f.genre&&!next)return Promise.reject(new Error('Sıralama için önce bir film türü seçin.'));if(!next){var u=new root.URL(url),ord={views:'2',comments:'3',imdb:'4'}[query.order];url=u.origin+u.pathname+(ord?'?ord='+ord:'');}return this.fetch(url,function(body){return P.list(body,url);},force,'list').then(function(data){return self.verify(data,force);});};
 Provider.prototype.search=function(query,force,next){var self=this;query=root.CatalogUtils.clean(query);if(!query||query.length>100||P.blocked(query))return Promise.reject(new Error('Genel film adı 1–100 karakter olmalı.'));var first=BASE+'/arama/?s='+encodeURIComponent(query),url=root.CatalogSearch.pageUrl(first,next);return this.fetch(url,function(body){return root.CatalogSearch.pageResult(P.list(body,url),first,url);},force,'search').then(function(data){return self.verify(data,force);});};
 Provider.prototype.seriesLanguage=function(){return Promise.resolve({language:''});};root.TurkceFilmlerProvider=Provider;
})(window);


/* siteler/turkcefilmler/turkcefilmler-decoder.js */
/* Literal data readers, not a JavaScript interpreter. No eval/Function/site scripts. */
(function(root){
 'use strict';function failure(message){var e=new Error('Türkçe Filmler · '+message);e.stage='decode';return e;}
 function literal(input,start){var quote=input.charAt(start),out='',i=start+1;if(quote!=="'"&&quote!=='"')throw failure('Veri dizesi bekleniyordu.');for(;i<input.length;i++){var c=input.charAt(i);if(c===quote)return {value:out,end:i+1};if(c==='\\'){c=input.charAt(++i);var escaped={n:'\n',r:'\r',t:'\t',b:'\b',f:'\f',v:'\v'};if(c==='x'||c==='u'){var size=c==='x'?2:4,hex=input.substr(i+1,size);if(!new RegExp('^[0-9a-fA-F]{'+size+'}$').test(hex))throw failure('Geçersiz veri kaçışı.');out+=String.fromCharCode(parseInt(hex,16));i+=size;}else if(c==='\\'||c==='/'||c==="'"||c==='"')out+=c;else if(escaped[c])out+=escaped[c];else throw failure('Desteklenmeyen veri kaçışı.');}else out+=c;}throw failure('Eksik veri dizesi.');}
 function base64(v){if(!/^[A-Za-z0-9+/]+={0,2}$/.test(v)||v.length%4!==0||v.length>65536)throw failure('Geçersiz iframe verisi.');try{return root.CryptoJS.enc.Base64.parse(v).toString(root.CryptoJS.enc.Utf8);}catch(ignore){throw failure('Iframe verisi okunamadı.');}}
 function frames(body){var values=[],m,re=/\bvar\s+ilkpartkod\s*=\s*(['"])([A-Za-z0-9+/=]{1,65536})\1/g;while((m=re.exec(body)))values.push(base64(m[2]));/* The verified template prepends this literal fragment to each part. */var prefix=/\brvali\(\s*'BSZtFmcmlGP'\s*\)/.test(body)?'PGlmcmFtZSB':'';re=/\bpdata\[['"]prt_\d+['"]\]\s*=\s*(['"])([A-Za-z0-9+/=]{1,65536})\1/g;while(prefix&&(m=re.exec(body)))values.push(base64(prefix+m[2]));var out=[];values.forEach(function(html){var m=/^\s*<iframe\b[^>]*\bsrc\s*=\s*(['"])(https:\/\/player\.filmizle\.in\/video\/[a-f0-9]{32})\1/i.exec(html);if(m&&out.indexOf(m[2])<0)out.push(m[2]);});return out;}
 function unpack(body){var marker=/\beval\(function\(p,a,c,k,e,d\)[\s\S]*?return p\}\(/.exec(body);if(!marker)throw failure('Oynatıcı veri biçimi tanınamadı.');var pos=marker.index+marker[0].length,payload=literal(body,pos);var tail=/^\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*/.exec(body.slice(payload.end));if(!tail)throw failure('Oynatıcı sözlüğü eksik.');var radix=Number(tail[1]),count=Number(tail[2]);if(radix<2||radix>62||count>4096)throw failure('Oynatıcı sözlüğü sınırı aşıldı.');var dictionary=literal(body,payload.end+tail[0].length);if(!/^\.split\('\|'\),0,\{\}\)\)/.test(body.slice(dictionary.end)))throw failure('Beklenmeyen oynatıcı sözlüğü.');var keys=dictionary.value.split('|');if(keys.length!==count)throw failure('Eksik oynatıcı sözlüğü.');function index(token){var n=0;for(var i=0;i<token.length;i++){var c=token.charCodeAt(i),v=c>=97?c-87:c>=65?c-29:c-48;if(v<0||v>=radix)return -1;n=n*radix+v;if(n>=count)return -1;}return n;}return payload.value.replace(/\b[0-9A-Za-z]+\b/g,function(word){var i=index(word);return i>=0&&keys[i]?keys[i]:word;});}
 function settings(body){var data=unpack(body),m=/\bFirePlayer\(\s*(['"])([a-f0-9]{32})\1\s*,\s*/.exec(data);if(!m)throw failure('Aktif oynatıcı ayarı bulunamadı.');var start=m.index+m[0].length,depth=0,quoted=false,escape=false,end=-1;for(var i=start;i<data.length;i++){var c=data.charAt(i);if(quoted){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')quoted=false;}else if(c==='"')quoted=true;else if(c==='{')depth++;else if(c==='}'&&--depth===0){end=i+1;break;}}var config;try{config=JSON.parse(data.slice(start,end));}catch(ignore){throw failure('Oynatıcı ayarı JSON değil.');}if(!config||!Array.isArray(config.tracks))throw failure('Oynatıcı ayarı eksik.');var subtitles=[];config.tracks.forEach(function(t){if(t.kind==='captions'&&typeof t.file==='string'&&/^https:\/\/newmoviescenas[0-9]+\.shop\/y\/[A-Za-z0-9_-]+\.jpg$/.test(t.file))subtitles.push({url:t.file,label:t.label||'Altyazı',language:t.language||'',type:'vtt'});});return {hash:m[2],api:'https://player.filmizle.in/player/index.php?data='+m[2]+'&do=getVideo',subtitles:subtitles};}
 function media(body){var data;try{data=JSON.parse(body);}catch(ignore){throw failure('Oynatıcı API yanıtı JSON değil.');}var u=data&&data.videoSource;if(data.hls!==true||typeof u!=='string'||!/^https:\/\/player\.filmizle\.in\/cdn\/hls\/[a-f0-9]{32}\/master\.txt$/.test(u))throw failure('Desteklenen HLS kaynağı bulunamadı.');return u;}
 root.TurkceFilmlerDecoder={frames:frames,settings:settings,media:media};
})(window);


/* siteler/turkcefilmler/turkcefilmler-resolver.js */
(function (root) {
  'use strict';
  function fail(stage, message) {
    var e = new Error('Türkçe Filmler · ' + message);
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
      P = root.TurkceFilmlerParser,
      D = root.TurkceFilmlerDecoder,
      sources = [],
      options = [],
      lastError,
      progress = root.SourceProgress && new root.SourceProgress(onProgress, hints);
    if (!P.movieUrl(content.pageUrl))
      return Promise.reject(fail('scope', 'Bu içerik genel film kapsamı dışında.'));
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
    function request(promise, stage) {
      return promise.then(
        function (r) {
          check();
          return r;
        },
        function (e) {
          check();
          e.stage = stage;
          throw e;
        }
      );
    }
    function get(url, ref, stage) {
      check();
      return request(network.get(url, ref, { 'User-Agent': 'Mozilla/5.0' }), stage);
    }
    return get(content.pageUrl, P.base + '/', 'page')
      .then(function (page) {
        P.detail(page.body, content);
        var links = D.frames(page.body);
        if (!links.length) throw fail('embed', 'Desteklenen oynatıcı bağlantısı bulunamadı.');
        var queue = links.map(function (url, i) {
          var option = {
            sourceId: 'turkcefilmler-' + i,
            label: 'DUAL' + (i ? ' ' + (i + 1) : ''),
            status: 'pending',
          };
          options.push(option);
          return { url: url, index: i, option: option };
        });
        function publish() {
          if (progress) progress.publish(sources, options);
        }
        publish();
        if (progress)
          queue = progress.order(queue, function (entry) {
            return { id: entry.option.sourceId, label: entry.option.label, type: 'hls' };
          });
        return queue.reduce(function (p, entry) {
          var url = entry.url,
            index = entry.index,
            option = entry.option;
          return p.then(function () {
            return (progress ? progress.wait(check) : Promise.resolve().then(check))
              .then(function () {
                return get(url, content.pageUrl, 'embed');
              })
              .then(function (embed) {
                var data = D.settings(embed.body);
                check();
                /* The embed receives the parent origin as document.referrer. The API rejects some full movie paths. */
                return request(
                  network.post(
                    data.api,
                    'hash=' + data.hash + '&r=' + encodeURIComponent(P.base + '/'),
                    {
                      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                      'X-Requested-With': 'XMLHttpRequest',
                    }
                  ),
                  'api'
                ).then(function (response) {
                  var media = D.media(response.body);
                  return get(media, url, 'manifest').then(function (manifest) {
                    if (!/^\s*#EXTM3U/.test(manifest.body))
                      throw fail('manifest', 'HLS manifesti alınamadı.');
                    sources.push({
                      id: 'turkcefilmler-' + index,
                      label: 'DUAL' + (index ? ' ' + (index + 1) : ''),
                      url: media,
                      referer: url,
                      userAgent: 'Mozilla/5.0',
                      destination: 'downloads',
                      type: 'hls',
                      status: 'ready',
                      transport: /^XHR/.test(manifest.method) ? 'xhr' : 'native',
                      seekMode: 'media-event',
                      subtitles: data.subtitles,
                    });
                    option.status = 'ready';
                    option.detail = 'HLS erişimi doğrulandı';
                    publish();
                  });
                });
              })
              .catch(function (e) {
                check();
                lastError = e;
                option.status = 'error';
                option.stage = e.stage || 'embed';
                option.detail = e.message;
                publish();
                self.log('Türkçe Filmler: ' + (e.stage || 'embed') + ' aşaması başarısız.');
              });
          });
        }, Promise.resolve());
      })
      .then(function () {
        check();
        if (progress && progress.enabled) sources.options = options;
        if (!sources.length) {
          var e = lastError || fail('decode', 'Oynatılabilir kaynak bulunamadı.');
          e.sourceOptions = options;
          throw e;
        }
        return sources;
      });
  };
  root.TurkceFilmlerSourceResolver = Resolver;
})(window);


/* siteler/turkcefilmler/site.js */
(function(root){'use strict';root.SiteRegistry.register({id:'turkcefilmler',name:'Türkçe Filmler',base:'https://turkcefilmler.to',mark:'TF',subtitle:'Genel film kataloğu',prefix:'turkcefilmler:',storagePrefix:'site.turkcefilmler.',contentTypes:['movie'],collectionKeys:['new'],posterBackground:'linear-gradient(145deg,#206d67,#112731)',Provider:root.TurkceFilmlerProvider,Resolver:root.TurkceFilmlerSourceResolver,ui:{movieRail:'Öne çıkan genel filmler',recommended:'En çok izlenenler',liked:'En çok yorumlananlar',filterHint:'Genel filmler; türü doğrulanamayan ve yetişkin içerikler alınmaz.',filterSummary:'Site filtresi',defaultOrder:'date'},collectionQuery:function(type,key){return {type:'movie',order:{new:'date',recommended:'views',rated:'imdb',liked:'comments'}[key]};},filterFields:function(type,query){return query&&query.filters&&query.filters.genre?['genres','order']:['genres'];}});})(window);


})(window);
