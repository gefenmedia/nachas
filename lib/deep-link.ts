import { useState as useReactState, useEffect as useReactEffect } from 'react'

export type DeepLinkKind = 'challenge' | 'user'

export interface DeepLinkTarget {
  kind: DeepLinkKind
  id: string
  /** Canonical in-app path for the target (query + hash for static-export safety). */
  path: string
  /** Path to restore after login/signup. */
  returnTo: string
}

const RETURN_TO_KEY = 'nachas_return_to'

function hashParts(hash: string): { path: string; params: URLSearchParams } {
  const raw = (hash || '').replace(/^#/, '')
  if (!raw) return { path: '', params: new URLSearchParams() }
  const [pathPart, queryPart = ''] = raw.split('?')
  const path = pathPart.startsWith('/') ? pathPart : ''
  return { path, params: new URLSearchParams(queryPart) }
}

export function locationParams(loc: Location): URLSearchParams {
  const params = new URLSearchParams(loc.search)
  hashParts(loc.hash).params.forEach((value, key) => {
    if (!params.has(key)) params.set(key, value)
  })
  return params
}

/**
 * Static-export-safe replacement for next/navigation's useSearchParams(), which
 * can return empty on first paint in `output: 'export'` builds. Reads the real
 * URL (query + hash) on mount. Returns null until mounted so callers can wait.
 */
export function useUrlParams(): URLSearchParams | null {
  const [params, setParams] = useReactState<URLSearchParams | null>(null)
  useReactEffect(() => {
    setParams(locationParams(window.location))
  }, [])
  return params
}

function pickId(params: URLSearchParams, kind: DeepLinkKind, allowPlainId: boolean): string {
  const specific = kind === 'challenge'
    ? ['challenge_id', 'challengeId', 'challenge', 'cid']
    : ['user_id', 'userId', 'user', 'uid']
  for (const key of specific) {
    const value = params.get(key)
    if (value) return value
  }
  return allowPlainId ? (params.get('id') || '') : ''
}

export function canonicalDeepLink(kind: DeepLinkKind, id: string, extra?: Record<string, string>): string {
  const base = kind === 'challenge' ? '/challenge/' : '/user/'
  const query = new URLSearchParams({ id })
  if (extra) Object.entries(extra).forEach(([key, value]) => value && query.set(key, value))
  // id in both query and hash — the hash survives proxies/redirects that strip query strings
  return `${base}?${query.toString()}#id=${id}`
}

/**
 * Parse the URL the app was launched with and turn shared/deep links into an
 * in-app target. Supports /challenge/?id=, /user/?id=, hash routes like
 * /#/challenge?id=, and root launches such as /?challenge_id= or /?user_id=.
 */
export function getDeepLinkFromLocation(loc: Location): DeepLinkTarget | null {
  const params = locationParams(loc)
  const hashPath = hashParts(loc.hash).path.replace(/\/+$/, '')
  const pagePath = (loc.pathname || '/').replace(/\/+$/, '') || '/'
  const path = hashPath || pagePath

  let kind: DeepLinkKind | null = null
  let allowPlainId = false
  if (path.startsWith('/challenge')) { kind = 'challenge'; allowPlainId = true }
  else if (path.startsWith('/user')) { kind = 'user'; allowPlainId = true }
  else if (params.get('challenge_id') || params.get('challengeId') || params.get('challenge') || params.get('cid')) kind = 'challenge'
  else if (params.get('user_id') || params.get('userId') || params.get('uid')) kind = 'user'

  if (!kind) return null
  const id = pickId(params, kind, allowPlainId)
  if (!id) return null

  const extra: Record<string, string> = {}
  if (params.get('sponsor')) extra.sponsor = params.get('sponsor') || '1'
  if (params.get('donate')) extra.sponsor = params.get('donate') || '1'
  if (params.get('new')) extra.new = params.get('new') || ''
  if (params.get('buddy')) extra.buddy = params.get('buddy') || ''

  const pathToTarget = canonicalDeepLink(kind, id, extra)
  return { kind, id, path: pathToTarget, returnTo: pathToTarget }
}

export function safeInternalPath(path: string | null | undefined): string {
  const p = (path || '').trim()
  if (!p.startsWith('/') || p.startsWith('//')) return ''
  if (/^[a-z][a-z0-9+.-]*:/i.test(p)) return ''
  return p
}

export function rememberReturnTo(path: string) {
  const safe = safeInternalPath(path)
  if (!safe || typeof sessionStorage === 'undefined') return
  try { sessionStorage.setItem(RETURN_TO_KEY, safe) } catch {}
}

export function peekReturnTo(): string {
  if (typeof sessionStorage === 'undefined') return ''
  try { return safeInternalPath(sessionStorage.getItem(RETURN_TO_KEY)) } catch { return '' }
}

export function consumeReturnTo(): string {
  const value = peekReturnTo()
  if (typeof sessionStorage !== 'undefined') {
    try { sessionStorage.removeItem(RETURN_TO_KEY) } catch {}
  }
  return value
}

/** Current page as a safe return target, normalized when it is itself a deep link. */
export function currentReturnTo(loc: Location): string {
  const deep = getDeepLinkFromLocation(loc)
  if (deep) return deep.returnTo
  return safeInternalPath(`${loc.pathname}${loc.search}${loc.hash}`)
}
