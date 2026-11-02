(function (global) {
  "use strict";

  var svg = null;
  var layer = null;
  var drag = null;

  function qs(id) { return document.getElementById(id); }

  function ensureLayer() {
    var wrap = qs("stage-wrap");
    if (!wrap) return null;
    layer = qs("path-layer");
    if (layer) {
      svg = layer.querySelector("svg");
      return layer;
    }
    layer = document.createElement("div");
    layer.id = "path-layer";
    layer.className = "path-layer";
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "path-svg");
    svg.innerHTML = "";
    layer.appendChild(svg);
    wrap.appendChild(layer);
    return layer;
  }

  function progressFromPlayhead(motion) {
    if (!motion || !global.Studio) return 0;
    var t = Studio.playhead || 0;
    var d = Math.max(0.0001, Number(motion.duration) || 1);
    if (t <= motion.start) return 0;
    if (t >= motion.start + d) return 1;
    return (t - motion.start) / d;
  }

  function placeElementOnPath(el, path, progress, autoRotate) {
    if (!el || !path || !global.PathGeom) return;
    var pt = PathGeom.pointAt(path, progress);
    var node = document.querySelector("[data-gsap-id='" + el.id + "']");
    var w = el.w || (node ? node.offsetWidth : 100);
    var h = node ? node.offsetHeight : 80;
    /* keep graph xy as top-left for stage layout; play uses x/y + xPercent */
    el.x = pt.x - w / 2;
    el.y = pt.y - h / 2;
    if (node) {
      node.style.left = "0px";
      node.style.top = "0px";
      var rot = 0;
      if (autoRotate) rot = PathGeom.tangentAt(path, progress);
      var motion = Graph.motionsForTarget(el.id)[0];
      var keyPose = sampleKeys(motion, progress);
      gsap.set(node, {
        x: pt.x,
        y: pt.y,
        xPercent: -50,
        yPercent: -50,
        rotation: keyPose.rotation != null ? keyPose.rotation : rot,
        scale: keyPose.scale != null ? keyPose.scale : 1,
        opacity: keyPose.opacity != null ? keyPose.opacity : 1,
        skewX: keyPose.skewX || 0,
        skewY: keyPose.skewY || 0,
        filter: keyPose.blur ? "blur(" + keyPose.blur + "px)" : "blur(0px)"
      });
      if (keyPose.color) node.style.color = keyPose.color;
      if (keyPose.backgroundColor) node.style.backgroundColor = keyPose.backgroundColor;
    }
  }

  function sampleKeys(motion, p) {
    if (!motion || !motion.keys || !motion.keys.length) return {};
    var keys = motion.keys.slice().sort(function (a, b) { return a.p - b.p; });
    if (p <= keys[0].p) return Object.assign({}, keys[0]);
    if (p >= keys[keys.length - 1].p) return Object.assign({}, keys[keys.length - 1]);
    var i;
    for (i = 0; i < keys.length - 1; i++) {
      if (p >= keys[i].p && p <= keys[i + 1].p) {
        var a = keys[i];
        var b = keys[i + 1];
        var t = (p - a.p) / Math.max(0.0001, b.p - a.p);
        function lerp(k, fallback) {
          var va = a[k];
          var vb = b[k];
          if (va == null && vb == null) return fallback;
          if (va == null) return vb;
          if (vb == null) return va;
          if (typeof va === "number" && typeof vb === "number") return va + (vb - va) * t;
          return t < 0.5 ? va : vb;
        }
        return {
          rotation: lerp("rotation", 0),
          scale: lerp("scale", 1),
          opacity: lerp("opacity", 1),
          skewX: lerp("skewX", 0),
          skewY: lerp("skewY", 0),
          blur: lerp("blur", 0),
          color: t < 0.5 ? a.color : b.color,
          backgroundColor: t < 0.5 ? a.backgroundColor : b.backgroundColor
        };
      }
    }
    return Object.assign({}, keys[0]);
  }

  function syncBoundElements(state) {
    if (Studio && Studio.playing) return;
    var i;
    for (i = 0; i < state.elements.length; i++) {
      var el = state.elements[i];
      if (!el.pathId || el.parent) continue;
      var path = Graph.pathById(el.pathId);
      var motion = Graph.motionsForTarget(el.id)[0];
      var p;
      if (state.editMode === "path" && state.selectedElementId === el.id && state._pathScrubbing) {
        p = state.scrubProgress || 0;
      } else if (motion) {
        p = progressFromPlayhead(motion);
      } else {
        p = state.scrubProgress || 0;
      }
      placeElementOnPath(el, path, p, motion && motion.autoRotate);
    }
  }

  function render(state) {
    ensureLayer();
    if (!svg) return;
    var pathMode = state.editMode === "path";
    layer.classList.toggle("is-on", pathMode || (state.paths && state.paths.length));
    layer.classList.toggle("is-edit", pathMode);

    var stage = qs("stage");
    var w = stage ? stage.clientWidth : 800;
    var h = stage ? stage.clientHeight : 500;
    svg.setAttribute("viewBox", "0 0 " + w + " " + h);
    svg.setAttribute("width", w);
    svg.setAttribute("height", h);
    svg.innerHTML = "";

    var paths = state.paths || [];
    var i;
    for (i = 0; i < paths.length; i++) {
      var path = paths[i];
      var g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("data-path", path.id);
      g.classList.toggle("is-selected", state.selectedPathId === path.id);

      var line = document.createElementNS("http://www.w3.org/2000/svg", "path");
      line.setAttribute("d", PathGeom.anchorsToSvgD(path.anchors));
      line.setAttribute("class", "path-stroke");
      g.appendChild(line);

      if (path.anchors && path.anchors.length) {
        var name = Graph.pathDisplayName(path);
        var label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.setAttribute("x", path.anchors[0].x);
        label.setAttribute("y", path.anchors[0].y - 10);
        label.setAttribute("class", "path-label" + (state.selectedPathId === path.id ? " is-on" : ""));
        label.textContent = name;
        g.appendChild(label);
      }

      var hit = document.createElementNS("http://www.w3.org/2000/svg", "path");
      hit.setAttribute("d", PathGeom.anchorsToSvgD(path.anchors));
      hit.setAttribute("class", "path-hit");
      hit.setAttribute("data-path", path.id);
      g.appendChild(hit);

      /* keyframe markers for selected motion on this path */
      var motions = (state.pathMotions || []).filter(function (m) { return m.pathId === path.id; });
      var mi;
      for (mi = 0; mi < motions.length; mi++) {
        var m = motions[mi];
        var ki;
        for (ki = 0; ki < m.keys.length; ki++) {
          var key = m.keys[ki];
          var pt = PathGeom.pointAt(path, key.p);
          var diamond = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          diamond.setAttribute("x", pt.x - 6);
          diamond.setAttribute("y", pt.y - 6);
          diamond.setAttribute("width", "12");
          diamond.setAttribute("height", "12");
          diamond.setAttribute("transform", "rotate(45 " + pt.x + " " + pt.y + ")");
          diamond.setAttribute("class", "path-kf" + (state.selectedKeyId === key.id ? " is-on" : ""));
          diamond.setAttribute("data-motion", m.id);
          diamond.setAttribute("data-key", key.id);
          g.appendChild(diamond);
        }
      }

      if (pathMode && state.selectedPathId === path.id) {
        if (path.meta && (path.kind === "arc" || path.kind === "semi")) {
          var c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          c.setAttribute("cx", path.meta.cx);
          c.setAttribute("cy", path.meta.cy);
          c.setAttribute("r", "7");
          c.setAttribute("class", "path-handle center");
          c.setAttribute("data-handle", "center");
          c.setAttribute("data-path", path.id);
          g.appendChild(c);

          var rp = PathGeom.arcPoint(path.meta.cx, path.meta.cy, path.meta.r, (path.meta.startAngle + path.meta.endAngle) / 2);
          var rc = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          rc.setAttribute("cx", rp.x);
          rc.setAttribute("cy", rp.y);
          rc.setAttribute("r", "6");
          rc.setAttribute("class", "path-handle radius");
          rc.setAttribute("data-handle", "radius");
          rc.setAttribute("data-path", path.id);
          g.appendChild(rc);

          var sp = PathGeom.arcPoint(path.meta.cx, path.meta.cy, path.meta.r, path.meta.startAngle);
          var ep = PathGeom.arcPoint(path.meta.cx, path.meta.cy, path.meta.r, path.meta.endAngle);
          [["start", sp], ["end", ep]].forEach(function (pair) {
            var hnd = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            hnd.setAttribute("cx", pair[1].x);
            hnd.setAttribute("cy", pair[1].y);
            hnd.setAttribute("r", "6");
            hnd.setAttribute("class", "path-handle angle");
            hnd.setAttribute("data-handle", pair[0]);
            hnd.setAttribute("data-path", path.id);
            g.appendChild(hnd);
          });
        }

        var ai;
        for (ai = 0; ai < path.anchors.length; ai++) {
          var a = path.anchors[ai];
          var hl = document.createElementNS("http://www.w3.org/2000/svg", "line");
          hl.setAttribute("x1", a.inX); hl.setAttribute("y1", a.inY);
          hl.setAttribute("x2", a.x); hl.setAttribute("y2", a.y);
          hl.setAttribute("class", "path-beam");
          g.appendChild(hl);
          var hr = document.createElementNS("http://www.w3.org/2000/svg", "line");
          hr.setAttribute("x1", a.x); hr.setAttribute("y1", a.y);
          hr.setAttribute("x2", a.outX); hr.setAttribute("y2", a.outY);
          hr.setAttribute("class", "path-beam");
          g.appendChild(hr);

          [["in", a.inX, a.inY], ["out", a.outX, a.outY], ["anchor", a.x, a.y]].forEach(function (h) {
            var dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            dot.setAttribute("cx", h[1]);
            dot.setAttribute("cy", h[2]);
            dot.setAttribute("r", h[0] === "anchor" ? "6" : "4");
            dot.setAttribute("class", "path-handle " + h[0]);
            dot.setAttribute("data-handle", h[0]);
            dot.setAttribute("data-anchor", String(ai));
            dot.setAttribute("data-path", path.id);
            g.appendChild(dot);
          });
        }
      }

      svg.appendChild(g);
    }

    /* scrubber ghost on selected bound element */
    if (pathMode && state.selectedElementId) {
      var el = Graph.elementById(state.selectedElementId);
      if (el && el.pathId) {
        var path2 = Graph.pathById(el.pathId);
        if (path2) {
          var scrub = PathGeom.pointAt(path2, state.scrubProgress || 0);
          var sc = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          sc.setAttribute("cx", scrub.x);
          sc.setAttribute("cy", scrub.y);
          sc.setAttribute("r", "5");
          sc.setAttribute("class", "path-scrub");
          svg.appendChild(sc);
        }
      }
    }

    if (!(Studio && Studio.playing)) syncBoundElements(state);
  }

  function clientToStage(e) {
    var stage = qs("stage");
    var rect = stage.getBoundingClientRect();
    return {
      x: e.clientX - rect.left + stage.scrollLeft,
      y: e.clientY - rect.top + stage.scrollTop
    };
  }

  function bind() {
    ensureLayer();
    if (!layer) return;

    layer.addEventListener("pointerdown", function (e) {
      var kf = e.target.closest(".path-kf");
      if (kf) {
        e.preventDefault();
        e.stopPropagation();
        Graph.select(Graph.motionById(kf.getAttribute("data-motion")).target, null, {
          motionId: kf.getAttribute("data-motion"),
          keyId: kf.getAttribute("data-key")
        });
        drag = {
          mode: "kf",
          motionId: kf.getAttribute("data-motion"),
          keyId: kf.getAttribute("data-key"),
          pointerId: e.pointerId
        };
        layer.setPointerCapture(e.pointerId);
        return;
      }

      var handle = e.target.closest(".path-handle");
      if (handle) {
        e.preventDefault();
        e.stopPropagation();
        var pathId = handle.getAttribute("data-path");
        /* keep current element selected so bind/inspector stay usable */
        Graph.select(Graph.get().selectedElementId, null, { pathId: pathId, keepMotion: true });
        stateSelectPath(pathId);
        drag = {
          mode: "handle",
          pathId: pathId,
          handle: handle.getAttribute("data-handle"),
          anchor: handle.getAttribute("data-anchor"),
          pointerId: e.pointerId
        };
        if (global.History) History.record();
        layer.setPointerCapture(e.pointerId);
        return;
      }

      var hit = e.target.closest(".path-hit");
      if (hit) {
        e.preventDefault();
        e.stopPropagation();
        var pid = hit.getAttribute("data-path");
        stateSelectPath(pid);
        Graph.setEditMode("path");
        var pt = clientToStage(e);
        var path = Graph.pathById(pid);
        var prog = PathGeom.closestProgress(path, pt.x, pt.y);
        var el = Graph.elementById(Graph.get().selectedElementId);
        if (el && !el.pathId) {
          Graph.bindElementToPath(el.id, pid);
          Graph.setScrubProgress(prog);
          return;
        }
        Graph.select(el ? el.id : null, null, { pathId: pid, keepMotion: true });
        Graph.setScrubProgress(prog);
        if (el && el.pathId === pid) {
          Graph.get()._pathScrubbing = true;
          drag = { mode: "scrub", pathId: pid, pointerId: e.pointerId };
          layer.setPointerCapture(e.pointerId);
        }
      }
    });

    window.addEventListener("pointermove", function (e) {
      if (!drag) return;
      var pt = clientToStage(e);
      if (drag.mode === "scrub") {
        var path = Graph.pathById(drag.pathId);
        var p = PathGeom.closestProgress(path, pt.x, pt.y);
        Graph.setScrubProgress(p, true);
        var el = Graph.elementById(Graph.get().selectedElementId);
        var motion = Graph.motionsForTarget(el.id)[0];
        placeElementOnPath(el, path, p, motion && motion.autoRotate);
        render(Graph.get());
        return;
      }
      if (drag.mode === "kf") {
        var m = Graph.motionById(drag.motionId);
        var path2 = Graph.pathById(m.pathId);
        var p2 = PathGeom.closestProgress(path2, pt.x, pt.y);
        Graph.updatePathKey(drag.motionId, drag.keyId, { p: p2 }, true);
        Graph.setScrubProgress(p2, true);
        render(Graph.get());
        return;
      }
      if (drag.mode === "handle") {
        var path3 = Graph.pathById(drag.pathId);
        if (!path3) return;
        if (drag.handle === "center" && path3.meta) {
          Graph.updatePath(drag.pathId, { meta: { cx: pt.x, cy: pt.y } }, true);
        } else if (drag.handle === "radius" && path3.meta) {
          var dx = pt.x - path3.meta.cx;
          var dy = pt.y - path3.meta.cy;
          Graph.updatePath(drag.pathId, { meta: { r: Math.max(20, Math.sqrt(dx * dx + dy * dy)) } }, true);
        } else if ((drag.handle === "start" || drag.handle === "end") && path3.meta) {
          var ang = Math.atan2(pt.y - path3.meta.cy, pt.x - path3.meta.cx) * 180 / Math.PI;
          var meta = {};
          meta[drag.handle === "start" ? "startAngle" : "endAngle"] = ang;
          Graph.updatePath(drag.pathId, { meta: meta }, true);
        } else if (drag.anchor != null) {
          var anchors = JSON.parse(JSON.stringify(path3.anchors));
          var idx = parseInt(drag.anchor, 10);
          var a = anchors[idx];
          if (drag.handle === "anchor") {
            var ddx = pt.x - a.x;
            var ddy = pt.y - a.y;
            a.x = pt.x; a.y = pt.y;
            a.inX += ddx; a.inY += ddy;
            a.outX += ddx; a.outY += ddy;
          } else if (drag.handle === "in") {
            a.inX = pt.x; a.inY = pt.y;
          } else if (drag.handle === "out") {
            a.outX = pt.x; a.outY = pt.y;
          }
          path3.kind = "bezier";
          path3.meta = null;
          Graph.updatePath(drag.pathId, { anchors: anchors, kind: "bezier" }, true);
        }
        render(Graph.get());
      }
    });

    window.addEventListener("pointerup", function () {
      if (!drag) return;
      var mode = drag.mode;
      drag = null;
      if (mode === "handle" || mode === "kf") Graph.flush();
      else if (mode === "scrub") {
        Graph.emit("scrub");
      }
    });
  }

  function stateSelectPath(pathId) {
    var s = Graph.get();
    s.selectedPathId = pathId;
    Graph.emit("select");
  }

  global.PathEditor = {
    bind: bind,
    render: render,
    placeElementOnPath: placeElementOnPath,
    sampleKeys: sampleKeys,
    syncBoundElements: syncBoundElements
  };
})(window);
