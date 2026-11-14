/* Publisher-qualified multi-root planning; no global prototype changes. */
(function (root) {
  'use strict';
  var S = root.FilmPluginSchema;
  function identity(publisher, id) { return publisher + '/' + id; }
  function range(v, d) { return S.compare(v, d.minVersion) >= 0 && S.compare(v, d.maxVersion) < 0; }
  function plan(roots, candidates, installed) {
    roots = typeof roots === 'string' ? [roots] : roots;
    var by = {}, forced = {}, steps = 0;
    candidates.forEach(function (c) { var k = identity(c.publisher, c.manifest.id); if (!by[k]) by[k] = []; by[k].push(c); });
    roots.forEach(function (key) { var c = candidates.filter(function (v) { return v.key === key; })[0]; if (!c) throw new Error('Package not found: ' + key); var id = identity(c.publisher,c.manifest.id); if (forced[id] && forced[id].manifest.version !== c.manifest.version) throw new Error('Conflicting root package'); forced[id] = c; });
    Object.keys(by).forEach(function (id) { by[id].sort(function (a,b) { var ae=installed.some(function(p){return p.key===a.key&&p.manifest.version===a.manifest.version;}),be=installed.some(function(p){return p.key===b.key&&p.manifest.version===b.manifest.version;});return Number(be)-Number(ae)||S.compare(b.manifest.version,a.manifest.version)||(a.key<b.key?-1:1); }); });
    function solve(pending, selected) {
      if (++steps > 512) throw new Error('Dependency planning limit exceeded');
      if (!pending.length) {
        var ok = installed.every(function (p) { return selected[identity(p.publisher,p.manifest.id)] || (p.manifest.dependencies||[]).every(function(d){var c=selected[identity(d.publisher,d.id)];return !c||range(c.manifest.version,d);}); });
        return ok ? selected : null;
      }
      var need=pending[0],rest=pending.slice(1),current=selected[need.id];
      function accepts(c){return (!need.dependency||c.manifest.type==='resolver'&&range(c.manifest.version,need.dependency));}
      if(current)return accepts(current)?solve(rest,selected):null;
      var choices=forced[need.id]?[forced[need.id]]:by[need.id]||[];
      for(var i=0;i<choices.length;i++)if(accepts(choices[i])){
        var c=choices[i],copy={},more=rest.slice();Object.keys(selected).forEach(function(k){copy[k]=selected[k];});copy[need.id]=c;
        (c.manifest.dependencies||[]).forEach(function(d){more.push({id:identity(d.publisher,d.id),dependency:d});});
        var found=solve(more,copy);if(found)return found;
      }
      return null;
    }
    var selected=solve(Object.keys(forced).map(function(k){return {id:k};}),{}),ordered=[],seen={},visiting={};
    if(!selected)throw new Error('Missing or incompatible dependency');
    function visit(id){if(visiting[id])throw new Error('Dependency cycle');if(seen[id])return;visiting[id]=true;var c=selected[id];(c.manifest.dependencies||[]).forEach(function(d){visit(identity(d.publisher,d.id));});delete visiting[id];seen[id]=true;ordered.push(c);}
    Object.keys(selected).forEach(visit);return ordered;
  }
  root.FilmDependencies = {identity:identity,satisfies:range,plan:plan};
})(window);
