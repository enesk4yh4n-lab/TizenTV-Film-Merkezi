(function (root) {
 'use strict';var P=root.SinemaccParser,D=root.SinemaccDecoder;
 function fail(stage,message){var e=new Error('Sinemacc · '+message);e.stage=stage;return e;}
 function Resolver(log,now){this.log=log||function(){};this.now=now||Date.now;this.generation=0;this.network=root.ChainNetwork.createClient({destination:'downloads',preferXHR:true});}
 Resolver.prototype.cancel=function(){this.generation++;this.network.cancel();};
 Resolver.prototype.resolve=function(content,deadline,onProgress,hints){
  this.cancel();var self=this,token=this.generation,sources=[],options=[],last,progress=root.SourceProgress&&new root.SourceProgress(onProgress,hints);
  if(!P.movieUrl(content.pageUrl))return Promise.reject(fail('page','Geçersiz film adresi.'));
  function check(){if(token!==self.generation){var e=fail('cancel','İptal edildi');e.cancelled=true;throw e;}if(self.now()>=deadline)throw fail('timeout','Kaynak hazırlama süresi doldu.');}
  function publish(){if(progress)progress.publish(sources,options);}
  function request(task,stage){return task.then(function(r){check();return r;},function(e){check();e.stage=stage;throw e;});}
  function get(url,ref,stage){check();return request(self.network.get(url,ref,{'User-Agent':'Mozilla/5.0'}),stage);}
  return get(content.pageUrl,P.base+'/','page').then(function(page){
   // Bind active sources to the requested film, excluding unrelated/recommended cards and ads.
   P.detail(page.body,content);var queue=D.alternatives(page.body);
   queue.forEach(function(e){options.push({sourceId:e.sourceId,label:e.label,status:'pending',detail:'',stage:''});});publish();
   if(progress)queue=progress.order(queue,function(e){return {id:e.sourceId,label:e.label,type:'hls'};});
   return queue.reduce(function(p,entry){return p.then(function(){var option=options.filter(function(o){return o.sourceId===entry.sourceId;})[0];return (progress?progress.wait(check):Promise.resolve().then(check)).then(function(){return get(entry.url,content.pageUrl,'embed');}).then(function(embed){
    var data=D.settings(embed.body,entry.url);check();var body='hash='+encodeURIComponent(data.id)+'&r='+encodeURIComponent(P.base+'/');
    return request(self.network.post(data.api,body,{'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8','X-Requested-With':'XMLHttpRequest'}),'api').then(function(response){var media=D.media(response.body);return get(media,entry.url,'manifest').then(function(manifest){
     if(!/^\s*#EXTM3U/.test(manifest.body))throw fail('manifest','HLS yerine farklı bir yanıt alındı.');
     // UE55MU7500: this CDN's 953 KiB fragment timed out in Download, while
     // HTTPS XHR delivered the same TS in 956 ms. Retain the shared native fallback.
     sources.push({id:entry.sourceId,label:entry.label,url:media,referer:entry.url,type:'hls',status:'ready',destination:'downloads',userAgent:'Mozilla/5.0',transport:'xhr',validation:{playlistTransport:/^XHR/.test(manifest.method)?'xhr':'native'},seekMode:'media-event',subtitles:data.subtitles});
     option.status='ready';option.detail=entry.labels.length>1?'HLS erişimi doğrulandı · aynı yayının dilleri Ses ve Altyazı menülerinde':'HLS erişimi doğrulandı';publish();
    });});
   }).catch(function(e){check();last=e;option.status='error';option.stage=e.stage||'decode';option.detail=root.PlayerCore.safeMessage(e.message);self.log('Sinemacc: '+entry.label+' / '+option.stage+' · '+option.detail);publish();});});},Promise.resolve());
  }).then(function(){check();sources.options=options;if(!sources.length){var e=last||fail('decode','Oynatılabilir kaynak bulunamadı.');e.sourceOptions=options;throw e;}return sources;});
 };
 root.SinemaccSourceResolver=Resolver;
})(window);
