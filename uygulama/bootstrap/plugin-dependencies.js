/* Package API v2: deterministic publisher-qualified dependency planning. ES5. */
(function (root) {
  'use strict';
  var S = root.FilmPluginSchema;
  function identity(publisher, id) { return publisher + '/' + id; }
  function range(version, dependency) {
    return S.compare(version, dependency.minVersion) >= 0 && S.compare(version, dependency.maxVersion) < 0;
  }
  function plan(rootKey, candidates, installed) {
    var selected = {}, visiting = {}, ordered = [], constraints = {}, byIdentity = {};
    candidates.forEach(function (c) {
      var id = identity(c.publisher, c.manifest.id);
      if (!byIdentity[id]) byIdentity[id] = [];
      byIdentity[id].push(c);
    });
    Object.keys(byIdentity).forEach(function (id) {
      byIdentity[id].sort(function (a, b) { return S.compare(b.manifest.version, a.manifest.version) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0); });
    });
    function visit(c) {
      var id = identity(c.publisher, c.manifest.id);
      if (visiting[id]) throw new Error('Dependency cycle: ' + c.manifest.id);
      if (selected[id]) {
        if (selected[id].manifest.version !== c.manifest.version) throw new Error('Dependency version conflict: ' + c.manifest.id);
        return;
      }
      visiting[id] = true;
      (c.manifest.dependencies || []).forEach(function (d) {
        var target = identity(d.publisher, d.id), rows = byIdentity[target] || [], required = constraints[target] || [];
        required.push(d); constraints[target] = required;
        var existing = installed.filter(function (p) { return identity(p.publisher, p.manifest.id) === target; })[0];
        var possible = rows.filter(function (p) { return p.manifest.type === 'resolver' && required.every(function (r) { return range(p.manifest.version, r); }); });
        var chosen = selected[target] || possible.filter(function (p) { return existing && p.key === existing.key && p.manifest.version === existing.manifest.version; })[0] || possible.filter(function (p) { return existing && p.manifest.version === existing.manifest.version; })[0] || possible[0];
        if (!chosen || !required.every(function (r) { return range(chosen.manifest.version, r); })) throw new Error('Missing or incompatible dependency: ' + d.id);
        visit(chosen);
      });
      delete visiting[id]; selected[id] = c; ordered.push(c);
    }
    var start = candidates.filter(function (c) { return c.key === rootKey; })[0];
    if (!start) throw new Error('Package not found');
    visit(start);
    installed.forEach(function (p) {
      if (selected[identity(p.publisher, p.manifest.id)]) return;
      (p.manifest.dependencies || []).forEach(function (d) {
        var changed = selected[identity(d.publisher, d.id)];
        if (changed && !range(changed.manifest.version, d)) throw new Error('Installed package requires another resolver version: ' + p.manifest.id);
      });
    });
    return ordered;
  }
  root.FilmDependencies = { identity: identity, satisfies: range, plan: plan };
})(window);
