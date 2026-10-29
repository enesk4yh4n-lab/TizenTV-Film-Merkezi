(function(root){
 'use strict';var D=root.WebPlayerData,BASE='https://lovefilmizle.net';
 function moly(u){return /^(?:vidmoly\.(?:net|me|biz|to)|lovefilmizle\.net)$/.test(u.hostname)&&(/^\/embed-[a-z0-9]+\.html$/.test(u.pathname)||/^\/bemoly\/bemoly\.php$/.test(u.pathname));}
 function alternatives(body,page){return D.frames(body,page,moly,'#player iframe').map(function(u,i){return {sourceId:'lovefilmizle-vidmoly-'+i,label:'Vidmoly',url:u};});}
 function follow(url,get,depth){if(depth>2)throw D.fail('decode','Vidmoly yönlendirme sınırı aşıldı.');return get(url,BASE+'/','embed').then(function(r){try{var v=D.jw(r.body,url);v.referer=url;return v;}catch(error){var frames=D.frames(r.body,url,moly);if(!frames.length)throw error;return follow(frames[0],get,depth+1);}});}
 root.LoveFilmizleDecoder={alternatives:alternatives,resolve:function(e,get){return follow(e.url,get,0);}};
})(window);
