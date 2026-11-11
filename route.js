// route.js — shortest-walk routing over the corridor graph in layout.js (Dijkstra, no libraries).
(function (root) {
  function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }

  function Router(NODES, EDGES) {
    const ids = Object.keys(NODES);
    const adj = {};
    ids.forEach(function (i) { adj[i] = []; });
    EDGES.forEach(function (e) {
      const d = dist(NODES[e[0]], NODES[e[1]]);
      adj[e[0]].push([e[1], d]);
      adj[e[1]].push([e[0], d]);
    });

    function nearest(pt) {
      let best = null, bd = Infinity;
      ids.forEach(function (i) {
        const d = dist(pt, NODES[i]);
        if (d < bd) { bd = d; best = i; }
      });
      return { id: best, d: bd };
    }

    function dijkstra(src) {
      const D = {}, P = {}, done = {};
      ids.forEach(function (i) { D[i] = Infinity; });
      D[src] = 0;
      for (;;) {
        let u = null;
        ids.forEach(function (i) { if (!done[i] && (u === null || D[i] < D[u])) u = i; });
        if (u === null || D[u] === Infinity) break;
        done[u] = true;
        adj[u].forEach(function (p) {
          if (D[u] + p[1] < D[p[0]]) { D[p[0]] = D[u] + p[1]; P[p[0]] = u; }
        });
      }
      return { D: D, P: P };
    }

    // a, b are [x, y]. Returns { points: [[x,y]...], length } or null.
    function route(a, b) {
      const na = nearest(a), nb = nearest(b);
      const r = dijkstra(na.id);
      if (r.D[nb.id] === Infinity) return null;
      const path = [nb.id];
      while (path[0] !== na.id) path.unshift(r.P[path[0]]);
      const points = [a].concat(path.map(function (i) { return NODES[i]; }), [b]);
      let length = 0;
      for (let i = 1; i < points.length; i++) length += dist(points[i - 1], points[i]);
      return { points: points, length: length };
    }

    return { route: route, nearest: nearest };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { Router: Router };
  else root.Router = Router;
})(typeof window !== 'undefined' ? window : this);
