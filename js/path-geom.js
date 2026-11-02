(function (global) {
  "use strict";

  function deg(rad) { return rad * 180 / Math.PI; }
  function rad(d) { return d * Math.PI / 180; }

  function anchor(x, y, inX, inY, outX, outY) {
    return {
      x: x, y: y,
      inX: inX != null ? inX : x,
      inY: inY != null ? inY : y,
      outX: outX != null ? outX : x,
      outY: outY != null ? outY : y
    };
  }

  function arcPoint(cx, cy, r, angleDeg) {
    var a = rad(angleDeg);
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  }

  /* Approximate circular arc with cubic beziers (kappa for 90deg) */
  function arcToAnchors(cx, cy, r, startAngle, endAngle) {
    var anchors = [];
    var sweep = endAngle - startAngle;
    var steps = Math.max(1, Math.ceil(Math.abs(sweep) / 90));
    var step = sweep / steps;
    var k = 0.5522847498;
    var i;
    for (i = 0; i <= steps; i++) {
      var ang = startAngle + step * i;
      var p = arcPoint(cx, cy, r, ang);
      var tAng = ang + 90;
      var tx = Math.cos(rad(tAng));
      var ty = Math.sin(rad(tAng));
      var handle = (Math.abs(step) * Math.PI / 180) * r * k / (Math.PI / 2) * (Math.abs(step) / 90);
      // simpler: use tangent length based on step
      var len = r * Math.tan(rad(Math.abs(step) / 4)) * (4 / 3);
      if (i === 0) {
        anchors.push(anchor(p.x, p.y, p.x, p.y, p.x + tx * len * Math.sign(step || 1), p.y + ty * len * Math.sign(step || 1)));
      } else {
        var prev = anchors[anchors.length - 1];
        var prevAng = startAngle + step * (i - 1);
        var prevT = prevAng + 90;
        var ptx = Math.cos(rad(prevT));
        var pty = Math.sin(rad(prevT));
        prev.outX = prev.x + ptx * len * Math.sign(step || 1);
        prev.outY = prev.y + pty * len * Math.sign(step || 1);
        anchors.push(anchor(
          p.x, p.y,
          p.x - tx * len * Math.sign(step || 1),
          p.y - ty * len * Math.sign(step || 1),
          p.x, p.y
        ));
      }
    }
    return anchors;
  }

  function syncArcAnchors(path) {
    var m = path.meta;
    if (!m) return;
    path.anchors = arcToAnchors(m.cx, m.cy, m.r, m.startAngle, m.endAngle);
  }

  function makePreset(kind, ox, oy) {
    ox = ox || 200;
    oy = oy || 180;
    if (kind === "line") {
      return {
        id: null,
        kind: "line",
        meta: null,
        anchors: [
          anchor(ox - 120, oy, ox - 120, oy, ox - 40, oy),
          anchor(ox + 120, oy, ox + 40, oy, ox + 120, oy)
        ]
      };
    }
    if (kind === "semi") {
      var path = {
        id: null,
        kind: "semi",
        meta: { cx: ox, cy: oy, r: 140, startAngle: 180, endAngle: 0 },
        anchors: []
      };
      syncArcAnchors(path);
      return path;
    }
    if (kind === "arc") {
      var arc = {
        id: null,
        kind: "arc",
        meta: { cx: ox, cy: oy, r: 120, startAngle: 200, endAngle: -20 },
        anchors: []
      };
      syncArcAnchors(arc);
      return arc;
    }
    if (kind === "wave") {
      return {
        id: null,
        kind: "wave",
        meta: null,
        anchors: [
          anchor(ox - 160, oy, ox - 160, oy, ox - 100, oy - 50),
          anchor(ox - 40, oy, ox - 100, oy + 50, ox + 20, oy - 50),
          anchor(ox + 80, oy, ox + 20, oy + 50, ox + 140, oy - 40),
          anchor(ox + 160, oy, ox + 160, oy, ox + 160, oy)
        ]
      };
    }
    return makePreset("line", ox, oy);
  }

  function anchorsToSvgD(anchors) {
    if (!anchors || !anchors.length) return "";
    var d = "M " + anchors[0].x + " " + anchors[0].y;
    var i;
    for (i = 1; i < anchors.length; i++) {
      var a = anchors[i - 1];
      var b = anchors[i];
      d += " C " + a.outX + " " + a.outY + ", " + b.inX + " " + b.inY + ", " + b.x + " " + b.y;
    }
    return d;
  }

  var measureEl = null;

  function ensureMeasure() {
    if (measureEl) return measureEl;
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.style.cssText = "position:absolute;left:-9999px;top:-9999px;overflow:hidden";
    measureEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
    svg.appendChild(measureEl);
    document.body.appendChild(svg);
    return measureEl;
  }

  function setMeasurePath(path) {
    var el = ensureMeasure();
    el.setAttribute("d", anchorsToSvgD(path.anchors));
    return el;
  }

  function pathLength(path) {
    return setMeasurePath(path).getTotalLength();
  }

  function pointAt(path, progress) {
    var el = setMeasurePath(path);
    var len = el.getTotalLength();
    var p = Math.max(0, Math.min(1, progress));
    return el.getPointAtLength(len * p);
  }

  function tangentAt(path, progress) {
    var el = setMeasurePath(path);
    var len = el.getTotalLength();
    var p = Math.max(0, Math.min(1, progress));
    var d = Math.max(0.5, len * 0.002);
    var a = el.getPointAtLength(Math.max(0, len * p - d));
    var b = el.getPointAtLength(Math.min(len, len * p + d));
    return deg(Math.atan2(b.y - a.y, b.x - a.x));
  }

  function closestProgress(path, x, y) {
    var el = setMeasurePath(path);
    var len = el.getTotalLength();
    if (len < 1) return 0;
    var samples = Math.max(40, Math.ceil(len / 4));
    var best = 0;
    var bestD = Infinity;
    var i;
    for (i = 0; i <= samples; i++) {
      var pt = el.getPointAtLength((len * i) / samples);
      var dx = pt.x - x;
      var dy = pt.y - y;
      var d2 = dx * dx + dy * dy;
      if (d2 < bestD) {
        bestD = d2;
        best = i / samples;
      }
    }
    /* refine */
    var lo = Math.max(0, best - 1 / samples);
    var hi = Math.min(1, best + 1 / samples);
    for (i = 0; i < 12; i++) {
      var mid1 = lo + (hi - lo) / 3;
      var mid2 = hi - (hi - lo) / 3;
      var p1 = el.getPointAtLength(len * mid1);
      var p2 = el.getPointAtLength(len * mid2);
      var d1 = (p1.x - x) * (p1.x - x) + (p1.y - y) * (p1.y - y);
      var d2b = (p2.x - x) * (p2.x - x) + (p2.y - y) * (p2.y - y);
      if (d1 < d2b) hi = mid2;
      else lo = mid1;
    }
    return (lo + hi) / 2;
  }

  global.PathGeom = {
    anchor: anchor,
    makePreset: makePreset,
    syncArcAnchors: syncArcAnchors,
    anchorsToSvgD: anchorsToSvgD,
    pathLength: pathLength,
    pointAt: pointAt,
    tangentAt: tangentAt,
    closestProgress: closestProgress,
    arcPoint: arcPoint
  };
})(window);
