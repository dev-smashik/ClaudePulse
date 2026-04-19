/**
 * ClaudeMonitor — Service Worker
 * Registers the MAIN-world interceptor and manages notifications/alarms.
 */
importScripts('../utils/logger.js', '../utils/storage.js');

// ── Register the fetch interceptor in the page's MAIN world ──────────
async function mountInterceptor() {
  try {
    const registered = await chrome.scripting.getRegisteredContentScripts();
    if (registered.some(s => s.id === 'cm-net')) return;

    await chrome.scripting.registerContentScripts([{
      id      : 'cm-net',
      matches : ['*://claude.ai/*'],
      js      : ['src/injected/interceptor.js'],
      runAt   : 'document_start',
      world   : 'MAIN',
    }]);
    CmLog.info('Interceptor registered.');
  } catch (err) {
    CmLog.error('Interceptor mount failed:', err);
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(async () => {
  await CmStore.boot();
  await mountInterceptor();
});

chrome.runtime.onStartup.addListener(mountInterceptor);

// ── Alert notifications on threshold cross ───────────────────────────
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.usage) return;

  const prev = changes.usage.oldValue || {};
  const next = changes.usage.newValue || {};

  chrome.storage.local.get('prefs', ({ prefs }) => {
    const thresholds = prefs?.alertAt || [80, 95];
    const newPct  = next.session?.pct || 0;
    const prevPct = prev.session?.pct || 0;

    if (newPct <= prevPct) return;

    for (const t of thresholds) {
      if (newPct >= t && prevPct < t) {
        chrome.notifications.create({
          type    : 'basic',
          iconUrl : 'icons/icon128.png',
          title   : '⚡ Claude Monitor',
          message : `Session usage crossed ${t}% (now ${newPct.toFixed(1)}%)`,
          priority: 1,
        });
        break;
      }
    }

    // Schedule an alarm when the session resets
    const resetsAt = next.session?.resetsAt;
    if (resetsAt && resetsAt !== prev.session?.resetsAt) {
      const when = new Date(resetsAt).getTime();
      if (when > Date.now()) {
        chrome.alarms.create('cm-session-reset', { when });
      }
    }
  });
});

// ── Alarm → reset notification ────────────────────────────────────────
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'cm-session-reset') {
    chrome.notifications.create({
      type    : 'basic',
      iconUrl : 'icons/icon128.png',
      title   : '✅ Claude Monitor',
      message : 'Your session limit has reset — fully refreshed!',
      priority: 2,
    });
  }
});
