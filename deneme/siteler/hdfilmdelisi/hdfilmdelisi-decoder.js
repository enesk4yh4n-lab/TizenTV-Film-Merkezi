/* Vixolity's literal encoding is decoded as text, never as JavaScript. */
(function(root){
 'use strict';
 function literal(s){return s.replace(/\\(x[0-9a-f]{2}|u[0-9a-f]{4}|[\\/'"])/gi,function(all,v){return v.charAt(0)==='x'||v.charAt(0)==='u'?String.fromCharCode(parseInt(v.slice(1),16)):v;});}
 function media(html){
  var re=/\(function\([^)]*\)\{([\s\S]*?)\}\)\('([0-9a-f]+)',\s*(\d{1,3})\);/gi,m,call,text,hex,shift,ascii,i,decoded,match;
  while((m=re.exec(html))){
   text=m[1];if(m[0].length>1024*1024||!text.match(/charCodeAt/)||!text.match(/reverse\(/)||!text.match(/atob\(/))continue;
   call=[m[0],m[2],m[3]];if(call[1].length%2)continue;
   hex=call[1];shift=Number(call[2]);if(shift>255)continue;ascii='';for(i=0;i<hex.length;i+=2)ascii+=String.fromCharCode(parseInt(hex.substr(i,2),16));ascii=ascii.split('').reverse().join('');
   if(!/^[A-Za-z0-9+/]+={0,2}$/.test(ascii)||ascii.length%4)continue;
   try{decoded=root.CryptoJS.enc.Base64.parse(ascii).toString(root.CryptoJS.enc.Latin1);}catch(ignore){continue;}
   text='';for(i=0;i<decoded.length;i++)text+=String.fromCharCode((decoded.charCodeAt(i)-shift+256)%256);
   match=/^\s*setupJWPlayer\(\s*['"]playerArea['"]\s*,\s*\{\s*file\s*:\s*'((?:\\(?:x[0-9a-f]{2}|u[0-9a-f]{4}|[\\/'"])|[^'\\\r\n])*)'\s*,/i.exec(text);
   if(!match)continue;var url=literal(match[1]);if(/^https:\/\/ha\.vixolity\.com\/vs\/[A-Za-z0-9_-]+(?:\/s[1-9]\d*\/e0*[1-9]\d*)?$/.test(url))return url;
  }throw new Error('Vixolity kaynak verisi çözümlenemedi.');
 }
 root.HdfilmDelisiDecoder={media:media};
})(window);
