(function (global) {
  "use strict";

  var tl = null;
  var META_KEYS = { path: 1, blur: 1 };

  if (typeof gsap !== "undefined" && typeof MotionPathPlugin !== "undefined") {
    gsap.registerPlugin(MotionPathPlugin);
  }

  var PATHS = {
    arc: [
      { x: -60, y: 40 },
      { x: -20, y: -36 },
      { x: 0, y: 0 }
    ],
    wave: [
      { x: -70, y: 0 },
      { x: -35, y: -28 },
      { x: 0, y: 12 },
      { x: 0, y: 0 }
    ],
    orbit: [
      { x: 0, y: -50 },
      { x: 45, y: 0 },
      { x: 0, y: 50 },
      { x: -45, y: 0 },
      { x: 0, y: 0 }
    ]
  };

  function sel(id) {
    return "[data-gsap-id='" + id + "']";
  }

  function node(id) {
    return document.querySelector(sel(id));
  }

  function ensureCompilePaths() {
    var host = document.getElementById("compile-paths");
    if (!host) {
      host = document.createElement("div");
      host.id = "compile-paths";
      host.style.cssText = "position:absolute;left:-9999px;top:-9999px;width:0;height:0;overflow:hidden";
      document.body.appendChild(host);
    }
    host.innerHTML = "";
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    var paths = Graph.get().paths || [];
    var i;
    for (i = 0; i < paths.length; i++) {
      var p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      p.setAttribute("id", "mp-" + paths[i].id);
      p.setAttribute("d", PathGeom.anchorsToSvgD(paths[i].anchors));
      svg.appendChild(p);
    }
    host.appendChild(svg);
    return host;
  }

  function resetPose() {
    var state = Graph.get();
    var i, el, meta;
    var t = (global.Studio && Studio.playhead) || 0;
    for (i = 0; i < state.elements.length; i++) {
      meta = state.elements[i];
      el = node(meta.id);
      if (!el) continue;
      gsap.set(el, {
        x: 0,
        y: 0,
        xPercent: 0,
        yPercent: 0,
        rotation: 0,
        scale: 1,
        opacity: 1,
        skewX: 0,
        skewY: 0,
        filter: "blur(0px)",
        clearProps: "color,backgroundColor"
      });
      if (meta.pathId && global.PathEditor && global.PathGeom) {
        var path = Graph.pathById(meta.pathId);
        var motion = Graph.motionsForTarget(meta.id)[0];
        var p = 0;
        if (motion) {
          var d = Math.max(0.0001, Number(motion.duration) || 1);
          if (t <= motion.start) p = 0;
          else if (t >= motion.start + d) p = 1;
          else p = (t - motion.start) / d;
        }
        PathEditor.placeElementOnPath(meta, path, p, motion && motion.autoRotate);
      }
    }
  }

  function pathKeyframes(name) {
    return PATHS[name] || null;
  }

  function tweenVars(clip) {
    var v = {};
    var key;
    var raw = clip.vars || {};
    for (key in raw) {
      if (!Object.prototype.hasOwnProperty.call(raw, key)) continue;
      if (raw[key] === "" || raw[key] === null || META_KEYS[key]) continue;
      v[key] = raw[key];
    }
    if (raw.blur != null && raw.blur !== "") {
      v.filter = "blur(" + Number(raw.blur) + "px)";
    }
    var frames = pathKeyframes(raw.path);
    if (frames) {
      v.keyframes = frames.map(function (f) { return Object.assign({}, f); });
      delete v.x;
      delete v.y;
    }
    v.duration = clip.duration;
    v.ease = clip.ease || "power2.out";
    v.immediateRender = false;
    if (clip.repeat) v.repeat = clip.repeat;
    if (clip.yoyo) v.yoyo = true;
    if (clip.stagger != null && clip.stagger !== "") v.stagger = Number(clip.stagger);
    return v;
  }

  function targetOf(clip) {
    var el = node(clip.target);
    if (!el) return null;
    var meta = Graph.elementById(clip.target);
    if ((clip.stagger != null && clip.stagger !== "") || (meta && meta.split)) {
      var kids = el.querySelectorAll("[data-gsap-id]");
      if (kids.length) return kids;
    }
    return el;
  }

  function sortedClips() {
    return Graph.get().clips.slice().sort(function (a, b) {
      return a.start - b.start;
    });
  }

  function applyClip(timeline, clip) {
    var target = targetOf(clip);
    if (!target) return;
    var vars = tweenVars(clip);
    var pos = clip.start;
    if (clip.method === "from") {
      timeline.from(target, vars, pos);
    } else if (clip.method === "fromTo") {
      var fromVars = {};
      var key;
      for (key in clip.vars) {
        if (Object.prototype.hasOwnProperty.call(clip.vars, key) && !META_KEYS[key]) {
          fromVars[key] = clip.vars[key];
        }
      }
      if (clip.vars && clip.vars.blur != null && clip.vars.blur !== "") {
        fromVars.filter = "blur(" + Number(clip.vars.blur) + "px)";
      }
      var toVars = tweenVars(clip);
      toVars.x = 0;
      toVars.y = 0;
      toVars.rotation = 0;
      toVars.scale = 1;
      toVars.opacity = 1;
      toVars.skewX = 0;
      toVars.skewY = 0;
      toVars.filter = "blur(0px)";
      delete toVars.keyframes;
      timeline.fromTo(target, fromVars, toVars, pos);
    } else if (clip.method === "set") {
      vars.duration = 0;
      timeline.set(target, vars, pos);
    } else {
      timeline.to(target, vars, pos);
    }
  }

  function formatVal(v) {
    if (typeof v === "number") {
      return Number.isInteger(v) ? String(v) : String(Math.round(v * 1000) / 1000);
    }
    return JSON.stringify(v);
  }

  function formatVarsObject(vars, clip) {
    var parts = [];
    var key;
    var raw = vars || {};
    for (key in raw) {
      if (!Object.prototype.hasOwnProperty.call(raw, key)) continue;
      if (raw[key] === "" || raw[key] === null) continue;
      if (key === "blur") {
        parts.push("filter: " + JSON.stringify("blur(" + Number(raw.blur) + "px)"));
        continue;
      }
      if (key === "path") continue;
      parts.push(key + ": " + formatVal(raw[key]));
    }
    if (raw.path && PATHS[raw.path]) {
      parts.push("keyframes: " + JSON.stringify(PATHS[raw.path]));
    }
    parts.push("duration: " + formatVal(clip.duration));
    parts.push("ease: " + JSON.stringify(clip.ease || "power2.out"));
    if (clip.stagger != null && clip.stagger !== "") parts.push("stagger: " + formatVal(Number(clip.stagger)));
    if (clip.repeat) parts.push("repeat: " + clip.repeat);
    if (clip.yoyo) parts.push("yoyo: true");
    return "{ " + parts.join(", ") + " }";
  }

  function formatVars(clip) {
    return formatVarsObject(clip.vars, clip);
  }

  function selectorExpr(clip) {
    var meta = Graph.elementById(clip.target);
    var base = "\"[data-gsap-id='" + clip.target + "']\"";
    if ((clip.stagger != null && clip.stagger !== "") || (meta && meta.split && clip.stagger != null)) {
      return "\"[data-gsap-id='" + clip.target + "'] [data-gsap-id]\"";
    }
    if (meta && meta.split && clip.stagger != null && clip.stagger !== "") {
      return "\"[data-gsap-id='" + clip.target + "'] [data-gsap-id]\"";
    }
    if (clip.stagger != null && clip.stagger !== "") {
      return "\"[data-gsap-id='" + clip.target + "'] [data-gsap-id]\"";
    }
    return base;
  }

  function lineFor(clip) {
    var pos = Math.round(clip.start * 1000) / 1000;
    var t = selectorExpr(clip);
    var v = formatVars(clip);
    if (clip.method === "from") return "tl.from(" + t + ", " + v + ", " + pos + ");";
    if (clip.method === "set") return "tl.set(" + t + ", " + v + ", " + pos + ");";
    if (clip.method === "fromTo") {
      return "tl.fromTo(" + t + ", " + formatVars(clip) + ", { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1, skewX: 0, skewY: 0, filter: \"blur(0px)\", duration: " + formatVal(clip.duration) + ", ease: " + JSON.stringify(clip.ease) + " }, " + pos + ");";
    }
    return "tl.to(" + t + ", " + v + ", " + pos + ");";
  }

  function lineForPathMotion(motion) {
    var path = Graph.pathById(motion.pathId);
    var d = path ? PathGeom.anchorsToSvgD(path.anchors) : "";
    var sel = "\"[data-gsap-id='" + motion.target + "']\"";
    var pose = (motion.keys || []).map(function (k, i, arr) {
      var dur = i === 0 ? 0.001 : Math.max(0.001, (k.p - arr[i - 1].p) * motion.duration);
      var parts = ["duration: " + formatVal(dur)];
      if (k.rotation != null) parts.push("rotation: " + formatVal(k.rotation));
      if (k.scale != null) parts.push("scale: " + formatVal(k.scale));
      if (k.opacity != null) parts.push("opacity: " + formatVal(k.opacity));
      if (k.skewX != null) parts.push("skewX: " + formatVal(k.skewX));
      if (k.skewY != null) parts.push("skewY: " + formatVal(k.skewY));
      if (k.blur != null) parts.push("filter: " + JSON.stringify("blur(" + k.blur + "px)"));
      return "{ " + parts.join(", ") + " }";
    }).join(", ");
    var pos = Math.round(motion.start * 1000) / 1000;
    return [
      "tl.to(" + sel + ", { duration: " + formatVal(motion.duration) + ", ease: " + JSON.stringify(motion.ease || "power2.inOut") + ", motionPath: { path: " + JSON.stringify(d) + ", alignOrigin: [0.5, 0.5], autoRotate: " + (!!motion.autoRotate) + " } }, " + pos + ");",
      pose ? "tl.to(" + sel + ", { keyframes: [" + pose + "], ease: " + JSON.stringify(motion.ease || "none") + " }, " + pos + ");" : ""
    ].filter(Boolean).join("\n");
  }

  function exportAll() {
    var motions = (Graph.get().pathMotions || []).slice().sort(function (a, b) { return a.start - b.start; });
    var bound = {};
    var i;
    for (i = 0; i < motions.length; i++) bound[motions[i].target] = true;
    var clips = sortedClips().filter(function (c) { return !bound[c.target]; });
    var lines = [
      I18n.t("exportHead"),
      "gsap.registerPlugin(MotionPathPlugin);",
      "const tl = gsap.timeline();"
    ];
    for (i = 0; i < clips.length; i++) lines.push(lineFor(clips[i]));
    for (i = 0; i < motions.length; i++) lines.push(lineForPathMotion(motions[i]));
    return lines.join("\n");
  }

  function exportSelected(elId) {
    var motions = (Graph.get().pathMotions || []).filter(function (m) { return m.target === elId; });
    var clips = sortedClips().filter(function (c) { return c.target === elId; });
    if (motions.length) clips = [];
    if (!clips.length && !motions.length) return I18n.t("noClip");
    var lines = ["// " + elId];
    var i;
    for (i = 0; i < clips.length; i++) lines.push(lineFor(clips[i]));
    for (i = 0; i < motions.length; i++) lines.push(lineForPathMotion(motions[i]));
    return lines.join("\n");
  }

  function applyPathMotion(timeline, motion) {
    var el = node(motion.target);
    var path = Graph.pathById(motion.pathId);
    if (!el || !path || typeof MotionPathPlugin === "undefined") return;
    var d = PathGeom.anchorsToSvgD(path.anchors);
    var startPt = PathGeom.pointAt(path, 0);
    gsap.set(el, {
      left: 0,
      top: 0,
      xPercent: -50,
      yPercent: -50,
      x: startPt.x,
      y: startPt.y,
      rotation: (motion.keys && motion.keys[0] && motion.keys[0].rotation) || 0
    });

    timeline.to(el, {
      duration: motion.duration,
      ease: motion.ease || "power2.inOut",
      motionPath: {
        path: d,
        autoRotate: !!motion.autoRotate,
        start: 0,
        end: 1
      },
      immediateRender: false
    }, motion.start);

    var keys = (motion.keys || []).slice().sort(function (a, b) { return a.p - b.p; });
    if (keys.length) {
      var frames = [];
      var i;
      for (i = 0; i < keys.length; i++) {
        var k = keys[i];
        var dur = i === 0 ? 0.001 : Math.max(0.001, (k.p - keys[i - 1].p) * motion.duration);
        var frame = { duration: dur, ease: i === 0 ? "none" : (motion.ease || "none") };
        if (k.rotation != null) frame.rotation = k.rotation;
        if (k.scale != null) frame.scale = k.scale;
        if (k.opacity != null) frame.opacity = k.opacity;
        if (k.skewX != null) frame.skewX = k.skewX;
        if (k.skewY != null) frame.skewY = k.skewY;
        if (k.blur != null) frame.filter = "blur(" + k.blur + "px)";
        if (k.color) frame.color = k.color;
        if (k.backgroundColor) frame.backgroundColor = k.backgroundColor;
        frames.push(frame);
      }
      timeline.to(el, { keyframes: frames, immediateRender: false }, motion.start);
    }
  }

  function parseObjectLiteral(src) {
    try {
      return Function("\"use strict\"; return (" + src + ");")();
    } catch (e) {
      return null;
    }
  }

  function normalizeVars(obj) {
    var vars = {};
    var key;
    if (!obj || typeof obj !== "object") return vars;
    for (key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
      if (key === "duration" || key === "ease" || key === "stagger" || key === "repeat" || key === "yoyo" || key === "immediateRender") continue;
      if (key === "filter" && typeof obj[key] === "string") {
        var m = obj[key].match(/blur\(([\d.]+)px\)/);
        if (m) vars.blur = Number(m[1]);
        continue;
      }
      if (key === "keyframes" && Array.isArray(obj[key])) {
        vars.path = "arc";
        continue;
      }
      vars[key] = obj[key];
    }
    return vars;
  }

  function parseSelectedCode(text, targetId) {
    var lines = String(text || "").split(/\r?\n/);
    var clips = [];
    var i;
    var re = /tl\.(from|to|fromTo|set)\(\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*,\s*/g;
    for (i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line || line.indexOf("//") === 0) continue;
      if (line.indexOf("tl.") !== 0) continue;
      var methodMatch = line.match(/^tl\.(from|to|fromTo|set)\(/);
      if (!methodMatch) continue;
      var method = methodMatch[1];
      var rest = line.slice(methodMatch[0].length);
      var selMatch = rest.match(/^("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*,\s*/);
      if (!selMatch) continue;
      var selector = selMatch[1].slice(1, -1);
      var idMatch = selector.match(/data-gsap-id='([^']+)'/);
      var tid = idMatch ? idMatch[1] : targetId;
      if (tid !== targetId && selector.indexOf(targetId) === -1) {
        /* allow editing only current element; retarget to selection */
        tid = targetId;
      }
      rest = rest.slice(selMatch[0].length);
      var depth = 0;
      var start = -1;
      var objs = [];
      var j;
      for (j = 0; j < rest.length; j++) {
        var ch = rest.charAt(j);
        if (ch === "{") {
          if (depth === 0) start = j;
          depth += 1;
        } else if (ch === "}") {
          depth -= 1;
          if (depth === 0 && start >= 0) {
            objs.push(rest.slice(start, j + 1));
            start = -1;
          }
        }
      }
      if (!objs.length) continue;
      var varsObj = parseObjectLiteral(objs[0]);
      if (!varsObj) continue;
      var posMatch = rest.match(/,\s*([0-9]*\.?[0-9]+)\s*\)\s*;?\s*$/);
      var startTime = posMatch ? Number(posMatch[1]) : 0;
      var stagger = varsObj.stagger != null ? Number(varsObj.stagger) : null;
      var duration = varsObj.duration != null ? Number(varsObj.duration) : 0.6;
      var ease = varsObj.ease || "power2.out";
      var clip = {
        id: Graph.uid("c"),
        target: targetId,
        method: method === "fromTo" ? "from" : method,
        start: startTime,
        duration: duration,
        ease: ease,
        vars: normalizeVars(varsObj),
        stagger: stagger,
        repeat: varsObj.repeat || 0,
        yoyo: !!varsObj.yoyo
      };
      if (selector.indexOf("[data-gsap-id]") > selector.indexOf("]") && clip.stagger == null) {
        clip.stagger = 0.05;
      }
      clips.push(clip);
    }
    return clips;
  }

  /* Paused at t≈0: show resting/design pose so new from-opacity-0 clips don't vanish on drop */
  function settleEditPose(t) {
    if (!global.Studio || Studio.playing) return;
    if (t > 0.0005) return;
    var state = Graph.get();
    var i;
    for (i = 0; i < state.elements.length; i++) {
      var meta = state.elements[i];
      if (meta.parent) continue;
      var el = node(meta.id);
      if (!el) continue;
      if (meta.pathId && global.PathEditor && global.PathGeom) {
        var path = Graph.pathById(meta.pathId);
        var motion = Graph.motionsForTarget(meta.id)[0];
        var p = 0;
        if (motion) {
          var d = Math.max(0.0001, Number(motion.duration) || 1);
          if (Studio.playhead <= motion.start) p = 0;
          else if (Studio.playhead >= motion.start + d) p = 1;
          else p = (Studio.playhead - motion.start) / d;
        }
        PathEditor.placeElementOnPath(meta, path, p, motion && motion.autoRotate);
        continue;
      }
      gsap.set(el, {
        opacity: 1,
        x: 0,
        y: 0,
        xPercent: 0,
        yPercent: 0,
        scale: 1,
        rotation: 0,
        skewX: 0,
        skewY: 0,
        filter: "blur(0px)"
      });
    }
  }

  function rebuild(keepTime) {
    var t = keepTime || 0;
    if (tl) {
      tl.pause();
      tl.kill();
    }
    ensureCompilePaths();
    resetPose();
    var loop = Studio && Studio.loop;
    tl = gsap.timeline({
      paused: true,
      repeat: loop ? -1 : 0,
      onUpdate: function () {
        if (Studio && Studio.onTick) Studio.onTick(tl.time());
      },
      onComplete: function () {
        if (Studio && Studio.onEnded) Studio.onEnded();
      }
    });
    var bound = {};
    var motions = (Graph.get().pathMotions || []).slice().sort(function (a, b) { return a.start - b.start; });
    var i;
    for (i = 0; i < motions.length; i++) bound[motions[i].target] = true;
    var clips = sortedClips();
    for (i = 0; i < clips.length; i++) {
      /* pathMotion owns the element — skip leftover clips to avoid dual tweens */
      if (bound[clips[i].target]) continue;
      applyClip(tl, clips[i]);
    }
    for (i = 0; i < motions.length; i++) applyPathMotion(tl, motions[i]);
    var total = Math.max(Graph.get().duration, tl.duration() || 0.01);
    if (tl.duration() < total) {
      tl.to({}, { duration: total - tl.duration() }, tl.duration());
    }
    tl.seek(Math.min(t, total), false);
    Studio.tl = tl;
    settleEditPose(Math.min(t, total));
    return tl;
  }

  global.Compiler = {
    rebuild: rebuild,
    exportAll: exportAll,
    exportSelected: exportSelected,
    parseSelectedCode: parseSelectedCode,
    resetPose: resetPose,
    settleEditPose: settleEditPose,
    PATHS: PATHS
  };
})(window);
