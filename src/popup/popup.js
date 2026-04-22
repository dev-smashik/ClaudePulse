/**
 * ClaudePulse — Popup Controller
 * Reads from CmStore, renders to the glass popup UI.
 * 100 % original logic.
 */
document.addEventListener('DOMContentLoaded', async () => {

  const state = await CmStore.boot();

  // ── Element refs ─────────────────────────────────────────────
  const viewEmpty   = document.getElementById('view-empty');
  const viewData    = document.getElementById('view-data');
  const valTokens   = document.getElementById('val-tokens');
  const valStatus   = document.getElementById('val-status');

  const pctSession  = document.getElementById('pct-session');
  const fillSession = document.getElementById('fill-session');
  const timeSession = document.getElementById('time-session');

  const pctWeekly   = document.getElementById('pct-weekly');
  const fillWeekly  = document.getElementById('fill-weekly');
  const timeWeekly  = document.getElementById('time-weekly');

  const btnTheme    = document.getElementById('btn-theme');
  const icoSun      = document.getElementById('ico-sun');
  const icoMoon     = document.getElementById('ico-moon');
  const togStrip    = document.getElementById('tog-strip');

  // ── Theme ────────────────────────────────────────────────────
  let dark = state.prefs?.darkMode !== false;

  function applyTheme() {
    document.body.classList.toggle('light', !dark);
    icoSun.style.display  = dark  ? '' : 'none';
    icoMoon.style.display = !dark ? '' : 'none';
  }
  applyTheme();

  btnTheme.addEventListener('click', async () => {
    dark = !dark;
    applyTheme();
    const { prefs: fresh } = await CmStore.read('prefs');
    CmStore.write({ prefs: { ...(fresh || {}), darkMode: dark } });
  });

  // ── Strip toggle ─────────────────────────────────────────────
  togStrip.checked = state.prefs?.showStrip !== false;
  togStrip.addEventListener('change', async () => {
    const { prefs: fresh } = await CmStore.read('prefs');
    CmStore.write({ prefs: { ...(fresh || {}), showStrip: togStrip.checked } });
  });

  // ── Formatters ───────────────────────────────────────────────
  function countdown(iso) {
    if (!iso) return '—';
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return 'Resetting now…';
    const h   = Math.floor(ms / 3_600_000);
    const min = Math.floor((ms % 3_600_000) / 60_000);
    if (h >= 24) return `Resets in ${Math.floor(h / 24)}d ${h % 24}h`;
    return `Resets in ${h}h ${min}m`;
  }

  function colourClass(pct) {
    if (pct >= 95) return 'danger';
    if (pct >= 80) return 'warn';
    return '';
  }

  function paintBar(fillEl, pctEl, pct, keepColour = false) {
    const p = Math.min(100, Math.max(0, pct || 0));
    fillEl.style.width = `${p}%`;
    pctEl.textContent  = `${p.toFixed(1)}%`;

    const cls = colourClass(p);
    // Remove old semantic classes, keep structural ones (e.g. 'weekly')
    fillEl.classList.remove('warn', 'danger');
    pctEl.classList.remove('warn', 'danger');
    if (cls) {
      fillEl.classList.add(cls);
      pctEl.classList.add(cls);
    }
    if (!keepColour && !cls) {
      pctEl.style.color = ''; // revert to CSS var
    }
  }

  // ── Render ───────────────────────────────────────────────────
  function render(usage) {
    if (!usage?.synced) {
      viewEmpty.classList.remove('hidden');
      viewData.classList.add('hidden');
      return;
    }

    viewEmpty.classList.add('hidden');
    viewData.classList.remove('hidden');

    // Tokens
    valTokens.textContent = Number(usage.tokens || 0).toLocaleString();

    // Status badge
    let statusText = 'Live';
    if (usage.updatedAt) {
      const ago = Math.round((Date.now() - new Date(usage.updatedAt).getTime()) / 60_000);
      if (ago > 1) statusText = `${ago}m ago`;
    }
    valStatus.textContent = statusText;

    // Session
    const s = usage.session || {};
    paintBar(fillSession, pctSession, s.pct);
    timeSession.textContent = countdown(s.resetsAt);

    // Weekly (keep purple colour from CSS unless warn/danger)
    const w = usage.weekly || {};
    paintBar(fillWeekly, pctWeekly, w.pct, true);
    if (!colourClass(w.pct)) pctWeekly.style.color = 'var(--purple-hi)';
    timeWeekly.textContent = countdown(w.resetsAt);
  }

  // ── Initial render ───────────────────────────────────────────
  const { usage } = await CmStore.read('usage');
  render(usage);

  // ── Live updates ─────────────────────────────────────────────
  CmStore.onChange(changes => {
    if (changes.usage) render(changes.usage.newValue);
  });

  // ── Countdown refresh every 30 s ────────────────────────────
  setInterval(async () => {
    const { usage: fresh } = await CmStore.read('usage');
    render(fresh);
  }, 30_000);

});
