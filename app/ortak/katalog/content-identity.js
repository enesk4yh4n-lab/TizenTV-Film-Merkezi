/* Conservative cross-provider identity. IMDb ratings are never IMDb identifiers. */
(function(root){
 'use strict';var U=root.CatalogUtils;
 function imdb(value){var s=String(value||'');if(/^tt\d{7,10}$/.test(s))return s;var u;try{u=new root.URL(s);}catch(ignore){}if(!u||!/(^|\.)imdb\.com$/.test(u.hostname)||u.username||u.password)return '';var m=/^\/title\/(tt\d{7,10})(?:\/|$)/.exec(u.pathname);return m?m[1]:'';}
 function year(value){var n=Number(value);return isFinite(n)&&n%1===0&&n>=1888&&n<=2100?n:null;}
 function name(value,y){var s=U.clean(value).replace(/İ/g,'i').toLowerCase().replace(/\u0307/g,'').replace(/[ıìíîï]/g,'i').replace(/[çćč]/g,'c').replace(/[ğģ]/g,'g').replace(/[öòóôõø]/g,'o').replace(/[şśš]/g,'s').replace(/[üùúû]/g,'u').replace(/[âàáäãå]/g,'a').replace(/[éèêë]/g,'e').replace(/ñ/g,'n');s=s.replace(/(?:\s+(?:full\s+hd|hd|1080p|4k|(?:turkce\s+)?(?:dublaj(?:li)?|altyazi(?:li)?)|(?:hint|yerli)\s+filmi|film(?:i)?|dizi))*\s+izle\s*$/,'');if(y)s=s.replace(new RegExp('(?:\\s*[-–—:(]\\s*|\\s+)'+y+'\\s*\\)?$'),'');return s.replace(/[^a-z0-9\u0370-\uffff]+/g,' ').replace(/\s+/g,' ').replace(/^\s+|\s+$/g,'').slice(0,180);}
 function seriesName(value,y){var s=U.clean(value).replace(/\s+(?:T[üu]rk[çc]e\s+)?(?:Dublaj|Altyaz[ıi]l[ıi])(?:\s+izle)?$/i,'');s=s.replace(/\s*[-–:]?\s+\d+\.?\s*(?:Sezon|Season)(?:\s*\d+\.?\s*B[öo]l[üu]m)?(?:\s+izle)?\s*$/i,'').replace(/\s*[-–:]?\s+(?:Sezon|Season)\s*\d+\s*$/i,'');return name(s||value,y);}
 function keys(card){var type=card.type==='series'?'series':card.type==='episode'?'episode':card.type==='collection'?'collection':'movie',y=year(card.year),out=[],id=imdb(card.imdbId||card.imdbUrl),names=[card.title,card.originalTitle].concat(card.titleAliases||[]);if(id&&type!=='collection')out.push(type+'|imdb|'+id);if(type!=='episode'&&type!=='collection'&&y)names.forEach(function(v){var n=type==='series'?seriesName(v,y):name(v,y),k=type+'|name|'+n+'|'+y;if(n&&out.indexOf(k)<0)out.push(k);});return out;}
 function fromPage(body,page,selectors){
  var env=U.envelope(body,!selectors),found=[],target=U.url(page),matched=[];
  function add(v){var id=imdb(v);if(id&&found.indexOf(id)<0)found.push(id);}
  env.schema.forEach(function(s){if(!/^(Movie|TVSeries|TVEpisode)$/.test(s['@type']))return;var explicit=s.url||s['@id'],bound=explicit?U.url(explicit,page)==target:false;
   if(!explicit){var actions=Array.isArray(s.potentialAction)?s.potentialAction:[s.potentialAction],targets=[];actions.forEach(function(a){if(!a||a['@type']&&a['@type']!=='WatchAction')return;(Array.isArray(a.target)?a.target:[a.target]).forEach(function(t){var v=typeof t==='string'?t:t&&t.urlTemplate;if(v)targets.push(U.url(v,page));});});bound=targets.length>0&&targets.every(function(v){return v===target;});}
   if(!bound)return;matched.push(s);add(s.imdbId);add(s.identifier&&s.identifier.value||s.identifier);(Array.isArray(s.sameAs)?s.sameAs:[s.sameAs]).forEach(add);
  });
  /* Only provider-declared active metadata fields, never arbitrary recommendation links. */
  if(selectors){var og=env.doc.querySelector('meta[property="og:url"]'),pageBound=matched.length===1||og&&U.url(og.getAttribute('content'),page)===target;if(pageBound)Array.prototype.forEach.call(env.doc.querySelectorAll(selectors),function(a){add(U.url(a.getAttribute('href'),page));});}
  var result=found.length===1?{imdbId:found[0]}:{};
  if(matched.length===1){var s=matched[0];if(s.alternateName)result.originalTitle=U.clean(s.alternateName);}
  return result;
 }
 root.ContentIdentity={imdb:imdb,year:year,name:name,seriesName:seriesName,keys:keys,fromPage:fromPage};
})(window);
