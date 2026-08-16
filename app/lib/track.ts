export function trackEvent(
  name: string,
  props?: Record<string, any>,
  userProps?: Record<string, any>
) {
  if (typeof window === 'undefined') return
  try {
    fetch(`${window.location.origin}/api/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: Math.random().toString(36).substring(2, 15),
        type: name,
        ts: new Date().toISOString(),
        props,
        userProps,
      }),
      keepalive: true,
    }).catch(() => {})
  } catch {}
}

export function syncToServer() {}
