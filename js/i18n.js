(function (global) {
  "use strict";

  var dict = {
    zh: {
      title: "GSAP 动画调参台",
      templates: "组件",
      layers: "图层",
      clip: "动画",
      clipEmpty: "从左侧拖组件到画布，或点选已有元素。双击可改文字。",
      gsapPanel: "当前元素 GSAP",
      pickEl: "选择一个元素",
      copyAll: "复制整段时间轴",
      copied: "已复制",
      copyPrompt: "复制这段给 AI",
      timeline: "时间轴",
      play: "播放",
      pause: "暂停",
      loop: "循环",
      addMotion: "+ 动画",
      delClip: "删除动画",
      delElement: "删除元素",
      noMotionHint: "这个元素还没有动画，点「+ 动画」在播放头新建。",
      feelSnap: "利落",
      feelSoft: "软",
      feelHeavy: "沉",
      feelSpring: "弹",
      method: "方法",
      stagger: "stagger（拆字）",
      staggerPh: "空=关闭",
      overlap: "同元素时间重叠：后写的 tween 会盖住先写的属性",
      noClip: "// 这个元素还没有 clip",
      exportHead: "// gsap动画调参台 export",
      langBtn: "EN",
      themeDark: "浅色",
      themeLight: "深色",
      tplHeading: "标题",
      tplText: "正文",
      tplCard: "卡片",
      tplButton: "按钮",
      tplBox: "色块",
      stageEmpty: "把左侧组件拖到这里",
      treeEmpty: "画布还是空的",
      elLabel: "图层名",
      fieldTitle: "标题",
      fieldBody: "正文",
      fieldText: "文字",
      fieldSplit: "按字拆开（可 stagger）",
      importBtn: "导入项目",
      exportBtn: "导出项目",
      importFail: "无法读取该项目文件",
      charPrefix: "字 ",
      tipFeelSnap: "短、快、停得干脆。适合按钮点按、小图标弹入。",
      tipFeelSoft: "时间拉长、进出更柔。适合大卡片、背景层。",
      tipFeelHeavy: "更慢、更沉。适合大标题或重要面板登场。",
      tipFeelSpring: "结尾带一点回弹。适合活泼、玩具感的元素。",
      tipMethod: "动画写法。from=从设定值回到原位；to=从现在播到设定值；fromTo=明确起止；set=瞬间改好不过渡。",
      tipMethodFrom: "从这些数值播回元素当前/原位（常见入场：从透明、偏移处进来）。",
      tipMethodTo: "从当前状态播到这些数值（常见离场或变到某个姿态）。",
      tipMethodFromTo: "同时写清起点和终点，不依赖当前状态。",
      tipMethodSet: "到点立刻变成这些值，没有缓动过程。",
      tipEase: "速度曲线。out=进场末段减速更自然；inOut=两端都柔；back/elastic=带过冲或弹性。",
      tipStart: "这条动画在时间轴上从第几秒开始。调大=更晚出现。",
      tipDuration: "播多久。调大=更慢更拖；调小=更快更干脆。",
      tipX: "水平位移（px）。正数往右，负数往左。from 时表示「从多远的地方滑进来」。",
      tipY: "垂直位移（px）。正数往下，负数往上。from 时表示「从多高/多低的地方进来」。",
      tipRot: "旋转角度（度）。正数顺时针。数值越大转得越多。",
      tipScale: "缩放。1=原大，小于 1 缩小，大于 1 放大。from 时 0.8 表示从小变到正常。",
      tipOpacity: "透明度。0=全透明，1=不透明。from 时 0 表示淡入。",
      tipStagger: "拆开后的子元素依次延迟（秒）。0.05=每个字比前一个晚 0.05s。空=整组一起动。",
      tipSplit: "打开后标题按字拆开，才能用 stagger 做逐字入场。",
      tipAddMotion: "在当前播放头位置，再给这个元素加一条动画。",
      tipDelEl: "从画布删除这个元素及其动画。",
      tipDelClip: "只删当前这条动画，元素还留在画布上。",
      tipSkewX: "水平倾斜（度）。正数向右倾。常和入场一起用，显得更有动感。",
      tipSkewY: "垂直倾斜（度）。用得少，数值大容易变形夸张。",
      tipBlur: "高斯模糊（px）。from 时 blur>0 表示从糊到清晰。0 或空=不模糊。",
      tipColor: "文字颜色。对标题/正文/按钮生效；空=保持原色。",
      tipBg: "背景色。对卡片/色块更明显；空=保持原样。",
      tipPath: "位移路径。选弧线/波浪/绕圈时，会用关键帧代替单纯的 x/y。",
      presets: "预设",
      presetPop: "弹入",
      presetStagger: "错落标题",
      presetCascade: "卡片 cascade",
      tipPresetPop: "缩放+淡入带回弹，适合按钮或单个强调元素。",
      tipPresetStagger: "标题拆字后逐个上移淡入。非标题会先改成可拆字标题。",
      tipPresetCascade: "画布上所有卡片依次错开上浮入场。",
      undo: "撤销",
      redo: "重做",
      applyCode: "应用代码",
      codeHint: "可直接改这里的 GSAP，粘贴后再点「应用代码」。",
      codeApplyOk: "已应用",
      codeApplyFail: "解析失败，请检查语法",
      modeStage: "舞台",
      modePath: "路径",
      pathPresets: "路径",
      pathLine: "直线",
      pathArc: "弧",
      pathSemi: "半圆",
      pathWave: "波浪",
      bindPath: "绑定到路径",
      unbindPath: "解除路径绑定",
      addKey: "+ 关键帧",
      delKey: "删除关键帧",
      autoRotate: "贴合切线旋转",
      scrub: "路径进度",
      pathMotion: "路径动画",
      pathPick: "目标路径",
      pathSwitch: "换绑路径",
      pathName: "路径名称",
      pathBezier: "曲线",
      delPath: "删除路径",
      pathNeedCreate: "先在上方「路径」里点直线/弧/半圆/波浪。",
      pathSnapHint: "也可把元素拖近路径吸附绑定；路径模式下点路径可直接绑。",
      tipPathName: "给路径起个好认的名字，时间轴和绑定列表都会显示它。",
      tipBindPath: "把当前元素绑到所选路径上，并生成起止关键帧。",
      tipAddKey: "在当前进度插入姿态关键帧。",
      tipScrub: "沿路径拖进度预览；拖元素或点路径也可。",
      tipAutoRotate: "元素朝向跟随路径切线。",
      keyP: "进度 p",
      propRot: "旋转",
      propScale: "缩放",
      propOpacity: "透明",
      propStart: "开始",
      propDuration: "时长",
      legacyPath: "快捷位移（旧）",
      tipLegacyPath: "旧版近似位移预设。正式沿路径请用上方「路径动画」绑定。"
    },
    en: {
      title: "GSAP Motion Desk",
      templates: "Blocks",
      layers: "Layers",
      clip: "Motion",
      clipEmpty: "Drag blocks onto the canvas, or select an element. Double-click to edit text.",
      gsapPanel: "GSAP for selection",
      pickEl: "Select an element",
      copyAll: "Copy full timeline",
      copied: "Copied",
      copyPrompt: "Copy this for your AI",
      timeline: "Timeline",
      play: "Play",
      pause: "Pause",
      loop: "Loop",
      addMotion: "+ motion",
      delClip: "Delete motion",
      delElement: "Delete element",
      noMotionHint: "No motion yet. Use + motion at the playhead.",
      feelSnap: "Snap",
      feelSoft: "Soft",
      feelHeavy: "Heavy",
      feelSpring: "Spring",
      method: "Method",
      stagger: "stagger (chars)",
      staggerPh: "empty = off",
      overlap: "Overlapping clips on this element: later tweens overwrite earlier properties",
      noClip: "// this element has no clips yet",
      exportHead: "// GSAP Motion Desk export",
      langBtn: "中",
      themeDark: "Light",
      themeLight: "Dark",
      tplHeading: "Heading",
      tplText: "Text",
      tplCard: "Card",
      tplButton: "Button",
      tplBox: "Box",
      stageEmpty: "Drop blocks here",
      treeEmpty: "Canvas is empty",
      elLabel: "Layer name",
      fieldTitle: "Title",
      fieldBody: "Body",
      fieldText: "Text",
      fieldSplit: "Split into chars (stagger)",
      importBtn: "Import",
      exportBtn: "Export",
      importFail: "Could not read that project file",
      charPrefix: "Char ",
      tipFeelSnap: "Short and snappy. Good for taps and small icons.",
      tipFeelSoft: "Longer and softer. Good for big cards and background layers.",
      tipFeelHeavy: "Slower and heavier. Good for hero titles or important panels.",
      tipFeelSpring: "Ends with a little bounce. Playful, toy-like motion.",
      tipMethod: "How the tween is written. from=from values back to rest; to=to values; fromTo=both ends; set=instant.",
      tipMethodFrom: "Animate from these values to the element's rest state (typical entrance).",
      tipMethodTo: "Animate from the current state to these values (exit or pose change).",
      tipMethodFromTo: "Spell out both start and end; ignores the current pose.",
      tipMethodSet: "Jump to these values at that time—no easing.",
      tipEase: "Speed curve. out=ease at the end; inOut=soft both ends; back/elastic=overshoot.",
      tipStart: "When this clip begins on the timeline (seconds). Larger = later.",
      tipDuration: "How long it runs. Larger = slower; smaller = snappier.",
      tipX: "Horizontal move in px. + right, − left. In from(), how far it slides in from.",
      tipY: "Vertical move in px. + down, − up. In from(), how far it comes from above/below.",
      tipRot: "Rotation in degrees. + clockwise. Larger absolute value = more spin.",
      tipScale: "Size. 1 = normal, <1 smaller, >1 bigger. from 0.8 = grow into place.",
      tipOpacity: "Transparency. 0 = invisible, 1 = solid. from 0 = fade in.",
      tipStagger: "Delay between split children (seconds). 0.05 = each char 0.05s after the previous. Empty = all together.",
      tipSplit: "Split the heading into characters so stagger can run per glyph.",
      tipAddMotion: "Add another clip on this element at the playhead.",
      tipDelEl: "Remove this element and its clips from the canvas.",
      tipDelClip: "Delete only this clip; keep the element.",
      tipSkewX: "Horizontal skew in degrees. Positive leans right.",
      tipSkewY: "Vertical skew in degrees. Large values look extreme.",
      tipBlur: "Gaussian blur in px. In from(), blur > 0 means sharpen into place.",
      tipColor: "Text color for headings/body/buttons. Empty keeps current.",
      tipBg: "Background color for cards/boxes. Empty keeps current.",
      tipPath: "Motion path. Arc/wave/orbit uses keyframes instead of plain x/y.",
      presets: "Presets",
      presetPop: "Pop in",
      presetStagger: "Stagger title",
      presetCascade: "Card cascade",
      tipPresetPop: "Scale + fade with overshoot. Great for buttons.",
      tipPresetStagger: "Split heading chars and cascade them up.",
      tipPresetCascade: "Stagger every card on the canvas upward.",
      undo: "Undo",
      redo: "Redo",
      applyCode: "Apply code",
      codeHint: "Edit or paste GSAP here, then click Apply code.",
      codeApplyOk: "Applied",
      codeApplyFail: "Parse failed — check the syntax",
      modeStage: "Stage",
      modePath: "Path",
      pathPresets: "Paths",
      pathLine: "Line",
      pathArc: "Arc",
      pathSemi: "Semicircle",
      pathWave: "Wave",
      bindPath: "Bind to path",
      unbindPath: "Unbind path",
      addKey: "+ keyframe",
      delKey: "Delete keyframe",
      autoRotate: "Auto-rotate to tangent",
      scrub: "Path progress",
      pathMotion: "Path motion",
      pathPick: "Target path",
      pathSwitch: "Switch path",
      pathName: "Path name",
      pathBezier: "Curve",
      delPath: "Delete path",
      pathNeedCreate: "Add a Line / Arc / Semicircle / Wave from Paths above.",
      pathSnapHint: "Or drag the element near a path to snap-bind; in Path mode, click the path.",
      tipPathName: "Name the path so the timeline and bind list stay readable.",
      tipBindPath: "Bind the selection to the chosen path and create start/end keys.",
      tipAddKey: "Insert a pose keyframe at the current progress.",
      tipScrub: "Scrub along the path to preview; drag the element or click the path.",
      tipAutoRotate: "Orient the element to the path tangent.",
      keyP: "progress p",
      propRot: "rotation",
      propScale: "scale",
      propOpacity: "opacity",
      propStart: "start",
      propDuration: "duration",
      legacyPath: "Quick move (legacy)",
      tipLegacyPath: "Legacy approximate moves. For real paths, use Path motion above."
    }
  };

  var lang = "en";
  var theme = "dark";

  function t(key) {
    var pack = dict[lang] || dict.zh;
    return pack[key] != null ? pack[key] : (dict.zh[key] || key);
  }

  function elementLabel(el) {
    if (!el) return "";
    if (el.type === "char" || el.parent) {
      var ch = (el.content && el.content.text) || el.label || "";
      return t("charPrefix") + ch;
    }
    if (el.label) return el.label;
    if (el.type === "card" && el.content && el.content.title) return el.content.title;
    if (el.content && el.content.text) {
      var s = String(el.content.text);
      return s.length > 12 ? s.slice(0, 12) + "…" : s;
    }
    return el.type || el.id;
  }

  function applyDom() {
    document.documentElement.lang = lang === "en" ? "en" : "zh-CN";
    document.documentElement.setAttribute("data-theme", theme);
    document.title = t("title");
    var nodes = document.querySelectorAll("[data-i18n]");
    var i;
    for (i = 0; i < nodes.length; i++) {
      nodes[i].textContent = t(nodes[i].getAttribute("data-i18n"));
    }
    var ph = document.querySelectorAll("[data-i18n-placeholder]");
    for (i = 0; i < ph.length; i++) {
      ph[i].setAttribute("placeholder", t(ph[i].getAttribute("data-i18n-placeholder")));
    }
    var langBtn = document.getElementById("btn-lang");
    var themeBtn = document.getElementById("btn-theme");
    if (langBtn) langBtn.textContent = t("langBtn");
    if (themeBtn) themeBtn.textContent = theme === "dark" ? t("themeDark") : t("themeLight");
  }

  function save() {
    try {
      localStorage.setItem("gsap-motion-desk-lang", lang);
      localStorage.setItem("gsap-motion-desk-theme", theme);
    } catch (e) {}
  }

  function load() {
    try {
      var l = localStorage.getItem("gsap-motion-desk-lang");
      var th = localStorage.getItem("gsap-motion-desk-theme");
      if (l === "en" || l === "zh") lang = l;
      if (th === "light" || th === "dark") theme = th;
    } catch (e) {}
  }

  function toggleLang(opts) {
    lang = lang === "zh" ? "en" : "zh";
    save();
    applyDom();
    if (!(opts && opts.silent) && global.UI && UI.onLocale) UI.onLocale();
  }

  function toggleTheme() {
    theme = theme === "dark" ? "light" : "dark";
    save();
    applyDom();
  }

  load();
  global.I18n = {
    t: t,
    elementLabel: elementLabel,
    applyDom: applyDom,
    toggleLang: toggleLang,
    toggleTheme: toggleTheme,
    getLang: function () { return lang; },
    getTheme: function () { return theme; }
  };
})(window);
