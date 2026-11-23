/* Per-package requests retain the signed owner through native redirects. */
(function (root) {
  'use strict';
  function allows(key, url) {
    var p = root.FilmPlugins.loaded[key], u;
    try { u = new root.URL(url); } catch (ignore) { return false; }
    return !!p && u.protocol === 'https:' && !u.username && !u.password && (!u.port || u.port === '443') && (p.origins || []).some(function (origin) { return root.FilmUpdateVerify.policyMatch(u.hostname, origin.slice(8)); });
  }
  function assert(key, url) { if (url && !allows(key, url)) { var error = new Error('Package origin denied: ' + key); error.stage = 'policy'; throw error; } }
  function checkResponse(response) {
    var body = response && response.body, challengeScript = false;
    var challengePath = /\/cdn-cgi\/challenge-platform\//i;
    if (typeof body !== 'string' || body.length > 4096 ||
        !/^\s*(?:<!doctype\s+html\b|<html\b)/i.test(body) || !challengePath.test(body)) return response;
    var markup = body.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, function (script) {
      if (/\b(?:jwplayer|videojs|playerConfig)\b|\.(?:m3u8|mp4)\b/i.test(script)) return script;
      if (challengePath.test(script)) challengeScript = true;
      return '';
    });
    if (!challengeScript || /<(?:main|article|h[1-6]|a|iframe|video|audio|source|script)\b/i.test(markup)) return response;
    var text = markup.replace(/<head\b[^>]*>[\s\S]*?<\/head\s*>/gi, '').replace(/<[^>]+>/g, '').trim();
    if (text.length > 64) return response;
    var error = new Error('Doğrulama/erişim engeli / Site requests access verification');
    error.stage = 'access';
    error.httpStatus = response.status || response.code || 0;
    throw error;
  }
  function create(key, options) {
    options = options || {};
    var tasks = [], platform = options.platformText ? root.ChainNetwork.createClient({ platformText: true, destination: 'downloads' }) : null;
    function request(url, ref, headers, body, policy) {
      policy = policy || {};
      if (options.userAgent) {
        var copied = {}, hasAgent = false;
        Object.keys(headers || {}).forEach(function (name) { copied[name] = headers[name]; if (/^user-agent$/i.test(name)) hasAgent = true; });
        if (!hasAgent) copied['User-Agent'] = options.userAgent;
        headers = copied;
      }
      try {
        assert(key, url); assert(key, ref);
        Object.keys(headers || {}).forEach(function (name) { if (/^origin$/i.test(name)) assert(key, headers[name]); });
      } catch (e) { return Promise.reject(e); }
      if (!platform && root.PackageFetchTransport && root.PackageFetchTransport.supported()) {
        var fetchTask = root.PackageFetchTransport.request(url, {
          packageKey: key, referer: ref || '', method: body === undefined ? 'GET' : 'POST',
          body: body, headers: headers || {}, timeoutMs: policy.timeoutMs || 30000,
          deadline: policy.deadline, byteLimit: policy.byteLimit || 2097152
        });
        tasks.push(fetchTask);
        var fetched = function () { var index = tasks.indexOf(fetchTask); if (index >= 0) tasks.splice(index, 1); };
        return fetchTask.promise.then(function (response) { fetched(); return checkResponse(response); }, function (e) { fetched(); throw e; });
      }
      if (platform) {
        return (body === undefined ? platform.get(url, ref, headers, policy) : platform.post(url, body, headers, policy)).then(function (response) { assert(key, response.url || url); return checkResponse(response); });
      }
      var p = root.FilmPlugins.loaded[key];
      if (!root.FilmNativeTLS.supported()) return Promise.reject(new Error('Signed package transport unavailable on this device'));
      var task = root.FilmNativeTLS.request(url, ref || '', { repositoryId: p.repo.id, pluginId: p.manifest.id, method: body === undefined ? 'GET' : 'POST', body: body || '', headers: headers || {}, timeoutMs: policy.timeoutMs || 30000, deadline: policy.deadline, byteLimit: policy.byteLimit || 2097152 });
      tasks.push(task);
      function remove() { var i = tasks.indexOf(task); if (i >= 0) tasks.splice(i, 1); }
      return task.promise.then(function (value) { remove(); return checkResponse(value); }, function (e) { remove(); throw e; });
    }
    return { get: function (url, ref, headers, policy) { return request(url, ref, headers, undefined, policy); }, post: function (url, body, headers, policy) { return request(url, '', headers, typeof body === 'string' ? body : JSON.stringify(body), policy); }, cancel: function () { if (platform) platform.cancel(); tasks.slice().forEach(function (t) { t.cancel(); }); tasks = []; } };
  }
  root.PackageNetwork = { allows: allows, assert: assert, createClient: create };
})(window);
