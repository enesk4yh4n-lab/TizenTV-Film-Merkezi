/* Generated ES5 provider module. */
(function(shared){'use strict';if(!shared.SitePluginRuntime)throw Error('Update core component to 1.10.0 before installing this module.');var context=shared.FilmPlugins.context(),window=shared.SitePluginRuntime.scope(context,'1.10.0');
var register=window.SiteRegistry.register;window.SiteRegistry.register=function(site){site.name='P007';site.subtitle='P007';site.mark='P007';register(site);};

/* saglayicilar/p007/parser.js */
(function(root){'use strict';root.FilmiFullizleParser=root.CatalogSiteKit.createParser({id:'filmifullizle',preferXHR:false,userAgent:'Mozilla/5.0',name:'Filmi Full İzle',base:'https://www.filmifullizle.news',movie:/^\/film\/[a-z0-9-]+\.html$/,cards:'.movie-box',title:'.film-ismi',year:'.film-yil',imdb:'.imdb',language:'.film-dil',description:'#film-aciklama',detailYear:'#filmbilgileri a[href*="/yil/"]',detailImdb:'#listelements .elements:nth-child(2)',genres:'#listelements a[href*="/kategori/"]',enrich:function(r,e){r.poster=r.poster||root.CatalogSiteKit.image(e.doc.querySelector('.film-afis'),r.pageUrl);r.language=root.CatalogSiteKit.language(root.CatalogSiteKit.text(e.doc,'.filmplus_sources .languages'));},listPath:'/',optionsPath:'/',filterPath:'/film',fields:{genres:'tur',years:'yil',lang:'dil',imdb:'imdb'},filterExtra:{filtrele:'date',sirala:'DESC'},searchPath:'/?s='});})(window);


/* saglayicilar/p007/provider.js */
(function(root){'use strict';root.FilmiFullizleProvider=root.CatalogSiteKit.createProvider(root.FilmiFullizleParser);})(window);


/* saglayicilar/p007/decoder.js */
(function(root){
 'use strict';var D=root.WebPlayerData,BASE=(root.SiteAddresses ? root.SiteAddresses.base('filmifullizle','https://www.filmifullizle.news') : 'https://www.filmifullizle.news');
 function allowed(u){return u.origin===BASE&&/^\/smplayer\//.test(u.pathname)||/^vidmoly\.(net|me|biz|to)$/.test(u.hostname)&&/^\/embed-[a-z0-9]+\.html$/.test(u.pathname)||u.hostname==='ok.ru'&&/^\/videoembed\/\d+/.test(u.pathname)||u.hostname==='film.popcornvakti.net'&&/^\/embed\/[a-z0-9-]+$/.test(u.pathname);}
 function alternatives(body,page){var d=D.doc(body),out=[];Array.prototype.forEach.call(d.querySelectorAll('.sources [id^="source"]'),function(n){var key=n.getAttribute('id');if(!/^source\d+$/.test(key))return;var re=new RegExp('\\$\\(\\s*["\']#'+key+'["\']\\s*\\)\\s*\\.click\\('),m=re.exec(body);if(!m)return;var part=body.slice(m.index,m.index+5000),html=/\.html\(\s*/.exec(part);if(!html)return;var fragment=D.literal(part,html.index+html[0].length).value,urls=D.frames(fragment,page,allowed);if(!urls.length)return;out.push({sourceId:'filmifullizle-'+key,label:root.CatalogUtils.clean(n.textContent)+' · '+(n.getAttribute('dil')==='trd'?'Türkçe Dublaj':'Türkçe Altyazılı'),url:urls[0]});});return out;}
 function decrypt(body,url){if(new root.URL(url).hostname!=='film.popcornvakti.net')return body;var marker=/\bCryptoJS\.AES\.decrypt\(\s*/.exec(body);if(!marker)return body;try{var cipher=D.literal(body,marker.index+marker[0].length),tail=/^\s*,\s*/.exec(body.slice(cipher.end));if(!tail)throw new Error();var password=D.literal(body,cipher.end+tail[0].length),plain=root.CryptoJS.AES.decrypt(cipher.value,password.value).toString(root.CryptoJS.enc.Utf8);if(!plain||plain.length>1048576)throw new Error();return plain;}catch(e){throw D.fail('decode','Sinefilm oynatıcı verisi çözülemedi.');}}
 function follow(url,get,depth,retries,request){if(depth>4)throw D.fail('decode','SMPlayer yönlendirme sınırı aşıldı.');
  var headers=new root.URL(url).hostname==='film.popcornvakti.net'&&root.ChainNetwork&&root.ChainNetwork.compatibilityHeaders?root.ChainNetwork.compatibilityHeaders(url):null;
  var task=headers&&request?request(url,BASE+'/','embed',undefined,headers):get(url,BASE+'/','embed');
  return task.then(function(r){if(/<title>\s*Lütfen bekleyiniz/i.test(r.body)){if((retries||0)<2&&/setTimeout[\s\S]{0,150}window\.location\.href/.test(r.body))return new Promise(function(resolve){setTimeout(resolve,1100);}).then(function(){return follow(url,get,depth,(retries||0)+1,request);});throw D.fail('access','SMPlayer kaynağı hazırlama süresinde açılamadı.');}if(new root.URL(url).hostname==='ok.ru'){var ok=D.ok(r.body,url);ok.referer=url;return ok;}var body=decrypt(r.body,url);try{var v=D.jw(body,url);v.referer=url;if(headers)v.userAgent=headers['User-Agent'];return v;}catch(error){var frames=D.frames(body,url,allowed);if(!frames.length)throw error;return follow(frames[0],get,depth+1,0,request);}});
 }
 root.FilmiFullizleDecoder={alternatives:alternatives,resolve:function(e,get,request){return follow(e.url,get,0,0,request);}};
})(window);


/* saglayicilar/p007/resolver.js */
(function(root){'use strict';root.FilmiFullizleSourceResolver=root.WebPlayerData.createResolver(root.FilmiFullizleParser,root.FilmiFullizleDecoder);})(window);


/* saglayicilar/p007/site.js */
(function(root){'use strict';var P=root.FilmiFullizleParser;root.SiteRegistry.register({id:P.config.id,name:P.config.name,base:P.base,mark:"FF",subtitle:"Film arşivi ve alternatif kaynaklar",prefix:P.config.id+':',storagePrefix:'site.'+P.config.id+'.',contentTypes:['movie'],collectionKeys:['new'],posterBackground:'linear-gradient(145deg,#624b94,#172135)',Provider:root.FilmiFullizleProvider,Resolver:root.FilmiFullizleSourceResolver,ui:{movieRail:'Yeni filmler',seriesRail:'Diziler',filterHint:'Sitenin sunduğu alanlarla katalogda ara.',defaultOrder:'date'},collectionQuery:function(type){return {type:type,url:P.base+(type==='series'?P.config.seriesPath:P.config.listPath)};},filterFields:function(){return ["genres", "years", "lang", "imdb"];}});})(window);


})(window);
