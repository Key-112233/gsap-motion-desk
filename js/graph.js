(function (global) {
  "use strict";

  var EASES = [
    "none",
    "power1.out",
    "power2.out",
    "power3.out",
    "power4.out",
    "power2.inOut",
    "power3.inOut",
    "sine.inOut",
    "back.out(1.7)",
    "elastic.out(1, 0.3)"
  ];

  var FEEL = {
    snap: { duration: 0.35, ease: "power4.out", stagger: 0.04 },
    soft: { duration: 0.8, ease: "power2.inOut", stagger: 0.1 },
    heavy: { duration: 1.2, ease: "power3.inOut", stagger: 0.14 },
    spring: { duration: 0.7, ease: "back.out(1.7)", stagger: 0.06 }
  };

  var TEMPLATES = [
    {
      type: "heading",
      labelKey: "tplHeading",
      split: true,
      content: { text: "把感觉拧准" },
      w: 420
    },
    {
      type: "text",
      labelKey: "tplText",
      content: { text: "在这里写一段说明文字，双击即可编辑。" },
      w: 280
    },
    {
      type: "card",
      labelKey: "tplCard",
      content: {
        title: "卡片标题",
        body: "点我选中。把入场拧到你要的感觉，再复制整段时间轴给 AI。"
      },
      w: 260
    },
    {
      type: "button",
      labelKey: "tplButton",
      content: { text: "开始" },
      w: 120
    },
    {
      type: "box",
      labelKey: "tplBox",
      content: { text: "" },
      w: 160
    }
  ];

  function uid(prefix) {
    return prefix + "-" + Math.random().toString(36).slice(2, 8);
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function defaultClipFor(el, start) {
    var clip = {
      id: uid("c"),
      target: el.id,
      method: "from",
      start: typeof start === "number" ? start : 0,
      duration: 0.65,
      ease: "power3.out",
      vars: { y: 28, opacity: 0 },
      stagger: null,
      repeat: 0,
      yoyo: false
    };
    if (el.split) {
      clip.stagger = 0.06;
      clip.vars = { y: 24, opacity: 0 };
    } else if (el.type === "card") {
      clip.vars = { x: -40, opacity: 0 };
    } else if (el.type === "button") {
      clip.vars = { scale: 0.85, opacity: 0 };
      clip.ease = "back.out(1.7)";
    }
    return clip;
  }

  function makeCharChildren(parentId, text) {
    var kids = [];
    var i;
    var s = String(text || "");
    for (i = 0; i < s.length; i++) {
      kids.push({
        id: parentId + "-ch-" + i,
        type: "char",
        label: s.charAt(i),
        parent: parentId,
        x: 0,
        y: 0,
        content: { text: s.charAt(i) },
        split: false
      });
    }
    return kids;
  }

  function defaultPathKey(p, patch) {
    return Object.assign({
      id: uid("k"),
      p: p,
      rotation: 0,
      scale: 1,
      opacity: 1
    }, patch || {});
  }

  function seed() {
    var cardId = "card-demo";
    var pathId = "path-semi";
    var motionId = "pm-card";
    var semi = global.PathGeom
      ? PathGeom.makePreset("semi", 320, 220)
      : { kind: "semi", meta: { cx: 320, cy: 220, r: 140, startAngle: 180, endAngle: 0 }, anchors: [] };
    semi.id = pathId;
    semi.label = (global.I18n && I18n.t("pathSemi")) || "Semicircle";

    var startPt = global.PathGeom ? PathGeom.pointAt(semi, 0) : { x: 180, y: 220 };
    var en = !(global.I18n && I18n.getLang && I18n.getLang() === "zh");
    var elements = [{
      id: cardId,
      type: "card",
      label: en ? "Card" : "卡片",
      parent: null,
      x: startPt.x - 130,
      y: startPt.y - 70,
      w: 260,
      content: en
        ? {
            title: "Path card",
            body: "Bound to a semicircle. Scrub progress and add pose keys in Path mode; the timeline controls when it plays."
          }
        : {
            title: "路径卡片",
            body: "绑在半圆上。路径模式里拖进度、插关键帧；时间轴管何时播放。"
          },
      split: false,
      pathId: pathId
    }];

    var pathMotions = [{
      id: motionId,
      target: cardId,
      pathId: pathId,
      start: 0.2,
      duration: 1.4,
      ease: "power2.inOut",
      autoRotate: false,
      keys: [
        defaultPathKey(0, { rotation: 0, scale: 1, opacity: 1 }),
        defaultPathKey(0.5, { rotation: -60, scale: 1, opacity: 1 }),
        defaultPathKey(1, { rotation: 0, scale: 1, opacity: 1 })
      ]
    }];

    return {
      version: 3,
      name: "path-demo",
      duration: 0.05,
      elements: elements,
      clips: [],
      paths: [semi],
      pathMotions: pathMotions,
      selectedElementId: cardId,
      selectedClipId: null,
      selectedPathId: pathId,
      selectedMotionId: motionId,
      selectedKeyId: pathMotions[0].keys[0].id,
      editMode: "path",
      scrubProgress: 0
    };
  }

  function clipEnd(clip, elements) {
    var extra = 0;
    var list = elements || state.elements;
    if (clip.stagger != null && clip.stagger !== "") {
      var n = 0;
      var i;
      for (i = 0; i < list.length; i++) {
        if (list[i].parent === clip.target) n += 1;
      }
      if (!n) n = 1;
      extra = Number(clip.stagger) * Math.max(0, n - 1);
    }
    return clip.start + Number(clip.duration) + extra;
  }

  function motionEnd(m) {
    return Number(m.start) + Number(m.duration);
  }

  function endsOf(clips, elements, motions) {
    var max = 0.05;
    var i;
    var list = clips || [];
    for (i = 0; i < list.length; i++) {
      max = Math.max(max, clipEnd(list[i], elements));
    }
    var ms = motions || [];
    for (i = 0; i < ms.length; i++) {
      max = Math.max(max, motionEnd(ms[i]));
    }
    return Math.round(max * 100) / 100;
  }

  function syncDuration() {
    state.duration = endsOf(state.clips, state.elements, state.pathMotions);
    if (global.Studio && Studio.playhead > state.duration) {
      Studio.playhead = state.duration;
    }
  }

  var state = seed();
  syncDuration();
  syncDuration();
  var listeners = [];

  function emit(kind) {
    var i;
    for (i = 0; i < listeners.length; i++) listeners[i](state, kind || "clips");
  }

  function clipById(id) {
    var i;
    for (i = 0; i < state.clips.length; i++) {
      if (state.clips[i].id === id) return state.clips[i];
    }
    return null;
  }

  function elementById(id) {
    var i;
    for (i = 0; i < state.elements.length; i++) {
      if (state.elements[i].id === id) return state.elements[i];
    }
    return null;
  }

  function roots() {
    return state.elements.filter(function (el) { return !el.parent; });
  }

  function recordHistory(coalesce) {
    if (global.History && !History.isLocked()) {
      History.record(coalesce ? { coalesce: true } : undefined);
    }
  }

  function pathById(id) {
    var i;
    for (i = 0; i < state.paths.length; i++) {
      if (state.paths[i].id === id) return state.paths[i];
    }
    return null;
  }

  function motionById(id) {
    var i;
    for (i = 0; i < state.pathMotions.length; i++) {
      if (state.pathMotions[i].id === id) return state.pathMotions[i];
    }
    return null;
  }

  function motionsForTarget(targetId) {
    return state.pathMotions.filter(function (m) { return m.target === targetId; });
  }

  function keyById(motion, keyId) {
    if (!motion || !motion.keys) return null;
    var i;
    for (i = 0; i < motion.keys.length; i++) {
      if (motion.keys[i].id === keyId) return motion.keys[i];
    }
    return null;
  }

  function select(elId, clipId, opts) {
    opts = opts || {};
    state.selectedElementId = elId || null;
    if (clipId) {
      state.selectedClipId = clipId;
    } else if (elId) {
      var found = null;
      var i;
      for (i = 0; i < state.clips.length; i++) {
        if (state.clips[i].target === elId) {
          found = state.clips[i].id;
          break;
        }
      }
      state.selectedClipId = found;
      var ms = motionsForTarget(elId);
      if (ms.length && !opts.keepMotion) {
        state.selectedMotionId = ms[0].id;
        if (ms[0].keys && ms[0].keys.length) state.selectedKeyId = ms[0].keys[0].id;
      }
      var el = elementById(elId);
      if (el && el.pathId) state.selectedPathId = el.pathId;
    } else {
      state.selectedClipId = null;
    }
    if (opts.pathId) state.selectedPathId = opts.pathId;
    if (opts.motionId) state.selectedMotionId = opts.motionId;
    if (opts.keyId) state.selectedKeyId = opts.keyId;
    emit("select");
  }

  function setEditMode(mode) {
    state.editMode = mode === "path" ? "path" : "stage";
    emit("select");
  }

  function setScrubProgress(p, silent) {
    state.scrubProgress = Math.max(0, Math.min(1, p));
    state._pathScrubbing = true;
    var motion = state.selectedMotionId
      ? motionById(state.selectedMotionId)
      : (state.selectedElementId ? motionsForTarget(state.selectedElementId)[0] : null);
    if (motion && global.Studio) {
      Studio.playhead = Number(motion.start) + state.scrubProgress * Number(motion.duration);
      if (global.TimelineView) TimelineView.setPlayhead(Studio.playhead, false, { fromPathScrub: true });
      if (Studio.tl) Studio.tl.seek(Studio.playhead, false);
    }
    if (!silent) emit("scrub");
  }

  function updateClip(id, patch, silent) {
    var clip = clipById(id);
    if (!clip) return;
    if (!silent) recordHistory(true);
    var key;
    for (key in patch) {
      if (Object.prototype.hasOwnProperty.call(patch, key)) {
        if (key === "vars") clip.vars = Object.assign({}, patch.vars);
        else clip[key] = patch[key];
      }
    }
    if (clip.duration < 0.05) clip.duration = 0.05;
    if (clip.start < 0) clip.start = 0;
    syncDuration();
    if (!silent) emit("clips");
  }

  function clearPathBinding(elId, silent) {
    var el = elementById(elId);
    if (!el) return;
    el.pathId = null;
    state.pathMotions = state.pathMotions.filter(function (m) { return m.target !== elId; });
    if (state.selectedMotionId && !motionById(state.selectedMotionId)) {
      state.selectedMotionId = null;
      state.selectedKeyId = null;
    }
    if (!silent) syncDuration();
  }

  function addClip(target, start) {
    var el = elementById(target || state.selectedElementId);
    if (!el || el.parent) {
      el = roots()[0];
    }
    if (!el) return null;
    /* path-bound elements use pathMotion only — don't create a second track item */
    if (el.pathId) return null;
    recordHistory();
    var clip = defaultClipFor(el, typeof start === "number" ? start : ((global.Studio && Studio.playhead) || 0));
    state.clips.push(clip);
    state.selectedElementId = clip.target;
    state.selectedClipId = clip.id;
    syncDuration();
    emit("clips");
    return clip;
  }

  function removeClip(id) {
    recordHistory();
    state.clips = state.clips.filter(function (c) { return c.id !== id; });
    if (state.selectedClipId === id) state.selectedClipId = null;
    syncDuration();
    emit("clips");
  }

  function rebuildSplitChildren(el) {
    state.elements = state.elements.filter(function (e) { return e.parent !== el.id; });
    if (!el.split) return;
    var kids = makeCharChildren(el.id, (el.content && el.content.text) || "");
    state.elements = state.elements.concat(kids);
  }

  function addFromTemplate(type, x, y) {
    var tpl = null;
    var i;
    for (i = 0; i < TEMPLATES.length; i++) {
      if (TEMPLATES[i].type === type) {
        tpl = TEMPLATES[i];
        break;
      }
    }
    if (!tpl) return null;

    recordHistory();
    var baseLabel = (global.I18n && I18n.t(tpl.labelKey)) || tpl.type;
    var sameType = 0;
    var ti;
    for (ti = 0; ti < state.elements.length; ti++) {
      if (!state.elements[ti].parent && state.elements[ti].type === tpl.type) sameType += 1;
    }
    var el = {
      id: uid(type),
      type: tpl.type,
      label: sameType === 0 ? baseLabel : baseLabel + " " + (sameType + 1),
      parent: null,
      x: Math.round(x || 40),
      y: Math.round(y || 40),
      w: tpl.w,
      content: clone(tpl.content),
      split: !!tpl.split
    };

    if (el.type === "heading" && global.I18n && I18n.getLang() === "en") {
      el.content.text = "FEELS";
    }
    if (el.type === "text" && global.I18n && I18n.getLang() === "en") {
      el.content.text = "Double-click to edit this copy.";
    }
    if (el.type === "card" && global.I18n && I18n.getLang() === "en") {
      el.content.title = "Card";
      el.content.body = "Drag templates onto the canvas. Dial motion on the timeline.";
    }
    if (el.type === "button" && global.I18n && I18n.getLang() === "en") {
      el.content.text = "Start";
    }

    state.elements.push(el);
    rebuildSplitChildren(el);

    var start = Studio ? Studio.playhead : 0;
    var clip = defaultClipFor(el, start);
    state.clips.push(clip);
    state.selectedElementId = el.id;
    state.selectedClipId = clip.id;
    syncDuration();
    emit("stage");
    return el;
  }

  function updateElement(id, patch, silent) {
    var el = elementById(id);
    if (!el || el.parent) return;
    if (!silent) {
      if (patch.x != null || patch.y != null) recordHistory(true);
      else recordHistory(true);
    }
    var key;
    for (key in patch) {
      if (!Object.prototype.hasOwnProperty.call(patch, key)) continue;
      if (key === "content") {
        el.content = Object.assign({}, el.content, patch.content);
      } else {
        el[key] = patch[key];
      }
    }
    if (patch.content && el.split) rebuildSplitChildren(el);
    if (!silent) emit(patch.content || patch.split != null ? "stage" : "drag");
    else if (patch.content) emit("stage");
  }

  function removeElement(id) {
    var el = elementById(id);
    if (!el) return;
    recordHistory();
    var rootId = el.parent || el.id;
    state.elements = state.elements.filter(function (e) {
      return e.id !== rootId && e.parent !== rootId;
    });
    state.clips = state.clips.filter(function (c) { return c.target !== rootId; });
    state.pathMotions = state.pathMotions.filter(function (m) { return m.target !== rootId; });
    if (state.selectedElementId === rootId || (el.parent && state.selectedElementId === el.id)) {
      state.selectedElementId = null;
      state.selectedClipId = null;
      state.selectedMotionId = null;
      state.selectedKeyId = null;
    }
    syncDuration();
    emit("stage");
  }

  function pathKindLabelKey(kind) {
    if (kind === "line") return "pathLine";
    if (kind === "arc") return "pathArc";
    if (kind === "semi") return "pathSemi";
    if (kind === "wave") return "pathWave";
    if (kind === "bezier") return "pathBezier";
    return "pathPresets";
  }

  function pathKindBaseName(kind) {
    if (global.I18n) return I18n.t(pathKindLabelKey(kind));
    return kind || "path";
  }

  function nextPathLabel(kind) {
    var base = pathKindBaseName(kind);
    var n = 0;
    var i;
    for (i = 0; i < state.paths.length; i++) {
      if (state.paths[i].kind === kind) n += 1;
    }
    return base + " " + (n + 1);
  }

  function pathDisplayName(path) {
    if (!path) return "";
    if (path.label) return path.label;
    return pathKindBaseName(path.kind);
  }

  function addPath(kind, x, y) {
    if (!global.PathGeom) return null;
    recordHistory();
    var path = PathGeom.makePreset(kind || "line", x || 220, y || 180);
    path.id = uid("path");
    path.label = nextPathLabel(path.kind);
    state.paths.push(path);
    state.selectedPathId = path.id;
    state.editMode = "path";
    emit("stage");
    return path;
  }

  function updatePath(id, patch, silent) {
    var path = pathById(id);
    if (!path) return;
    if (!silent) recordHistory(true);
    if (patch.meta) {
      path.meta = Object.assign({}, path.meta || {}, patch.meta);
      if (path.kind === "arc" || path.kind === "semi") PathGeom.syncArcAnchors(path);
    }
    if (patch.anchors) path.anchors = clone(patch.anchors);
    if (patch.kind) path.kind = patch.kind;
    if (patch.label != null) path.label = String(patch.label);
    if (!silent) emit("paths");
  }

  function removePath(id) {
    recordHistory();
    state.paths = state.paths.filter(function (p) { return p.id !== id; });
    state.pathMotions = state.pathMotions.filter(function (m) { return m.pathId !== id; });
    var i;
    for (i = 0; i < state.elements.length; i++) {
      if (state.elements[i].pathId === id) state.elements[i].pathId = null;
    }
    if (state.selectedPathId === id) state.selectedPathId = null;
    emit("stage");
  }

  function bindElementToPath(elId, pathId) {
    var el = elementById(elId);
    var path = pathById(pathId);
    if (!el || el.parent || !path) return null;
    recordHistory();
    el.pathId = pathId;
    /* path motion owns the track — drop ordinary clips so timeline is one block */
    state.clips = state.clips.filter(function (c) { return c.target !== elId; });
    state.selectedClipId = null;
    var prev = motionsForTarget(elId)[0];
    state.pathMotions = state.pathMotions.filter(function (m) { return m.target !== elId; });
    var motion = {
      id: (prev && prev.id) || uid("pm"),
      target: elId,
      pathId: pathId,
      start: prev ? prev.start : ((global.Studio && Studio.playhead) || 0),
      duration: prev ? prev.duration : 1.2,
      ease: (prev && prev.ease) || "power2.inOut",
      autoRotate: prev ? !!prev.autoRotate : false,
      keys: prev && prev.keys && prev.keys.length
        ? clone(prev.keys)
        : [defaultPathKey(0), defaultPathKey(1)]
    };
    state.pathMotions.push(motion);
    state.selectedPathId = pathId;
    state.selectedMotionId = motion.id;
    state.selectedKeyId = motion.keys[0].id;
    state.selectedElementId = elId;
    state.scrubProgress = 0;
    state.editMode = "path";
    syncDuration();
    emit("stage");
    return motion;
  }

  function unbindElementPath(elId) {
    var el = elementById(elId);
    if (!el) return;
    recordHistory();
    el.pathId = null;
    state.pathMotions = state.pathMotions.filter(function (m) { return m.target !== elId; });
    if (state.selectedMotionId) {
      var m = motionById(state.selectedMotionId);
      if (!m) {
        state.selectedMotionId = null;
        state.selectedKeyId = null;
      }
    }
    /* restore a simple entrance clip so the track isn't empty */
    var hasClip = false;
    var i;
    for (i = 0; i < state.clips.length; i++) {
      if (state.clips[i].target === elId) { hasClip = true; break; }
    }
    if (!hasClip) {
      var clip = defaultClipFor(el, (global.Studio && Studio.playhead) || 0);
      state.clips.push(clip);
      state.selectedClipId = clip.id;
    }
    syncDuration();
    emit("stage");
  }

  function updatePathMotion(id, patch, silent) {
    var m = motionById(id);
    if (!m) return;
    if (!silent) recordHistory(true);
    var key;
    for (key in patch) {
      if (!Object.prototype.hasOwnProperty.call(patch, key)) continue;
      if (key === "keys") m.keys = clone(patch.keys);
      else m[key] = patch[key];
    }
    if (m.duration < 0.05) m.duration = 0.05;
    if (m.start < 0) m.start = 0;
    syncDuration();
    if (!silent) emit("clips");
  }

  function addPathKey(motionId, progress, props) {
    var m = motionById(motionId);
    if (!m) return null;
    recordHistory();
    var p = Math.max(0, Math.min(1, progress));
    var existing = null;
    var i;
    for (i = 0; i < m.keys.length; i++) {
      if (Math.abs(m.keys[i].p - p) < 0.02) {
        existing = m.keys[i];
        break;
      }
    }
    if (existing) {
      Object.assign(existing, props || {});
      existing.p = p;
      state.selectedKeyId = existing.id;
    } else {
      var key = defaultPathKey(p, props);
      m.keys.push(key);
      m.keys.sort(function (a, b) { return a.p - b.p; });
      state.selectedKeyId = key.id;
    }
    state.selectedMotionId = motionId;
    emit("paths");
    return state.selectedKeyId;
  }

  function updatePathKey(motionId, keyId, patch, silent) {
    var m = motionById(motionId);
    var key = keyById(m, keyId);
    if (!key) return;
    if (!silent) recordHistory(true);
    Object.assign(key, patch || {});
    if (key.p != null) key.p = Math.max(0, Math.min(1, key.p));
    m.keys.sort(function (a, b) { return a.p - b.p; });
    if (!silent) emit("paths");
  }

  function removePathKey(motionId, keyId) {
    var m = motionById(motionId);
    if (!m || m.keys.length <= 1) return;
    recordHistory();
    m.keys = m.keys.filter(function (k) { return k.id !== keyId; });
    if (state.selectedKeyId === keyId) {
      state.selectedKeyId = m.keys[0] ? m.keys[0].id : null;
    }
    emit("paths");
  }

  function applyFeel(name) {
    var feel = FEEL[name];
    var clip = clipById(state.selectedClipId);
    if (!feel || !clip) return;
    recordHistory();
    clip.duration = feel.duration;
    clip.ease = feel.ease;
    var el = elementById(clip.target);
    if (el && el.split) clip.stagger = feel.stagger;
    emit("clips");
  }

  var PRESETS = {
    popIn: {
      labelKey: "presetPop",
      tipKey: "tipPresetPop",
      apply: function (el, start) {
        return {
          id: uid("c"),
          target: el.id,
          method: "from",
          start: start || 0,
          duration: 0.55,
          ease: "back.out(1.7)",
          vars: { scale: 0.55, opacity: 0 },
          stagger: null,
          repeat: 0,
          yoyo: false
        };
      }
    },
    staggerTitle: {
      labelKey: "presetStagger",
      tipKey: "tipPresetStagger",
      apply: function (el, start) {
        if (!el.split) {
          el.split = true;
          rebuildSplitChildren(el);
        }
        return {
          id: uid("c"),
          target: el.id,
          method: "from",
          start: start || 0,
          duration: 0.55,
          ease: "power3.out",
          vars: { y: 36, opacity: 0, skewX: 8 },
          stagger: 0.05,
          repeat: 0,
          yoyo: false
        };
      }
    },
    cardCascade: {
      labelKey: "presetCascade",
      tipKey: "tipPresetCascade",
      multi: true,
      applyAll: function (start) {
        var cards = roots().filter(function (el) { return el.type === "card"; });
        var out = [];
        var i;
        for (i = 0; i < cards.length; i++) {
          out.push({
            id: uid("c"),
            target: cards[i].id,
            method: "from",
            start: (start || 0) + i * 0.12,
            duration: 0.65,
            ease: "power3.out",
            vars: { y: 48, opacity: 0, blur: 8 },
            stagger: null,
            repeat: 0,
            yoyo: false
          });
        }
        return out;
      }
    }
  };

  function applyPreset(name) {
    var preset = PRESETS[name];
    if (!preset) return;
    recordHistory();
    var start = (global.Studio && Studio.playhead) || 0;
    if (preset.multi && preset.applyAll) {
      var clips = preset.applyAll(start);
      if (!clips.length) return;
      var i;
      for (i = 0; i < clips.length; i++) {
        clearPathBinding(clips[i].target, true);
        state.clips = state.clips.filter(function (c) { return c.target !== clips[i].target; });
      }
      state.clips = state.clips.concat(clips);
      state.selectedElementId = clips[0].target;
      state.selectedClipId = clips[0].id;
      syncDuration();
      emit("stage");
      return;
    }
    var el = elementById(state.selectedElementId);
    if (!el || el.parent) return;
    if (name === "staggerTitle" && el.type !== "heading") {
      el.type = "heading";
      el.split = true;
      rebuildSplitChildren(el);
    }
    /* choosing a clip preset replaces path motion on this element */
    clearPathBinding(el.id, true);
    state.clips = state.clips.filter(function (c) { return c.target !== el.id; });
    var clip = preset.apply(el, start);
    state.clips.push(clip);
    state.selectedClipId = clip.id;
    syncDuration();
    emit("stage");
  }

  function replaceClipsForTarget(targetId, clips) {
    recordHistory();
    state.clips = state.clips.filter(function (c) { return c.target !== targetId; }).concat(clips);
    if (clips.length) {
      state.selectedElementId = targetId;
      state.selectedClipId = clips[0].id;
    }
    syncDuration();
    emit("clips");
  }

  function replaceState(data) {
    state.elements = clone(data.elements || []);
    state.clips = clone(data.clips || []);
    state.paths = clone(data.paths || []);
    state.pathMotions = clone(data.pathMotions || []);
    state.name = data.name || state.name;
    state.selectedElementId = data.selectedElementId || null;
    state.selectedClipId = data.selectedClipId || null;
    state.selectedPathId = data.selectedPathId || null;
    state.selectedMotionId = data.selectedMotionId || null;
    state.selectedKeyId = data.selectedKeyId || null;
    state.editMode = data.editMode || state.editMode || "stage";
    state.scrubProgress = data.scrubProgress != null ? data.scrubProgress : 0;
    syncDuration();
    emit("stage");
  }

  function overlapWarning(clip) {
    if (!clip) return "";
    var i, other;
    for (i = 0; i < state.clips.length; i++) {
      other = state.clips[i];
      if (other.id === clip.id || other.target !== clip.target) continue;
      if (clip.start < other.start + other.duration && other.start < clip.start + clip.duration) {
        return "overlap";
      }
    }
    return "";
  }

  function exportProject() {
    return {
      version: 3,
      name: state.name || "project",
      elements: clone(state.elements),
      clips: clone(state.clips),
      paths: clone(state.paths || []),
      pathMotions: clone(state.pathMotions || [])
    };
  }

  function importProject(data) {
    if (!data || !Array.isArray(data.elements) || !Array.isArray(data.clips)) {
      throw new Error("invalid");
    }
    recordHistory();
    state.version = data.version || 3;
    state.name = data.name || "project";
    state.elements = clone(data.elements);
    state.clips = clone(data.clips);
    state.paths = clone(data.paths || []);
    state.pathMotions = clone(data.pathMotions || []);
    state.selectedElementId = roots()[0] ? roots()[0].id : null;
    state.selectedClipId = null;
    state.selectedPathId = state.paths[0] ? state.paths[0].id : null;
    state.selectedMotionId = null;
    state.selectedKeyId = null;
    if (state.selectedElementId) {
      var i;
      for (i = 0; i < state.clips.length; i++) {
        if (state.clips[i].target === state.selectedElementId) {
          state.selectedClipId = state.clips[i].id;
          break;
        }
      }
      var ms = motionsForTarget(state.selectedElementId);
      if (ms.length) {
        state.selectedMotionId = ms[0].id;
        state.selectedKeyId = ms[0].keys[0] ? ms[0].keys[0].id : null;
      }
    }
    syncDuration();
    emit("stage");
  }

  /* ensure arrays exist even if old seed somehow ran */
  if (!state.paths) state.paths = [];
  if (!state.pathMotions) state.pathMotions = [];
  if (state.editMode == null) state.editMode = "stage";
  if (state.scrubProgress == null) state.scrubProgress = 0;
  (function ensurePathLabels() {
    var counts = {};
    var i;
    for (i = 0; i < state.paths.length; i++) {
      var p = state.paths[i];
      if (p.label) continue;
      var k = p.kind || "path";
      counts[k] = (counts[k] || 0) + 1;
      p.label = pathKindBaseName(k) + " " + counts[k];
    }
  })();

  global.Graph = {
    EASES: EASES,
    FEEL: FEEL,
    TEMPLATES: TEMPLATES,
    PRESETS: PRESETS,
    PATH_KINDS: ["line", "arc", "semi", "wave"],
    get: function () { return state; },
    subscribe: function (fn) { listeners.push(fn); fn(state, "stage"); },
    select: select,
    setEditMode: setEditMode,
    setScrubProgress: setScrubProgress,
    updateClip: updateClip,
    addClip: addClip,
    removeClip: removeClip,
    addFromTemplate: addFromTemplate,
    updateElement: updateElement,
    removeElement: removeElement,
    applyFeel: applyFeel,
    applyPreset: applyPreset,
    replaceClipsForTarget: replaceClipsForTarget,
    replaceState: replaceState,
    addPath: addPath,
    updatePath: updatePath,
    removePath: removePath,
    bindElementToPath: bindElementToPath,
    unbindElementPath: unbindElementPath,
    updatePathMotion: updatePathMotion,
    addPathKey: addPathKey,
    updatePathKey: updatePathKey,
    removePathKey: removePathKey,
    flush: function () { emit("clips"); },
    emit: emit,
    clipById: clipById,
    elementById: elementById,
    pathById: pathById,
    pathDisplayName: pathDisplayName,
    motionById: motionById,
    motionsForTarget: motionsForTarget,
    keyById: keyById,
    roots: roots,
    overlapWarning: overlapWarning,
    exportProject: exportProject,
    importProject: importProject,
    uid: uid
  };
})(window);
