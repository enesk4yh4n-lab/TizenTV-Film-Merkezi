/* Generated ES5 provider module. */
(function(shared){'use strict';if(!shared.SitePluginRuntime)throw Error('Update core component to 1.10.0 before installing this module.');var context=shared.FilmPlugins.context(),window=shared.SitePluginRuntime.scope(context,'1.10.0');
var register=window.SiteRegistry.register;window.SiteRegistry.register=function(site){site.name='P006';site.subtitle='P006';site.mark='P006';register(site);};

/* saglayicilar/p006/parser.js */
(function(root){'use strict';root.FilmizleHellParser=root.CatalogSiteKit.createParser({id:'filmizlehell',name:'Film İzle Hell',base:'https://filmizlehell.net',movie:/^\/film\/\d+-[a-z0-9-]+$/,sameContent:function(a,b){var x=/^\/film\/(\d+)-/.exec(new root.URL(a).pathname),y=/^\/film\/(\d+)-/.exec(new root.URL(b).pathname);return !!(x&&y&&x[1]===y[1]);},cards:'a.poster-card, div.grid > div.group',title:'h3',year:'.overlay, .bottom-0 span',imdb:'.rating, .top-2.left-2',language:'.language-badge, .top-2.right-2',description:'.movie-description',listPath:'/filmler',optionsPath:'/filmler',filterPath:'/filmler',fields:{genres:'category',imdb:'imdb'},searchPath:'/arama?q='});})(window);


/* saglayicilar/p006/provider.js */
(function(root){'use strict';root.FilmizleHellProvider=root.CatalogSiteKit.createProvider(root.FilmizleHellParser);})(window);


/* saglayicilar/p006/decoder.js */
(function(root){
 'use strict';var D=root.WebPlayerData,HOST='https://p.playturka.space';
 function alternatives(body){var d=D.doc(body),out=[],seen={};Array.prototype.forEach.call(d.querySelectorAll('[x-data],button'),function(n){var attr=n.getAttribute('x-data')||n.getAttribute('@click')||n.getAttribute('x-on:click')||'',m=/\bactiveSource\s*(?::|=)\s*(['"])(https:\/\/p\.playturka\.space\/#([A-Za-z0-9_-]+))\1/.exec(attr);if(!m||seen[m[3]])return;seen[m[3]]=true;out.push({sourceId:'filmizlehell-'+m[3],id:m[3],label:n.tagName==='BUTTON'?root.CatalogUtils.clean(n.textContent):'PlayTurka',url:m[2]});});return out;}
 function settings(body,id){var v;try{v=JSON.parse(body);}catch(ignore){var data=body.replace(/^\s+|\s+$/g,'').replace(/[A-Za-z0-9_-]/g,function(c){var n=c.charCodeAt(0);return n>=65&&n<=90?String.fromCharCode(155-n):n>=97&&n<=122?String.fromCharCode(219-n):/\d/.test(c)?String((Number(c)+5)%10):c==='-'?'+':'/';});while(data.length%4)data+='=';try{v=JSON.parse(D.b64(data));}catch(error){throw D.fail('decode','PlayTurka API yanıtı okunamadı.');}}
  if(!v||v.status!=='success'||v.videoId!==id||!v.files)throw D.fail('unavailable','PlayTurka videosu bu yanıtta kullanılamıyor.');var u=D.publicUrl(v.files.masterUrl),p=u&&new root.URL(u);if(!p||p.origin!==HOST||p.pathname!=='/videos/'+id+'/master.m3u8')throw D.fail('decode','PlayTurka manifest kimliği eşleşmiyor.');return {url:u,type:'hls',subtitles:[]};
 }
 root.FilmizleHellDecoder={alternatives:alternatives,settings:settings,resolve:function(e,get){return get(HOST+'/api/video-url?id='+encodeURIComponent(e.id),root.FilmizleHellParser.base+'/','api').then(function(r){var v=settings(r.body,e.id);v.referer=e.url;return v;});}};
})(window);


/* saglayicilar/p006/resolver.js */
(function(root){'use strict';root.FilmizleHellSourceResolver=root.WebPlayerData.createResolver(root.FilmizleHellParser,root.FilmizleHellDecoder);})(window);


/* saglayicilar/p006/site.js */
(function(root){'use strict';var P=root.FilmizleHellParser;root.SiteRegistry.register({id:P.config.id,name:P.config.name,base:P.base,mark:"HL",subtitle:"Film kataloğu ve dil seçenekleri",prefix:P.config.id+':',storagePrefix:'site.'+P.config.id+'.',contentTypes:['movie'],collectionKeys:['new'],posterBackground:'linear-gradient(145deg,#8e4939,#172135)',Provider:root.FilmizleHellProvider,Resolver:root.FilmizleHellSourceResolver,ui:{movieRail:'Yeni filmler',seriesRail:'Diziler',filterHint:'Sitenin sunduğu alanlarla katalogda ara.',defaultOrder:'date'},collectionQuery:function(type){return {type:type,url:P.base+(type==='series'?P.config.seriesPath:P.config.listPath)};},filterFields:function(){return ["genres", "imdb"];}});})(window);


})(window);
