(function (root) {
  const defaults = { split: 'Ctrl+B', play: 'Space', undo: 'Ctrl+Z', redo: 'Ctrl+Shift+Z', nudgeLeft: 'ArrowLeft', nudgeRight: 'ArrowRight', deleteClip: 'Delete' };
  function validate(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_VALUE');
    const result = {};
    for (const action of Object.keys(defaults)) {
      const shortcut = value[action] ?? defaults[action];
      if (typeof shortcut !== 'string' || !/^(Ctrl\+)?(Alt\+)?(Shift\+)?([A-Z0-9]|Space|Delete|Backspace|ArrowLeft|ArrowRight|ArrowUp|ArrowDown|F[1-9]|F1[0-2])$/.test(shortcut) || /^(Ctrl\+(W|R|F4)|Alt\+F4)$/.test(shortcut)) throw new Error('INVALID_VALUE');
      result[action] = shortcut;
    }
    if (new Set(Object.values(result)).size !== Object.keys(defaults).length) throw new Error('SHORTCUT_CONFLICT');
    return result;
  }
  function fromEvent(event) {
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) return null;
    const key = event.code === 'Space' ? 'Space' : event.key.length === 1 ? event.key.toUpperCase() : event.key;
    return `${event.ctrlKey || event.metaKey ? 'Ctrl+' : ''}${event.altKey ? 'Alt+' : ''}${event.shiftKey ? 'Shift+' : ''}${key}`;
  }
  const api = { defaults, validate, fromEvent };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.aerodubShortcuts = api;
})(typeof window === 'undefined' ? globalThis : window);
