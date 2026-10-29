(function(root){
 'use strict';var U=root.CatalogUtils;
 function failure(message){var e=new Error('Dizibox · '+message);e.stage='decode';return e;}
 function unwrap(body){for(var i=0;i<3;i++){var m=/^\s*(?:<script\b[^>]*>\s*)?document\.write\s*\(\s*atob\s*\(\s*unescape\s*\(\s*(['"])((?:%[0-9a-fA-F]{2}|[A-Za-z0-9+/=]){1,2097152})\1\s*\)\s*\)\s*\)/.exec(body);if(!m)return body;try{var encoded=decodeURIComponent(m[2]);if(!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)||encoded.length%4!==0)throw new Error();body=root.CryptoJS.enc.Base64.parse(encoded).toString(root.CryptoJS.enc.Utf8);if(!body||body.length>2*1024*1024)throw new Error();}catch(ignore){throw failure('Kodlanmış oynatıcı verisi okunamadı.');}}throw failure('Oynatıcı veri katmanı sınırı aşıldı.');}
 function documentData(body){var html=unwrap(body).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'').replace(/\ssrc\s*=/gi,' data-frame-src=').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,'');return new DOMParser().parseFromString(html,'text/html');}
 function allowed(url){try{var p=new root.URL(url);return p.protocol==='https:'&&!p.username&&!p.password&&(p.hostname==='www.dizibox.live'&&/^\/player\//.test(p.pathname)||p.hostname==='dbx.molystream.org'&&/^\/embed\//.test(p.pathname)||p.hostname==='vidmoly.biz'&&/^\/embed-[a-z0-9]+\.html$/.test(p.pathname)||p.hostname==='ok.ru'&&/^\/videoembed\/\d+\/?$/.test(p.pathname));}catch(ignore){return false;}}
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
