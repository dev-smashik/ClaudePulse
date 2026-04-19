/**
 * ClaudeMonitor — Content Script Orchestrator
 * Wires interceptor events → data normalization → storage → UI strip.
 */
(async () => {
  'use strict';

  await CmStore.boot();
  CmLog.info('Orchestrator ready.');

  // ── Token estimation ────────────────────────────────────────────────
  // ~3.9 chars/token for Claude (empirical average including code blocks)
  const estimateTokens = (text) =>
    typeof text === 'string' ? Math.ceil(text.length / 3.9) : 0;

  // ── Walk active conversation branch leaf → root ─────────────────────
  function countBranchTokens(conv) {
    if (!conv?.chat_messages) return 0;

    const byId = new Map(conv.chat_messages.map(m => [m.uuid, m]));
    let ptr = conv.current_leaf_message_uuid;
    let sum = 0;

    while (ptr) {
      const node = byId.get(ptr);
      if (!node) break;
      if (Array.isArray(node.content)) {
        for (const blk of node.content) {
          if (blk.text) sum += estimateTokens(blk.text);
        }
      }
      ptr = node.parent_message_uuid ?? null;
    }
    return sum;
  }

  // ── Normalize the two known Claude API shapes ───────────────────────
  function parseUsagePayload(raw) {
    if (!raw || typeof raw !== 'object') return null;

    // Shape A: { five_hour: { utilization, resets_at }, seven_day: … }
    if (raw.five_hour !== undefined || raw.seven_day !== undefined) {
      const s = raw.five_hour;
      const w = raw.seven_day;
      return {
        session : s ? { pct: Number(s.utilization || 0),       resetsAt: s.resets_at || null } : null,
        weekly  : w ? { pct: Number(w.utilization || 0),       resetsAt: w.resets_at || null } : null,
      };
    }

    // Shape B: { windows: { '5h': { utilization, resets_at }, '7d': … } }
    if (raw.windows) {
      const s = raw.windows['5h'];
      const w = raw.windows['7d'];
      const _ts = (t) => t > 1e11 ? t : t * 1000;
      return {
        session : s ? { pct: (s.utilization || 0) * 100, resetsAt: new Date(_ts(s.resets_at || 0)).toISOString() } : null,
        weekly  : w ? { pct: (w.utilization || 0) * 100, resetsAt: new Date(_ts(w.resets_at || 0)).toISOString() } : null,
      };
    }

    return null;
  }

  // ── Handle incoming interceptor events ─────────────────────────────
  window.addEventListener('ClaudeMonitor', async (ev) => {
    const { type, payload } = ev.detail ?? {};

    if (type === 'cm:usage' || type === 'cm:limit') {
      const parsed = parseUsagePayload(payload);
      if (!parsed) return;
      const stored = await CmStore.patchUsage({ ...parsed, synced: true });
      CmStrip.paint(stored);
    }

    if (type === 'cm:conversation') {
      const tokens = countBranchTokens(payload);
      await CmStore.patchUsage({ tokens });
    }
  });

  // ── Live draft counter ──────────────────────────────────────────────
  document.addEventListener('input', (ev) => {
    const el = ev.target;
    const isEditor = el.getAttribute('contenteditable') === 'true' || el.tagName === 'TEXTAREA';
    if (!isEditor) return;
    const count = estimateTokens(el.innerText ?? el.value ?? '');
    // Future: could display draft count in header
    CmLog.debug('Draft tokens:', count);
  });

  // ── MutationObserver: re-mount strip after SPA navigation ──────────
  const observer = new MutationObserver(() => CmStrip.tryMount());
  observer.observe(document.body, { childList: true, subtree: true });
  CmStrip.tryMount(); // immediate attempt

  // ── Restore last known data from storage ───────────────────────────
  const state = await CmStore.read(null);
  if (state.usage?.synced) CmStrip.paint(state.usage);
  if (state.prefs?.showStrip === false) CmStrip.setVisibility(false);

  // ── Listen to live preferences updates ─────────────────────────────
  CmStore.onChange((changes) => {
    if (changes.prefs) {
      const show = changes.prefs.newValue?.showStrip ?? true;
      CmStrip.setVisibility(show);
    }
  });

  // ── Refresh countdown text every 30 s ──────────────────────────────
  setInterval(() => CmStrip.tick(), 30_000);

})();
