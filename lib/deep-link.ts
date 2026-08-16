export function getDeepLinkFromLocation(loc: Location | { search: string; pathname?: string }): { kind: string; id: string; returnTo: string } | null {
  if (!loc) return null
  const params = new URLSearchParams(loc.search)
  const id = params.get('id')
  if (id) {
    return { kind: 'challenge', id, returnTo: `/challenge?id=${id}` }
  }
  return null
}

export function canonicalDeepLink(kind: string, id: string): string {
  return `/${kind}?id=${id}`
}

export function locationParams(loc: Location | { search: string }): URLSearchParams {
  return new URLSearchParams(loc.search)
}

export function rememberReturnTo(url: string) {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('nachas_return_to', url)
  }
}

export function currentReturnTo(loc: Location | { pathname: string; search: string }): string {
  return loc.pathname + loc.search
}
