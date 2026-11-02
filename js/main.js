(function (global) {
  "use strict";

  if (typeof gsap === "undefined") return;

  var rebuildTimer = 0;

  global.Studio = {
    tl: null,
    playhead: 0,
    playing: false,
    loop: false,
    onTick: function (t) {
      TimelineView.setPlayhead(t, false);
    },
    onEnded: function () {
      Studio.playing = false;
      if (global.PathEditor) PathEditor.syncBoundElements(Graph.get());
    },
    play: function () {
      var t = Studio.playhead;
      if (t >= Graph.get().duration - 0.001) t = 0;
      /* mark playing before rebuild so edit-rest pose is skipped and from-tweens render */
      Studio.playing = true;
      Compiler.rebuild(t);
      Studio.tl.play();
    },
    pause: function () {
      Studio.playing = false;
      if (Studio.tl) Studio.tl.pause();
      if (Compiler.settleEditPose) Compiler.settleEditPose(Studio.playhead);
    },
    toggleLoop: function () {
      Studio.loop = !Studio.loop;
      Compiler.rebuild(Studio.playhead);
      UI.render(Graph.get());
    }
  };

  TimelineView.bind();
  StageView.bind();
  if (global.PathEditor) PathEditor.bind();
  UI.bind();

  Graph.subscribe(function (state, kind) {
    UI.render(state, kind);
    if (kind === "select" || kind === "drag" || kind === "scrub") return;
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(function () {
      var wasPlaying = Studio.playing;
      Compiler.rebuild(Studio.playhead);
      if (wasPlaying) Studio.play();
    }, 40);
  });
})(window);
