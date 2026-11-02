(function (global) {
  "use strict";

  function qs(id) { return document.getElementById(id); }

  function renderPalette() {
    var box = qs("palette");
    if (!box) return;
    box.innerHTML = "";
    var list = Graph.TEMPLATES;
    var i;
    for (i = 0; i < list.length; i++) {
      var tpl = list[i];
      var item = document.createElement("button");
      item.type = "button";
      item.className = "tpl-item";
      item.draggable = true;
      item.setAttribute("data-tpl", tpl.type);
      item.textContent = I18n.t(tpl.labelKey);
      box.appendChild(item);
    }
  }

  function renderPresets() {
    var box = qs("presets");
    if (!box) return;
    box.innerHTML = "";
    var keys = Object.keys(Graph.PRESETS);
    var i;
    for (i = 0; i < keys.length; i++) {
      var name = keys[i];
      var preset = Graph.PRESETS[name];
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tpl-item has-tip";
      btn.setAttribute("data-preset", name);
      btn.setAttribute("data-tip", I18n.t(preset.tipKey));
      btn.textContent = I18n.t(preset.labelKey);
      box.appendChild(btn);
    }
    bindTips(box);
  }

  function renderPathPalette() {
    var box = qs("path-palette");
    if (!box) return;
    var kinds = [
      ["line", "pathLine"],
      ["arc", "pathArc"],
      ["semi", "pathSemi"],
      ["wave", "pathWave"]
    ];
    box.innerHTML = "";
    var i;
    for (i = 0; i < kinds.length; i++) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tpl-item";
      btn.setAttribute("data-path-kind", kinds[i][0]);
      btn.textContent = I18n.t(kinds[i][1]);
      box.appendChild(btn);
    }
  }

  function syncModeButtons(state) {
    var stageBtn = qs("btn-mode-stage");
    var pathBtn = qs("btn-mode-path");
    if (stageBtn) stageBtn.classList.toggle("is-on", state.editMode !== "path");
    if (pathBtn) pathBtn.classList.toggle("is-on", state.editMode === "path");
  }

  function renderTree(state) {
    var tree = qs("tree");
    if (!tree) return;
    tree.innerHTML = "";
    var roots = state.elements.filter(function (el) { return !el.parent; });
    var i;
    for (i = 0; i < roots.length; i++) {
      var el = roots[i];
      var item = document.createElement("div");
      item.className = "tree-item" + (state.selectedElementId === el.id ? " is-on" : "");
      item.setAttribute("data-el", el.id);
      var dot = document.createElement("i");
      dot.className = "dot";
      item.appendChild(dot);
      var title = I18n.elementLabel(el);
      if (el.pathId) {
        var bound = Graph.pathById(el.pathId);
        title += " · " + Graph.pathDisplayName(bound);
      }
      item.appendChild(document.createTextNode(title));
      tree.appendChild(item);
    }
    var paths = state.paths || [];
    if (paths.length) {
      var ph = document.createElement("div");
      ph.className = "tree-subh";
      ph.textContent = I18n.t("pathPresets");
      tree.appendChild(ph);
      for (i = 0; i < paths.length; i++) {
        var path = paths[i];
        var pitem = document.createElement("div");
        pitem.className = "tree-item is-path" + (state.selectedPathId === path.id ? " is-on" : "");
        pitem.setAttribute("data-path", path.id);
        var pdot = document.createElement("i");
        pdot.className = "dot is-path";
        pitem.appendChild(pdot);
        pitem.appendChild(document.createTextNode(Graph.pathDisplayName(path)));
        tree.appendChild(pitem);
      }
    }
    if (!roots.length && !paths.length) {
      tree.innerHTML = "<p class=\"hint\">" + I18n.t("treeEmpty") + "</p>";
    }
  }

  function num(v, fallback) {
    var n = parseFloat(v);
    return isNaN(n) ? fallback : n;
  }

  function tip(key) {
    return " data-tip=\"" + String(I18n.t(key)).replace(/"/g, "&quot;") + "\"";
  }

  function tipLabel(text, tipKey) {
    return "<label class=\"has-tip\"" + tip(tipKey) + "><span>" + text + "</span><i class=\"tip-i\" aria-hidden=\"true\">?</i></label>";
  }

  var tipEl = null;
  var tipTimer = 0;

  function ensureTip() {
    if (tipEl) return tipEl;
    tipEl = document.createElement("div");
    tipEl.className = "desk-tip";
    tipEl.setAttribute("role", "tooltip");
    document.body.appendChild(tipEl);
    return tipEl;
  }

  function hideTip() {
    clearTimeout(tipTimer);
    if (!tipEl) return;
    tipEl.classList.remove("is-on");
  }

  function showTip(anchor) {
    var text = anchor.getAttribute("data-tip");
    if (!text) return;
    var el = ensureTip();
    el.textContent = text;
    el.classList.add("is-on");
    var r = anchor.getBoundingClientRect();
    var tw = el.offsetWidth || 220;
    var th = el.offsetHeight || 40;
    var left = Math.min(window.innerWidth - tw - 8, Math.max(8, r.left));
    var top = r.bottom + 8;
    if (top + th > window.innerHeight - 8) top = Math.max(8, r.top - th - 8);
    el.style.left = left + "px";
    el.style.top = top + "px";
  }

  function bindTips(root) {
    if (!root || root._tipsBound) return;
    root._tipsBound = true;
    root.addEventListener("mouseover", function (e) {
      var t = e.target.closest("[data-tip]");
      if (!t || !root.contains(t)) return;
      clearTimeout(tipTimer);
      tipTimer = setTimeout(function () { showTip(t); }, 180);
    });
    root.addEventListener("mouseout", function (e) {
      var t = e.target.closest("[data-tip]");
      if (!t) return;
      var to = e.relatedTarget;
      if (to && t.contains(to)) return;
      hideTip();
    });
    root.addEventListener("scroll", hideTip, true);
  }

  function renderInspector(state) {
    var box = qs("inspector");
    if (!box) return;
    var el = Graph.elementById(state.selectedElementId);
    var clip = Graph.clipById(state.selectedClipId);

    if (!el || el.parent) {
      var onlyPath = Graph.pathById(state.selectedPathId);
      if (onlyPath) {
        var pathHtml = "<div class=\"panel-h\" style=\"margin:0 -12px 10px;padding-left:12px\">" + I18n.t("pathPresets") + "</div>";
        pathHtml += "<div class=\"field\">" + tipLabel(I18n.t("pathName"), "tipPathName") +
          "<input id=\"f-path-label\" type=\"text\" value=\"" + String(Graph.pathDisplayName(onlyPath) || "").replace(/"/g, "&quot;") + "\"></div>";
        pathHtml += "<button type=\"button\" class=\"tool-btn\" id=\"f-del-path\">" + I18n.t("delPath") + "</button>";
        pathHtml += "<p class=\"hint\">" + I18n.t("pathSnapHint") + "</p>";
        box.innerHTML = pathHtml;
        bindTips(box);
        return;
      }
      var empty = "<p class=\"hint\">" + I18n.t("clipEmpty") + "</p>";
      if ((state.paths || []).length) {
        empty += "<p class=\"hint\">" + I18n.t("pathSnapHint") + "</p>";
      }
      box.innerHTML = empty;
      return;
    }

    var c = el.content || {};
    var html = "<div class=\"field\"><label>" + I18n.t("elLabel") + "</label>" +
      "<input id=\"f-label\" type=\"text\" value=\"" + String(el.label || "").replace(/"/g, "&quot;") + "\"></div>";

    if (el.type === "card") {
      html += "<div class=\"field\"><label>" + I18n.t("fieldTitle") + "</label>" +
        "<input id=\"f-title\" type=\"text\" value=\"" + String(c.title || "").replace(/"/g, "&quot;") + "\"></div>";
      html += "<div class=\"field\"><label>" + I18n.t("fieldBody") + "</label>" +
        "<textarea id=\"f-body\" rows=\"3\">" + String(c.body || "").replace(/</g, "&lt;") + "</textarea></div>";
    } else if (el.type !== "box") {
      html += "<div class=\"field\"><label>" + I18n.t("fieldText") + "</label>" +
        "<textarea id=\"f-text\" rows=\"2\">" + String(c.text || "").replace(/</g, "&lt;") + "</textarea></div>";
    }

    if (el.type === "heading") {
      html += "<label class=\"check has-tip\"" + tip("tipSplit") + "><input id=\"f-split\" type=\"checkbox\"" +
        (el.split ? " checked" : "") + "> " + I18n.t("fieldSplit") + "<i class=\"tip-i\" aria-hidden=\"true\">?</i></label>";
    }

    html += "<div class=\"row\" style=\"margin-top:10px\">";
    if (!el.pathId) {
      html += "<button type=\"button\" class=\"tool-btn has-tip\" id=\"f-add-clip\"" + tip("tipAddMotion") + ">" + I18n.t("addMotion") + "</button>";
    }
    html += "<button type=\"button\" class=\"tool-btn has-tip\" id=\"f-del-el\"" + tip("tipDelEl") + ">" + I18n.t("delElement") + "</button>" +
      "</div>";

    /* path binding / keyframes — keep above clip fields so it stays reachable */
    var motion = Graph.motionsForTarget(el.id)[0];
    var paths = state.paths || [];
    html += "<div class=\"panel-h\" style=\"margin:14px -12px 10px;padding-left:12px\">" + I18n.t("pathMotion") + "</div>";
    if (!el.pathId) {
      if (!paths.length) {
        html += "<p class=\"hint\">" + I18n.t("pathNeedCreate") + "</p>";
      } else {
        var selPath = state.selectedPathId || (paths[0] && paths[0].id) || "";
        html += "<div class=\"field\">" + tipLabel(I18n.t("pathPick"), "tipBindPath") +
          "<select id=\"f-bind-path-sel\">" +
          paths.map(function (p) {
            var label = Graph.pathDisplayName(p);
            return "<option value=\"" + p.id + "\"" + (p.id === selPath ? " selected" : "") + ">" + label + "</option>";
          }).join("") +
          "</select></div>";
        html += "<button type=\"button\" class=\"tool-btn primary has-tip\" id=\"f-bind-path\"" + tip("tipBindPath") + ">" + I18n.t("bindPath") + "</button>";
        html += "<p class=\"hint\">" + I18n.t("pathSnapHint") + "</p>";
      }
    } else {
      var boundPath = Graph.pathById(el.pathId);
      html += "<div class=\"field\">" + tipLabel(I18n.t("pathName"), "tipPathName") +
        "<input id=\"f-path-label\" type=\"text\" value=\"" + String(Graph.pathDisplayName(boundPath) || "").replace(/"/g, "&quot;") + "\"></div>";
      if (paths.length > 1) {
        html += "<div class=\"field\">" + tipLabel(I18n.t("pathSwitch"), "tipBindPath") +
          "<select id=\"f-switch-path\">" +
          paths.map(function (p) {
            return "<option value=\"" + p.id + "\"" + (p.id === el.pathId ? " selected" : "") + ">" + Graph.pathDisplayName(p) + "</option>";
          }).join("") +
          "</select></div>";
      }
      html += "<div class=\"row\" style=\"margin-top:6px\">" +
        "<button type=\"button\" class=\"tool-btn\" id=\"f-unbind-path\">" + I18n.t("unbindPath") + "</button>" +
        "<button type=\"button\" class=\"tool-btn\" id=\"f-del-path\">" + I18n.t("delPath") + "</button>" +
        "</div>";
      html += "<div class=\"field\" style=\"margin-top:10px\">" + tipLabel(I18n.t("scrub"), "tipScrub") +
        "<input id=\"f-scrub\" type=\"range\" min=\"0\" max=\"1\" step=\"0.01\" value=\"" + (state.scrubProgress || 0) + "\"></div>";
      if (motion) {
        html += "<label class=\"check has-tip\"" + tip("tipAutoRotate") + "><input id=\"f-autorot\" type=\"checkbox\"" +
          (motion.autoRotate ? " checked" : "") + "> " + I18n.t("autoRotate") + "</label>";
        html += "<div class=\"row\" style=\"margin-top:8px\">" +
          "<button type=\"button\" class=\"tool-btn has-tip\" id=\"f-add-key\"" + tip("tipAddKey") + ">" + I18n.t("addKey") + "</button>" +
          "<button type=\"button\" class=\"tool-btn\" id=\"f-del-key\">" + I18n.t("delKey") + "</button></div>";
        var key = Graph.keyById(motion, state.selectedKeyId) || motion.keys[0];
        if (key) {
          html += "<div class=\"field\"><label>" + I18n.t("keyP") + "</label><input id=\"f-key-p\" type=\"number\" min=\"0\" max=\"1\" step=\"0.01\" value=\"" + key.p + "\"></div>";
          html += "<div class=\"row-3\">" +
            "<div class=\"field\"><label>" + I18n.t("propRot") + "</label><input id=\"f-key-rot\" type=\"number\" step=\"1\" value=\"" + (key.rotation != null ? key.rotation : 0) + "\"></div>" +
            "<div class=\"field\"><label>" + I18n.t("propScale") + "</label><input id=\"f-key-scale\" type=\"number\" step=\"0.05\" value=\"" + (key.scale != null ? key.scale : 1) + "\"></div>" +
            "<div class=\"field\"><label>" + I18n.t("propOpacity") + "</label><input id=\"f-key-op\" type=\"number\" step=\"0.05\" min=\"0\" max=\"1\" value=\"" + (key.opacity != null ? key.opacity : 1) + "\"></div>" +
            "</div>";
          html += "<div class=\"row\">" +
            "<div class=\"field\"><label>" + I18n.t("propStart") + "</label><input id=\"f-pm-start\" type=\"number\" step=\"0.05\" value=\"" + motion.start + "\"></div>" +
            "<div class=\"field\"><label>" + I18n.t("propDuration") + "</label><input id=\"f-pm-dur\" type=\"number\" step=\"0.05\" value=\"" + motion.duration + "\"></div>" +
            "</div>";
        }
      }
    }

    if (!clip && !motion) {
      html += "<p class=\"hint\" style=\"margin-top:12px\">" + I18n.t("noMotionHint") + "</p>";
      box.innerHTML = html;
      bindTips(box);
      return;
    }

    if (!clip) {
      box.innerHTML = html;
      bindTips(box);
      return;
    }

    var vars = clip.vars || {};
    var warn = Graph.overlapWarning(clip) ? I18n.t("overlap") : "";
    var easeOpts = Graph.EASES.map(function (e) {
      return "<option value=\"" + e + "\"" + (clip.ease === e ? " selected" : "") + ">" + e + "</option>";
    }).join("");

    html += "<div class=\"panel-h\" style=\"margin:14px -12px 10px;padding-left:12px\">" + I18n.t("clip") + "</div>";
    html +=
      "<div class=\"feel\">" +
        "<button type=\"button\" class=\"has-tip\" data-feel=\"snap\"" + tip("tipFeelSnap") + ">" + I18n.t("feelSnap") + "</button>" +
        "<button type=\"button\" class=\"has-tip\" data-feel=\"soft\"" + tip("tipFeelSoft") + ">" + I18n.t("feelSoft") + "</button>" +
        "<button type=\"button\" class=\"has-tip\" data-feel=\"heavy\"" + tip("tipFeelHeavy") + ">" + I18n.t("feelHeavy") + "</button>" +
        "<button type=\"button\" class=\"has-tip\" data-feel=\"spring\"" + tip("tipFeelSpring") + ">" + I18n.t("feelSpring") + "</button>" +
      "</div>" +
      "<div class=\"row\">" +
        "<div class=\"field\">" + tipLabel(I18n.t("method"), "tipMethod") + "<select id=\"f-method\">" +
          ["from", "to", "fromTo", "set"].map(function (m) {
            return "<option" + (clip.method === m ? " selected" : "") + ">" + m + "</option>";
          }).join("") +
        "</select></div>" +
        "<div class=\"field\">" + tipLabel("ease", "tipEase") + "<select id=\"f-ease\">" + easeOpts + "</select></div>" +
      "</div>" +
      "<div class=\"row\">" +
        "<div class=\"field\">" + tipLabel("start <span>" + clip.start.toFixed(2) + "s</span>", "tipStart") +
          "<input id=\"f-start\" type=\"number\" step=\"0.05\" value=\"" + clip.start + "\"></div>" +
        "<div class=\"field\">" + tipLabel("duration <span>" + clip.duration.toFixed(2) + "s</span>", "tipDuration") +
          "<input id=\"f-dur\" type=\"number\" step=\"0.05\" value=\"" + clip.duration + "\"></div>" +
      "</div>" +
      "<div class=\"row\">" +
        "<div class=\"field\">" + tipLabel("x", "tipX") +
          "<input id=\"f-x\" type=\"number\" step=\"1\" value=\"" + (vars.x != null ? vars.x : "") + "\" placeholder=\"—\"></div>" +
        "<div class=\"field\">" + tipLabel("y", "tipY") +
          "<input id=\"f-y\" type=\"number\" step=\"1\" value=\"" + (vars.y != null ? vars.y : "") + "\" placeholder=\"—\"></div>" +
      "</div>" +
      "<div class=\"row-3\">" +
        "<div class=\"field\">" + tipLabel("rotation", "tipRot") +
          "<input id=\"f-rot\" type=\"number\" step=\"1\" value=\"" + (vars.rotation != null ? vars.rotation : "") + "\" placeholder=\"—\"></div>" +
        "<div class=\"field\">" + tipLabel("scale", "tipScale") +
          "<input id=\"f-scale\" type=\"number\" step=\"0.05\" value=\"" + (vars.scale != null ? vars.scale : "") + "\" placeholder=\"—\"></div>" +
        "<div class=\"field\">" + tipLabel("opacity", "tipOpacity") +
          "<input id=\"f-op\" type=\"number\" step=\"0.05\" min=\"0\" max=\"1\" value=\"" + (vars.opacity != null ? vars.opacity : "") + "\" placeholder=\"—\"></div>" +
      "</div>" +
      "<div class=\"row-3\">" +
        "<div class=\"field\">" + tipLabel("skewX", "tipSkewX") +
          "<input id=\"f-skewx\" type=\"number\" step=\"1\" value=\"" + (vars.skewX != null ? vars.skewX : "") + "\" placeholder=\"—\"></div>" +
        "<div class=\"field\">" + tipLabel("skewY", "tipSkewY") +
          "<input id=\"f-skewy\" type=\"number\" step=\"1\" value=\"" + (vars.skewY != null ? vars.skewY : "") + "\" placeholder=\"—\"></div>" +
        "<div class=\"field\">" + tipLabel("blur", "tipBlur") +
          "<input id=\"f-blur\" type=\"number\" step=\"1\" min=\"0\" value=\"" + (vars.blur != null ? vars.blur : "") + "\" placeholder=\"—\"></div>" +
      "</div>" +
      "<div class=\"row\">" +
        "<div class=\"field\">" + tipLabel("color", "tipColor") +
          "<div class=\"color-row\"><input id=\"f-color\" type=\"color\" value=\"" + (vars.color || "#e8e6df") + "\"><input id=\"f-color-t\" type=\"text\" value=\"" + (vars.color != null ? vars.color : "") + "\" placeholder=\"—\"></div></div>" +
        "<div class=\"field\">" + tipLabel("bg", "tipBg") +
          "<div class=\"color-row\"><input id=\"f-bg\" type=\"color\" value=\"" + (vars.backgroundColor || "#222632") + "\"><input id=\"f-bg-t\" type=\"text\" value=\"" + (vars.backgroundColor != null ? vars.backgroundColor : "") + "\" placeholder=\"—\"></div></div>" +
      "</div>" +
      "<div class=\"field\">" + tipLabel(I18n.t("legacyPath"), "tipLegacyPath") +
        "<select id=\"f-path\">" +
          [["", "—"], ["arc", "arc"], ["wave", "wave"], ["orbit", "orbit"]].map(function (p) {
            return "<option value=\"" + p[0] + "\"" + ((vars.path || "") === p[0] ? " selected" : "") + ">" + p[1] + "</option>";
          }).join("") +
        "</select></div>" +
      "<div class=\"field\">" + tipLabel(I18n.t("stagger"), "tipStagger") +
        "<input id=\"f-stagger\" type=\"number\" step=\"0.01\" value=\"" + (clip.stagger != null ? clip.stagger : "") + "\" placeholder=\"" + I18n.t("staggerPh") + "\"></div>" +
      "<p class=\"warn\">" + (warn || "") + "</p>" +
      "<button type=\"button\" class=\"tool-btn has-tip\" id=\"f-del-clip\"" + tip("tipDelClip") + ">" + I18n.t("delClip") + "</button>";

    box.innerHTML = html;
    bindTips(box);
  }

  function readContent() {
    var el = Graph.elementById(Graph.get().selectedElementId);
    if (!el || el.parent) return;
    var patch = {};
    var label = qs("f-label");
    if (label) patch.label = label.value;
    var split = qs("f-split");
    if (split) patch.split = !!split.checked;
    var content = {};
    var title = qs("f-title");
    var body = qs("f-body");
    var text = qs("f-text");
    if (title) content.title = title.value;
    if (body) content.body = body.value;
    if (text) content.text = text.value;
    if (title || body || text) patch.content = content;
    Graph.updateElement(el.id, patch);
  }

  function readPathKeyInspector() {
    var state = Graph.get();
    var motion = Graph.motionById(state.selectedMotionId) || Graph.motionsForTarget(state.selectedElementId)[0];
    if (!motion) return;
    if (qs("f-pm-start") || qs("f-pm-dur")) {
      Graph.updatePathMotion(motion.id, {
        start: qs("f-pm-start") ? num(qs("f-pm-start").value, motion.start) : motion.start,
        duration: qs("f-pm-dur") ? num(qs("f-pm-dur").value, motion.duration) : motion.duration
      }, true);
    }
    var key = Graph.keyById(motion, state.selectedKeyId) || motion.keys[0];
    if (!key) return;
    var patch = {};
    if (qs("f-key-p")) patch.p = num(qs("f-key-p").value, key.p);
    if (qs("f-key-rot")) patch.rotation = num(qs("f-key-rot").value, 0);
    if (qs("f-key-scale")) patch.scale = num(qs("f-key-scale").value, 1);
    if (qs("f-key-op")) patch.opacity = num(qs("f-key-op").value, 1);
    Graph.updatePathKey(motion.id, key.id, patch, true);
    clearTimeout(readPathKeyInspector._t);
    readPathKeyInspector._t = setTimeout(function () { Graph.flush(); }, 200);
    if (global.PathEditor) PathEditor.render(Graph.get());
  }

  function readInspector() {
    readContent();
    var clip = Graph.clipById(Graph.get().selectedClipId);
    if (!clip) return;
    if (!qs("f-method")) return;
    var vars = {};
    var x = qs("f-x");
    var y = qs("f-y");
    var rot = qs("f-rot");
    var sc = qs("f-scale");
    var op = qs("f-op");
    var skewx = qs("f-skewx");
    var skewy = qs("f-skewy");
    var blur = qs("f-blur");
    var colorT = qs("f-color-t");
    var bgT = qs("f-bg-t");
    var path = qs("f-path");
    if (x && x.value !== "") vars.x = num(x.value, 0);
    if (y && y.value !== "") vars.y = num(y.value, 0);
    if (rot && rot.value !== "") vars.rotation = num(rot.value, 0);
    if (sc && sc.value !== "") vars.scale = num(sc.value, 1);
    if (op && op.value !== "") vars.opacity = num(op.value, 1);
    if (skewx && skewx.value !== "") vars.skewX = num(skewx.value, 0);
    if (skewy && skewy.value !== "") vars.skewY = num(skewy.value, 0);
    if (blur && blur.value !== "") vars.blur = num(blur.value, 0);
    if (colorT && colorT.value !== "") vars.color = colorT.value;
    if (bgT && bgT.value !== "") vars.backgroundColor = bgT.value;
    if (path && path.value) vars.path = path.value;
    var staggerEl = qs("f-stagger");
    var stagger = staggerEl && staggerEl.value !== "" ? num(staggerEl.value, 0) : null;
    Graph.updateClip(clip.id, {
      method: qs("f-method").value,
      ease: qs("f-ease").value,
      start: num(qs("f-start").value, clip.start),
      duration: num(qs("f-dur").value, clip.duration),
      stagger: stagger,
      vars: vars
    });
  }

  var codeDirty = false;

  function renderCode(state) {
    var pre = qs("code-sel");
    if (!pre) return;
    if (codeDirty && document.activeElement === pre) return;
    if (!state.selectedElementId) {
      pre.value = I18n.t("pickEl");
      pre.readOnly = true;
      return;
    }
    pre.readOnly = false;
    pre.value = Compiler.exportSelected(state.selectedElementId);
    codeDirty = false;
  }

  function applyCodeEditor() {
    var pre = qs("code-sel");
    var id = Graph.get().selectedElementId;
    var status = qs("code-status");
    if (!pre || !id) return;
    var clips = Compiler.parseSelectedCode(pre.value, id);
    if (!clips.length) {
      if (status) status.textContent = I18n.t("codeApplyFail");
      return;
    }
    Graph.replaceClipsForTarget(id, clips);
    codeDirty = false;
    if (status) {
      status.textContent = I18n.t("codeApplyOk");
      setTimeout(function () { if (status) status.textContent = ""; }, 1200);
    }
  }

  function syncHistoryButtons() {
    var u = qs("btn-undo");
    var r = qs("btn-redo");
    if (u) u.disabled = !(History && History.canUndo());
    if (r) r.disabled = !(History && History.canRedo());
  }

  function downloadJson(obj, filename) {
    var blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 500);
  }

  function bind() {
    I18n.applyDom();
    renderPalette();
    renderPresets();
    renderPathPalette();
    bindTips(qs("inspector"));
    syncHistoryButtons();

    qs("btn-mode-stage").addEventListener("click", function () { Graph.setEditMode("stage"); });
    qs("btn-mode-path").addEventListener("click", function () { Graph.setEditMode("path"); });

    qs("btn-lang").addEventListener("click", function () {
      if (global.Fx) Fx.toggleLang();
      else I18n.toggleLang();
    });
    qs("btn-theme").addEventListener("click", function () {
      if (global.Fx) Fx.toggleTheme();
      else I18n.toggleTheme();
    });
    qs("btn-undo").addEventListener("click", function () {
      if (History.undo() && Studio) Compiler.rebuild(Studio.playhead);
      syncHistoryButtons();
    });
    qs("btn-redo").addEventListener("click", function () {
      if (History.redo() && Studio) Compiler.rebuild(Studio.playhead);
      syncHistoryButtons();
    });

    var palette = qs("palette");
    palette.addEventListener("dragstart", function (e) {
      var item = e.target.closest("[data-tpl]");
      if (!item) return;
      e.dataTransfer.setData("application/x-gsap-tpl", item.getAttribute("data-tpl"));
      e.dataTransfer.setData("text/plain", item.getAttribute("data-tpl"));
      e.dataTransfer.effectAllowed = "copy";
    });
    palette.addEventListener("click", function (e) {
      var item = e.target.closest("[data-tpl]");
      if (!item) return;
      var stage = qs("stage");
      var rect = stage.getBoundingClientRect();
      Graph.addFromTemplate(item.getAttribute("data-tpl"), rect.width * 0.2, rect.height * 0.25);
    });

    qs("presets").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-preset]");
      if (!btn) return;
      Graph.applyPreset(btn.getAttribute("data-preset"));
    });

    qs("path-palette").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-path-kind]");
      if (!btn) return;
      var stage = qs("stage");
      var rect = stage.getBoundingClientRect();
      Graph.addPath(btn.getAttribute("data-path-kind"), rect.width * 0.45, rect.height * 0.45);
      Graph.setEditMode("path");
    });

    qs("tree").addEventListener("click", function (e) {
      var item = e.target.closest(".tree-item");
      if (!item) return;
      var pathId = item.getAttribute("data-path");
      if (pathId) {
        /* select path alone so inspector can rename/delete without forcing an element */
        var keepEl = null;
        var els = Graph.get().elements;
        var ei;
        for (ei = 0; ei < els.length; ei++) {
          if (els[ei].pathId === pathId) { keepEl = els[ei].id; break; }
        }
        Graph.select(keepEl, null, { pathId: pathId, keepMotion: true });
        Graph.setEditMode("path");
        return;
      }
      Graph.select(item.getAttribute("data-el"));
    });

    qs("inspector").addEventListener("click", function (e) {
      var b = e.target.closest("[data-feel]");
      if (b) Graph.applyFeel(b.getAttribute("data-feel"));
      if (e.target.closest("#f-add-clip")) {
        var addEl = Graph.elementById(Graph.get().selectedElementId);
        if (addEl && addEl.pathId) {
          var addM = Graph.motionsForTarget(addEl.id)[0];
          if (addM) Graph.addPathKey(addM.id, Graph.get().scrubProgress || 0, PathEditor.sampleKeys(addM, Graph.get().scrubProgress || 0));
        } else {
          Graph.addClip(Graph.get().selectedElementId, Studio.playhead);
        }
      }
      if (e.target.closest("#f-del-el")) {
        if (Graph.get().selectedElementId) Graph.removeElement(Graph.get().selectedElementId);
      }
      if (e.target.closest("#f-del-clip")) {
        if (Graph.get().selectedClipId) Graph.removeClip(Graph.get().selectedClipId);
      }
      if (e.target.closest("#f-bind-path")) {
        var pick = qs("f-bind-path-sel");
        var sid = (pick && pick.value) || Graph.get().selectedPathId || (Graph.get().paths[0] && Graph.get().paths[0].id);
        if (sid && Graph.get().selectedElementId) Graph.bindElementToPath(Graph.get().selectedElementId, sid);
      }
      if (e.target.closest("#f-unbind-path")) {
        if (Graph.get().selectedElementId) Graph.unbindElementPath(Graph.get().selectedElementId);
      }
      if (e.target.closest("#f-del-path")) {
        var delPid = Graph.get().selectedPathId ||
          ((Graph.elementById(Graph.get().selectedElementId) || {}).pathId);
        if (delPid) Graph.removePath(delPid);
      }
      if (e.target.closest("#f-add-key")) {
        var m = Graph.motionById(Graph.get().selectedMotionId) || Graph.motionsForTarget(Graph.get().selectedElementId)[0];
        if (m) Graph.addPathKey(m.id, Graph.get().scrubProgress || 0, PathEditor.sampleKeys(m, Graph.get().scrubProgress || 0));
      }
      if (e.target.closest("#f-del-key")) {
        var m2 = Graph.motionById(Graph.get().selectedMotionId);
        if (m2 && Graph.get().selectedKeyId) Graph.removePathKey(m2.id, Graph.get().selectedKeyId);
      }
    });
    qs("inspector").addEventListener("change", function (e) {
      if (!e.target) return;
      if (e.target.id === "f-bind-path-sel") {
        Graph.get().selectedPathId = e.target.value;
        if (global.PathEditor) PathEditor.render(Graph.get());
        return;
      }
      if (e.target.id === "f-switch-path") {
        var swEl = Graph.get().selectedElementId;
        var swPid = e.target.value;
        if (swEl && swPid) Graph.bindElementToPath(swEl, swPid);
        return;
      }
      if (e.target.id === "f-color") {
        var ct = qs("f-color-t");
        if (ct) ct.value = e.target.value;
      }
      if (e.target.id === "f-bg") {
        var bt = qs("f-bg-t");
        if (bt) bt.value = e.target.value;
      }
      if (e.target.id === "f-autorot") {
        var mid = Graph.get().selectedMotionId;
        if (mid) Graph.updatePathMotion(mid, { autoRotate: !!e.target.checked });
        return;
      }
      if (/^f-key-/.test(e.target.id) || e.target.id === "f-pm-start" || e.target.id === "f-pm-dur") {
        readPathKeyInspector();
        return;
      }
      if (e.target.id === "f-path-label") {
        var pid = Graph.get().selectedPathId || (Graph.elementById(Graph.get().selectedElementId) || {}).pathId;
        if (pid) Graph.updatePath(pid, { label: e.target.value });
        return;
      }
      if (/^f-(split|label|title|body|text)$/.test(e.target.id)) {
        readContent();
        if (Studio && Studio.tl) Compiler.rebuild(Studio.playhead);
        return;
      }
      readInspector();
    });
    qs("inspector").addEventListener("input", function (e) {
      if (!e.target) return;
      if (e.target.id === "f-scrub") {
        Graph.setScrubProgress(num(e.target.value, 0));
        return;
      }
      if (e.target.id === "f-path-label") {
        var pid2 = Graph.get().selectedPathId || (Graph.elementById(Graph.get().selectedElementId) || {}).pathId;
        if (pid2) Graph.updatePath(pid2, { label: e.target.value }, true);
        clearTimeout(e.target._t);
        e.target._t = setTimeout(function () { Graph.flush(); }, 200);
        renderTree(Graph.get());
        return;
      }
      if (/^f-(label|title|body|text|split)$/.test(e.target.id)) {
        readContent();
        return;
      }
      if (e.target.id === "f-color-t" && qs("f-color") && /^#/.test(e.target.value)) {
        qs("f-color").value = e.target.value;
      }
      if (e.target.id === "f-bg-t" && qs("f-bg") && /^#/.test(e.target.value)) {
        qs("f-bg").value = e.target.value;
      }
      if (/^f-key-/.test(e.target.id) || e.target.id === "f-pm-start" || e.target.id === "f-pm-dur") {
        readPathKeyInspector();
        return;
      }
      if (e.target.tagName === "SELECT") return;
      readInspector();
    });

    qs("code-sel").addEventListener("input", function () { codeDirty = true; });
    qs("btn-apply-code").addEventListener("click", applyCodeEditor);

    qs("btn-copy").addEventListener("click", function () {
      var text = Compiler.exportAll();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          qs("btn-copy").textContent = I18n.t("copied");
          setTimeout(function () { qs("btn-copy").textContent = I18n.t("copyAll"); }, 1200);
        });
      } else {
        window.prompt(I18n.t("copyPrompt"), text);
      }
    });

    qs("btn-export").addEventListener("click", function () {
      downloadJson(Graph.exportProject(), "gsap-desk-project.json");
    });

    qs("btn-import").addEventListener("click", function () {
      qs("file-import").click();
    });
    qs("file-import").addEventListener("change", function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          Graph.importProject(JSON.parse(String(reader.result)));
          if (Studio && Studio.tl) Compiler.rebuild(0);
          Studio.playhead = 0;
        } catch (err) {
          alert(I18n.t("importFail"));
        }
        e.target.value = "";
      };
      reader.readAsText(file);
    });

    qs("btn-play").addEventListener("click", function () { Studio.play(); });
    qs("btn-pause").addEventListener("click", function () { Studio.pause(); });
    qs("btn-loop").addEventListener("click", function () { Studio.toggleLoop(); });

    window.addEventListener("keydown", function (e) {
      var mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) {
        if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) && e.target.id === "code-sel") return;
        if (e.target && e.target.isContentEditable) return;
        e.preventDefault();
        if (History.undo() && Studio) Compiler.rebuild(Studio.playhead);
        syncHistoryButtons();
        return;
      }
      if (mod && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
        if (e.target && e.target.id === "code-sel") return;
        e.preventDefault();
        if (History.redo() && Studio) Compiler.rebuild(Studio.playhead);
        syncHistoryButtons();
        return;
      }
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.target && e.target.isContentEditable) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        if (Graph.get().selectedElementId) {
          e.preventDefault();
          Graph.removeElement(Graph.get().selectedElementId);
        }
      }
      if (e.key === " ") {
        e.preventDefault();
        if (Studio.playing) Studio.pause();
        else Studio.play();
      }
    });
  }

  function render(state, kind) {
    if (kind === "stage" || !kind) {
      renderPalette();
      renderPresets();
      renderPathPalette();
    }
    renderTree(state);
    syncModeButtons(state);
    /* 只有舞台内容变了才重建 DOM；选中/改 clip 只改高亮，避免 GSAP 绑到已卸掉的节点 */
    if (kind === "stage" || !kind) {
      StageView.render(state);
    } else {
      StageView.markSelected(state.selectedElementId);
    }
    if (global.PathEditor) PathEditor.render(state);
    var insp = qs("inspector");
    var typing = insp && insp.contains(document.activeElement);
    if (!typing && kind !== "scrub" && kind !== "drag") renderInspector(state);
    if (kind !== "scrub") renderCode(state);
    if (kind !== "drag" && kind !== "scrub") TimelineView.render(state);
    qs("btn-loop").classList.toggle("is-on", !!Studio.loop);
    syncHistoryButtons();
  }

  global.UI = {
    bind: bind,
    render: render,
    onLocale: function () {
      I18n.applyDom();
      renderPalette();
      renderPresets();
      renderPathPalette();
      render(Graph.get(), "select");
      if (Studio && Studio.tl) Compiler.rebuild(Studio.playhead);
    }
  };
})(window);
