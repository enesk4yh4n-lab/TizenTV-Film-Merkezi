(function (root) {
  'use strict';
  function tr(value) {
    return root.FilmI18n ? root.FilmI18n.text(value) : value;
  }
  root.FilmLegal.start(function () {
    root.CatalogRuntime.install();
    root.SiteRegistry.load(function () {
      var versionLabel = document.querySelector('.catalog-version');
      if (versionLabel) versionLabel.textContent = tr('TIZEN 3.0 · ' + root.AppInfo.version);
      var d = new root.PlayerDiagnostics(),
        c;
      function log(message) {
        d.log(message);
      }
      var storage = null;
      try {
        storage = root.localStorage;
      } catch (ignore) {}
      var storageNotices = [];
      storage = new root.StorageCoordinator(storage, function (message) {
        storageNotices.push(message);
        log(message);
        if (root.ChainApp && root.ChainApp.view) root.ChainApp.view.toast(message);
      });
      var store = new root.PlaybackStore(storage, function (message) {
        if (c) c.notice(message);
        else log(message);
      });
      var subtitles = new root.SubtitleManager(document.getElementById('subtitle-layer'), function (
        message
      ) {
        if (c) c.notice(message);
      });
      var capabilities = new root.PlayerCapabilities(storage, function (m) {
          if (c) c.notice(m);
        }),
        compatibility = new root.PlaybackCompatibilityStore(storage, function (m) {
          if (c) c.notice(m);
        });
      var engine = new root.PlaybackEngineRouter(
          document.getElementById('browser-video'),
          document.getElementById('av-player'),
          subtitles,
          log,
          capabilities
        ),
        resolver = new root.SourceResolver(log);
      c = new root.PlayerController({
        engine: engine,
        resolver: resolver,
        store: store,
        log: log,
        compatibility: compatibility,
        capabilities: capabilities
      });
      var view = new root.PlayerView(c, d),
        trials = (c.trials = new root.PlayerCompatibilityTrials(c, capabilities)),
        input = new root.PlayerInput(c, view, document),
        lifecycle = new root.PlayerLifecycle(c, input);
      storageNotices.forEach(function (message) {
        view.toast(message);
      });
      storageNotices = [];
      if (root.FilmLegal.notice) view.toast(root.FilmLegal.notice);
      function open(content) {
        c.open(content);
      }
      root.addEventListener('error', function (e) {
        log('JS hata: ' + e.message + '; satır ' + e.lineno);
      });
      root.ChainApp = {
        compatibility: compatibility,
        capabilities: capabilities,
        trials: trials,
        open: open,
        controller: c,
        engine: engine,
        view: view,
        input: input,
        store: store,
        diagnostics: d,
        version: root.AppInfo.version
      };
      root.ChainApp.catalog = new root.CatalogApp(root.ChainApp, storage);
      if (root.FilmI18n)
        root.FilmI18n.onChange(function () {
          var catalog = root.ChainApp.catalog,
            focused = document.activeElement,
            focusKey = focused && focused.getAttribute('data-focus'),
            command = focused && focused.getAttribute('data-command'),
            index = view.menu ? view.focusIndex() : 0;
          root.SiteSelection.refreshLanguage();
          catalog.render(true);
          if (catalog.panel) catalog.renderPanel(focusKey);
          view.render(true);
          if (view.menu && c.content) view.openMenu(view.menu, index);
          if (c.dialog) {
            view.drawDialog(c.dialog);
            var buttons = document.querySelectorAll('#dialog-actions [data-command]');
            Array.prototype.some.call(buttons, function (button) {
              if (button.getAttribute('data-command') === command) {
                button.focus();
                return true;
              }
              return false;
            });
          }
        });
      root.SiteSelection.init(root.ChainApp);
      log(root.AppInfo.version + ' hazır. Gerçek katalog / native-XHR / hls.js.');
    });
  });
})(window);
