// Downloads the world's two models with byte-level progress for the loading screen, then hands
// them to the scene as in-memory blob URLs (so they are fetched once). The download starts as soon
// as this module loads, before React renders the canvas.
import manifest from './world-manifest.json'

/**
 * download: the two models are streaming in. build: they are parsed and the scene is assembled.
 * compile: shaders compile in the background. frames: the first frames draw (textures upload).
 * ready: the world is on screen. Each phase records when it began, for the loader's estimate.
 */
export type LoadPhase = 'download' | 'build' | 'compile' | 'frames' | 'ready' | 'error'
export type LoadState = { phase: LoadPhase; loaded: number; total: number; since: number }

const WORLD = '/assets/seireitei/seireitei-world.glb'
const COLLISION = '/assets/seireitei/seireitei-collision.glb'

// Expected sizes come from the manifest, so the bar is right even when the server compresses
// the files (a compressed Content-Length would understate the bytes actually streamed).
let state: LoadState = { phase: 'download', loaded: 0, total: manifest.stats.visual.bytes + manifest.stats.collision.bytes, since: performance.now() }
const listeners = new Set<() => void>()
function update(next: Partial<LoadState>) {
  state = { ...state, ...next, since: next.phase && next.phase !== state.phase ? performance.now() : state.since }
  if (state.loaded > state.total) state = { ...state, total: state.loaded }
  listeners.forEach(l => l())
}
/** Moves the loader on to a later phase (called by the scene as it warms up). */
export function setLoadPhase(phase: LoadPhase) { if (state.phase !== phase) update({ phase }) }
/** The scene's one-time shader warm-up has finished (the finale's own warm-up waits for it). */
export const worldWarmup = { done: false }

const span = (from: number, to: number, elapsed: number, tau: number) => from + (to - from) * (1 - Math.exp(-elapsed / tau))
/**
 * Overall progress, 0..1: the download is measured in bytes (70%); the later phases cannot be
 * measured, so each creeps toward its share on a time constant and snaps forward when it ends.
 */
export function loadProgress(s: LoadState, now: number) {
  const t = (now - s.since) / 1000
  switch (s.phase) {
    case 'download': return .7 * Math.min(1, s.loaded / s.total)
    case 'build': return span(.7, .8, t, 1.2)
    case 'compile': return span(.8, .96, t, 2.5)
    case 'frames': return span(.96, 1, t, .3)
    default: return 1
  }
}

/** For useSyncExternalStore. */
export const loadingStore = {
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
  get: () => state,
}

async function download(url: string, onBytes: (n: number) => void) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Could not load ${url} (${res.status})`)
  if (!res.body) { const blob = await res.blob(); onBytes(blob.size); return URL.createObjectURL(blob) }
  const reader = res.body.getReader(), chunks: Uint8Array<ArrayBuffer>[] = []
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    onBytes(value.byteLength)
  }
  return URL.createObjectURL(new Blob(chunks, { type: 'model/gltf-binary' }))
}

let urls: Promise<{ world: string; collision: string }> | null = null
/** The models as blob URLs; the same promise every call (suitable for React's use()). */
export function worldAssetUrls() {
  urls ??= (async () => {
    let loaded = 0, last = 0
    const bytes = (n: number) => {
      loaded += n
      const now = performance.now()
      if (now - last > 60) { last = now; update({ loaded }) }
    }
    try {
      const [world, collision] = await Promise.all([download(WORLD, bytes), download(COLLISION, bytes)])
      update({ loaded, phase: 'build' })
      return { world, collision }
    } catch (error) {
      update({ phase: 'error' })
      throw error
    }
  })()
  return urls
}
worldAssetUrls()
