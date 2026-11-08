/* Generated from canonical site sources; edit deneme/siteler, then rebuild. */
(function(shared){'use strict';if(!shared.SitePluginRuntime)throw Error('Update core component to 1.8.0 before installing this site.');var context=shared.FilmPlugins.context(),window=shared.SitePluginRuntime.scope(context,'1.8.0');

/* siteler/sinemacc/sinemacc-parser.js */
/* Sinemacc catalog data from an inert document; page scripts never enter the app. */
(function (root) {
 'use strict'; var U = root.CatalogUtils, BASE = (root.SiteAddresses ? root.SiteAddresses.base('sinemacc', 'https://sinemacc.com') : 'https://sinemacc.com');
 function text(node, selector) { var n = node && (selector ? node.querySelector(selector) : node); return U.clean(n && n.textContent); }
 function safe(value, page) { var url = U.url(value, page || BASE + '/'), u; try { u = new root.URL(url); } catch (ignore) {} return u && u.origin === BASE && !u.username && !u.password ? url : ''; }
 function movieUrl(value) { var url = safe(value), u = url && new root.URL(url); return u && !u.search && /^\/film\/[a-z0-9-]+\/$/.test(u.pathname) ? url : ''; }
 function catalogUrl(value) { var url = safe(value), u = url && new root.URL(url); return u && /^(?:\/|\/(?:populer-filmler|imdb-top-250|en-cok-yorumlanan-filmler|film-arsivi|arama)\/|\/tur\/[a-z0-9-]+\/)(?:page\/[1-9]\d*\/)?$/.test(u.pathname) ? url : ''; }
 function id(url) { var value = movieUrl(url); return value ? 'sinemacc:movie:' + new root.URL(value).pathname.split('/')[2] : ''; }
 function number(value) { var m = /\d+(?:[.,]\d+)?/.exec(String(value || '')); return m ? Number(m[0].replace(',', '.')) : null; }
 function image(node, page) { var n = node && node.querySelector('img'); return U.url(n && (n.getAttribute('data-src') || n.getAttribute('data-catalog-src')), page); }
 function language(node) {
  var dub = false, sub = false;
  Array.prototype.forEach.call(node.querySelectorAll('use'), function (u) { var icon = u.getAttribute('href') || u.getAttribute('xlink:href') || ''; if (/#icon_flag_tr$/.test(icon)) dub = true; if (/#icon_subtitle$/.test(icon)) sub = true; });
  Array.prototype.forEach.call(node.querySelectorAll('.type'), function (n) { var s = text(n); if (/Dublaj/i.test(s)) dub = true; if (/Altyaz/i.test(s)) sub = true; });
  return dub && sub ? 'Dublaj & Altyazılı' : dub ? 'Türkçe Dublaj' : sub ? 'Türkçe Altyazılı' : '';
 }
 function unwrap(body) { if (/^\s*\{/.test(body)) { var json = JSON.parse(body); if (typeof json.ajaxpagi_filmler !== 'string') throw new Error('Sinemacc liste yanıtı değişti.'); return json.ajaxpagi_filmler; } return body; }
 function cards(doc, page) {
  var out = [], seen = {};
  Array.prototype.forEach.call(doc.querySelectorAll('.film_kutusu, .film_uzun_kutu'), function (box) {
   var a = box.querySelector('a[href]'), url = movieUrl(safe(a && a.getAttribute('href'), page)), title = text(box, '.title .text, .detay > .baslik'), year = /\b((?:19|20)\d{2})\b/.exec(text(box, '.years'));
   if (!url || !title || seen[url]) return; seen[url] = true;
   out.push({ contentId: id(url), providerId: 'sinemacc', type: 'movie', pageUrl: url, title: title, poster: image(box, page), year: year ? Number(year[1]) : null, imdb: number(text(box, '.imdb')), language: language(box) });
  }); return out;
 }
 function literalNumber(body, name) { var m = new RegExp('\\b(?:let|var|const)\\s+' + name + '\\s*=\\s*["\']?(\\d+)["\']?\\s*;').exec(body); return m ? Number(m[1]) : null; }
 function next(doc, body, page, archivePage) {
  var a = doc.querySelector('.pagination a.next'), rel = a && Number(a.getAttribute('rel')), target = a && catalogUrl(U.url(a.getAttribute('href'), page));
  if (archivePage) return rel === archivePage + 1 ? { kind: 'sinemacc-archive', page: rel } : null;
  var current = literalNumber(body, 'currentPage'), total = literalNumber(body, 'totalpages'), m = /\b(?:let|var|const)\s+load_adres\s*=\s*(['"])(https:\/\/[^'"\s]+)\1/.exec(body), base = m && catalogUrl(m[2]);
  if (target && target !== page) return { kind: 'url', url: target };
  if (!base || !current || !total || current >= total || total > 100000) return null;
  var parsed = new root.URL(page), b = new root.URL(base), rootPath = parsed.pathname.replace(/page\/\d+\/$/, '');
  if (b.pathname !== rootPath) return null;
  return { kind: 'url', url: BASE + rootPath + 'page/' + (current + 1) + '/' + parsed.search };
 }
 function list(body, page, archivePage) { if(root.SiteAddresses)page=root.SiteAddresses.resolve(page);
  body = unwrap(body); var doc = U.envelope(body).doc, all = cards(doc, page);
  if (!all.length && !doc.querySelector('#iceri_cek, #jcontent, #arsiv_ust') && !/sonu[çc].{0,50}(?:bulunamad|yok)|bulunamad[ıi]/i.test(text(doc.body))) throw new Error('Sinemacc katalog biçimi tanınamadı.');
  return { cards: all, next: next(doc, body, page, archivePage) };
 }
 function home(body) { var data = list(body, BASE + '/'); if (!data.cards.length) throw new Error('Sinemacc ana kataloğu boş.'); return { hero: data.cards[0], movies: data.cards, series: [], next: data.next }; }
 function options(body) {
  var d = U.envelope(body).doc, result = {};
  [['genres','rcat'],['years','rdate'],['lang','rdil'],['imdb','rimdb']].forEach(function (pair) {
   var select = d.querySelector('select[name="' + pair[1] + '"]'); if (!select) throw new Error('Sinemacc filtre alanı bulunamadı.');
   result[pair[0]] = Array.prototype.map.call(select.querySelectorAll('option[value]'), function (o) { var v = o.getAttribute('value'); return { value: pair[0] === 'imdb' && v ? v + '-10' : v, label: text(o) }; }).filter(function (o) { return /^\d+(?:-10)?$/.test(o.value) && !(pair[0] === 'lang' && o.value === '76'); });
  }); return result;
 }
 function detail(body, original) {
  var page = movieUrl(original.pageUrl), env = U.envelope(body), d = env.doc, heading = d.querySelector('h1.baslik'), schema = env.schema.filter(function (s) { return s['@type'] === 'Movie'; })[0];
  if (!page || !heading || !schema) throw new Error('Sinemacc film detayı tanınamadı.');
  // Bind the schema's WatchAction to the requested film.
  var target = schema.potentialAction && schema.potentialAction.target, entry = Array.isArray(target) && target[0], bound = entry && movieUrl(entry.urlTemplate);
  if (bound && bound !== page) throw new Error('Sinemacc film kimliği yanıtla eşleşmiyor.');
  var meta = heading.parentNode.parentNode, result = { contentId: id(page), providerId: 'sinemacc', type: 'movie', pageUrl: page, title: text(heading).replace(/\s+İzle$/i, ''), originalTitle: '', poster: U.url(typeof schema.image === 'string' ? schema.image : '', page) || original.poster || '', description: text(meta, '.kategori_aciklama'), year: Number(String(schema.dateCreated || schema.datePublished || '').slice(0,4)) || original.year || null, imdb: number(schema.aggregateRating && schema.aggregateRating.ratingValue) || original.imdb || null, duration: '', cast: [], genres: [], language: original.language || '', episodes: [], seasons: [], sources: [], subtitles: [] };
  var alt = U.clean(schema.alternateName || text(meta, 'h2.orj')), minutes = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(schema.duration || ''); if (alt.length > 1 && alt !== result.title) result.originalTitle = alt;
  if (minutes) result.duration = (Number(minutes[1] || 0) * 60 + Number(minutes[2] || 0)) + ' dk';
  if (!result.description && schema.description) result.description = text(U.envelope(schema.description).doc.body);
  (Array.isArray(schema.actor) ? schema.actor : []).slice(0,60).forEach(function (a) { var name = U.clean(a.name); if (name) result.cast.push(name); });
  Array.prototype.forEach.call(meta.querySelectorAll('a[href]'), function (a) { var url = safe(a.getAttribute('href')), label = text(a); if (url && /\/tur\//.test(url) && label && result.genres.indexOf(label) < 0) result.genres.push(label); if (url && /\/dil\//.test(url) && /Türkçe\s+(?:Dublaj|Altyaz)/i.test(label)) { if (/Dublaj/i.test(label)) result.language = /Altyaz/.test(result.language) ? 'Dublaj & Altyazılı' : 'Türkçe Dublaj'; else result.language = /Dublaj/.test(result.language) ? 'Dublaj & Altyazılı' : 'Türkçe Altyazılı'; } });
  return result;
 }
 root.SinemaccParser = { base: BASE, safe: safe, movieUrl: movieUrl, catalogUrl: catalogUrl, id: id, home: home, list: list, detail: detail, options: options };
})(window);


/* siteler/sinemacc/sinemacc-provider.js */
(function (root) {
 'use strict'; var P = root.SinemaccParser, BASE = P.base;
 function Provider(cache, network) { root.CatalogClient.call(this, cache, network || root.ChainNetwork.createClient({destination:'downloads',preferXHR:true}), {base:BASE,identitySelectors:'.imdb_link[href]',headers:{Accept:'text/html','User-Agent':'Mozilla/5.0'},postHeaders:{'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'}}); }
 Provider.prototype = Object.create(root.CatalogClient.prototype); Provider.prototype.constructor = Provider;
 Provider.prototype.fetch = function (url, parse, force, scope, body) { if (!P.safe(url)) return Promise.reject(new Error('Sinemacc dışı istek reddedildi.')); return this.request(url, body || null, parse, force, 'sinemacc0130-' + scope); };
 Provider.prototype.home = function (force) { return this.fetch(BASE+'/', P.home, force, 'home'); };
 Provider.prototype.options = function () { var self=this; return self.filterOptions ? Promise.resolve(self.filterOptions) : self.fetch(BASE+'/film-arsivi/',P.options,false,'options').then(function (o) { self.filterOptions=o;return o; }); };
 Provider.prototype.list = function (query, next, force) {
  query=query||{};var self=this,f=query.filters||{},filtered=!!(f.genre||f.year||f.language||f.imdb),url=query.url||BASE+'/';
  if(query.type==='series')return Promise.reject(new Error('Sinemacc film kataloğu sunuyor.'));
  if(filtered) return this.options().then(function (options) {
   var values={genres:f.genre||'',years:f.year||'',lang:f.language||'',imdb:f.imdb||''};
   Object.keys(values).forEach(function (key) { if(values[key]&&!options[key].some(function(o){return o.value===String(values[key]);}))throw new Error('Sinemacc filtresi geçersiz.'); });
   var signature=JSON.stringify(values),page=next&&next.page||1;
   if(next&&(next.kind!=='sinemacc-archive'||next.signature!==signature||!isFinite(page)||page%1||page<2||page>100000))throw new Error('Geçersiz Sinemacc devam isteği.');
   var fields={action:'ajax_archive',rdil:values.lang,rdate:values.years,rtip:'',rcat:values.genres,rimdb:values.imdb.split('-')[0],sayfano:page},body=Object.keys(fields).map(function(k){return k+'='+encodeURIComponent(fields[k]);}).join('&');
   return self.fetch(BASE+'/film-arsivi/',function(body){var result=P.list(body,BASE+'/film-arsivi/',page);if(result.next)result.next.signature=signature;return result;},force,'filter',body);
  });
  if(next){if(next.kind!=='url'||!P.catalogUrl(next.url))return Promise.reject(new Error('Geçersiz Sinemacc devam bağlantısı.'));var a=new root.URL(url),b=new root.URL(next.url),m=/\/page\/(\d+)\/$/.exec(b.pathname);if(!m||Number(m[1])<2||b.pathname.replace(/page\/\d+\/$/,'')!==a.pathname.replace(/page\/\d+\/$/,'')||b.search!==a.search)return Promise.reject(new Error('Sinemacc devam bağlantısı listeyle eşleşmiyor.'));url=next.url;}
  if(!P.catalogUrl(url))return Promise.reject(new Error('Geçersiz Sinemacc katalog adresi.'));
  return this.fetch(url,function(body){return P.list(body,url);},force,'list');
 };
 Provider.prototype.search = function (query,force,next) { query=root.CatalogUtils.clean(query);if(!query||query.length>100)return Promise.reject(new Error('Arama 1–100 karakter olmalı.'));var first=BASE+'/arama/?s='+encodeURIComponent(query),url=root.CatalogSearch.pageUrl(first,next);return this.fetch(url,function(body){return root.CatalogSearch.pageResult(P.list(body,url),first,url);},force,'search'); };
 Provider.prototype.detail = function (card,force) {if(root.SiteAddresses)card=root.SiteAddresses.content(card); if(!P.movieUrl(card.pageUrl))return Promise.reject(new Error('Geçersiz Sinemacc film adresi.'));return this.fetch(card.pageUrl,function(body){return P.detail(body,card);},force,'detail'); };
 Provider.prototype.seriesLanguage = function () { return Promise.resolve({language:''}); };
 root.SinemaccProvider=Provider;
})(window);


/* siteler/sinemacc/sinemacc-decoder.js */
/* Parse literal FirePlayer data. Packed page JavaScript is never evaluated. */
(function (root) {
 'use strict'; var BASE='https://player.filmizle.in';
 function failure(message) { var e=new Error('Sinemacc · '+message);e.stage='decode';return e; }
 function literal(input,start) {
  var quote=input.charAt(start),out='',i=start+1;if(quote!=="'"&&quote!=='"')throw failure('Veri dizesi bekleniyordu.');
  for(;i<input.length;i++){var c=input.charAt(i);if(c===quote)return {value:out,end:i+1};if(c==='\\'){c=input.charAt(++i);var escapes={n:'\n',r:'\r',t:'\t',b:'\b',f:'\f',v:'\v'};if(c==='x'||c==='u'){var size=c==='x'?2:4,hex=input.substr(i+1,size);if(!new RegExp('^[0-9a-fA-F]{'+size+'}$').test(hex))throw failure('Geçersiz veri kaçışı.');out+=String.fromCharCode(parseInt(hex,16));i+=size;}else if(c==='\\'||c==='/'||c==="'"||c==='"')out+=c;else if(escapes[c])out+=escapes[c];else throw failure('Desteklenmeyen veri kaçışı.');}else out+=c;if(out.length>1048576)throw failure('Oynatıcı verisi sınırı aşıldı.');}throw failure('Eksik veri dizesi.');
 }
 function unpack(body) {
  if(typeof body!=='string'||body.length>2097152)throw failure('Oynatıcı yanıtı sınırı aşıldı.');
  var marker=/\beval\(function\(p,a,c,k,e,d\)[\s\S]*?return p\}\(/.exec(body);if(!marker)throw failure('Oynatıcı veri biçimi tanınamadı.');
  var payload=literal(body,marker.index+marker[0].length),tail=/^\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*/.exec(body.slice(payload.end));if(!tail)throw failure('Oynatıcı sözlüğü bulunamadı.');
  var radix=Number(tail[1]),count=Number(tail[2]);if(radix<2||radix>62||count<1||count>4096)throw failure('Oynatıcı sözlüğü sınırı aşıldı.');
  var dictionary=literal(body,payload.end+tail[0].length),keys=dictionary.value.split('|');if(keys.length!==count||!/^\.split\(['"]\|['"]\),0,\{\}\)\)/.test(body.slice(dictionary.end)))throw failure('Geçersiz oynatıcı sözlüğü.');
  function index(word){var n=0;for(var i=0;i<word.length;i++){var c=word.charCodeAt(i),v=c>=97?c-87:c>=65?c-29:c-48;if(v<0||v>=radix)return -1;n=n*radix+v;if(n>=count)return -1;}return n;}
  return payload.value.replace(/\b[0-9A-Za-z]+\b/g,function(word){var i=index(word);return i>=0&&keys[i]?keys[i]:word;});
 }
 function embed(value) { try { var u=new root.URL(value),m=/^\/(?:video|embed)\/([a-zA-Z0-9]{8,32})$/.exec(u.pathname);if(u.origin!==BASE||u.username||u.password||u.hash||!m||u.search&&!/^\?lng=(?:tur|trsub|orig)$/.test(u.search))return null;return {url:u.href,id:m[1]}; }catch(ignore){return null;} }
 function decode64(value) { if(!/^[A-Za-z0-9+/]+={0,2}$/.test(value)||value.length%4||value.length>4096)throw failure('Geçersiz kaynak adresi verisi.');try{return root.CryptoJS.enc.Base64.parse(value).toString(root.CryptoJS.enc.Utf8);}catch(ignore){throw failure('Kaynak adresi okunamadı.');} }
 function alternatives(body) {
  if(typeof body!=='string'||body.length>2097152)throw failure('Film sayfası sınırı aşıldı.');
  var html=body.replace(/<(script|style|object|video|audio)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'').replace(/<link\b[^>]*>/gi,'').replace(/\ssrc\s*=/gi,' data-frame-src=').replace(/\ssrcset\s*=/gi,' data-frame-srcset=').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,''),d=new DOMParser().parseFromString(html,'text/html'),entries=[];
  function add(value,label){var e=embed(decode64(value));if(!e)return;var known=entries.filter(function(x){return x.id.toLowerCase()===e.id.toLowerCase();})[0];if(known){if(known.labels.indexOf(label)<0)known.labels.push(label);}else entries.push({id:e.id,url:e.url,labels:[label]});}
  Array.prototype.forEach.call(d.querySelectorAll('#player_part button.grup_button[rel]'),function(n){var label=root.CatalogUtils.clean(n.textContent);if(/Fragman/i.test(label))return;add(n.getAttribute('rel'),label||'SinemaCC');});
  if(!entries.length){var iframe=d.querySelector('iframe#video_playeriframe[data-vsrc]');if(iframe)add(iframe.getAttribute('data-vsrc'),'SinemaCC');}
  entries.forEach(function(e){var joined=e.labels.join(' ');e.label=/Dublaj/i.test(joined)&&/Altyaz/i.test(joined)?'Dublaj & Altyazı':e.labels[0];e.sourceId='sinemacc-'+e.id.toLowerCase();});
  if(!entries.length||entries.length>12)throw failure('Desteklenen aktif film oynatıcısı bulunamadı.');return entries;
 }
 function publicMedia(value) { try { var u=new root.URL(value);if(u.protocol!=='https:'||u.username||u.password||u.hash||!/[a-z]/i.test(u.hostname)||/(?:^|\.)localhost$|(?:^|\.)local$/i.test(u.hostname)||/^\d|:/.test(u.hostname))return '';return u.href; }catch(ignore){return '';} }
 function settings(body,page) {
  var expected=embed(page);if(!expected)throw failure('Geçersiz oynatıcı adresi.');var data=unpack(body),m=/\bFirePlayer\(\s*(['"])([a-zA-Z0-9]{8,32})\1\s*,\s*/.exec(data);if(!m||m[2].toLowerCase()!==expected.id.toLowerCase())throw failure('Aktif oynatıcı kimliği sayfayla eşleşmiyor.');
  var start=m.index+m[0].length,depth=0,quoted=false,escaped=false,end=-1;
  for(var i=start;i<data.length;i++){var c=data.charAt(i);if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;}else if(c==='"')quoted=true;else if(c==='{')depth++;else if(c==='}'&&--depth===0){end=i+1;break;}}
  var config;try{config=JSON.parse(data.slice(start,end));}catch(ignore){throw failure('Oynatıcı ayarı JSON değil.');}if(!config||!Array.isArray(config.tracks))throw failure('Oynatıcı ayarı eksik.');
  var subtitles=[];config.tracks.forEach(function(t){var url=t.kind==='captions'&&publicMedia(t.file);if(url&&!subtitles.some(function(s){return s.url===url;}))subtitles.push({url:url,label:root.CatalogUtils.clean(t.label)||'Altyazı',language:t.language||'',type:'vtt'});});
  return {id:m[2],api:BASE+'/player/index.php?data='+encodeURIComponent(m[2])+'&do=getVideo',subtitles:subtitles};
 }
 function media(body) {
  var d;try{d=JSON.parse(body);}catch(ignore){throw failure('Oynatıcı API yanıtı JSON değil.');}
  var u;try{u=new root.URL(d.videoSource);}catch(ignoreUrl){}
  if(!d||d.hls!==true||!u||u.origin!==BASE||u.username||u.password||u.search||u.hash||!/^\/cdn\/hls\/[a-f0-9]{32}\/master\.txt$/.test(u.pathname))throw failure('Aktif HLS kaynağı bulunamadı.');
  if(d.securedLink){var signed;try{signed=new root.URL(d.securedLink);}catch(ignoreSigned){}if(!signed||signed.origin!==u.origin||signed.username||signed.password||signed.hash||signed.pathname!==u.pathname.replace(/master\.txt$/,'master.m3u8')||!/^\?md5=[a-zA-Z0-9_-]+&expires=\d+$/.test(signed.search))throw failure('İmzalı HLS adresi aktif yayınla eşleşmiyor.');return signed.href;}
  return u.href;
 }
 root.SinemaccDecoder={alternatives:alternatives,settings:settings,media:media,embed:embed};
})(window);


/* siteler/sinemacc/sinemacc-resolver.js */
(function (root) {
 'use strict';var P=root.SinemaccParser,D=root.SinemaccDecoder;
 function fail(stage,message){var e=new Error('Sinemacc · '+message);e.stage=stage;return e;}
 function Resolver(log,now){this.log=log||function(){};this.now=now||Date.now;this.generation=0;this.network=root.ChainNetwork.createClient({destination:'downloads',preferXHR:true});}
 Resolver.prototype.cancel=function(){this.generation++;this.network.cancel();};
 Resolver.prototype.resolve=function(content,deadline,onProgress,hints){
  this.cancel();var self=this,token=this.generation,sources=[],options=[],last,progress=root.SourceProgress&&new root.SourceProgress(onProgress,hints);
  if(!P.movieUrl(content.pageUrl))return Promise.reject(fail('page','Geçersiz film adresi.'));
  function check(){if(token!==self.generation){var e=fail('cancel','İptal edildi');e.cancelled=true;throw e;}if(self.now()>=deadline)throw fail('timeout','Kaynak hazırlama süresi doldu.');}
  function publish(){if(progress)progress.publish(sources,options);}
  function request(task,stage){return task.then(function(r){check();return r;},function(e){check();e.stage=stage;throw e;});}
  function get(url,ref,stage){check();return request(self.network.get(url,ref,{'User-Agent':'Mozilla/5.0'}),stage);}
  return get(content.pageUrl,P.base+'/','page').then(function(page){
   // Bind active sources to the requested film, excluding unrelated/recommended cards and ads.
   P.detail(page.body,content);var queue=D.alternatives(page.body);
   queue.forEach(function(e){options.push({sourceId:e.sourceId,label:e.label,status:'pending',detail:'',stage:''});});publish();
   if(progress)queue=progress.order(queue,function(e){return {id:e.sourceId,label:e.label,type:'hls'};});
   return queue.reduce(function(p,entry){return p.then(function(){var option=options.filter(function(o){return o.sourceId===entry.sourceId;})[0];return (progress?progress.wait(check):Promise.resolve().then(check)).then(function(){return get(entry.url,content.pageUrl,'embed');}).then(function(embed){
    var data=D.settings(embed.body,entry.url);check();var body='hash='+encodeURIComponent(data.id)+'&r='+encodeURIComponent(P.base+'/');
    return request(self.network.post(data.api,body,{'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8','X-Requested-With':'XMLHttpRequest'}),'api').then(function(response){var media=D.media(response.body);return get(media,entry.url,'manifest').then(function(manifest){
     if(!/^\s*#EXTM3U/.test(manifest.body))throw fail('manifest','HLS yerine farklı bir yanıt alındı.');
     // UE55MU7500: this CDN's 953 KiB fragment timed out in Download, while
     // HTTPS XHR delivered the same TS in 956 ms. Retain the shared native fallback.
     sources.push({id:entry.sourceId,label:entry.label,url:media,referer:entry.url,type:'hls',status:'ready',destination:'downloads',userAgent:'Mozilla/5.0',transport:'xhr',validation:{playlistTransport:/^XHR/.test(manifest.method)?'xhr':'native'},seekMode:'media-event',subtitles:data.subtitles});
     option.status='ready';option.detail=entry.labels.length>1?'HLS erişimi doğrulandı · aynı yayının dilleri Ses ve Altyazı menülerinde':'HLS erişimi doğrulandı';publish();
    });});
   }).catch(function(e){check();last=e;option.status='error';option.stage=e.stage||'decode';option.detail=root.PlayerCore.safeMessage(e.message);self.log('Sinemacc: '+entry.label+' / '+option.stage+' · '+option.detail);publish();});});},Promise.resolve());
  }).then(function(){check();sources.options=options;if(!sources.length){var e=last||fail('decode','Oynatılabilir kaynak bulunamadı.');e.sourceOptions=options;throw e;}return sources;});
 };
 root.SinemaccSourceResolver=Resolver;
})(window);


/* siteler/sinemacc/site.js */
(function(root){'use strict';var BASE=root.SinemaccParser.base;root.SiteRegistry.register({id:'sinemacc',name:'SinemaCC',base:BASE,mark:'CC',subtitle:'Film arşivi ve IMDb Top 250',prefix:'sinemacc:',storagePrefix:'site.sinemacc.',contentTypes:['movie'],collectionKeys:['new','recommended','rated','liked'],posterBackground:'linear-gradient(145deg,#a93749,#301b34)',Provider:root.SinemaccProvider,Resolver:root.SinemaccSourceResolver,ui:{movieRail:'Sinemacc yeni filmler',recommended:'Popüler filmler',rated:'IMDb Top 250',liked:'En çok yorumlananlar',filterHint:'Sitenin Film Robotu: tür, yıl, dil ve IMDb alt sınırı birlikte uygulanır.',filterSummary:'Film Robotu',defaultOrder:'date'},collectionQuery:function(type,key){return {type:'movie',url:({new:BASE+'/',recommended:BASE+'/populer-filmler/',rated:BASE+'/imdb-top-250/',liked:BASE+'/en-cok-yorumlanan-filmler/'})[key]||BASE+'/'};},filterFields:function(){return ['genres','years','lang','imdb'];}});})(window);


})(window);
