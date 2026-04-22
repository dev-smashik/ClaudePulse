/**
 * ClaudePulse — In-Page Glass Strip
 *
 * Renders a slim frosted-glass status bar directly in Claude's footer,
 * matching the layout shown in the README screenshot:
 *   Session: 22.8% · resets in 4h 43m [━━] [━━━━━━━━━] Weekly: 78.5% · resets in 1d 21h
 *
 * 100% original design — no code from third-party sources.
 */
const CmStrip = (() => {

  // ── Config ─────────────────────────────────────────────────────────
  const ROOT_ID   = 'cm-glass-strip';
  const STYLE_ID  = 'cm-glass-css';

  // ── State ──────────────────────────────────────────────────────────
  let _snapshot = null; // last usage data

  // ── CSS ─────────────────────────────────────────────────────────────
  const CSS = `
    /* ── Glass strip container ────────────────────────────────────── */
    #cm-glass-strip {
      display: flex;
      align-items: center;
      gap: 6px;
      width: 100%;
      padding: 7px 16px;
      box-sizing: border-box;

      /* Glassmorphism */
      background : rgba(255, 255, 255, 0.04);
      backdrop-filter: blur(12px) saturate(160%);
      -webkit-backdrop-filter: blur(12px) saturate(160%);
      border-top : 1px solid rgba(255, 255, 255, 0.07);

      font-family : var(--font-tiempos, ui-sans-serif, system-ui, -apple-system, sans-serif);
      font-size   : 11.5px;
      line-height : 1;
      color       : rgba(180, 180, 190, 0.85);
      user-select : none;
    }

    /* ── Text labels ──────────────────────────────────────────────── */
    .cm-seg-label {
      white-space : nowrap;
      flex-shrink : 0;
      font-weight : 500;
      letter-spacing: 0.01em;
    }

    /* ── Progress track ───────────────────────────────────────────── */
    .cm-bar-track {
      flex         : 1 1 0;
      min-width    : 60px;
      max-width    : 240px;
      height       : 5px;
      border-radius: 3px;
      background   : rgba(140, 140, 160, 0.15);
      overflow     : hidden;
      position     : relative;
    }

    /* ── Progress fill ────────────────────────────────────────────── */
    .cm-bar-fill {
      position     : absolute;
      inset-block  : 0;
      left         : 0;
      width        : 0%;
      height       : 100%;
      border-radius: 3px;
      transition   : width 0.55s cubic-bezier(0.4, 0, 0.2, 1),
                     background 0.35s ease;
    }

    /* Session fill — electric blue */
    .cm-bar-fill.session {
      background: linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%);
      box-shadow: 0 0 8px rgba(59, 130, 246, 0.5);
    }
    /* Warning (≥80%) */
    .cm-bar-fill.session.warn,
    .cm-bar-fill.weekly.warn {
      background: linear-gradient(90deg, #d97706 0%, #fbbf24 100%);
      box-shadow: 0 0 8px rgba(217, 119, 6, 0.5);
    }
    /* Danger (≥95%) */
    .cm-bar-fill.session.danger,
    .cm-bar-fill.weekly.danger {
      background: linear-gradient(90deg, #dc2626 0%, #f87171 100%);
      box-shadow: 0 0 8px rgba(220, 38, 38, 0.5);
    }

    /* Weekly fill — bright teal-blue */
    .cm-bar-fill.weekly {
      background: linear-gradient(90deg, #2563eb 0%, #38bdf8 100%);
      box-shadow: 0 0 8px rgba(56, 189, 248, 0.45);
    }

    /* ── Divider dot ──────────────────────────────────────────────── */
    .cm-dot-sep {
      flex-shrink: 0;
      font-size  : 10px;
      color      : rgba(140, 140, 160, 0.35);
      padding    : 0 2px;
    }
  `;

  // ── DOM helpers ─────────────────────────────────────────────────────

  function _injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  function _buildStrip() {
    const root = document.createElement('div');
    root.id = ROOT_ID;

    // We render the strip content dynamically via _render()
    root.innerHTML = _makeHTML({ session: { pct: 0, resetsAt: null }, weekly: { pct: 0, resetsAt: null } });
    return root;
  }

  function _makeHTML(usage) {
    const s    = usage?.session || {};
    const w    = usage?.weekly  || {};
    const sPct = _clamp(s.pct  || 0);
    const wPct = _clamp(w.pct  || 0);

    return `
      <span class="cm-seg-label">
        Session:&nbsp;<strong style="color:rgba(220,220,235,0.9)">${sPct.toFixed(1)}%</strong>
        &nbsp;·&nbsp;${_countdown(s.resetsAt, 'session')}
      </span>
      <div class="cm-bar-track" style="flex:0 1 160px">
        <div class="cm-bar-fill session ${_colourClass(sPct)}" style="width:${sPct}%"></div>
      </div>
      <div class="cm-dot-sep">·</div>
      <div class="cm-bar-track" style="flex:0 1 200px">
        <div class="cm-bar-fill weekly ${_colourClass(wPct)}" style="width:${wPct}%"></div>
      </div>
      <span class="cm-seg-label">
        Weekly:&nbsp;<strong style="color:rgba(220,220,235,0.9)">${wPct.toFixed(1)}%</strong>
        &nbsp;·&nbsp;${_countdown(w.resetsAt, 'weekly')}
      </span>
    `;
  }

  // ── Utilities ────────────────────────────────────────────────────────

  function _clamp(n) { return Math.min(100, Math.max(0, n || 0)); }

  function _colourClass(pct) {
    if (pct >= 95) return 'danger';
    if (pct >= 80) return 'warn';
    return '';
  }

  function _countdown(iso, _type) {
    if (!iso) return '<span style="opacity:0.45">syncing…</span>';
    const delta = new Date(iso).getTime() - Date.now();
    if (delta <= 0) return '<span style="color:#34d399">resetting…</span>';
    const h   = Math.floor(delta / 3_600_000);
    const min = Math.floor((delta % 3_600_000) / 60_000);
    const d   = Math.floor(h / 24);
    const txt = d >= 1 ? `resets in ${d}d ${h % 24}h` : `resets in ${h}h ${min}m`;
    return `<span style="opacity:0.6">${txt}</span>`;
  }

  // ── Anchor-finding strategy ────────────────────────────────────────
  // Claude's composer sits in different containers across versions.
  // We work through candidates from most to least specific.

  function _findAnchor() {
    // 1. Structural approach: Find the rich-text editor
    const editor = document.querySelector('[contenteditable="true"]');
    if (editor) {
      const fieldset = editor.closest('fieldset');
      if (fieldset) return fieldset;
      const form = editor.closest('form');
      if (form) return form.querySelector('fieldset') || form.lastElementChild || form;
      return editor;
    }

    // 2. Legacy/Data attributes approach
    const selectors = [
      '[data-testid="chat-input-grid-area"]',
      'div[class*="ProseMirror"]',
      'fieldset[data-testid]',
      'form > div[class*="flex-col"]',
      'form fieldset',
      'main form > div:last-child',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  // ── Public API ────────────────────────────────────────────────────────

  return {

    /** Called repeatedly by MutationObserver after every DOM change */
    tryMount() {
      _injectStyles();
      if (document.getElementById(ROOT_ID)) return; // already mounted

      const anchor = _findAnchor();
      if (!anchor) return;

      // Climb to a reliable parent (fieldset or form div)
      const parent = anchor.closest('fieldset') || anchor.parentElement;
      if (!parent) return;

      const strip = _buildStrip();
      parent.insertAdjacentElement('afterend', strip);

      if (_snapshot) this.paint(_snapshot); // restore last known data
    },

    /** Push new usage into the strip */
    paint(usage) {
      _snapshot = usage;
      const el = document.getElementById(ROOT_ID);
      if (el) el.innerHTML = _makeHTML(usage);
    },

    /** Refresh only countdown text (called every 30 s) */
    tick() {
      if (_snapshot) this.paint(_snapshot);
    },

    /** Show or hide the strip based on user preference */
    setVisibility(isVisible) {
      const el = document.getElementById(ROOT_ID);
      if (el) el.style.display = isVisible ? 'flex' : 'none';
    },
  };

})();
