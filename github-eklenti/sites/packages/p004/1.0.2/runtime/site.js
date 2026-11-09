/* Generated ES5 provider module. */
(function(shared){'use strict';if(!shared.SitePluginRuntime)throw Error('Update core component to 1.10.0 before installing this module.');var context=shared.FilmPlugins.context(),window=shared.SitePluginRuntime.scope(context,'1.10.0');
var register=window.SiteRegistry.register;window.SiteRegistry.register=function(site){site.name='P004';site.subtitle='P004';site.mark='P004';register(site);};

/* saglayicilar/p004/decoder.js */
(function(root){
 'use strict';var D=root.WebPlayerData;
 function alternatives(body){var data=D.object(body,/\bvar\s+scx\s*=\s*/),out=[];Object.keys(data).slice(0,12).forEach(function(k){var s=data[k],values=s&&s.sx&&s.sx.t;if(!Array.isArray(values)||!values.length)return;var first=values[0],u=first;if(!/^https:\/\//.test(u)){var rot=u.replace(/[a-z]/gi,function(c){return String.fromCharCode(c.charCodeAt(0)+(c.toLowerCase()<'n'?13:-13));});u=D.b64(rot);}u=D.publicUrl(u);if(!u)return;var p=new root.URL(u);if(!/^(?:rapidvid\.org|rapidvid\.net)$/.test(p.hostname)||!/^\/(?:vx|vod)\/[a-z0-9]+$/i.test(p.pathname))return;var label;try{label=D.b64(s.tt);}catch(ignore){label=k;}out.push({sourceId:'fullhdfilmizlesene-'+k,label:label,url:u});});return out;}
 function decode(encoded){if(typeof encoded!=='string'||encoded.length>1048576)throw D.fail('decode','Atom veri sınırı aşıldı.');var outer=D.b64(encoded.split('').reverse().join('')),inner='',salt='K9L';for(var i=0;i<outer.length;i++)inner+=String.fromCharCode(outer.charCodeAt(i)-(salt.charCodeAt(i%3)%5+1));return D.b64(inner);}
 function settings(body,page){var m=/\bwindow\._p8\s*=\s*/.exec(body),v;
  if(!m){var active=/\bjwplayer\(\s*['"]playerArea['"]\s*\)\.setup\(\s*jwSetup\s*\)/.test(body),file=/\bjwSetup\.sources\s*=\s*\[[\s\S]{0,2000}?['"]file['"]\s*:\s*av\(\s*/.exec(body);if(!active||!file||!D.doc(body).getElementById('playerArea'))throw D.fail('decode','Atom aktif oynatıcı verisi bulunamadı.');var media=D.publicUrl(decode(D.literal(body,file.index+file[0].length).value),page);if(!media)throw D.fail('decode','Geçersiz Atom medya adresi.');var result={url:media,type:'hls',subtitles:[]},tracks=/\bjwSetup\.tracks\s*=\s*(\[[\s\S]{0,65536}?\])\s*;/.exec(body),list=[];try{if(tracks)list=JSON.parse(tracks[1]);}catch(ignoreTracks){}list.forEach(function(t){var u=D.publicUrl(t.file,page);if(u&&t.kind==='captions')result.subtitles.push({url:u,label:root.CatalogUtils.clean(t.label)||'Altyazı',language:t.language||'',format:'vtt'});});return result;}
  try{v=JSON.parse(decode(D.literal(body,m.index+m[0].length).value));}catch(ignore){throw D.fail('decode','Atom oynatıcı verisi okunamadı.');}
  var doc=D.doc(body),mount=v.m&&doc.getElementById(v.m),url=D.publicUrl(v.cm,page);if(!mount||!url||!v.i)throw D.fail('decode','Atom H.264 medya veya oynatıcı kimliği eşleşmiyor.');
  var result={url:url,type:'hls',subtitles:[]};(Array.isArray(v.ct)?v.ct:[]).forEach(function(t,i){var u=D.publicUrl(t.file,page);if(u&&/^(?:captions|subtitles)$/.test(t.kind||''))result.subtitles.push({id:'atom-sub-'+i,url:u,label:root.CatalogUtils.clean(t.label)||'Altyazı',language:t.language||t.srclang||'',format:'vtt'});});return result;
 }
 root.FullHDFilmizleseneDecoder={alternatives:alternatives,settings:settings,resolve:function(e,get){return get(e.url,root.FullHDFilmizleseneParser.base+'/','embed').then(function(r){var v=settings(r.body,e.url);v.referer=e.url;return v;});}};
})(window);


/* saglayicilar/p004/parser.js */
(function(root){'use strict';root.FullHDFilmizleseneParser=root.CatalogSiteKit.createParser({id:'fullhdfilmizlesene',name:'Full HD Film İzlesene',base:'https://www.fullhdfilmizlesene.now',movie:/^\/film\/[a-z0-9-]+\/$/,pageNumber:function(u){var m=/^\/yeni-filmler\/(\d+)$/.exec(u.pathname);return m?Number(m[1]):0;},cards:'.film',cardLink:'a.tt',title:'.film-title',year:'.film-yil',imdb:'.imdb',language:'.trz',description:'.ozet, .film-ozet',listPath:'/',optionsPath:'/',filterPath:'/filmrobot/',fields:{},searchPath:'/arama/'});})(window);


/* saglayicilar/p004/provider.js */
(function (root) {
  'use strict';
  var Base = root.CatalogSiteKit.createProvider(root.FullHDFilmizleseneParser);
  function Provider(cache, network) {
    Base.call(this, cache, network || root.ChainNetwork.createClient({ destination: 'downloads', platformText: true }));
  }
  Provider.prototype = Object.create(Base.prototype);
  Provider.prototype.constructor = Provider;
  root.FullHDFilmizleseneProvider = Provider;
})(window);


/* saglayicilar/p004/resolver.js */
(function (root) {
  'use strict';
  var P = root.FullHDFilmizleseneParser, Base = root.WebPlayerData.createResolver(P, root.FullHDFilmizleseneDecoder);
  function Resolver(log, now) {
    Base.call(this, log, now);
    var normal = this.network, platform = root.ChainNetwork.createClient({ destination: 'downloads', platformText: true });
    function client(url) {
      var u;
      try { u = new root.URL(url); } catch (ignore) {}
      var atom = u && u.protocol === 'https:' && !u.username && !u.password && /^(rapidvid\.net|rapidvid\.org|tv\.rapidvid\.org)$/.test(u.hostname);
      return P.safe(url) || atom ? platform : normal;
    }
    this.network = {
      get: function (url, ref, headers, policy) { return client(url).get(url, ref, headers, policy); },
      post: function (url, body, headers, policy) { return client(url).post(url, body, headers, policy); },
      cancel: function () { normal.cancel(); platform.cancel(); }
    };
  }
  Resolver.prototype = Object.create(Base.prototype);
  Resolver.prototype.constructor = Resolver;
  root.FullHDFilmizleseneSourceResolver = Resolver;
})(window);


/* saglayicilar/p004/site.js */
(function(root){'use strict';var P=root.FullHDFilmizleseneParser;root.SiteRegistry.register({id:P.config.id,name:P.config.name,base:P.base,mark:"HD",subtitle:"Film arşivi ve Atom kaynakları",prefix:P.config.id+':',storagePrefix:'site.'+P.config.id+'.',contentTypes:['movie'],collectionKeys:['new'],posterBackground:'linear-gradient(145deg,#32558b,#172135)',Provider:root.FullHDFilmizleseneProvider,Resolver:root.FullHDFilmizleseneSourceResolver,ui:{movieRail:'Yeni filmler',seriesRail:'Diziler',filterHint:'Sitenin sunduğu alanlarla katalogda ara.',defaultOrder:'date'},collectionQuery:function(type){return {type:type,url:P.base+(type==='series'?P.config.seriesPath:P.config.listPath)};},filterFields:function(){return [];}});})(window);


})(window);
