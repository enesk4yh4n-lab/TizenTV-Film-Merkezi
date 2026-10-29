/* Dizibox HTML is read as inert data; page scripts are never evaluated. */
(function (root) {
 'use strict';
 var U = root.CatalogUtils, BASE = 'https://www.dizibox.live';
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
 function list(body,page) {var d=doc(body),n=d.querySelector('.woca-pagination a.next'),next=safe(n&&n.getAttribute('href'),page);return {cards:cards(d,page),next:next&&next!==page?{kind:'url',url:next}:null};}
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
