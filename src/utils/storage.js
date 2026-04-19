/**
 * ClaudeMonitor — Storage
 * Thin async wrapper around chrome.storage.local with schema defaults.
 */
const CmStore = (() => {
  const DEFAULTS = {
    usage: {
      session : { pct: 0, resetsAt: null },
      weekly  : { pct: 0, resetsAt: null },
      tokens  : 0,
      synced  : false,
      updatedAt: null,
    },
    prefs: {
      darkMode      : true,
      showStrip     : true,
      alertAt       : [80, 95],
    },
  };

  async function _get(keys = null) {
    return new Promise(res => chrome.storage.local.get(keys, res));
  }

  async function _set(data) {
    return new Promise(res => chrome.storage.local.set(data, res));
  }

  return {
    /** Seed defaults on first run */
    async boot() {
      const stored = await _get(null);
      if (stored.usage && stored.prefs) return stored;

      const merged = {
        usage : { ...DEFAULTS.usage,  ...(stored.usage  || {}) },
        prefs : { ...DEFAULTS.prefs,  ...(stored.prefs  || {}) },
      };
      await _set(merged);
      return merged;
    },

    async read(key = null) {
      return _get(key);
    },

    async write(data) {
      return _set(data);
    },

    /** Merge partial usage object into stored usage */
    async patchUsage(patch) {
      const { usage = {} } = await _get('usage');
      const next = { 
        ...DEFAULTS.usage, 
        ...usage, 
        ...patch, 
        session: patch.session ? { ...(usage.session || DEFAULTS.usage.session), ...patch.session } : (usage.session || DEFAULTS.usage.session),
        weekly:  patch.weekly  ? { ...(usage.weekly  || DEFAULTS.usage.weekly),  ...patch.weekly  } : (usage.weekly  || DEFAULTS.usage.weekly),
        updatedAt: new Date().toISOString() 
      };
      await _set({ usage: next });
      return next;
    },

    /** Subscribe to storage changes */
    onChange(fn) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local') fn(changes);
      });
    },
  };
})();

if (typeof window !== 'undefined') window.CmStore = CmStore;
else if (typeof self   !== 'undefined') self.CmStore = CmStore;
