(function(root){
 'use strict';var U=root.CatalogUtils,D=root.HdfilmDelisiData,BASE='https://hdfilmdelisi.one';
 function text(node,selector){var n=node&&(selector?node.querySelector(selector):node);if(n&&n.nodeType===9)n=n.body;return U.clean(n&&n.textContent);}
 function safe(value){var url=U.url(value,BASE+'/');try{var u=new root.URL(url);return u.origin===BASE&&!u.username&&!u.password?url:'';}catch(ignore){return '';}}
 function contentUrl(value){var u=safe(value);return /^https:\/\/hdfilmdelisi\.one\/(film|dizi)\/[a-z0-9-]+(?:\/sezon-[1-9]\d*\/bolum-[1-9]\d*)?$/.test(u)?u:'';}
 function genre(value){var u=safe(value);return /^https:\/\/hdfilmdelisi\.one\/tur\/[a-z0-9-]+$/.test(u)?u:'';}
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
