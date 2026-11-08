(function (root) {
 'use strict';
 var BASE = root.FixFullParser.base;
 root.SiteRegistry.register({
  id: 'fixfullfilmizle', name: 'FixFullFilmİzle', base: BASE, mark: 'FX', subtitle: 'Film ve dizi arşivi', prefix: 'fixfullfilmizle:', storagePrefix: 'site.fixfullfilmizle.',
  posterBackground: 'linear-gradient(145deg,#c58e24,#29201b)', Provider: root.FixFullProvider, Resolver: root.FixFullSourceResolver,
  collectionKeys: function (type) { return type === 'series' ? ['new'] : ['new', 'recommended', 'rated', 'liked']; },
  ui: { movieRail: 'Yeni filmler', seriesRail: 'Dizi arşivi', recommended: 'En çok izlenenler', rated: 'En çok yorumlananlar', liked: 'En çok beğenilenler', filterHint: 'Filmlerde gerçek tür arşivleri; genel listede site sıralamaları kullanılır.', filterSummary: 'Tür', defaultOrder: 'date' },
  filterFields: function (type) { return type === 'series' ? [] : ['genres']; },
  collectionQuery: function (type, key, links) { return { type: type, url: links && links[key] || ({ new: BASE + '/', recommended: BASE + '/en-cok-izlenenler/', rated: BASE + '/en-cok-yorumlananlar/', liked: BASE + '/en-cok-begenilenler/' })[key] }; }
 });
})(window);
