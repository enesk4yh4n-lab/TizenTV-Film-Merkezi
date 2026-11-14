/* Per-package requests retain the signed owner through native redirects. */
(function (root) {
  'use strict';
  function allows(key, url) {
    var p = root.FilmPlugins.loaded[key], u;
    try { u = new root.URL(url); } catch (ignore) { return false; }
    return !!p && u.protocol === 'https:' && !u.username && !u.password && (!u.port || u.port === '443') && (p.origins || []).some(function (origin) { return root.FilmUpdateVerify.policyMatch(u.hostname, origin.slice(8)); });
  }
  function assert(key, url) { if (url && !allows(key, url)) { var error = new Error('Package origin denied: ' + key); error.stage = 'policy'; throw error; } }
  function create(key, options) {
    options = options || {};
    var tasks = [], platform = options.platformText ? root.ChainNetwork.createClient({ platformText: true, destination: 'downloads' }) : null;
    function request(url, ref, headers, body, policy) {
      policy = policy || {};
      try {
        assert(key, url); assert(key, ref);
        Object.keys(headers || {}).forEach(function (name) { if (/^origin$/i.test(name)) assert(key, headers[name]); });
      } catch (e) { return Promise.reject(e); }
      if (platform) {
        return (body === undefined ? platform.get(url, ref, headers, policy) : platform.post(url, body, headers, policy)).then(function (response) { assert(key, response.url || url); return response; });
      }
      var p = root.FilmPlugins.loaded[key];
      if (!root.FilmNativeTLS.supported()) return Promise.reject(new Error('Signed package transport unavailable on this device'));
      var task = root.FilmNativeTLS.request(url, ref || '', { repositoryId: p.repo.id, pluginId: p.manifest.id, method: body === undefined ? 'GET' : 'POST', body: body || '', headers: headers || {}, timeoutMs: policy.timeoutMs || 30000, deadline: policy.deadline, byteLimit: policy.byteLimit || 2097152 });
      tasks.push(task);
      function remove() { var i = tasks.indexOf(task); if (i >= 0) tasks.splice(i, 1); }
      return task.promise.then(function (value) { remove(); return value; }, function (e) { remove(); throw e; });
    }
    return { get: function (url, ref, headers, policy) { return request(url, ref, headers, undefined, policy); }, post: function (url, body, headers, policy) { return request(url, '', headers, typeof body === 'string' ? body : JSON.stringify(body), policy); }, cancel: function () { if (platform) platform.cancel(); tasks.slice().forEach(function (t) { t.cancel(); }); tasks = []; } };
  }
  root.PackageNetwork = { allows: allows, assert: assert, createClient: create };
})(window);
