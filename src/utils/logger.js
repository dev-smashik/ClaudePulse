/**
 * ClaudeMonitor — Logger
 * Lightweight, level-gated console wrapper.
 */
const CmLog = (() => {
  const PREFIX = '%c[CM]%c';
  const STYLES = ['color:#4fa4ea;font-weight:700', 'color:inherit;font-weight:normal'];

  const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
  const current = LEVELS['info'];

  function out(level, args) {
    if (LEVELS[level] < current) return;
    const fn = console[level] || console.log;
    fn(PREFIX, ...STYLES, ...args);
  }

  return {
    debug : (...a) => out('debug', a),
    info  : (...a) => out('info',  a),
    warn  : (...a) => out('warn',  a),
    error : (...a) => out('error', a),
  };
})();

if (typeof window !== 'undefined') window.CmLog = CmLog;
else if (typeof self !== 'undefined') self.CmLog = CmLog;
