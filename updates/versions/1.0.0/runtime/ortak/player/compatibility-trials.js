/* Optional, user-invoked tests using original package-local media, never a PC server. */
(function(root){
 'use strict';var C=root.PlayerCore;
 var clips=[
  {id:'avc1080',name:'AVPlay · 1080p H.264 / AAC kontrolü',height:1080,width:1920,video:'avc1',audio:'mp4a.40.2',features:[]},
  {id:'avc2160',name:'4K H.264 / AAC',height:2160,width:3840,video:'avc1',audio:'mp4a.40.2',features:['uhd']},
  {id:'hevc10',name:'4K HEVC Main10 SDR / AAC',height:2160,width:3840,video:'hvc1',videoProfile:'main10',audio:'mp4a.40.2',features:['uhd','hevc']},
  {id:'hevc2160',name:'4K HEVC Main / AAC',height:2160,width:3840,video:'hvc1',videoProfile:'main',audio:'mp4a.40.2',features:['uhd','hevc']},
  {id:'hdr10',name:'HDR10 · 4K HEVC / AAC',height:2160,width:3840,video:'hvc1',audio:'mp4a.40.2',range:'PQ',videoProfile:'main10',features:['uhd','hevc','hdr']},
  {id:'ac3',name:'Dolby AC-3 · TV hoparlörleri',height:360,width:640,video:'avc1',audio:'ac-3',features:['ac3']},
  {id:'eac3',name:'Dolby Digital Plus · TV hoparlörleri',height:360,width:640,video:'avc1',audio:'ec-3',features:['eac3']},
  {id:'ac3_51',name:'AC-3 5.1 giriş / TV hoparlörüne indirgeme',height:360,width:640,video:'avc1',audio:'ac-3',audioChannels:6,features:['ac3']},
  {id:'eac3_51',name:'E-AC-3 5.1 giriş / TV hoparlörüne indirgeme',height:360,width:640,video:'avc1',audio:'ec-3',audioChannels:6,features:['eac3']},
  {id:'dts_51',name:'DTS Core 5.1 giriş / TV hoparlörüne indirgeme',height:360,width:640,video:'avc1',audio:'dts',audioChannels:6,features:['dts']},
  {id:'dts',name:'DTS · TV hoparlörleri',height:360,width:640,video:'avc1',audio:'dts',features:['dts']}
 ];
 function get(id){var row=clips.filter(function(r){return r.id===id;})[0];if(!row)return null;return {id:'reference-'+id,label:row.name,type:'mp4',url:'compat-media/'+id+'.mp4',localPath:'compat-media/'+id+'.mp4',referenceId:id,referenceFeatures:row.features.slice(),preferredEngine:'avplay',mp4Verified:false,engineSupport:{html5:'unknown',avplay:'unknown'},mediaProfile:{height:row.height,width:row.width,videoCodec:row.video,audioCodec:row.audio,audioChannels:row.audioChannels||2,audioProfile:'core',videoProfile:row.videoProfile||'',range:row.range||'SDR'},subtitles:[]};}
 root.PlayerReferences={list:function(){return C.copy(clips);},get:get,valid:function(source){var known=source&&get(source.referenceId);return !!(known&&source.localPath===known.localPath&&source.url===known.url&&source.type==='mp4');}};
 function Trials(controller,caps){this.c=controller;this.caps=caps;this.active=null;this.returnTo=null;this.lastResult=null;var self=this;controller.on('change',function(){self.observe();});controller.on('close',function(result){if(self.active&&result.content&&result.content.referenceTrial&&result.reason!=='replace'){if(result.reason==='hidden')controller.suspended=self.returnTo?C.copy(self.returnTo.content):null;self.active=null;self.returnTo=null;}});}
 Trials.prototype.start=function(id){var source=get(id),c=this.c;if(!source||!this.caps.available('avplay'))return false;this.returnTo=c.content&&!c.content.referenceTrial?{content:C.copy(c.content),position:c.position,duration:c.duration,desiredPlay:c.desiredPlay}:null;this.active={id:id,source:source,progress:0,last:null,loop:false};c.open({contentId:'compat:'+id,title:source.label,referenceTrial:true,sources:[source]});return true;};
 Trials.prototype.observe=function(){var t=this.active,c=this.c;if(!t||!c.content||!c.content.referenceTrial)return;if(c.phase==='error'){this.finish(false,c.error);return;}if(c.ready&&c.duration>1&&!t.loop){t.loop=true;c.loop.a=0;c.loop.b=Math.max(1,c.duration-2);}
  var s=c.snapshot||{};if(c.phase==='playing'&&!s.paused&&!s.seeking&&!c.pendingSeek&&!c.engine.requestedSeek){var delta=s.position-t.last;if(t.last!==null&&C.finite(delta)&&delta>0&&delta<2)t.progress+=delta;t.last=s.position;}else t.last=null;
  if(t.progress<3||c.dialog||!(s.videoWidth>0&&s.videoHeight>0))return;
  var self=this,hdr=t.source.referenceFeatures.indexOf('hdr')>=0,message=hdr?'Renk deseni ve ses doğru mu; TV bilgi ekranı HDR sinyalini doğruluyor mu? Bu test renk kalibrasyonu değildir.':'Beyaz işaret ile kısa bipler aynı anda mı; görüntü ve ses doğru mu? Ses kabulü TV hoparlörleri içindir.';
  c.ask('feature-test',message,[{label:hdr?'Görüntü, ses ve HDR bilgisi doğru':'Görüntü ve ses doğru',action:function(){self.finish(true);}},{label:'Onay verme / önceki oynatmaya dön',action:function(){self.finish(false);}}]);
 };
 Trials.prototype.finish=function(confirmed,error){var t=this.active,c=this.c;if(!t)return;var restore=this.returnTo,s=c.snapshot||{},source=t.source;if(c.engineId()!=='avplay')confirmed=false;var proof={progress:t.progress,videoWidth:s.videoWidth||0,videoHeight:s.videoHeight||0,humanConfirmed:confirmed===true,hdrConfirmed:confirmed===true&&source.referenceFeatures.indexOf('hdr')>=0,referenceId:t.id,videoProfile:source.mediaProfile.videoProfile,audioChannels:source.mediaProfile.audioChannels,audioProfile:source.mediaProfile.audioProfile,features:source.referenceFeatures.slice()},approved=[];
  if(confirmed){source.referenceFeatures.forEach(function(feature){if(this.caps.confirmFeature('avplay',feature,proof))approved.push(feature);},this);}
  this.lastResult={id:t.id,confirmed:!!confirmed,progress:t.progress,width:proof.videoWidth,height:proof.videoHeight,approved:approved,error:error?C.safeMessage(error):null};this.active=null;this.returnTo=null;c.stop('compatibility');var session=c.session;c.notice(error?'Uyumluluk denemesi tamamlanamadı: '+C.safeMessage(error):confirmed?'TV hoparlörleri için doğrulama kaydedildi.':'Özellik onayı verilmedi.');
  if(restore)setTimeout(function(){if(c.session===session&&!c.content)c.open(restore.content,{position:restore.position,duration:restore.duration,desiredPlay:restore.desiredPlay});},80);
 };
 root.PlayerCompatibilityTrials=Trials;
})(window);
