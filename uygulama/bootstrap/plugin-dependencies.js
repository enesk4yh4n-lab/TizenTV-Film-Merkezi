/* Package API v2: deterministic publisher-qualified dependency planning. ES5. */
(function (root) {
  'use strict';
  var S = root.FilmPluginSchema;
  function identity(publisher, id) { return publisher + '/' + id; }
  function range(version, dependency) {
    return S.compare(version, dependency.minVersion) >= 0 && S.compare(version, dependency.maxVersion) < 0;
  }
  function select(roots, candidates, installed, check) {
    var steps = 0, byId = {}, existing = {}, lastError;
    installed.forEach(function (c) { existing[identity(c.publisher, c.manifest.id)] = c; });
    candidates.forEach(function (c) {
      var id = identity(c.publisher, c.manifest.id), old = existing[id];
      if (old && (old.key !== c.key || S.compare(c.manifest.version, old.manifest.version) < 0)) return;
      (byId[id] || (byId[id] = [])).push(c);
    });
    Object.keys(byId).forEach(function (id) { byId[id].sort(function (a, b) { return Number(!!b.installed) - Number(!!a.installed) || S.compare(b.manifest.version, a.manifest.version) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0); }); });
    function solve(todo, selected, ordered, visiting) {
      if (check) check();
      if (++steps > 8192) throw new Error('Bağımlılık çözümleme sınırına ulaşıldı.');
      if (!todo.length) {
        var safe = installed.every(function (c) { return selected[identity(c.publisher, c.manifest.id)] || c.manifest.dependencies.every(function (d) { var next = selected[identity(d.publisher, d.id)]; return !next || range(next.manifest.version, d); }); });
        if (!safe) lastError = 'Kurulu bir eklenti başka bir çözümleyici sürümü gerektiriyor.';
        return safe ? ordered : null;
      }
      var step = todo[0], tail = todo.slice(1), id = step.id, current = selected[id], result;
      if (step.finish) {
        delete visiting[id]; result = solve(tail, selected, ordered.concat(current), visiting); visiting[id] = true;
        return result;
      }
      if (visiting[id]) { lastError = 'Bağımlılık döngüsü: ' + id; return null; }
      if (current) return step.accept(current) ? solve(tail, selected, ordered, visiting) : null;
      var rows = (byId[id] || []).filter(step.accept), i;
      if (!rows.length) lastError = 'Uyumlu bağımlılık bulunamadı: ' + id.split('/').pop();
      for (i = 0; i < rows.length; i++) {
        var choice = rows[i], dependencies = choice.manifest.dependencies.map(function (d) { return { id: identity(d.publisher, d.id), accept: function (c) { return c.manifest.type === 'resolver' && range(c.manifest.version, d); } }; });
        selected[id] = choice; visiting[id] = true;
        result = solve(dependencies.concat([{ id: id, finish: true }], tail), selected, ordered, visiting);
        delete selected[id]; delete visiting[id];
        if (result) return result;
      }
      return null;
    }
    var result = solve(roots.map(function (r) { return { id: identity(r.publisher, r.id), accept: function (c) { return c.key === r.key && !c.installed; } }; }), {}, [], {});
    if (!result) throw new Error(lastError || 'Uyumlu bir eklenti takımı bulunamadı.');
    return result;
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
  root.FilmDependencies = { identity: identity, satisfies: range, plan: plan, select: select };
})(window);
