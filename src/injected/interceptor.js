/**
 * ClaudePulse — Network Interceptor
 * Runs in MAIN world (injected by service worker via chrome.scripting).
 * Wraps window.fetch to observe Claude API traffic and dispatch typed events.
 */
(() => {
  const _nativeFetch = window.fetch.bind(window);

  window.fetch = async function cmFetch(...args) {
    const req  = args[0];
    const url  = typeof req === 'string' ? req : (req instanceof Request ? req.url : String(req));
    const resp = await _nativeFetch(...args);

    // ── Usage quota endpoint ──────────────────────────────────
    if (/\/api\/organizations\/.+\/usage/.test(url)) {
      _handleJson(resp.clone(), 'cm:usage');
    }

    // ── Conversation tree load (not a completion) ─────────────
    if (/\/api\/organizations\/.+\/chat_conversations\/[^/]+$/.test(url)) {
      _handleJson(resp.clone(), 'cm:conversation');
    }

    // ── Streaming completion ──────────────────────────────────
    if (/\/chat_conversations\/.+\/completion/.test(url)) {
      _handleStream(resp.clone());
    }

    return resp;
  };

  // ── Helpers ───────────────────────────────────────────────────

  async function _handleJson(resp, evtType) {
    try {
      const data = await resp.json();
      _emit(evtType, data);
    } catch (_) {}
  }

  async function _handleStream(resp) {
    try {
      const reader  = resp.body.getReader();
      const decoder = new TextDecoder();
      let   buf     = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        // Process complete SSE lines
        const lines = buf.split('\n');
        buf = lines.pop(); // keep incomplete tail

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const json = JSON.parse(line.slice(6));
            if (json.message_limit) _emit('cm:limit', json.message_limit);
            if (json.type === 'message_stop') _emit('cm:stop', {});
          } catch (_) {}
        }
      }
    } catch (_) {}
  }

  function _emit(type, payload) {
    window.dispatchEvent(
      new CustomEvent('ClaudePulse', { detail: { type, payload } })
    );
  }

  console.debug('[CM] Interceptor active.');
})();
