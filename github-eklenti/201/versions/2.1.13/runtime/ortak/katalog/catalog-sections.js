/* Navigation sections are independent of movie/series identity and playback. */
(function (root) {
  'use strict';
  var special = ['animation', 'drama-short'];
  function text(value) { return String(value || '').replace(/İ/g,'i').replace(/I/g,'ı').toLowerCase().replace(/ı/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c').replace(/[-_/]+/g,' ').replace(/\s+/g,' ').replace(/^\s+|\s+$/g,''); }
  function own(card) {
    if (!card) return '';
    var labels = [].concat(card.genres || [], card.identityCategories || [], card.catalogCategories || []).filter(function (s) { return typeof s === 'string'; }).slice(0,64).map(text), section = special.indexOf(card.catalogSection) >= 0 ? card.catalogSection : '';
    if (section === 'animation' || labels.some(function (s) { return /^(?:animation|animasyon|anime|cartoon|cartoons|cizgi film|cizgi filmler|animasyon filmleri|anime dizileri)$/.test(s); })) return 'animation';
    if (section === 'drama-short' || card.type === 'series' && labels.some(function (s) { return /^(?:asya dizileri|kore dizileri|korean drama|k drama|asian drama|short drama|micro drama|mini drama|dikey dizi|kisa bolumlu diziler)$/.test(s); })) return 'drama-short';
    if (card.type === 'series' && [].concat(card.productionCountries || []).some(function (s) { return typeof s === 'string' && /^(?:kr|jp|cn|tw|hk|th|south korea|japan|china|taiwan|hong kong|thailand|guney kore|japonya|cin|tayvan|tayland)$/.test(text(s)); })) return 'drama-short';
    return '';
  }
  function classify(card) {
    var result = own(card);
    (card && Array.isArray(card.variants) ? card.variants : []).slice(0,64).some(function (v) { var found = own(v);if (found === 'animation') { result = found;return true; }if (!result && found) result = found;return false; });
    return result;
  }
  function supported(site, section) { return !!(site && Array.isArray(site.catalogSections) && site.catalogSections.indexOf(section) >= 0); }
  function matches(card, section, library) { var value = classify(card);if(!value&&library&&typeof library.group==='function')value=classify(library.group(card.canonicalId||card.contentId));return special.indexOf(section) >= 0 ? value === section : !value; }
  function known(library, section, providers, merge) {
    var result=[];
    if(!library||!library.data||!library.data.items||special.indexOf(section)<0)return result;
    Object.keys(library.data.items).forEach(function(id){
      var g=library.data.items[id];if(!g||['movie','series'].indexOf(g.type)<0||classify(g)!==section)return;
      var variants=(g.variants||[]).filter(function(v){return providers.indexOf(v.providerId)>=0;});
      if(!variants.length)return;
      if(merge){var card=library.card(id);if(card)result.push(card);}
      else variants.forEach(function(v){var card={};Object.keys(v).forEach(function(k){card[k]=v[k];});card.catalogSection=section;result.push(card);});
    });return result;
  }
  root.CatalogSections = { classify:classify, supported:supported, matches:matches, known:known, special:function (s) { return special.indexOf(s) >= 0; } };
})(window);
