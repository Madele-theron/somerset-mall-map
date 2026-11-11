// script.js — Somerset Mall Navigator. Plain JS, no libraries, no backend.
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var EDIT = new URLSearchParams(location.search).has('edit');
  var MAXZ = 10;

  var byId = {};
  locations.forEach(function (l) { byId[l.id] = l; });
  var entrances = locations.filter(function (l) { return l.type === 'parkade-entrance'; });
  var anchorIds = {};
  BLOCKS.forEach(function (b) { anchorIds[b.id] = true; });
  var router = Router(NODES, EDGES);

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function norm(s) { return String(s).toLowerCase().replace(/[^a-z0-9]/g, ''); }
  function typeLabel(l) { return l.type === 'parkade-entrance' ? 'Entrance' : (l.type === 'store' ? 'Shop' : 'Food / service'); }
  function make(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  // ---------- state ----------
  var from = null, to = null, selected = null;
  var freeOnly = false;
  try { freeOnly = localStorage.getItem('freeOnly') === '1'; } catch (_) {}
  var cur = null; // current drawn route {points, start, end, auto}

  // ---------- build the map ----------
  var svg = $('map');
  make('rect', { class: 'map-bg', x: -200, y: -200, width: 500, height: 500 }, svg);
  var gBlocks = make('g', {}, svg), gRoads = make('g', {}, svg), gRoute = make('g', {}, svg),
      gPins = make('g', {}, svg), gLabels = make('g', {}, svg), gMarks = make('g', {}, svg);

  BLOCKS.forEach(function (b) {
    var l = byId[b.id]; if (!l) return;
    make('rect', { class: 'block', x: l.x - b.w / 2, y: l.y - b.h / 2, width: b.w, height: b.h, rx: 0.8 }, gBlocks);
  });
  EDGES.forEach(function (e) {
    var a = NODES[e[0]], c = NODES[e[1]];
    make('line', { class: 'road', x1: a[0], y1: a[1], x2: c[0], y2: c[1] }, gRoads);
  });

  var routeCase = make('polyline', { class: 'route-case', points: '' }, gRoute);
  var routeLine = make('polyline', { class: 'route-line', points: '' }, gRoute);

  var pins = [];
  locations.forEach(function (l) {
    var isEnt = l.type === 'parkade-entrance';
    var cls = isEnt ? 'ent' : (l.type === 'store' ? 'store' : 'food');
    var g = make('g', { class: 'pin ' + cls, 'data-id': l.id }, gPins);
    var p = { loc: l, isEnt: isEnt };
    p.hit = make('circle', { cx: l.x, cy: l.y, class: 'hit' }, g);
    if (isEnt) {
      p.bubble = make('circle', { cx: l.x, cy: l.y, class: 'bubble' }, g);
      p.txt = make('text', { x: l.x, y: l.y }, g);
      p.txt.textContent = l.name.replace('Entrance ', '');
    } else {
      p.dot = make('circle', { cx: l.x, cy: l.y, class: 'dot' }, g);
    }
    p.lbl = make('text', { class: 'lbl' }, gLabels);
    p.lbl.textContent = l.name;
    p.minZoom = isEnt ? 0 : (anchorIds[l.id] ? 1.7 : 3.4);
    pins.push(p);
  });

  // ---------- view (pan / zoom) ----------
  var view = { x: 0, y: 0, w: MAP.width, h: MAP.height }, baseW = MAP.width;
  function rect() { return svg.getBoundingClientRect(); }
  function ppu() { return rect().width / view.w; } // screen pixels per map unit

  function clampView() {
    view.x = Math.min(Math.max(view.x, -view.w * 0.3), MAP.width - view.w * 0.7);
    view.y = Math.min(Math.max(view.y, -view.h * 0.3), MAP.height - view.h * 0.7);
  }
  function setView() {
    svg.setAttribute('viewBox', view.x + ' ' + view.y + ' ' + view.w + ' ' + view.h);
    applyScale();
  }
  function fitAll() {
    var r = rect(); if (!r.width || !r.height) return;
    var asp = r.width / r.height, w, h;
    if (asp > MAP.width / MAP.height) { h = MAP.height; w = h * asp; } else { w = MAP.width; h = w / asp; }
    view = { x: (MAP.width - w) / 2, y: (MAP.height - h) / 2, w: w, h: h };
    baseW = w;
    setView();
  }
  function onResize() {
    var r = rect(); if (!r.width || !r.height) return;
    var cx = view.x + view.w / 2, cy = view.y + view.h / 2;
    view.h = view.w * (r.height / r.width);
    view.x = cx - view.w / 2; view.y = cy - view.h / 2;
    setView();
  }
  function zoomAt(cx, cy, factor, noSet) {
    var r = rect();
    var fx = (cx - r.left) / r.width, fy = (cy - r.top) / r.height;
    var px = view.x + fx * view.w, py = view.y + fy * view.h;
    var nw = Math.min(Math.max(view.w * factor, baseW / MAXZ), baseW);
    view.w = nw; view.h = nw * (r.height / r.width);
    view.x = px - fx * view.w; view.y = py - fy * view.h;
    clampView();
    if (!noSet) setView();
  }
  function fitBounds(points) {
    var r = rect(); if (!r.width || !r.height) return;
    var minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    points.forEach(function (p) { minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); miny = Math.min(miny, p[1]); maxy = Math.max(maxy, p[1]); });
    var pad = 9, asp = r.width / r.height;
    var w = Math.max(maxx - minx + pad * 2, (maxy - miny + pad * 2) * asp, baseW / 3);
    w = Math.min(w, baseW);
    var h = w / asp;
    view = { x: (minx + maxx) / 2 - w / 2, y: (miny + maxy) / 2 - h / 2, w: w, h: h };
    clampView();
    setView();
  }

  // Keep pins / text a constant size on screen, whatever the zoom.
  function applyScale() {
    var k = ppu(); if (!isFinite(k) || k <= 0) return;
    var zoom = baseW / view.w;
    pins.forEach(function (p) {
      var l = p.loc;
      p.hit.setAttribute('r', (p.isEnt ? 16 : 12) / k);
      if (p.isEnt) {
        p.bubble.setAttribute('r', 9 / k); p.bubble.setAttribute('stroke-width', 1.5 / k);
        p.txt.setAttribute('font-size', 11 / k); p.txt.setAttribute('dy', 4 / k);
      } else {
        p.dot.setAttribute('r', 3.6 / k); p.dot.setAttribute('stroke-width', 1.2 / k);
      }
      var show = p.isEnt || zoom >= p.minZoom || l.id === from || l.id === to || l.id === selected;
      p.lbl.style.display = show ? '' : 'none';
      if (show) {
        p.lbl.setAttribute('x', l.x + (p.isEnt ? 12 : 7) / k);
        p.lbl.setAttribute('y', l.y + 3.5 / k);
        p.lbl.setAttribute('font-size', 10.5 / k);
        p.lbl.setAttribute('stroke-width', 3 / k);
      }
    });
    routeCase.setAttribute('stroke-width', 8 / k);
    routeLine.setAttribute('stroke-width', 4.5 / k);
    drawMarks(k);
  }

  function drawMarks(k) {
    while (gMarks.firstChild) gMarks.removeChild(gMarks.firstChild);
    function mark(loc, letter, cls) {
      var g = make('g', { class: 'mark ' + cls }, gMarks);
      make('circle', { cx: loc.x, cy: loc.y, r: 10 / k, 'stroke-width': 1.5 / k }, g);
      var t = make('text', { x: loc.x, y: loc.y, 'font-size': 12 / k, dy: 4.3 / k }, g);
      t.textContent = letter;
    }
    if (selected && byId[selected]) {
      make('circle', { class: 'sel-ring', cx: byId[selected].x, cy: byId[selected].y, r: 13 / k, 'stroke-width': 2 / k }, gMarks);
    }
    if (cur) {
      mark(cur.start, cur.auto ? 'P' : 'A', 'a');
      mark(cur.end, 'B', 'b');
    }
  }

  // ---------- pointer handling (drag, pinch, wheel, tap) ----------
  var ptrs = {}, nPtr = 0, moved = false, down = null, lastPinch = null;
  function pinchState() {
    var ids = Object.keys(ptrs), a = ptrs[ids[0]], b = ptrs[ids[1]];
    return { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
  }
  svg.addEventListener('pointerdown', function (e) {
    try { svg.setPointerCapture(e.pointerId); } catch (_) {}
    ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
    nPtr = Object.keys(ptrs).length;
    if (nPtr === 1) { moved = false; down = { x: e.clientX, y: e.clientY }; }
    else if (nPtr === 2) { moved = true; lastPinch = pinchState(); }
  });
  svg.addEventListener('pointermove', function (e) {
    var p = ptrs[e.pointerId]; if (!p) return;
    var nx = e.clientX, ny = e.clientY;
    if (nPtr === 1) {
      if (!moved && Math.hypot(nx - down.x, ny - down.y) > 6) moved = true;
      if (moved) {
        var k = ppu();
        view.x -= (nx - p.x) / k; view.y -= (ny - p.y) / k;
        clampView(); setView();
      }
      p.x = nx; p.y = ny;
    } else if (nPtr >= 2) {
      p.x = nx; p.y = ny;
      var s = pinchState();
      if (lastPinch && lastPinch.d > 0 && s.d > 0) {
        zoomAt(s.cx, s.cy, lastPinch.d / s.d, true);
        var k2 = ppu();
        view.x -= (s.cx - lastPinch.cx) / k2; view.y -= (s.cy - lastPinch.cy) / k2;
        clampView(); setView();
      }
      lastPinch = s;
    }
  });
  function endPointer(e) {
    if (!ptrs[e.pointerId]) return;
    delete ptrs[e.pointerId];
    var wasTap = nPtr === 1 && !moved && e.type === 'pointerup';
    nPtr = Object.keys(ptrs).length;
    lastPinch = null;
    if (nPtr === 1) { var rem = ptrs[Object.keys(ptrs)[0]]; down = { x: rem.x, y: rem.y }; moved = true; }
    if (wasTap) onTap(e);
  }
  svg.addEventListener('pointerup', endPointer);
  svg.addEventListener('pointercancel', endPointer);
  svg.addEventListener('wheel', function (e) {
    e.preventDefault();
    zoomAt(e.clientX, e.clientY, e.deltaY > 0 ? 1.2 : 1 / 1.2);
  }, { passive: false });

  $('zoomIn').addEventListener('click', function () { var r = rect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1 / 1.5); });
  $('zoomOut').addEventListener('click', function () { var r = rect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1.5); });
  $('zoomReset').addEventListener('click', fitAll);

  var toastTimer = null;
  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 3500);
  }

  function onTap(e) {
    var el = document.elementFromPoint(e.clientX, e.clientY);
    var g = el && el.closest ? el.closest('[data-id]') : null;
    if (g) { select(g.getAttribute('data-id')); return; }
    if (EDIT) {
      var r = rect();
      var x = view.x + (e.clientX - r.left) / r.width * view.w;
      var y = view.y + (e.clientY - r.top) / r.height * view.h;
      var txt = 'x: ' + x.toFixed(1) + ', y: ' + y.toFixed(1);
      toast(txt); console.log(txt);
      try { navigator.clipboard.writeText(txt); } catch (_) {}
    }
    select(null);
  }

  // ---------- search boxes ----------
  var fromInput = $('fromInput'), toInput = $('toInput');

  function suggestions(q) {
    var n = norm(q);
    if (!n) {
      var anchors = locations.filter(function (l) { return anchorIds[l.id]; })
        .sort(function (a, b) { return a.name.localeCompare(b.name); });
      return entrances.concat(anchors).slice(0, 10);
    }
    return locations.map(function (l) {
      var nn = norm(l.name), i = nn.indexOf(n);
      return { l: l, s: i === 0 ? 0 : (i > 0 ? 1 : 9) };
    }).filter(function (x) { return x.s < 9; })
      .sort(function (a, b) { return a.s - b.s || a.l.name.localeCompare(b.l.name); })
      .slice(0, 8).map(function (x) { return x.l; });
  }

  function combo(input, list, onPick) {
    var items = [], idx = -1;
    function render() {
      items = suggestions(input.value);
      list.innerHTML = '';
      items.forEach(function (l, i) {
        var li = document.createElement('li');
        li.innerHTML = '<span>' + esc(l.name) + '</span><span class="tag">' + typeLabel(l) + '</span>';
        li.addEventListener('pointerdown', function (ev) { ev.preventDefault(); choose(l); });
        if (i === idx) li.className = 'active';
        list.appendChild(li);
      });
      list.hidden = !items.length;
    }
    function choose(l) { list.hidden = true; input.blur(); onPick(l.id); }
    input.addEventListener('focus', function () { input.select(); idx = -1; render(); });
    input.addEventListener('input', function () {
      idx = -1;
      if (!input.value.trim()) onPick(null, true);
      render();
    });
    input.addEventListener('blur', function () { setTimeout(function () { list.hidden = true; }, 120); });
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowDown') { ev.preventDefault(); idx = Math.min(idx + 1, items.length - 1); render(); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); idx = Math.max(idx - 1, 0); render(); }
      else if (ev.key === 'Enter') { ev.preventDefault(); var pick = items[idx >= 0 ? idx : 0]; if (pick) choose(pick); }
      else if (ev.key === 'Escape') { list.hidden = true; input.blur(); }
    });
  }
  combo(fromInput, $('fromList'), function (id, keepText) { setFrom(id, keepText); });
  combo(toInput, $('toList'), function (id, keepText) { setTo(id, keepText); });

  function syncInputs() {
    fromInput.value = from ? byId[from].name : '';
    toInput.value = to ? byId[to].name : '';
  }
  function setFrom(id, keepText) { from = id; if (!keepText) syncInputs(); refresh(true); }
  function setTo(id, keepText) { to = id; if (!keepText) syncInputs(); refresh(true); }

  $('swapBtn').addEventListener('click', function () { var t = from; from = to; to = t; syncInputs(); refresh(true); });
  $('clearBtn').addEventListener('click', function () { from = null; to = null; selected = null; syncInputs(); refresh(false); fitAll(); });
  Array.prototype.forEach.call(document.querySelectorAll('#chips [data-ent]'), function (b) {
    b.addEventListener('click', function () { setFrom(b.getAttribute('data-ent')); });
  });
  var freeBox = $('freeOnly');
  freeBox.checked = freeOnly;
  freeBox.addEventListener('change', function () {
    freeOnly = freeBox.checked;
    try { localStorage.setItem('freeOnly', freeOnly ? '1' : '0'); } catch (_) {}
    refresh(true);
  });

  // ---------- selecting a pin ----------
  function select(id) {
    selected = id;
    var card = $('pickCard');
    if (!id) { card.hidden = true; card.innerHTML = ''; applyScale(); return; }
    var l = byId[id];
    var html = '<h2>' + esc(l.name) + '</h2><p class="muted">' + typeLabel(l) + (l.note && l.type !== 'parkade-entrance' ? ' · ' + esc(l.note) : '') + '</p>';
    if (l.type === 'parkade-entrance') {
      html += '<p>' + parkTag(l) + ' ' + esc(l.parkingNote || '') + '</p>';
      if (l.note) html += '<p class="muted">' + esc(l.note) + '</p>';
    }
    html += '<div class="row"><button class="btn" data-a="from">I\'m here</button><button class="btn" data-a="to">Take me here</button><button class="btn alt" data-a="close">Close</button></div>';
    card.innerHTML = html; card.hidden = false;
    card.querySelector('[data-a="from"]').addEventListener('click', function () { selected = null; card.hidden = true; setFrom(id); });
    card.querySelector('[data-a="to"]').addEventListener('click', function () { selected = null; card.hidden = true; setTo(id); });
    card.querySelector('[data-a="close"]').addEventListener('click', function () { select(null); });
    applyScale();
  }

  // ---------- routing + "where to park" ----------
  function parkTag(ent) {
    return ent.parking === 'paid' ? '<span class="tagp paid">Paid</span>' : '<span class="tagp free">Free</span>';
  }

  function rankEntrances(dest) {
    return entrances.map(function (e) {
      var r = router.route([e.x, e.y], [dest.x, dest.y]);
      return { ent: e, len: r ? r.length : Infinity };
    }).sort(function (a, b) { return a.len - b.len; });
  }

  function refresh(fit) {
    var rc = $('routeCard');
    var dest = to ? byId[to] : null;
    var ranks = null, closest = null, best = null, freeBest = null;
    if (dest) {
      ranks = rankEntrances(dest);
      closest = ranks[0];
      freeBest = ranks.filter(function (r) { return r.ent.parking === 'free'; })[0] || null;
      best = (freeOnly && freeBest) ? freeBest : closest;
    }

    // which route to draw
    var start = null, auto = false;
    if (dest && from) start = byId[from];
    else if (dest) { start = best.ent; auto = true; }
    cur = null;
    if (start && dest) {
      var r = router.route([start.x, start.y], [dest.x, dest.y]);
      if (r) {
        cur = { start: start, end: dest, auto: auto, points: r.points };
        var pts = r.points.map(function (p) { return p[0] + ',' + p[1]; }).join(' ');
        routeCase.setAttribute('points', pts); routeLine.setAttribute('points', pts);
      }
    }
    if (!cur) { routeCase.setAttribute('points', ''); routeLine.setAttribute('points', ''); }

    // chips highlight
    Array.prototype.forEach.call(document.querySelectorAll('#chips [data-ent]'), function (b) {
      b.classList.toggle('on', b.getAttribute('data-ent') === from);
    });

    // text card
    var html = '';
    function parkBlock(title) {
      var h = '<p class="big">' + title + ' <b>' + esc(best.ent.name) + '</b> ' + parkTag(best.ent) + '</p>';
      h += '<p class="muted">' + esc(best.ent.parkingNote || '') + '</p>';
      if (freeOnly && closest.ent !== best.ent) {
        h += '<p class="muted">' + esc(closest.ent.name) + ' is closer (' + esc(closest.ent.parkingNote || 'paid') + '), but you asked for free parking only.</p>';
      } else if (!freeOnly && closest.ent.parking === 'paid' && freeBest) {
        h += '<p class="muted">Prefer free parking? ' + esc(freeBest.ent.name) + ' is the closest free option.</p>';
      }
      return h;
    }
    function orderLine() {
      return '<p class="muted">All entrances, nearest first: ' + ranks.map(function (r) {
        return esc(r.ent.name) + ' (' + (r.ent.parking === 'paid' ? 'paid' : 'free') + ')';
      }).join(' · ') + '</p>';
    }

    if (dest && !from) {
      html += parkBlock('Park at');
      html += '<p>Then follow the red line to <b>' + esc(dest.name) + '</b>.</p>';
      html += orderLine();
    } else if (dest && from) {
      html += '<p class="big">From <b>' + esc(byId[from].name) + '</b> to <b>' + esc(dest.name) + '</b></p><p>Follow the red line.</p>';
      html += parkBlock('Where to park for ' + esc(dest.name) + ':');
      if (byId[from].type === 'parkade-entrance') {
        if (from === best.ent.id) html += '<p class="muted">You\'re already at the best entrance for this shop.</p>';
        else html += '<p class="muted">Tip: ' + esc(best.ent.name) + ' is a shorter walk to this shop than ' + esc(byId[from].name) + '.</p>';
      }
      html += orderLine();
    } else if (from) {
      html += '<p class="big">Starting from <b>' + esc(byId[from].name) + '</b></p><p class="muted">Now pick where you want to go.</p>';
    } else {
      html += '<p class="big">Where are you headed?</p><p class="muted">Pick a shop above to see which entrance to park at and the walking route. Tap any dot on the map to set it as your start or destination.</p>';
    }
    rc.innerHTML = html;

    try { history.replaceState(null, '', '#' + (from ? 'from=' + from : '') + (from && to ? '&' : '') + (to ? 'to=' + to : '')); } catch (_) {}

    applyScale();
    if (fit) {
      if (cur) fitBounds(cur.points);
      else if (from) fitBounds([[byId[from].x, byId[from].y]]);
    }
  }

  // ---------- start up ----------
  (function readHash() {
    var h = new URLSearchParams(location.hash.replace(/^#/, ''));
    if (h.get('from') && byId[h.get('from')]) from = h.get('from');
    if (h.get('to') && byId[h.get('to')]) to = h.get('to');
  })();

  syncInputs();
  fitAll();
  refresh(false);
  if (from || to) setTimeout(function () { refresh(true); }, 0);
  window.addEventListener('load', function () { fitAll(); if (from || to) refresh(true); });
  window.addEventListener('orientationchange', function () { setTimeout(fitAll, 250); });
  if (window.ResizeObserver) new ResizeObserver(onResize).observe($('map'));
  if (EDIT) toast('Edit mode: tap empty map to read x/y (copied to clipboard)');
})();
