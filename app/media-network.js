/* HLS transport selection for legacy TVs. No proxy or downloaded code execution. */
(function(root){'use strict';
var TV_UA='Mozilla/5.0 (SMART-TV; Linux; Tizen 3.0) AppleWebKit/537.36 (KHTML, like Gecko) Version/3.0 TV Safari/537.36';
function error(message,code){var e=new Error(message);e.code=code||0;return e;}
function htmlResponse(response){if(/text\/html|application\/xhtml\+xml/i.test(response.mimeType||''))return true;var bytes=new Uint8Array(response.data),prefix='';for(var i=0;i<Math.min(bytes.length,128);i++)prefix+=String.fromCharCode(bytes[i]);return /^\s*(?:<!doctype\s+html|<html\b|<head\b|<title\b)/i.test(prefix);}
function xhrRequest(url,options){
 var cancel=function(){},promise=new Promise(function(resolve,reject){
  var trace=root.PlayerReliability,traceId=trace?trace.begin(options.kind||(options.binary?'fragment':'playlist'),'xhr'):null;
  var x=null,done=false,timer=null,firstTimer=null,firstSeen=false,limit=options.byteLimit||(options.binary?8*1024*1024:2*1024*1024);
  function finish(e,data){if(done)return;done=true;if(trace)trace.end(traceId,!!e);clearTimeout(timer);clearTimeout(firstTimer);if(e){try{if(x)x.abort();}catch(ignore){}reject(e);}else resolve(data);}
  function first(){if(done||firstSeen)return;firstSeen=true;clearTimeout(firstTimer);if(options.onprogress)options.onprogress(0,0);}
  cancel=function(){var e=error('Iptal edildi');e.cancelled=true;finish(e);};
  try{
   x=new XMLHttpRequest();x.open('GET',url,true);if(options.binary)x.responseType='arraybuffer';
   if(options.rangeEnd>options.rangeStart)x.setRequestHeader('Range','bytes='+options.rangeStart+'-'+(options.rangeEnd-1));
   // Browser controls Referer and User-Agent. Do not try setting forbidden headers.
   timer=setTimeout(function(){finish(error('XHR '+(options.timeoutMs/1000)+' sn zaman asimi'));},options.timeoutMs);
   if(options.firstByteTimeoutMs)firstTimer=setTimeout(function(){finish(error('XHR ilk veri zaman asimi'));},Math.min(options.timeoutMs,options.firstByteTimeoutMs));
   x.onreadystatechange=function(){if(x.readyState>=2)first();};
   x.onprogress=function(event){if(trace)trace.progress(traceId,event.loaded);if(event.loaded>limit){finish(error('XHR medya boyut siniri'));return;}if(event.loaded>0)first();if(!done&&options.onprogress)options.onprogress(event.loaded,event.lengthComputable?event.total:0);};
   x.onload=function(){
    if(done)return;if(x.status<200||x.status>=300){finish(error('XHR HTTP '+x.status,x.status));return;}
    var data=options.binary?x.response:x.responseText,size=data&&(options.binary?data.byteLength:data.length);
    if(!data||typeof size!=='number'||size===0){finish(error('XHR bos veya desteklenmeyen medya yaniti'));return;}
    if(size>limit){finish(error('XHR medya boyut siniri'));return;}
    var range=x.getResponseHeader?x.getResponseHeader('Content-Range'):null,partial=false;
    if(x.status===206){var m=/^bytes\s+(\d+)-(\d+)\/(?:\d+|\*)$/i.exec(range||'');if(!m||Number(m[1])!==options.rangeStart||Number(m[2])+1!==options.rangeEnd||size!==options.rangeEnd-options.rangeStart){finish(error('Eksik veya doğrulanamayan HTTP byte range',206));return;}partial=true;}
    finish(null,{data:data,url:x.responseURL||url,method:'xhr',code:x.status,partial:partial,mimeType:x.getResponseHeader?x.getResponseHeader('Content-Type')||'':''});
   };
   x.onerror=function(){finish(error('XHR ag/CORS/TLS hatasi'));};
   x.ontimeout=function(){finish(error('XHR zaman asimi'));};
   x.onabort=function(){if(!done)finish(error('XHR istek iptal edildi'));};
   x.send();
  }catch(e){finish(error('XHR API: '+e.message));}
 });
 return {promise:promise,cancel:function(){cancel();}};
}
function request(url,options){
 options=options||{};var policy=options.policy||{},current=null,done=false,cancel=function(){};
 var promise=new Promise(function(resolve,reject){
  var nativeMode={method:'native',userAgent:policy.userAgent||''},browserMode={method:'xhr'},attempts=[],failures=[];
  if(policy.preferred==='xhr')attempts.push(browserMode,nativeMode);else attempts.push(nativeMode,browserMode);
  if(nativeMode.userAgent!==TV_UA)attempts.push({method:'native',userAgent:TV_UA});
  if(options.only==='xhr')attempts=[browserMode];else if(options.only==='native')attempts=[nativeMode];
  function report(message){if(!done&&options.onstatus)options.onstatus(message);}
  function finish(e,response){if(done)return;done=true;if(e)reject(e);else resolve(response);}
  cancel=function(){if(done)return;var e=error('Iptal edildi');e.cancelled=true;finish(e);if(current)current.cancel();};
  function next(index){
   if(done)return;
   if(index>=attempts.length){finish(error(failures.join(' | '),failures.lastCode));return;}
   var mode=attempts[index],label=mode.method==='xhr'?'XHR (Referer/UA tarayici kontrolunde)':(mode.userAgent?'Native / TV UA':'Native / varsayilan UA');
   if(mode.method==='native'&&policy.nativeUnavailable){next(index+1);return;}
   var deadline=typeof options.deadline==='function'?options.deadline():options.deadline;
   var remaining=deadline?deadline-Date.now():Infinity;
   if(remaining<=0){finish(error('Ortak istek süresi doldu'));return;}
   var timeout=Math.max(1,Math.min(options.timeoutMs||Infinity,options.binary?20000:10000,remaining));
   var progress=function(loaded,total){if(!done&&options.onprogress)options.onprogress(loaded,total);};
   if(!options.binary)report(label+': '+(options.kind||'playlist')+' isteniyor');
   try{
    current=mode.method==='xhr'?xhrRequest(url,{kind:options.kind,binary:options.binary,timeoutMs:timeout,firstByteTimeoutMs:options.firstByteTimeoutMs,byteLimit:options.byteLimit,rangeStart:options.rangeStart,rangeEnd:options.rangeEnd,onprogress:progress}):NativeMedia.request(url,{kind:options.kind,binary:options.binary,referer:options.referer,userAgent:mode.userAgent,timeoutMs:timeout,firstByteTimeoutMs:options.firstByteTimeoutMs,byteLimit:options.byteLimit,onprogress:progress,onstatus:function(s){report(label+': '+s);}});
    current.promise.then(function(response){
     if(done)return;
     if(!options.binary&&(!options.kind||options.kind==='playlist')&&!/^\s*#EXTM3U/.test(response.data))throw error('Yanit HLS playlist degil');
     if(!options.binary&&/^\s*(?:<!doctype\s+html|<html\b|<head\b)/i.test(response.data))throw error('Metin yerine HTML hata/dogrulama sayfasi alindi');
     if(options.binary&&(!response.data||!response.data.byteLength))throw error('Bos ikili medya yaniti');
     if(options.binary&&htmlResponse(response))throw error('Medya yerine HTML hata/dogrulama sayfasi alindi');
     var changed=policy.preferred!==mode.method||mode.method==='native'&&policy.userAgent!==mode.userAgent;
     policy.preferred=mode.method;if(mode.method==='native')policy.userAgent=mode.userAgent;
     if(!options.binary||changed||!policy.binaryReported)report(label+': '+(options.binary?'medya parcasi':'HLS playlist')+' alindi ('+(options.binary?response.data.byteLength:response.data.length)+' bayt/karakter)');
     if(options.binary)policy.binaryReported=true;
     response.method=mode.method;finish(null,response);
    }).catch(function(e){if(done)return;failures.push(label+': '+e.message);failures.lastCode=e.code||failures.lastCode||0;report(label+': '+e.message);if(e.nativeUnavailable)policy.nativeUnavailable=true;next(index+1);});
   }catch(e){failures.push(label+': '+e.message);report(label+': '+e.message);next(index+1);}
  }
  if(!/^https?:\/\//i.test(url)){finish(error('Desteklenmeyen medya adresi'));return;}
  next(0);
 });
 return {promise:promise,cancel:function(){cancel();}};
}
root.MediaNetwork={request:request};
})(window);
