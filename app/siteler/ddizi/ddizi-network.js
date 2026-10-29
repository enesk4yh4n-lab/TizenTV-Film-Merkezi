(function (root) {
  'use strict';
  function createClient(options) {
    options = options || {};
    var legacy = root.ChainNetwork.createClient(options),
      active = [],
      generation = 0;
    function release(task) {
      var at = active.indexOf(task);
      if (at >= 0) active.splice(at, 1);
    }
    return {
      get: function (url, referer, headers, policy) {
        var secure = root.ChainSecureHttp,
          token = generation;
        if (!secure || !secure.supported() || !secure.allowed(url, referer))
          return legacy.get(url, referer, headers, policy);
        var task = secure.request(url, referer, {
          deadline: Math.min(options.deadline || Infinity, (policy && policy.deadline) || Infinity),
          timeout: (policy && policy.timeoutMs) || 18000,
        });
        active.push(task);
        return task.promise.then(
          function (value) {
            release(task);
            return value;
          },
          function (e) {
            release(task);
            if (token !== generation || e.cancelled || !e.unavailable) throw e;
            return legacy.get(url, referer, headers, policy);
          }
        );
      },
      cancel: function () {
        generation++;
        active.slice().forEach(function (task) {
          task.cancel();
        });
        active = [];
        legacy.cancel();
      },
    };
  }
  root.DdiziNetwork = { createClient: createClient };
})(window);
