/* Reads literal Next Flight data. No component or page script is executed. */
(function(root){
 'use strict';
 function walk(value,visit){var count=0;function next(v,depth){if(!v||typeof v!=='object'||depth>80||++count>60000)return;visit(v);Object.keys(v).forEach(function(k){next(v[k],depth+1);});}next(value,0);}
 function records(html){
  if(typeof html!=='string'||html.length>4*1024*1024)throw new Error('Site verisi çok büyük.');
  var wire='',re=/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi,m,match;
  while((m=re.exec(html))){match=/^\s*self\.__next_f\.push\((\[[\s\S]*\])\);?\s*$/.exec(m[1]);if(!match)continue;try{var chunk=JSON.parse(match[1]);if(chunk[0]===1&&typeof chunk[1]==='string')wire+=chunk[1];}catch(ignore){}}
  if(wire.length>3*1024*1024)throw new Error('Site verisi çok büyük.');
  var values=[],i=0,end,head,size,used,c,width;
  while(i<wire.length){
   if(wire.charAt(i)==='\n'){i++;continue;}
   head=/^([0-9a-f]+):/.exec(wire.slice(i,i+20));if(!head){end=wire.indexOf('\n',i);if(end<0)break;i=end+1;continue;}i+=head[0].length;
   head=/^T([0-9a-f]+),/.exec(wire.slice(i,i+20));
   if(head){size=parseInt(head[1],16);i+=head[0].length;used=0;while(i<wire.length&&used<size){c=wire.charCodeAt(i);width=c<128?1:c<2048?2:c>=55296&&c<=56319?4:3;used+=width;i+=width===4?2:1;}if(used!==size)throw new Error('Site metin çerçevesi bozuk.');continue;}
   end=wire.indexOf('\n',i);if(end<0)end=wire.length;
   if(/^[\[{\"]/.test(wire.charAt(i))){try{values.push(JSON.parse(wire.slice(i,end)));}catch(ignore2){}}
   i=end+1;
  }return values;
 }
 function find(values,predicate){var found=null;walk(values,function(v){if(!found&&!Array.isArray(v)&&predicate(v))found=v;});return found;}
 function player(html){
  var guard=find(records(html),function(v){return Object.prototype.hasOwnProperty.call(v,'accessLevel')&&Object.prototype.hasOwnProperty.call(v,'requireAuthForWatch');});
  if(!guard)throw new Error('HDFilmDelisi oynatıcı verisi bulunamadı.');
  if(guard.accessLevel!=='public'||guard.requireAuthForWatch!==false)throw new Error('Bu içerik üye girişi gerektiriyor.');
  var data=find(guard.children,function(v){return typeof v.videoUrl==='string'&&Object.prototype.hasOwnProperty.call(v,'isCopyrighted');});
  if(!data||data.isCopyrighted)throw new Error('Bu içerik için herkese açık oynatıcı bulunmuyor.');
  if(!/^https:\/\/pl\.vixolity\.com\/[A-Za-z0-9_=-]+$/.test(data.videoUrl))throw new Error('Oynatıcı biçimi desteklenmiyor.');
  return {url:data.videoUrl,poster:data.posterUrl||''};
 }
 root.HdfilmDelisiData={records:records,find:find,player:player};
})(window);
