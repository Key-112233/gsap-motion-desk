(function (global) {
  "use strict";

  var PPS = 90;
  var TRACK_H = 36;
  var SNAP = 0.05;
  var drag = null;

  function snap(v) {
    return Math.round(v / SNAP) * SNAP;
  }

  function tracks() {
    return Graph.get().elements.filter(function (el) { return !el.parent; });
  }

  function trackIndex(id) {
    var list = tracks();
    var i;
    for (i = 0; i < list.length; i++) if (list[i].id === id) return i;
    return 0;
  }

  function syncScroll() {
    var heads = document.getElementById("tl-heads");
    var lanes = document.getElementById("tl-lanes");
    if (!heads || !lanes) return;
    heads.scrollTop = lanes.scrollTop;
    lanes.scrollTop = heads.scrollTop;
  }

  function renderRuler(host, duration) {
    var ruler = document.createElement("div");
    ruler.className = "tl-ruler";
    ruler.style.width = duration * PPS + 40 + "px";
    var t;
    for (t = 0; t <= duration; t += 0.5) {
      var mark = document.createElement("span");
      mark.textContent = t.toFixed(1);
      mark.style.position = "absolute";
      mark.style.left = t * PPS + "px";
      mark.style.top = "4px";
      ruler.appendChild(mark);
    }
    host.appendChild(ruler);
  }

  function render(state) {
    var heads = document.getElementById("tl-heads");
    var lanes = document.getElementById("tl-lanes");
    if (!heads || !lanes) return;
    var scrollY = lanes.scrollTop;
    var scrollX = lanes.scrollLeft;
    heads.innerHTML = "";
    lanes.innerHTML = "";
    lanes.style.setProperty("--pps", PPS + "px");

    renderRuler(lanes, state.duration);

    var playhead = document.createElement("div");
    playhead.className = "playhead";
    playhead.id = "playhead";
    playhead.style.left = Studio.playhead * PPS + "px";
    playhead.appendChild(document.createElement("i"));
    lanes.appendChild(playhead);

    var i;
    var rootList = tracks();
    for (i = 0; i < rootList.length; i++) {
      var el = rootList[i];
      var h = document.createElement("div");
      h.className = "tl-track-h" + (state.selectedElementId === el.id ? " is-on" : "");
      h.textContent = I18n.elementLabel(el);
      h.setAttribute("data-el", el.id);
      heads.appendChild(h);

      var lane = document.createElement("div");
      lane.className = "tl-lane";
      lane.style.width = state.duration * PPS + 40 + "px";
      lane.setAttribute("data-el", el.id);
      lanes.appendChild(lane);
    }

    var boundTargets = {};
    var motions = state.pathMotions || [];
    for (i = 0; i < motions.length; i++) boundTargets[motions[i].target] = true;

    for (i = 0; i < state.clips.length; i++) {
      var clip = state.clips[i];
      /* path-bound elements use the path block only (same as seed demo) */
      if (boundTargets[clip.target]) continue;
      var laneEl = lanes.querySelector('.tl-lane[data-el="' + clip.target + '"]');
      if (!laneEl) continue;
      var block = document.createElement("div");
      block.className = "tl-clip" + (state.selectedClipId === clip.id ? " is-on" : "");
      block.setAttribute("data-clip", clip.id);
      block.style.left = clip.start * PPS + "px";
      block.style.width = Math.max(clip.duration * PPS, 16) + "px";
      var tag = (clip.method || "to") + " · " + String(clip.ease || "").replace(/\(.*\)/, "");
      block.appendChild(document.createTextNode(tag));
      var hl = document.createElement("i");
      hl.className = "tl-handle l";
      var hr = document.createElement("i");
      hr.className = "tl-handle r";
      block.appendChild(hl);
      block.appendChild(hr);
      laneEl.appendChild(block);
    }

    for (i = 0; i < motions.length; i++) {
      var pm = motions[i];
      var lanePm = lanes.querySelector('.tl-lane[data-el="' + pm.target + '"]');
      if (!lanePm) continue;
      var pathMeta = Graph.pathById(pm.pathId);
      var pathName = Graph.pathDisplayName(pathMeta) || "path";
      var pblock = document.createElement("div");
      pblock.className = "tl-clip is-path" + (state.selectedMotionId === pm.id ? " is-on" : "");
      pblock.setAttribute("data-path-motion", pm.id);
      pblock.setAttribute("title", pathName);
      pblock.style.left = pm.start * PPS + "px";
      pblock.style.width = Math.max(pm.duration * PPS, 16) + "px";
      pblock.appendChild(document.createTextNode(pathName + " · " + (pm.keys ? pm.keys.length : 0) + "kf"));
      var phl = document.createElement("i");
      phl.className = "tl-handle l";
      var phr = document.createElement("i");
      phr.className = "tl-handle r";
      pblock.appendChild(phl);
      pblock.appendChild(phr);
      lanePm.appendChild(pblock);
    }

    lanes.scrollTop = scrollY;
    heads.scrollTop = scrollY;
    lanes.scrollLeft = scrollX;
  }

  function setPlayhead(t, seek, opts) {
    opts = opts || {};
    var dur = Graph.get().duration;
    t = Math.max(0, Math.min(dur, t));
    Studio.playhead = t;
    var ph = document.getElementById("playhead");
    if (ph) ph.style.left = t * PPS + "px";
    var readout = document.getElementById("time-readout");
    if (readout) readout.textContent = t.toFixed(2) + "s";
    var state = Graph.get();
    if (!opts.fromPathScrub) {
      var motion = state.selectedMotionId
        ? Graph.motionById(state.selectedMotionId)
        : (state.selectedElementId ? Graph.motionsForTarget(state.selectedElementId)[0] : null);
      if (motion) {
        var d = Math.max(0.0001, Number(motion.duration) || 1);
        var p = (t - motion.start) / d;
        state.scrubProgress = Math.max(0, Math.min(1, p));
        state._pathScrubbing = false;
      }
    }
    if (seek && Studio.tl) Studio.tl.seek(t, false);
    if (seek && !Studio.playing) {
      if (global.Compiler && Compiler.settleEditPose) Compiler.settleEditPose(t);
      if (global.PathEditor) PathEditor.syncBoundElements(Graph.get());
    }
  }

  function bind() {
    var heads = document.getElementById("tl-heads");
    var lanes = document.getElementById("tl-lanes");
    if (!heads || !lanes) return;

    lanes.addEventListener("scroll", function () {
      heads.scrollTop = lanes.scrollTop;
    });
    heads.addEventListener("scroll", function () {
      lanes.scrollTop = heads.scrollTop;
    });

    heads.addEventListener("click", function (e) {
      var h = e.target.closest(".tl-track-h");
      if (!h) return;
      Graph.select(h.getAttribute("data-el"));
    });

    function timeAtPointer(e) {
      var rect = lanes.getBoundingClientRect();
      return snap((e.clientX - rect.left + lanes.scrollLeft) / PPS);
    }

    function scrubTo(e) {
      Studio.pause();
      setPlayhead(timeAtPointer(e), true);
    }

    lanes.addEventListener("pointerdown", function (e) {
      var handle = e.target.closest(".tl-handle");
      var pblock = e.target.closest("[data-path-motion]");
      if (pblock) {
        var pmid = pblock.getAttribute("data-path-motion");
        var pm = Graph.motionById(pmid);
        if (!pm) return;
        Graph.select(pm.target, null, { motionId: pm.id, pathId: pm.pathId });
        Graph.setEditMode("path");
        var pmode = "pm-move";
        if (handle && handle.classList.contains("l")) pmode = "pm-trim-start";
        if (handle && handle.classList.contains("r")) pmode = "pm-trim-end";
        drag = {
          mode: pmode,
          id: pmid,
          startX: e.clientX,
          startY: e.clientY,
          origStart: pm.start,
          origDur: pm.duration
        };
        pblock.setPointerCapture(e.pointerId);
        e.preventDefault();
        return;
      }
      var block = e.target.closest(".tl-clip");
      if (block && block.getAttribute("data-clip")) {
        var id = block.getAttribute("data-clip");
        var clip = Graph.clipById(id);
        if (!clip) return;
        Graph.select(clip.target, clip.id);
        var mode = "move";
        if (handle && handle.classList.contains("l")) mode = "trim-start";
        if (handle && handle.classList.contains("r")) mode = "trim-end";
        drag = {
          mode: mode,
          id: id,
          startX: e.clientX,
          startY: e.clientY,
          origStart: clip.start,
          origDur: clip.duration,
          origTarget: clip.target,
          origIndex: trackIndex(clip.target)
        };
        block.setPointerCapture(e.pointerId);
        e.preventDefault();
        return;
      }
      drag = { mode: "scrub" };
      lanes.setPointerCapture(e.pointerId);
      e.preventDefault();
      scrubTo(e);
    });

    lanes.addEventListener("dblclick", function (e) {
      var pblock = e.target.closest("[data-path-motion]");
      if (!pblock) return;
      var pmid = pblock.getAttribute("data-path-motion");
      var pm = Graph.motionById(pmid);
      if (!pm) return;
      Graph.select(pm.target, null, { motionId: pm.id, pathId: pm.pathId });
      Graph.setEditMode("path");
    });

    window.addEventListener("pointermove", function (e) {
      if (!drag) return;
      if (drag.mode === "scrub") {
        scrubTo(e);
        return;
      }
      var dx = (e.clientX - drag.startX) / PPS;
      if (drag.mode.indexOf("pm-") === 0) {
        var pm = Graph.motionById(drag.id);
        if (!pm) return;
        if (drag.mode === "pm-move") {
          Graph.updatePathMotion(drag.id, { start: snap(Math.max(0, drag.origStart + dx)) }, true);
        } else if (drag.mode === "pm-trim-end") {
          Graph.updatePathMotion(drag.id, { duration: snap(Math.max(0.05, drag.origDur + dx)) }, true);
        } else if (drag.mode === "pm-trim-start") {
          var ns = snap(Math.max(0, drag.origStart + dx));
          var nd = snap(Math.max(0.05, drag.origDur - (ns - drag.origStart)));
          Graph.updatePathMotion(drag.id, { start: ns, duration: nd }, true);
        }
        var livePm = Graph.motionById(drag.id);
        var pb = document.querySelector('[data-path-motion="' + drag.id + '"]');
        if (livePm && pb) {
          pb.style.left = livePm.start * PPS + "px";
          pb.style.width = Math.max(livePm.duration * PPS, 16) + "px";
        }
        return;
      }
      var dy = e.clientY - drag.startY;
      var clip = Graph.clipById(drag.id);
      if (!clip) return;
      if (drag.mode === "move") {
        var start = snap(Math.max(0, drag.origStart + dx));
        var list = tracks();
        var next = drag.origIndex + Math.round(dy / TRACK_H);
        next = Math.max(0, Math.min(list.length - 1, next));
        Graph.updateClip(drag.id, { start: start, target: list[next].id }, true);
      } else if (drag.mode === "trim-end") {
        Graph.updateClip(drag.id, { duration: snap(Math.max(0.05, drag.origDur + dx)) }, true);
      } else if (drag.mode === "trim-start") {
        var ns2 = snap(Math.max(0, drag.origStart + dx));
        var nd2 = snap(Math.max(0.05, drag.origDur - (ns2 - drag.origStart)));
        Graph.updateClip(drag.id, { start: ns2, duration: nd2 }, true);
      }
      var live = Graph.clipById(drag.id);
      var block = document.querySelector('.tl-clip[data-clip="' + drag.id + '"]');
      if (live && block) {
        block.style.left = live.start * PPS + "px";
        block.style.width = Math.max(live.duration * PPS, 16) + "px";
        var lane = document.querySelector('.tl-lane[data-el="' + live.target + '"]');
        if (lane && block.parentNode !== lane) lane.appendChild(block);
      }
    });

    window.addEventListener("pointerup", function () {
      if (!drag) return;
      var wasClip = drag.mode !== "scrub";
      drag = null;
      if (wasClip) Graph.flush();
    });
  }

  global.TimelineView = {
    PPS: PPS,
    render: render,
    bind: bind,
    setPlayhead: setPlayhead,
    syncScroll: syncScroll
  };
})(window);
