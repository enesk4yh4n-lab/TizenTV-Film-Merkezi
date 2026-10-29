(function(root){'use strict';var BASE='https://invalid.local';
 function clean(value) { return String(value || '').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, ''); }
 function languageBadges(value) {
  var label = clean(value).toLowerCase().replace(/ı/g, 'i').replace(/ü/g, 'u').replace(/ç/g, 'c').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ğ/g, 'g').replace(/\u0307/g, '')
   .replace(/[&/+(),-]/g, ' ').replace(/\bve\b/g, ' ').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
  // Accept explicit site labels only; country, title and generic series type are not language evidence.
  var dual = /^(?:dual|(?:dual )?(?:turkce )?dublaj(?:li)? (?:turkce )?altyazi(?:li)?)$/.test(label);
  return { dubbed: dual || /^(?:turkce )?dublaj(?:li)?$/.test(label), subtitled: dual || /^(?:turkce )?altyazi(?:li)?$/.test(label) };
 }
 function url(value, base) {
  value = clean(value); if (!value || /^(javascript|data|blob|file):/i.test(value)) return '';
  try { var u = new root.URL(value, base || BASE + '/'); return /^https?:$/.test(u.protocol) ? u.href.replace(/#.*$/, '') : ''; } catch (ignore) { return ''; }
 }
 function envelope(body, metadataOnly) {
  var data = {}, html = body;
  if (/^\s*[{[]/.test(body)) { try { data = JSON.parse(body); } catch (e) { throw new Error('Katalog yanıtı okunamadı.'); }
   if (data.error) throw new Error('Katalog: ' + clean(data.error).slice(0, 150));
   html = data.html !== undefined ? data.html : (Array.isArray(data.results) ? data.results.join('\n') : '');
  }
  if (typeof html !== 'string') throw new Error('Katalog yanıt biçimi değişti.');
  var schema = [];
  html.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi, function (all, value) {
   try { var parsed = JSON.parse(value); schema = schema.concat(Array.isArray(parsed) ? parsed : parsed['@graph'] || [parsed]); } catch (ignore) {} return all;
  });
  if (metadataOnly) return { data: data, schema: schema };
  /* Prevent scripts, embedded documents, CSS and eager image requests even in the detached parser. */
  html = html.replace(/<(script|style|iframe|object|video|audio)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '').replace(/<link\b[^>]*>/gi, '')
   .replace(/(\s)src(\s*=)/gi, '$1data-catalog-src$2').replace(/(\s)srcset(\s*=)/gi, '$1data-catalog-srcset$2').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  return { data: data, schema: schema, doc: new DOMParser().parseFromString(html, 'text/html') };
 }
root.CatalogUtils={clean:clean,url:url,envelope:envelope,languageBadges:languageBadges};})(window);