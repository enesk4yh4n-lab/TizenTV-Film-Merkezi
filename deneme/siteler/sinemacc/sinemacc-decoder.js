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
