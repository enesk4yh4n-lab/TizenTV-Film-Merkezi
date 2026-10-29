(function(root){
 'use strict';var D=root.WebPlayerData,BASE='https://www.filmifullizle.news';
 function allowed(u){return u.origin===BASE&&/^\/smplayer\//.test(u.pathname)||/^vidmoly\.(net|me|biz|to)$/.test(u.hostname)&&/^\/embed-[a-z0-9]+\.html$/.test(u.pathname)||u.hostname==='ok.ru'&&/^\/videoembed\/\d+/.test(u.pathname);}
 function alternatives(body,page){var d=D.doc(body),out=[];Array.prototype.forEach.call(d.querySelectorAll('.sources [id^="source"]'),function(n){var key=n.getAttribute('id');if(!/^source\d+$/.test(key))return;var re=new RegExp('\\$\\(\\s*["\']#'+key+'["\']\\s*\\)\\s*\\.click\\('),m=re.exec(body);if(!m)return;var part=body.slice(m.index,m.index+5000),html=/\.html\(\s*/.exec(part);if(!html)return;var fragment=D.literal(part,html.index+html[0].length).value,urls=D.frames(fragment,page,allowed);if(!urls.length)return;out.push({sourceId:'filmifullizle-'+key,label:root.CatalogUtils.clean(n.textContent)+' · '+(n.getAttribute('dil')==='trd'?'Türkçe Dublaj':'Türkçe Altyazılı'),url:urls[0]});});return out;}
 function follow(url,get,depth){if(depth>3)throw D.fail('decode','SMPlayer yönlendirme sınırı aşıldı.');
  return get(url,BASE+'/','embed').then(function(r){if(/<title>\s*Lütfen bekleyiniz/i.test(r.body))throw D.fail('access','SMPlayer erişim doğrulaması istiyor.');if(new root.URL(url).hostname==='ok.ru'){var ok=D.ok(r.body,url);ok.referer=url;return ok;}try{var v=D.jw(r.body,url);v.referer=url;return v;}catch(error){var frames=D.frames(r.body,url,allowed);if(!frames.length)throw error;return follow(frames[0],get,depth+1);}});
 }
 root.FilmiFullizleDecoder={alternatives:alternatives,resolve:function(e,get){return follow(e.url,get,0);}};
})(window);
