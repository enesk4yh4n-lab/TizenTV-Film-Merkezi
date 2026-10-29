(function(root){
 'use strict';var D=root.WebPlayerData;
 function alternatives(body){var data=D.object(body,/\bvar\s+scx\s*=\s*/),out=[];Object.keys(data).slice(0,12).forEach(function(k){var s=data[k],values=s&&s.sx&&s.sx.t;if(!Array.isArray(values)||!values.length)return;var first=values[0],u=first;if(!/^https:\/\//.test(u)){var rot=u.replace(/[a-z]/gi,function(c){return String.fromCharCode(c.charCodeAt(0)+(c.toLowerCase()<'n'?13:-13));});u=D.b64(rot);}u=D.publicUrl(u);if(!u)return;var p=new root.URL(u);if(!/^(?:rapidvid\.org|rapidvid\.net)$/.test(p.hostname)||!/^\/vx\/[a-z0-9]+$/i.test(p.pathname))return;var label;try{label=D.b64(s.tt);}catch(ignore){label=k;}out.push({sourceId:'fullhdfilmizlesene-'+k,label:label,url:u});});return out;}
 function settings(body,page){var m=/\bwindow\._p8\s*=\s*/.exec(body);if(!m)throw D.fail('decode','Atom aktif oynatıcı verisi bulunamadı.');var encoded=D.literal(body,m.index+m[0].length).value,outer=D.b64(encoded.split('').reverse().join('')),inner='',salt='K9L',v;
  for(var i=0;i<outer.length;i++)inner+=String.fromCharCode(outer.charCodeAt(i)-(salt.charCodeAt(i%3)%5+1));
  try{v=JSON.parse(D.b64(inner));}catch(ignore){throw D.fail('decode','Atom oynatıcı verisi okunamadı.');}
  var doc=D.doc(body),mount=v.m&&doc.getElementById(v.m),url=D.publicUrl(v.cm,page);if(!mount||!url||!v.i||!/\.(?:m3u8|txt)(?:$|[?#])/i.test(url))throw D.fail('decode','Atom H.264 medya veya oynatıcı kimliği eşleşmiyor.');
  var result={url:url,type:'hls',subtitles:[]};(Array.isArray(v.ct)?v.ct:[]).forEach(function(t,i){var u=D.publicUrl(t.file,page);if(u&&/^(?:captions|subtitles)$/.test(t.kind||''))result.subtitles.push({id:'atom-sub-'+i,url:u,label:root.CatalogUtils.clean(t.label)||'Altyazı',language:t.language||t.srclang||'',format:'vtt'});});return result;
 }
 root.FullHDFilmizleseneDecoder={alternatives:alternatives,settings:settings,resolve:function(e,get){return get(e.url,'https://www.fullhdfilmizlesene.now/','embed').then(function(r){var v=settings(r.body,e.url);v.referer=e.url;return v;});}};
})(window);
