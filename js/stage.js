(function (global) {
  "use strict";

  var stageEl = null;
  var dragMove = null;
  var editing = false;

  function qs(id) {
    return document.getElementById(id);
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function buildNode(el) {
    var node;
    var c = el.content || {};

    if (el.type === "heading") {
      node = document.createElement("p");
      node.className = "stage-el is-heading";
      if (el.split) {
        var kids = Graph.get().elements.filter(function (e) { return e.parent === el.id; });
        var i;
        for (i = 0; i < kids.length; i++) {
          var span = document.createElement("span");
          span.className = "char";
          span.setAttribute("data-gsap-id", kids[i].id);
          span.textContent = kids[i].content.text;
          node.appendChild(span);
        }
      } else {
        node.textContent = c.text || "";
      }
    } else if (el.type === "text") {
      node = document.createElement("p");
      node.className = "stage-el is-text";
      node.textContent = c.text || "";
    } else if (el.type === "card") {
      node = document.createElement("article");
      node.className = "stage-el is-card card";
      var h = document.createElement("h2");
      h.setAttribute("data-edit", "title");
      h.textContent = c.title || "";
      var p = document.createElement("p");
      p.setAttribute("data-edit", "body");
      p.textContent = c.body || "";
      node.appendChild(h);
      node.appendChild(p);
    } else if (el.type === "button") {
      node = document.createElement("button");
      node.className = "stage-el is-button";
      node.type = "button";
      node.textContent = c.text || "";
    } else if (el.type === "box") {
      node = document.createElement("div");
      node.className = "stage-el is-box";
    } else {
      node = document.createElement("div");
      node.className = "stage-el";
      node.textContent = c.text || el.label || "";
    }

    node.setAttribute("data-gsap-id", el.id);
    node.style.left = (el.x || 0) + "px";
    node.style.top = (el.y || 0) + "px";
    if (el.w) node.style.width = el.w + "px";
    return node;
  }

  function render(state) {
    if (!stageEl) stageEl = qs("stage");
    if (!stageEl) return;
    if (editing) return;

    var selected = state.selectedElementId;
    var roots = state.elements.filter(function (el) { return !el.parent; });
    stageEl.innerHTML = "";

    if (!roots.length) {
      var empty = document.createElement("div");
      empty.className = "stage-empty";
      empty.textContent = I18n.t("stageEmpty");
      stageEl.appendChild(empty);
      return;
    }

    var i;
    for (i = 0; i < roots.length; i++) {
      var node = buildNode(roots[i]);
      if (selected === roots[i].id || (selected && String(selected).indexOf(roots[i].id + "-ch-") === 0)) {
        node.classList.add("is-selected");
      }
      stageEl.appendChild(node);
    }
  }

  function markSelected(id) {
    if (!stageEl) return;
    var nodes = stageEl.querySelectorAll("[data-gsap-id]");
    var i;
    for (i = 0; i < nodes.length; i++) {
      var nid = nodes[i].getAttribute("data-gsap-id");
      var on = nid === id;
      if (!on && id && nodes[i].querySelector("[data-gsap-id='" + id + "']")) on = true;
      nodes[i].classList.toggle("is-selected", on);
    }
  }

  function dropAt(e, type) {
    var rect = stageEl.getBoundingClientRect();
    var x = e.clientX - rect.left - 40;
    var y = e.clientY - rect.top - 20;
    x = Math.max(8, x);
    y = Math.max(8, y);
    Graph.addFromTemplate(type, x, y);
  }

  function beginEdit(target) {
    var root = target.closest(".stage-el");
    if (!root) return;
    var id = root.getAttribute("data-gsap-id");
    var el = Graph.elementById(id);
    if (!el || el.type === "box") return;

    editing = true;
    Graph.select(id);

    var field = target.getAttribute("data-edit");
    var editTarget = target;

    if (el.type === "heading" && el.split) {
      root.innerHTML = "";
      root.textContent = (el.content && el.content.text) || "";
      editTarget = root;
      field = "text";
    } else if (el.type === "card") {
      if (!field) {
        editTarget = root.querySelector("[data-edit='title']") || root;
        field = editTarget.getAttribute("data-edit") || "title";
      }
    } else {
      field = "text";
      editTarget = root;
    }

    editTarget.contentEditable = "true";
    editTarget.focus();
    try {
      var range = document.createRange();
      range.selectNodeContents(editTarget);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (err) {}

    function commit() {
      editTarget.contentEditable = "false";
      editTarget.removeEventListener("blur", commit);
      editTarget.removeEventListener("keydown", onKey);
      var text = editTarget.textContent || "";
      var patch = {};
      if (el.type === "card") {
        patch[field === "body" ? "body" : "title"] = text;
      } else {
        patch.text = text;
      }
      editing = false;
      Graph.updateElement(id, { content: patch });
      if (Studio && Studio.tl) Compiler.rebuild(Studio.playhead);
    }

    function onKey(ev) {
      if (ev.key === "Enter" && el.type !== "text" && el.type !== "card") {
        ev.preventDefault();
        editTarget.blur();
      }
      if (ev.key === "Escape") {
        editing = false;
        editTarget.contentEditable = "false";
        editTarget.removeEventListener("blur", commit);
        editTarget.removeEventListener("keydown", onKey);
        render(Graph.get());
        if (Studio && Studio.tl) Compiler.rebuild(Studio.playhead);
      }
    }

    editTarget.addEventListener("blur", commit);
    editTarget.addEventListener("keydown", onKey);
  }

  function bind() {
    stageEl = qs("stage");
    if (!stageEl) return;

    stageEl.addEventListener("dragover", function (e) {
      if (!e.dataTransfer) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      stageEl.classList.add("is-drop");
    });
    stageEl.addEventListener("dragleave", function () {
      stageEl.classList.remove("is-drop");
    });
    stageEl.addEventListener("drop", function (e) {
      e.preventDefault();
      stageEl.classList.remove("is-drop");
      var type = e.dataTransfer.getData("application/x-gsap-tpl") || e.dataTransfer.getData("text/plain");
      if (!type) return;
      dropAt(e, type);
      if (Studio && Studio.tl) Compiler.rebuild(Studio.playhead);
    });

    stageEl.addEventListener("click", function (e) {
      if (editing) return;
      var t = e.target.closest("[data-gsap-id]");
      if (!t || !stageEl.contains(t)) {
        Graph.select(null);
        return;
      }
      var id = t.getAttribute("data-gsap-id");
      var el = Graph.elementById(id);
      if (el && el.parent) id = el.parent;
      Graph.select(id);
    });

    stageEl.addEventListener("dblclick", function (e) {
      var t = e.target.closest(".stage-el, [data-edit]");
      if (!t) return;
      e.preventDefault();
      beginEdit(t);
    });

    stageEl.addEventListener("pointerdown", function (e) {
      if (editing) return;
      if (e.button != null && e.button !== 0) return;
      var root = e.target.closest(".stage-el");
      if (!root || e.target.closest("[contenteditable='true']")) return;
      var id = root.getAttribute("data-gsap-id");
      var el = Graph.elementById(id);
      if (!el || el.parent) return;
      Graph.select(id);
      /* bound elements always scrub along path (stage or path mode) */
      if (el.pathId) {
        Graph.setEditMode("path");
        dragMove = {
          id: id,
          mode: "path-scrub",
          pathId: el.pathId,
          pointerId: e.pointerId,
          moved: false
        };
        root.setPointerCapture(e.pointerId);
        e.preventDefault();
        return;
      }
      if (global.History) History.record();
      dragMove = {
        id: id,
        mode: "free",
        startX: e.clientX,
        startY: e.clientY,
        origX: el.x || 0,
        origY: el.y || 0,
        moved: false
      };
      root.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    window.addEventListener("pointermove", function (e) {
      if (!dragMove) return;
      if (dragMove.mode === "path-scrub") {
        var path = Graph.pathById(dragMove.pathId);
        if (!path || !global.PathGeom) return;
        var stage = qs("stage");
        var rect = stage.getBoundingClientRect();
        var x = e.clientX - rect.left + stage.scrollLeft;
        var y = e.clientY - rect.top + stage.scrollTop;
        var p = PathGeom.closestProgress(path, x, y);
        Graph.setScrubProgress(p, true);
        dragMove.moved = true;
        if (global.PathEditor) PathEditor.render(Graph.get());
        return;
      }
      var dx = e.clientX - dragMove.startX;
      var dy = e.clientY - dragMove.startY;
      if (Math.abs(dx) + Math.abs(dy) > 3) dragMove.moved = true;
      var nx = Math.max(0, dragMove.origX + dx);
      var ny = Math.max(0, dragMove.origY + dy);
      Graph.updateElement(dragMove.id, { x: nx, y: ny }, true);
      var node = stageEl.querySelector("[data-gsap-id='" + dragMove.id + "']");
      if (node) {
        node.style.left = nx + "px";
        node.style.top = ny + "px";
      }
    });

    window.addEventListener("pointerup", function () {
      if (!dragMove) return;
      var id = dragMove.id;
      var moved = dragMove.moved;
      var mode = dragMove.mode;
      dragMove = null;
      if (mode === "path-scrub") {
        Graph.emit("scrub");
        return;
      }
      if (moved) {
        Graph.flush();
        trySnapBind(id);
      } else {
        Graph.select(id);
      }
    });
  }

  function trySnapBind(elId) {
    var el = Graph.elementById(elId);
    if (!el || el.parent || el.pathId || !global.PathGeom) return;
    var paths = Graph.get().paths || [];
    if (!paths.length) return;
    var node = stageEl && stageEl.querySelector("[data-gsap-id='" + elId + "']");
    var w = (node && node.offsetWidth) || el.w || 80;
    var h = (node && node.offsetHeight) || 60;
    var cx = (el.x || 0) + w / 2;
    var cy = (el.y || 0) + h / 2;
    var best = null;
    var bestD = 36;
    var bestP = 0;
    var i;
    for (i = 0; i < paths.length; i++) {
      var path = paths[i];
      var p = PathGeom.closestProgress(path, cx, cy);
      var pt = PathGeom.pointAt(path, p);
      var dx = pt.x - cx;
      var dy = pt.y - cy;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestD) {
        bestD = d;
        best = path;
        bestP = p;
      }
    }
    if (!best) return;
    Graph.bindElementToPath(elId, best.id);
    Graph.setScrubProgress(bestP);
  }

  global.StageView = {
    bind: bind,
    render: render,
    markSelected: markSelected
  };
})(window);
