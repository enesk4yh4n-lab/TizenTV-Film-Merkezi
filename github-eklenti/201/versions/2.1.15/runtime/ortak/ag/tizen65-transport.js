/* Let the signed core use the compiled transport already present in WGT 2.0.3. */
(function (root) {
  'use strict';
  function policyMessages(core, plugins) {
    var base = core.baseline.networkPolicy, active = core.selected.networkPolicy;
    var coreRepo = {kind:'repository', repositoryId:'core-runtime',
      url:core.config.channel + '/filmmerkezi-repository.json', publicKey:core.selected._signer};
    return Promise.all([core.local(base.file), core.local(base.signature),
      core.source(active.file), core.source(active.signature)]).then(function (files) {
      var messages = [
        {kind:'configure', policy:files[0], signature:files[1]},
        coreRepo,
        {kind:'repository-policy', repositoryId:coreRepo.repositoryId, pluginId:'core', policy:files[2], signature:files[3]}
      ];
      Object.keys(plugins.state.repositories).sort().forEach(function (id) {
        var repo = plugins.state.repositories[id];
        if (repo.enabled) messages.push({kind:'repository', repositoryId:id,
          url:repo.url.replace(/filmmerkezi201-repository\.json$/, 'filmmerkezi-repository.json'), publicKey:repo.publicKey});
      });
      // These are the already approved, signed records selected by the normal bootstrap.
      var pending = Promise.resolve();
      Object.keys(plugins.loaded).sort().forEach(function (key) {
        pending = pending.then(function () {
          var pkg = plugins.loaded[key];
          return plugins.policy(pkg.repo, pkg.manifest).then(function (policy) {
            messages.push({kind:'repository-policy', repositoryId:pkg.repo.id,
              pluginId:pkg.manifest.id, policy:policy[0], signature:policy[1]});
          });
        });
      });
      return pending.then(function () { return {messages:messages, coreRepo:coreRepo}; });
    });
  }
  function warm(bridge, messages) {
    return new Promise(function (resolve, reject) {
      var ready, index = 0, awaiting = 0, timer = setTimeout(failed, 12000);
      function finish(error) {
        clearTimeout(timer);
        bridge.removeEventListener('message', receive);
        bridge.removeEventListener('error', failed);
        if (error) reject(error); else resolve(ready);
      }
      function failed() { finish(Error('Tizen 6.5 WASM transport did not initialize')); }
      function next() {
        if (index === messages.length) { finish(); return; }
        var message = messages[index++];
        message.id = awaiting = 1000000000 + index;
        bridge.postMessage(message);
      }
      function receive(event) {
        var message = event.data;
        if (!ready && message.kind === 'ready') {
          if (message.protocol !== 1 || message.policy !== 1 || !message.binary ||
              !message.tls || message.repositoryTrust !== 1) { failed(); return; }
          ready = message;
          next();
        } else if (ready && message.kind === 'result' && message.id === awaiting) {
          if (message.code !== 0) finish(Error('Tizen 6.5 rejected a signed network policy'));
          else next();
        }
      }
      bridge.addEventListener('message', receive);
      bridge.addEventListener('error', failed);
      bridge.start();
    });
  }
  function readyBridge(bridge, ready) {
    var receiver, started = false, embed = Object.create(bridge);
    embed.addEventListener = function (type, listener) {
      if (type === 'message' && !started) receiver = listener;
      bridge.addEventListener(type, listener);
    };
    embed.start = function () {
      if (started) return;
      started = true;
      if (receiver) receiver({data:ready});
      receiver = null;
    };
    return embed;
  }
  function prepare(core, plugins) {
    var agent = root.navigator, original = root.FilmWasmTLS, transport = root.FilmNativeTLS, bridge, timer;
    if (!agent || !/\bTizen 6\.5(?:[; )]|$)/i.test(agent.userAgent || '') ||
        !root.Worker || !root.WebAssembly || !root.TextDecoder || !original || !transport ||
        transport.supported() || original.supported() ||
        agent.mimeTypes && agent.mimeTypes['application/x-nacl'] ||
        !core || core.blocked || core.bootStopped || core.config.appVersion !== '2.0.3' ||
        !plugins || plugins.blocked) return Promise.resolve(false);

    var timeout = new Promise(function (resolve, reject) {
      timer = setTimeout(function () { reject(Error('Reading signed network policies took too long')); }, 12000);
    });
    var plan = Promise.resolve().then(function () { return policyMessages(core, plugins); });
    return Promise.race([plan, timeout]).then(function (plan) {
      clearTimeout(timer);
      if (core.bootStopped) return false;
      bridge = original.create();
      return warm(bridge, plan.messages).then(function (ready) {
        if (core.bootStopped) throw Error('Application startup was cancelled');
        // The bootstrap's native client keeps the same API and JS permission checks.
        root.FilmWasmTLS = {
          supported:function () { return true; },
          create:function () { return readyBridge(bridge, ready); }
        };
        var repo = plan.coreRepo;
        return transport.registerRepository(repo.repositoryId, repo.url, repo.publicKey)
          .then(function () { return true; });
      });
    }).catch(function () {
      clearTimeout(timer);
      root.FilmWasmTLS = original;
      if (bridge) bridge.destroy();
      return false;
    });
  }
  root.FilmTizen65Transport = {prepare:prepare};
})(window);
