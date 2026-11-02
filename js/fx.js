(function (global) {
  "use strict";

  if (typeof gsap === "undefined") return;

  var busy = false;
  var THEME_BG = { dark: "#12141a", light: "#f4f1ea" };
  var wipe = document.getElementById("bg-wipe");
  if (wipe) gsap.set(wipe, { scaleX: 0, transformOrigin: "left center" });

  function reduceMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function qs(id) {
    return document.getElementById(id);
  }

  function tap(btn) {
    if (!btn) return;
    gsap.killTweensOf(btn);
    gsap.fromTo(
      btn,
      { scale: 0.92, rotation: -4 },
      { scale: 1, rotation: 0, duration: 0.38, ease: "back.out(2.4)", overwrite: true }
    );
  }

  function refreshLocaleUi() {
    I18n.applyDom();
    if (global.UI && UI.render) UI.render(Graph.get(), "select");
    if (Studio && Studio.tl) Compiler.rebuild(Studio.playhead);
  }

  function unlock(btn) {
    busy = false;
    if (btn) btn.disabled = false;
  }

  function travelX() {
    return Math.round(Math.max(globalThis.innerWidth, 960) * 1.15);
  }

  function themePanels() {
    return gsap.utils.toArray(".topbar, .left, .stage-wrap, .right, .timeline-wrap");
  }

  /* 抄 gsap深色模式切换：旧面板右出 → 背景擦除 → 新主题从左飞回原位 */
  function toggleTheme() {
    var btn = qs("btn-theme");
    tap(btn);
    if (busy) return;
    if (reduceMotion() || !wipe) {
      I18n.toggleTheme();
      return;
    }

    busy = true;
    if (btn) btn.disabled = true;

    var wasPlaying = !!(Studio && Studio.playing);
    if (Studio && Studio.pause) Studio.pause();

    var next = I18n.getTheme() === "dark" ? "light" : "dark";
    var panels = themePanels();
    var dx = travelX();

    gsap.set(panels, { x: 0 });
    gsap.set(wipe, {
      scaleX: 0,
      transformOrigin: "left center",
      backgroundColor: THEME_BG[next]
    });

    var tl = gsap.timeline({
      defaults: { force3D: true },
      onComplete: function () {
        gsap.set(panels, { x: 0, clearProps: "transform" });
        gsap.set(wipe, { scaleX: 0 });
        unlock(btn);
        if (Studio && Studio.tl) Compiler.rebuild(Studio.playhead);
        if (wasPlaying && Studio && Studio.play) Studio.play();
      }
    });

    /* 旧面板整组向右飞出视窗 */
    tl.to(panels, {
      x: dx,
      duration: 0.65,
      stagger: 0.06,
      ease: "power3.in"
    }, 0);

    /* 背景左→右擦除 */
    tl.to(wipe, {
      scaleX: 1,
      duration: 0.8,
      ease: "power2.inOut"
    }, 0.05);

    /* 换肤后从左侧飞入原位（单套 DOM：overwrite 掉右出，从屏外左侧入场） */
    tl.add(function () {
      I18n.toggleTheme();
    }, 0.35);

    tl.fromTo(
      panels,
      { x: -dx },
      {
        x: 0,
        duration: 0.7,
        stagger: 0.06,
        ease: "power3.out",
        overwrite: "auto",
        immediateRender: false
      },
      0.35
    );
  }

  function toggleLang() {
    var btn = qs("btn-lang");
    tap(btn);
    if (busy) return;
    if (reduceMotion()) {
      I18n.toggleLang();
      return;
    }

    busy = true;
    if (btn) btn.disabled = true;

    var wasPlaying = !!(Studio && Studio.playing);
    if (Studio && Studio.pause) Studio.pause();

    var panels = gsap.utils.toArray(
      ".brand, .panel-h, .palette, .tree, .inspector, .code, .tl-bar .k, .copy-bar .tool-btn.primary, .tl-heads"
    );

    gsap.to(panels, {
      opacity: 0.12,
      duration: 0.18,
      ease: "power1.in",
      onComplete: function () {
        I18n.toggleLang({ silent: true });
        refreshLocaleUi();
        gsap.to(panels, {
          opacity: 1,
          duration: 0.32,
          ease: "power2.out",
          onComplete: function () {
            gsap.set(panels, { clearProps: "opacity" });
            unlock(btn);
            if (wasPlaying && Studio && Studio.play) Studio.play();
          }
        });
      }
    });
  }

  global.Fx = {
    toggleTheme: toggleTheme,
    toggleLang: toggleLang
  };
})(window);
