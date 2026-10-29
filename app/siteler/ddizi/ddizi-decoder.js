/* Literal active player configuration; never executes DDizi, JW or YouTube scripts. */
(function(root){
 'use strict';var U=root.CatalogUtils;
 function fail(message,stage){var e=new Error('DDizi · '+message);e.stage=stage||'decode';return e;}
 function doc(body){if(typeof body!=='string'||body.length>2*1024*1024)throw fail('Oynatıcı yanıtı sınırı aşıldı.');var html=body.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'').replace(/\ssrc\s*=/gi,' data-frame-src=').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,'');return new DOMParser().parseFromString(html,'text/html');}
 /* Tizen3 URL has no searchParams until an optional runtime adds it. */
 function parameter(u,key){var list=u.search.replace(/^\?/,'').split('&'),i,at;for(i=0;i<list.length;i++){at=list[i].indexOf('=');if(decodeURIComponent((at<0?list[i]:list[i].slice(0,at)).replace(/\+/g,' '))===key)return decodeURIComponent((at<0?'':list[i].slice(at+1)).replace(/\+/g,' '));}return '';}
 function youtube(value,page){try{var u=new root.URL(value,page),id;if(u.protocol!=='https:'||u.username||u.password||!/^(?:www\.)?youtube(?:-nocookie)?\.com$/.test(u.hostname))return null;id=u.pathname==='/watch'?parameter(u,'v'):(/^\/embed\/([A-Za-z0-9_-]{11})(?:\/|$)/.exec(u.pathname)||[])[1];return /^[A-Za-z0-9_-]{11}$/.test(id||'')?{type:'youtube',videoId:id,url:'https://www.youtube.com/watch?v='+id,referer:page,subtitles:[]}:null;}catch(ignore){return null;}}
 function allowed(value){try{var u=new root.URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&/^www\.ddizi\.(?:tel|re)$/.test(u.hostname)&&(/^\/player\/oynat\/[a-f0-9]{32}$/.test(u.pathname)||u.pathname==='/player/youtube.php'&&/^[A-Za-z0-9_-]{11}$/.test(parameter(u,'id'))||u.pathname==='/player/telif/index.php'&&!!youtube(parameter(u,'id'),u.href));}catch(ignore){return false;}}
 function frame(body,page){var d=doc(body),node=d.querySelector('.video-g iframe')||d.querySelector('iframe'),url=U.url(node&&node.getAttribute('data-frame-src'),page);if(!allowed(url))throw fail('Desteklenen aktif oynatıcı bulunamadı.');return url;}
 function alternatives(body,page){var d=doc(body),out=[];Array.prototype.forEach.call(d.querySelectorAll('.parts a'),function(a){var url=a.getAttribute('href')?root.DdiziParser.episodeUrl(U.url(a.getAttribute('href'),page)):a.className==='active'?page:'',label=U.clean(a.textContent);if(!url||!label||root.DdiziParser.canonical(url)!==root.DdiziParser.canonical(page)||out.some(function(v){return v.url===url;}))return;out.push({url:url,label:label});});return out.length?out:[{url:page,label:'Kaynak 1'}];}
 function stream(body,page){
  var d=doc(body),frame=d.querySelector('iframe[data-frame-src*="youtube.com/embed/"],iframe[data-frame-src*="youtube-nocookie.com/embed/"]'),link=d.querySelector('a.div[href]'),yt;
  if(frame){yt=youtube(U.url(frame.getAttribute('data-frame-src'),page),page);if(!yt)throw fail('Geçersiz YouTube oynatıcı bağlantısı.');return yt;}
  /* Observed DDizi click-through page contains a single official video link, no JW setup. */
  if(link&&/Diziyi izlemek i\S*in t\S*klay\S*n/i.test(U.clean(link.textContent))){yt=youtube(U.url(link.getAttribute('href'),page),page);if(yt)return yt;throw fail('Bu sayfa desteklenmeyen bir dış oynatıcıya yönlendiriyor.','unsupported');}
  if(/<title[^>]*>\s*(?:Just a moment|Attention Required|Access Denied)|cf-browser-verification|cf-mitigated/i.test(body))throw fail('Oynatıcı sayfasına erişim engellendi.','access');
  if(/<title[^>]*>\s*404\s+Not Found|<h1[^>]*>\s*404\s*<\/h1>/i.test(body))throw fail('Oynatıcı sayfası video yerine 404 yanıtı döndürdü; kaynak erişimi doğrulanamadı.','access');
  var setup=/\bvar\s+player\s*=\s*jwplayer\(\s*['"]player['"]\s*\)\s*;\s*player\.setup\(\s*\{/.exec(body);if(!setup){if(d.querySelector('iframe'))throw fail('Bu sayfa JW yerine farklı bir dış oynatıcı döndürdü.','unsupported');throw fail('Bu yanıtta JW medya ayarları yok; kaynak sayfası değişmiş veya kullanılamıyor olabilir.');}
  var tail=body.slice(setup.index+setup[0].length),m=/\bsources\s*:\s*\[\s*\{\s*file\s*:\s*("(?:\\.|[^"\\\r\n])*")\s*,\s*label\s*:\s*"[^"\r\n]*"\s*,\s*type\s*:\s*"(hls|mp4)"/.exec(tail);if(!m)throw fail('Aktif medya verisi okunamadı.');
  var raw;try{raw=JSON.parse(m[1]);}catch(ignore){throw fail('Medya adresi okunamadı.');}var url=U.url(raw,page),u;try{u=new root.URL(url);}catch(ignore2){throw fail('Geçersiz medya adresi.');}
  if(u.protocol!=='https:'||u.username||u.password||!(/^(?:video\.twimg\.com|streambox\.xyz|eu1\.tabii\.com|puhu-p3\.mncdn\.com)$/.test(u.hostname)||/(^|\.)googlevideo\.com$/.test(u.hostname)))throw fail('Desteklenmeyen medya sunucusu: '+(u.hostname||'bilinmiyor')+'.','unsupported');
  var noRef=!!d.querySelector('meta[name="referrer"][content="no-referrer"]');return {url:url,type:m[2],referer:noRef?'':page,subtitles:[]};
 }root.DdiziDecoder={allowed:allowed,frame:frame,alternatives:alternatives,stream:stream};
})(window);
