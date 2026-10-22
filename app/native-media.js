/* Native binary/text transport for the HLS loader; no downloaded code execution. */
(function(root){'use strict';
var serial=0;
function measured(name,fn){return root.PlayerReliability?root.PlayerReliability.call(name,fn):fn();}
function request(url,options){
 options=options||{};
 var cancelled=false,cancelJob=function(){},promise=new Promise(function(resolve,reject){
  var trace=root.PlayerReliability,traceId=trace?trace.begin(options.kind||(options.binary?'fragment':'playlist'),'native'):null;
  var done=false,id=null,timer=null,firstTimer=null,readTimer=null,streamHandle=null,path=null,reading=false,mimeType='',received=0,state='baslatiliyor',timeout=options.timeoutMs||25000,limit=options.byteLimit||(options.binary?8*1024*1024:2*1024*1024);
  function status(message){if(!done&&options.onstatus)options.onstatus(message);}
  function unavailable(message){var e=new Error(message);e.nativeUnavailable=true;return e;}
  function cleanup(){if(!path||reading)return;var remove=path;path=null;try{tizen.filesystem.resolve(remove,function(file){if(file.parent)file.parent.deleteFile(file.fullPath,function(){},function(){});},function(){},'rw');}catch(ignore){}}
  function closeStream(){if(!streamHandle)return;var current=streamHandle;streamHandle=null;try{current.close();}catch(ignore){}reading=false;}
  function finish(error,data){if(done){cleanup();return;}done=true;if(trace)trace.end(traceId,!!error);clearTimeout(timer);clearTimeout(firstTimer);clearTimeout(readTimer);closeStream();cleanup();if(error){try{if(id!==null&&id>=0)tizen.download.cancel(id);}catch(ignore){}reject(error);}else resolve(data);}
  cancelJob=function(){cancelled=true;finish(new Error('Iptal edildi'));};
  if(!/^https?:\/\//i.test(url)){finish(new Error('Desteklenmeyen medya adresi'));return;}
  if(!root.tizen||!tizen.download||!tizen.DownloadRequest||!tizen.filesystem){finish(unavailable('Native medya API mevcut degil'));return;}
  try{if(tizen.systeminfo&&tizen.systeminfo.getCapability&&tizen.systeminfo.getCapability('http://tizen.org/feature/download')===false){finish(unavailable('Download capability false'));return;}}catch(ignore){}
  timer=setTimeout(function(){finish(new Error('Native medya '+(timeout/1000)+' sn zaman asimi; durum '+state+'; alinan '+received+' bayt'));},timeout);
  if(options.firstByteTimeoutMs)firstTimer=setTimeout(function(){finish(new Error('Native ilk veri zaman asimi'));},Math.min(timeout,options.firstByteTimeoutMs));
  try{
   var headers={Accept:'*/*'};if(options.userAgent)headers['User-Agent']=options.userAgent;if(options.referer)headers.Referer=options.referer;
   id=measured('media.download.start',function(){return tizen.download.start(new tizen.DownloadRequest(url,'documents','media_'+Date.now()+'_'+(++serial)+'.bin','ALL',headers),{
    onprogress:function(job,size,total){if(done)return;if(trace)trace.progress(traceId,size);received=size;state='DOWNLOADING';if(size>limit){finish(new Error('Medya parcasi boyut siniri: '+limit));return;}if(size>0){clearTimeout(firstTimer);if(!done&&options.onprogress)options.onprogress(size,total||0);}},
    onpaused:function(){finish(new Error('Native indirme duraklatildi (PAUSED)'));},
    oncanceled:function(){finish(new Error('Native indirme iptal edildi (CANCELED)'));},
    onfailed:function(job,error){finish(new Error('Native medya: '+error.name+(error.message?' '+error.message:'')));},
    oncompleted:function(job,filePath){
     path=filePath;state='dosya okunuyor';clearTimeout(firstTimer);if(done){cleanup();return;}
     try{if(tizen.download.getMIMEType)mimeType=measured('media.download.getMIMEType',function(){return tizen.download.getMIMEType(job);})||'';}catch(ignore){}
     try{tizen.filesystem.resolve(path,function(file){
      if(done){cleanup();return;}if(typeof file.fileSize!=='number'||file.fileSize<0||file.fileSize>limit){finish(new Error('Medya dosyasi boyut siniri'));return;}
      reading=true;
      try{
       if(!options.binary){file.readAsText(function(text){reading=false;finish(null,{data:text,url:url,mimeType:mimeType});},function(e){reading=false;finish(new Error('Playlist okuma: '+e.name));},'UTF-8');return;}
       file.openStream('r',function(stream){
        if(done){try{stream.close();}catch(ignore){}reading=false;cleanup();return;}
        streamHandle=stream;var data,offset=0;
        try{data=new Uint8Array(file.fileSize);}catch(e){finish(new Error('Medya bellegi ayrilamadi'));return;}
        function chunk(){
         readTimer=null;if(done)return;
         try{
          var count=Math.min(65536,file.fileSize-offset),bytes=measured('media.file.readBytes',function(){return stream.readBytes(count);});
          if(!bytes||bytes.length!==count)throw new Error('Eksik medya verisi');data.set(bytes,offset);offset+=bytes.length;
          if(offset<file.fileSize){readTimer=setTimeout(chunk,0);return;}
          closeStream();finish(null,{data:data.buffer,url:url,mimeType:mimeType});
         }catch(e){finish(new Error('Ikili medya okuma: '+e.message));}
        }
        chunk();
       },function(e){reading=false;finish(new Error('Medya dosyasi acma: '+e.name));});
      }catch(e){reading=false;finish(new Error('Medya dosyasi okuma: '+e.message));}
     },function(e){finish(new Error('Medya dosyasi erisimi: '+e.name));},'rw');}catch(e){finish(e);}
    }
   });});
   if(typeof id!=='number'||id<0){finish(unavailable('Native indirme baslatilamadi; is kimligi '+id+' (ag kullanilamiyor olabilir)'));return;}
   // Completion, progress and failure callbacks own state; avoid synchronous bridge polling.
  }catch(e){finish(e);}
 });
 return {promise:promise,cancel:function(){if(!cancelled)cancelJob();}};
}
root.NativeMedia={request:request};
})(window);
