(function(root){
 'use strict';var D=root.WebPlayerData;
 function allowed(u){return /^(?:closeload|rapid)\.filmmakinesi\.to$/.test(u.hostname)&&/^\/(?:video\/embed\/|embed-)/.test(u.pathname);}
 function alternatives(body,page){var d=D.doc(body),out=[],seen={};Array.prototype.forEach.call(d.querySelectorAll('#player-section .video-parts [data-video_url]'),function(n){var u=D.publicUrl(n.getAttribute('data-video_url'),page);if(!u||!allowed(new root.URL(u))||seen[u])return;seen[u]=true;out.push({sourceId:'filmmakinesi-'+(new root.URL(u).hostname.split('.')[0])+'-'+new root.URL(u).pathname.replace(/[^A-Za-z0-9_-]+/g,'-'),label:root.CatalogUtils.clean(n.textContent),url:u});});return out;}
 root.FilmMakinesiDecoder={alternatives:alternatives,resolve:function(e,get){return get(e.url,'https://filmmakinesi.to/','embed').then(function(r){var v=D.seeded(r.body,e.url);v.referer=e.url;return v;});}};
})(window);
