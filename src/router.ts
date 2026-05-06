type RouteHandler = (root: HTMLElement, params: Record<string, string>) => void | (() => void)

type Route = {
  pattern: RegExp
  keys: string[]
  handler: RouteHandler
}

const routes: Route[] = []
let currentCleanup: (() => void) | null = null
let rootEl: HTMLElement | null = null

export function registerRoute(path: string, handler: RouteHandler): void {
  const keys: string[] = []
  const pattern = new RegExp(
    '^' +
      path.replace(/:([A-Za-z][A-Za-z0-9_]*)/g, (_, key) => {
        keys.push(key)
        return '([^/]+)'
      }) +
      '$'
  )
  routes.push({ pattern, keys, handler })
}

export function startRouter(root: HTMLElement): void {
  rootEl = root
  window.addEventListener('hashchange', dispatch)
  if (!location.hash) location.hash = '#/'
  else dispatch()
}

export function navigate(path: string): void {
  location.hash = '#' + path
}

function dispatch(): void {
  if (!rootEl) return
  if (currentCleanup) {
    currentCleanup()
    currentCleanup = null
  }
  rootEl.innerHTML = ''

  const path = location.hash.replace(/^#/, '') || '/'
  for (const route of routes) {
    const match = route.pattern.exec(path)
    if (!match) continue
    const params: Record<string, string> = {}
    route.keys.forEach((k, i) => (params[k] = decodeURIComponent(match[i + 1])))
    const cleanup = route.handler(rootEl, params)
    if (typeof cleanup === 'function') currentCleanup = cleanup
    return
  }

  rootEl.innerHTML = `<div class="page"><h1>404</h1><p class="muted">${path}</p></div>`
}
