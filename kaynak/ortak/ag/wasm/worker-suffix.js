/* All permission decisions below are repeated inside signed compiled code. */
self.onmessage = function (event) {
  var m = event.data, code = -1, stage = 'validation', args, types, headers;
  if (!m || typeof m.id !== 'number' || m.id <= 0 || m.id % 1 || m.id > 2147483647) return;
  function text(value, max) { return typeof value === 'string' && value.length <= max && value.indexOf('\x00') < 0; }
  try {
    if (m.kind === 'configure' && text(m.policy, 16384) && text(m.signature, 1024)) {
      stage = 'policy'; code = Module.ccall('fm_configure', 'number', ['string', 'string'], [m.policy, m.signature]);
    } else if (m.kind === 'repository' && text(m.repositoryId, 64) && text(m.url, 2048) && text(m.publicKey, 800)) {
      stage = 'repository'; code = Module.ccall('fm_repository', 'number', ['string', 'string', 'string'], [m.repositoryId, m.url, m.publicKey]);
    } else if (m.kind === 'repository-policy' && text(m.repositoryId, 64) && text(m.pluginId, 64) && text(m.policy, 16384) && text(m.signature, 1024)) {
      stage = 'policy'; code = Module.ccall('fm_policy', 'number', ['string', 'string', 'string', 'string'], [m.repositoryId, m.pluginId, m.policy, m.signature]);
    } else if (m.kind === 'repository-remove' && text(m.repositoryId, 64)) {
      stage = 'repository'; code = Module.ccall('fm_remove', 'number', ['string'], [m.repositoryId]);
    } else if (m.kind === 'request' && text(m.url, 4096) && text(m.referer || '', 4096) &&
        text(m.repositoryId || '', 64) && text(m.pluginId || '', 64) && text(m.body || '', 262144) &&
        (m.method === 'GET' || m.method === 'POST') && typeof m.byteLimit === 'number' && m.byteLimit % 1 === 0) {
      headers = m.headers || {};
      if (Object.keys(headers).some(function (key) { return ['Range', 'Origin', 'Content-Type', 'X-Requested-With', 'User-Agent'].indexOf(key) < 0 || !text(headers[key], 2048); })) throw new Error('Invalid headers');
      args = [m.id, m.url, m.referer || '', m.repositoryId || '', m.pluginId || '', m.method, m.body || '',
        headers.Range || '', headers.Origin || '', headers['Content-Type'] || '', headers['X-Requested-With'] || '', headers['User-Agent'] || '',
        m.binary ? 1 : 0, m.byteLimit, Math.min(30000, Math.max(1, m.timeoutMs || 30000))];
      types = ['number', 'string', 'string', 'string', 'string', 'string', 'string', 'string', 'string', 'string', 'string', 'string', 'number', 'number', 'number'];
      Module.ccall('fm_request', null, types, args); return;
    }
    postMessage({ kind: 'result', id: m.id, stage: stage, code: code, engine: 'wasm' });
  } catch (ignore) { postMessage({ kind: 'result', id: m.id, stage: stage, code: -1, engine: 'wasm' }); }
};
