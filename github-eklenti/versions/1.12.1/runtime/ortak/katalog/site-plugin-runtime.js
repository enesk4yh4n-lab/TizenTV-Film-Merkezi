/* Private module namespaces for signed site packages. Shared engine/store contracts stay global. */
(function (root) {
  'use strict';
  // WGT 1.4.1 can reuse a valid blob and then GC it before the pending record is committed.
  // Protect successfully read download objects for the existing operation's staging lifetime.
  var manager = root.FilmPlugins;
  if (manager && !manager.siteBlobStaging180) {
    var readBlob = manager.blob;
    manager.blob = function (hash) {
      var self = this;
      return readBlob.call(self, hash).then(function (text) {
        if (self.busy === 'download') self.staging[hash] = true;
        return text;
      });
    };
    manager.siteBlobStaging180 = true;
  }
  function scope(context, minimum) {
    var current = root.FilmUpdate && root.FilmUpdate.status().current;
    if (!current || root.FilmPluginSchema.compare(current, minimum || '1.8.0') < 0)
      throw new Error('Bu site için önce Güncelleme Merkezi üzerinden çekirdek bileşenini güncelleyin.');
    var local = {}, keys = ['URL','PlayerCore','CatalogUtils','CatalogClient','CatalogSearch','CatalogSiteKit','ContentIdentity','ChainDecoder','LiteralMediaDecoder','WebPlayerData','VidaraDecoder','CryptoJS','YoutubeSource','ChainNetwork','MediaNetwork','SourceProgress','SiteAddresses','SitePayload','SiteSourceFamilies'];
    keys.forEach(function (key) { local[key] = root[key]; });
    local.SiteRegistry = { register: function (site) {
      if (site.id !== context.site.id || site.prefix !== context.site.prefix)
        throw new Error('Site eklentisi bildirdiği kimlik dışında kayıt oluşturamaz.');
      if (site.translations && root.FilmI18n) root.FilmI18n.register({ messages: site.translations });
      root.SiteRegistry.register(site);
    }, get: root.SiteRegistry.get, forContent: root.SiteRegistry.forContent, sites: root.SiteRegistry.sites };
    local.window = local;
    return local;
  }
  root.SitePluginRuntime = { scope: scope };
})(window);
