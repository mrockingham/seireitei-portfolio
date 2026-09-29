// Downloads the world's two models with byte-level progress for the loading screen, then hands
// them to the scene as in-memory blob URLs (so they are fetched once). The download starts as soon
// as this module loads, before React renders the canvas.
import manifest from './world-manifest.json'

export type LoadPhase = 'download' | 'build' | 'error'
export type LoadState = { phase: LoadPhase; loaded: number; total: number }

const WORLD = '/assets/seireitei/seireitei-world.glb'
const COLLISION = '/assets/seireitei/seireitei-collision.glb'

// Expected sizes come from the manifest, so the bar is right even when the server compresses
// the files (a compressed Content-Length would understate the bytes actually streamed).
let state: LoadState = { phase: 'download', loaded: 0, total: manifest.stats.visual.bytes + manifest.stats.collision.bytes }
const listeners = new Set<() => void>()
function update(next: Partial<LoadState>) {
  state = { ...state, ...next }
  if (state.loaded > state.total) state = { ...state, total: state.loaded }
  listeners.forEach(l => l())
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
