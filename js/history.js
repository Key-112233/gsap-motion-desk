(function (global) {
  "use strict";

  var MAX = 80;
  var past = [];
  var future = [];
  var locked = false;
  var coalesce = false;
  var coalesceTimer = 0;

  function snap() {
    var s = Graph.get();
    return JSON.stringify({
      elements: s.elements,
      clips: s.clips,
      paths: s.paths || [],
      pathMotions: s.pathMotions || [],
      selectedElementId: s.selectedElementId,
      selectedClipId: s.selectedClipId,
      selectedPathId: s.selectedPathId,
      selectedMotionId: s.selectedMotionId,
      selectedKeyId: s.selectedKeyId,
      editMode: s.editMode,
      scrubProgress: s.scrubProgress,
      name: s.name
    });
  }

  function restore(raw) {
    var data = JSON.parse(raw);
    locked = true;
    Graph.replaceState(data);
    locked = false;
  }

  function push(raw) {
    var s = raw || snap();
    if (past.length && past[past.length - 1] === s) return;
    past.push(s);
    if (past.length > MAX) past.shift();
    future = [];
  }

  function record(opts) {
    if (locked) return;
    opts = opts || {};
    if (opts.coalesce) {
      if (!coalesce) {
        push();
        coalesce = true;
      }
      clearTimeout(coalesceTimer);
      coalesceTimer = setTimeout(function () { coalesce = false; }, 450);
      return;
    }
    coalesce = false;
    clearTimeout(coalesceTimer);
    push();
  }

  function undo() {
    if (!past.length) return false;
    future.push(snap());
    restore(past.pop());
    coalesce = false;
    return true;
  }

  function redo() {
    if (!future.length) return false;
    past.push(snap());
    restore(future.pop());
    coalesce = false;
    return true;
  }

  global.History = {
    record: record,
    undo: undo,
    redo: redo,
    canUndo: function () { return past.length > 0; },
    canRedo: function () { return future.length > 0; },
    isLocked: function () { return locked; }
  };
})(window);
