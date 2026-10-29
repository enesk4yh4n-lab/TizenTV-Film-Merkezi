/* Shared inert catalog plumbing. Each site's selectors and URL contracts live in its own folder. */
(function (root) {
 'use strict'; var U = root.CatalogUtils;
 function text(n, selector) { n = n && (selector ? n.querySelector(selector) : n); return U.clean(n && n.textContent); }
 function num(s) { var m = /\d+(?:[.,]\d+)?/.exec(String(s || '')); return m ? Number(m[0].replace(',', '.')) : null; }
 function image(n, page) { var i = n && n.querySelector('img'); return U.url(i && (i.getAttribute('data-src') || i.getAttribute('data-catalog-src')), page); }
 function language(s) { var d = /dublaj|\bdual\b/i.test(s), a = /altyaz|\bdual\b/i.test(s); return d && a ? 'Dublaj & Altyazılı' : d ? 'Türkçe Dublaj' : a ? 'Türkçe Altyazılı' : ''; }
 function createParser(c) {
  function safe(value, page) { var url = U.url(value, page || c.base + '/'), u; try { u = new root.URL(url); } catch (ignore) {} return u && u.origin === c.base && !u.username && !u.password ? url : ''; }
  function kind(url) { var u = safe(url); if (!u) return ''; var path = new root.URL(u).pathname; return c.episode && c.episode.test(path) ? 'episode' : c.series && c.series.test(path) ? 'series' : c.movie.test(path) ? 'movie' : ''; }
  function contentUrl(url) { url = safe(url); return kind(url) && !new root.URL(url).search ? url : ''; }
  function id(url) { var v = contentUrl(url); return v ? c.id + ':' + kind(v) + ':' + new root.URL(v).pathname.replace(/^\/+|\/+$/g, '') : ''; }
  function cards(doc, page) {
   var out = [], seen = {};
   Array.prototype.forEach.call(doc.querySelectorAll(c.cards), function (box) {
    var a = box.tagName === 'A' ? box : box.querySelector(c.cardLink || 'a[href]'), url = safe(a && a.getAttribute('href'), page), i = box.querySelector('img');
    if (!contentUrl(url) || kind(url) === 'episode' || !i || /\bsoon\b/.test(box.className)) return;
    var title = text(box, c.title) || U.clean(i.getAttribute('alt') || a.getAttribute('title')).replace(/\s+(?:film\s+)?izle$/i, '');
    title=title.replace(/\s+izle$/i,'');if (!title) return;
    var year = /\b((?:19|20)\d{2})\b/.exec(text(box, c.year || '.year')), lang = text(box, c.language || '.language');
    if (c.cardLanguage) lang = c.cardLanguage(box);
    var card={contentId:id(url), providerId:c.id, type:kind(url), pageUrl:url, title:title, poster:image(box,page), year:year ? Number(year[1]) : null, imdb:num(text(box,c.imdb || '.imdb')), language:language(lang)};if(seen[url]){['poster','year','imdb','language'].forEach(function(k){if(!seen[url][k]&&card[k])seen[url][k]=card[k];});return;}seen[url]=card;out.push(card);
   }); return out;
  }
  function list(body, page) {
   var env = U.envelope(body), d = env.doc, all = cards(d,page), next = null, current = new root.URL(page), currentPage = Number(c.pageNumber&&c.pageNumber(current)||param(current.href,'page') || (/\/(?:page|sayfa)\/(\d+)\/?$/.exec(current.pathname) || [0,1])[1]);
   if (!all.length && !/(?:sonu[çc].{0,40}(?:yok|bulunamad)|bulunamad[ıi]|no results)/i.test(text(d.body))) throw new Error(c.name + ' katalog biçimi tanınamadı veya erişim engellendi.');
   Array.prototype.some.call(d.querySelectorAll('a[href]'), function (a) {
    var u = safe(a.getAttribute('href'),page), label = text(a); if (!u || u === page) return false;
    var parsed = new root.URL(u), p = Number(c.pageNumber&&c.pageNumber(parsed)||param(parsed.href,'page') || (/\/(?:page|sayfa)\/(\d+)\/?$/.exec(parsed.pathname) || [0,0])[1]);
    if ((a.getAttribute('rel') || '').indexOf('next') >= 0 || /^(?:İleri|Sonraki|Next|›|»|→)$/i.test(label) && p === currentPage+1 || /^\d+$/.test(label) && Number(label) === currentPage+1 && p === currentPage+1) { next = {url:u,from:page}; return true; } return false;
   }); return {cards:all,next:next};
  }
  function detail(body, original) {
   var url = contentUrl(original.pageUrl), env = U.envelope(body), d = env.doc, k = kind(url), h = d.querySelector(c.heading || 'h1'), schema = env.schema.filter(function(s){return /^(?:Movie|TVSeries|TVEpisode)$/.test(s['@type']);})[0] || {}, result;
   if (!url || !h) throw new Error(c.name+' içerik detayı bulunamadı.');
   if (schema.url && contentUrl(schema.url) && contentUrl(schema.url) !== url) throw new Error(c.name+' içerik kimliği yanıtla eşleşmiyor.');
   var title = U.clean(schema.name) || text(h), description = text(d,c.description || '.description'), meta = d.querySelector('meta[name="description"]'), poster = d.querySelector('meta[property="og:image"]');
   title = title.replace(/\s+izle(?:\s*\(\d{4}\))?$/i,'');
   result = {contentId:id(url),providerId:c.id,type:k,pageUrl:url,title:title,originalTitle:U.clean(schema.alternateName || text(d,c.originalTitle || 'h2.original-title')),poster:U.url(typeof schema.image==='string'?schema.image:poster&&poster.getAttribute('content'),url)||original.poster||'',description:description||U.clean(schema.description)||U.clean(meta&&meta.getAttribute('content')),year:original.year||num(text(d,c.detailYear || '.film-yil'))||null,imdb:original.imdb||num(schema.aggregateRating&&schema.aggregateRating.ratingValue)||num(text(d,c.detailImdb || '.imdb')),duration:'',language:original.language||'',cast:[],genres:[],episodes:[],seasons:[],sources:[],subtitles:[]};
   if (!result.year) { var y=/\b((?:19|20)\d{2})\b/.exec(String(schema.startDate||schema.dateCreated||schema.datePublished||''));if(y)result.year=Number(y[1]); }
   var duration=/^PT(?:(\d+)H)?(?:(\d+)M)?/.exec(schema.duration||'');if(duration)result.duration=(Number(duration[1]||0)*60+Number(duration[2]||0))+' dk';
   (Array.isArray(schema.actor)?schema.actor:[]).forEach(function(a){if(a&&a.name)result.cast.push(U.clean(a.name));});
   Array.prototype.forEach.call(d.querySelectorAll(c.cast || 'a[href*="/oyuncu/"]'),function(a){var name=text(a);if(name&&result.cast.indexOf(name)<0)result.cast.push(name);});
   Array.prototype.forEach.call(d.querySelectorAll(c.genres || '[itemprop="genre"]'),function(a){var name=text(a);if(name&&result.genres.indexOf(name)<0)result.genres.push(name);});
   if (k === 'series' && c.episode) {
    var seen={};Array.prototype.forEach.call(d.querySelectorAll(c.episodeLinks||'a[href]'),function(a){var u=safe(a.getAttribute('href'),url),m=u&&c.episodeNumbers.exec(new root.URL(u).pathname);if(!m||seen[u])return;seen[u]=true;var e={contentId:id(u),providerId:c.id,type:'episode',pageUrl:u,title:text(a).replace(/\s+/g,' ')||m[1]+'. Sezon '+m[2]+'. Bölüm',seriesId:result.contentId,seriesTitle:result.title,season:Number(m[1]),number:Number(m[2]),poster:image(a,url)||result.poster};result.episodes.push(e);if(result.seasons.indexOf(e.season)<0)result.seasons.push(e.season);});result.episodes.sort(function(a,b){return a.season-b.season||a.number-b.number;});result.seasons.sort(function(a,b){return a-b;});
   }
   (Array.isArray(schema.genre)?schema.genre:typeof schema.genre==='string'?schema.genre.split(','):[]).forEach(function(g){g=U.clean(g);if(g&&result.genres.indexOf(g)<0)result.genres.push(g);});
   result.episodes.forEach(function(e){e.episode={seriesId:result.contentId,season:e.season,number:e.number};e.seriesPageUrl=result.pageUrl;e.episodeTitle=e.title;e.title=result.title+' · '+e.season+'. Sezon '+e.number+'. Bölüm';e.sources=[];e.subtitles=[];});
   if (c.enrich) c.enrich(result,env,original); return result;
  }
  function options(body) { var d=U.envelope(body).doc,out={genres:[],years:[],lang:[],imdb:[]};Object.keys(c.fields||{}).forEach(function(key){var select=d.querySelector('select[name="'+c.fields[key]+'"]');if(select)out[key]=Array.prototype.map.call(select.querySelectorAll('option[value]'),function(o){var v=o.getAttribute('value');return {value:key==='imdb'&&/^\d+(?:x)?$/.test(v)?String(parseInt(v,10))+'-10':v,label:text(o)};}).filter(function(o){return !!o.value;});});return out; }
  return {config:c,base:c.base,safe:safe,contentUrl:contentUrl,movieUrl:contentUrl,kind:kind,id:id,list:list,detail:detail,options:options,home:function(body){var data=list(body,c.base+'/');return {hero:data.cards[0],movies:data.cards.filter(function(x){return x.type==='movie';}),series:data.cards.filter(function(x){return x.type==='series';}),next:data.next};}};
 }
 function param(url,key) { var pairs=String(url).split('?')[1]||'';pairs=pairs.split('#')[0].split('&');for(var i=0;i<pairs.length;i++){var p=pairs[i].split('=');try{if(decodeURIComponent(p.shift())===key)return decodeURIComponent(p.join('=').replace(/\+/g,' '));}catch(ignore){}}return ''; }
 function queryUrl(base,fields) { var u=new root.URL(base),query=[];Object.keys(fields).forEach(function(k){if(fields[k]!==''&&fields[k]!==null&&fields[k]!==undefined)query.push(encodeURIComponent(k)+'='+encodeURIComponent(String(fields[k])));});u.search=query.length?'?'+query.join('&'):'';return u.href; }
 function createProvider(P) {
  var c=P.config;
  function Provider(cache,network){root.CatalogClient.call(this,cache,network||root.ChainNetwork.createClient({destination:'downloads',preferXHR:true}),{base:c.base,headers:{Accept:'text/html','User-Agent':'Mozilla/5.0'}});}
  Provider.prototype=Object.create(root.CatalogClient.prototype);Provider.prototype.constructor=Provider;
  Provider.prototype.fetch=function(url,parse,force,scope){if(!P.safe(url))return Promise.reject(new Error('Site dışı istek reddedildi.'));return this.request(url,null,parse,force,c.id+'0140-'+scope);};
  Provider.prototype.home=function(force){return this.fetch(c.base+'/',P.home,force,'home');};
  Provider.prototype.options=function(){var self=this;return self.filterOptions?Promise.resolve(self.filterOptions):self.fetch(c.base+(c.optionsPath||c.listPath),P.options,false,'options').then(function(o){self.filterOptions=o;return o;});};
  Provider.prototype.list=function(q,next,force){q=q||{};var self=this,f=q.filters||{},url=q.url||c.base+(q.type==='series'?c.seriesPath||c.listPath:c.listPath),filtered=!!(f.genre||f.year||f.language||f.imdb),sig=JSON.stringify(q);
   if(q.type==='series'&&!c.series)return Promise.reject(new Error(c.name+' film kataloğu sunuyor.'));
   function load(){if(next){if(!P.safe(next.url)||next.signature!==sig)return Promise.reject(new Error('Devam bağlantısı listeyle eşleşmiyor.'));url=next.url;}return self.fetch(url,function(body){var r=P.list(body,url);if(q.type)r.cards=r.cards.filter(function(x){return x.type===q.type;});if(r.next)r.next.signature=sig;return r;},force,'list');}
   if(!filtered)return load();
   return this.options().then(function(options){var values={genres:f.genre||'',years:f.year||'',lang:f.language||'',imdb:f.imdb||''},fields={};Object.keys(values).forEach(function(key){var v=String(values[key]);if(v){if(!c.fields[key]||!options[key].some(function(o){return o.value===v;}))throw new Error(c.name+' filtresi geçersiz veya henüz sunulmuyor.');fields[c.fields[key]]=key==='imdb'?v.split('-')[0]:v;}});if(c.filterExtra)Object.keys(c.filterExtra).forEach(function(k){fields[k]=c.filterExtra[k];});url=queryUrl(c.base+(c.filterPath||c.listPath),fields);return load();});
  };
  Provider.prototype.search=function(s,force,next){s=U.clean(s);if(!s||s.length>100)return Promise.reject(new Error('Arama 1–100 karakter olmalı.'));var first=c.base+c.searchPath+encodeURIComponent(s),url=root.CatalogSearch.pageUrl(first,next);return this.fetch(url,function(body){return root.CatalogSearch.pageResult(P.list(body,url),first,url);},force,'search0160');};
  Provider.prototype.detail=function(card,force){if(!P.contentUrl(card.pageUrl))return Promise.reject(new Error('Geçersiz içerik adresi.'));return this.fetch(card.pageUrl,function(body){return P.detail(body,card);},force,'detail');};
  Provider.prototype.seriesLanguage=function(){return Promise.resolve({language:''});};return Provider;
 }
 root.CatalogSiteKit={createParser:createParser,createProvider:createProvider,text:text,num:num,image:image,language:language,queryUrl:queryUrl,param:param};
})(window);
