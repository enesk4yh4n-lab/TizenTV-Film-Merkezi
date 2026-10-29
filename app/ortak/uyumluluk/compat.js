/* Only missing ECMAScript helpers used by the pinned HLS UMD build. */
(function(){'use strict';
 if(!Object.entries)Object.entries=function(o){return Object.keys(o).map(function(k){return [k,o[k]];});};
 if(!Object.values)Object.values=function(o){return Object.keys(o).map(function(k){return o[k];});};
 if(!Array.prototype.includes)Object.defineProperty(Array.prototype,'includes',{value:function(value,start){var n=this.length>>>0,i=Number(start)||0;if(i<0)i=Math.max(n+i,0);for(;i<n;i++){if(this[i]===value||(this[i]!==this[i]&&value!==value))return true;}return false;},configurable:true,writable:true});
 if(!Uint8Array.from)Uint8Array.from=function(value){return new Uint8Array(Array.prototype.slice.call(value));};
})();
