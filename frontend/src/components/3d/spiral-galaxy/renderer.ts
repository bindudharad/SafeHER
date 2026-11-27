import { clock, frameLoop, init, surface, type Gpu, type Surface } from 'vgpu'

import { createAnimation, type Animation } from './animation'
import { generateField, type StarField } from './field'
import { installFieldInput, type FieldInput } from './input'
import {
  bakeDirt,
  createEffects,
  createResources,
  createTargets,
  DEFAULT_LOOK,
  destroyTargets,
  prewarm,
  renderChain,
  setBindings,
  setLook,
  stepSimulation,
  type Effects,
  type Resources,
  type Targets,
} from './pipeline'

interface RendererOptions {
  readonly canvas: HTMLCanvasElement
}

interface RenderSize {
  width: number
  height: number
  dpr: number
}

const MAX_DPR = 1.6

/** SafeHER Midnight Aurora star palette: Aurora Violet, Periwinkle, Deep Purple, Ice Cyan, Cloud White */
const SAFEHER_AURORA_PALETTE = ['#d5ff54', '#e2ff84', '#6500B8', '#d5ff54', '#f0f2eb'] as const

function bestEffort(cleanup: () => void): void {
  try {
    cleanup()
  } catch {
    // Teardown must run to completion even when one step throws.
  }
}

export function createRenderer({ canvas }: RendererOptions) {
  let disposed = false
  let gpu: Gpu | undefined
  let canvasSurface: Surface | undefined
  let field: StarField | undefined
  let animation: Animation | undefined
  let resources: Resources | undefined
  let effects: Effects | undefined
  let targets: Targets | undefined
  let input: FieldInput | undefined
  let observer: ResizeObserver | undefined
  let resizeFrame = 0
  let pendingSize: RenderSize | undefined
  let pixelRatio = 1
  let lastDpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio

  const applyResize = () => {
    resizeFrame = 0
    const size = pendingSize
    pendingSize = undefined
    if (disposed || !size || !gpu || !effects || !targets || !resources || !animation || !canvasSurface) return

    const width = Math.max(1, Math.round(size.width * size.dpr))
    const height = Math.max(1, Math.round(size.height * size.dpr))
    if (targets.scene.size[0] === width && targets.scene.size[1] === height && pixelRatio === size.dpr) return

    try {
      const previousTargets = targets
      const nextTargets = createTargets(gpu, [width, height])
      try {
        pixelRatio = size.dpr
        setBindings(effects, nextTargets, resources, { pixelRatio, repelRadius: animation.repelRadius })
      } catch (error) {
        destroyTargets(nextTargets)
        throw error
      }
      targets = nextTargets
      destroyTargets(previousTargets)
      animation.resetMotion()
    } catch (error) {
      fail(error)
    }
  }

  const resize = (size: RenderSize) => {
    if (disposed || size.width <= 0 || size.height <= 0) return
    pendingSize = size
    if (!resizeFrame) resizeFrame = requestAnimationFrame(applyResize)
  }

  const measure = () => {
    const rect = canvas.getBoundingClientRect()
    resize({
      width: rect.width,
      height: rect.height,
      dpr: Math.min(MAX_DPR, Math.max(1, window.devicePixelRatio || 1)),
    })
  }

  const onWindowResize = () => {
    if (window.devicePixelRatio === lastDpr) return
    lastDpr = window.devicePixelRatio
    measure()
  }

  const dispose = () => {
    if (disposed) return
    disposed = true
    if (resizeFrame) cancelAnimationFrame(resizeFrame)
    for (const cleanup of [
      () => observer?.disconnect(),
      () => {
        if (typeof window !== 'undefined') window.removeEventListener('resize', onWindowResize)
      },
      () => input?.dispose(),
      () => gpu?.dispose(),
    ]) {
      bestEffort(cleanup)
    }
  }

  const initialize = async () => {
    if (disposed) return

    const nextGpu = await init({
      requiredLimits: { maxStorageBuffersInVertexStage: 1 } as Record<string, number>,
    })
    if (disposed) {
      nextGpu.dispose()
      return
    }

    gpu = nextGpu
    canvasSurface = surface(gpu, canvas, { dpr: [1, MAX_DPR] })
    pixelRatio = Math.min(MAX_DPR, Math.max(1, window.devicePixelRatio || 1))
    const reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isCompactViewport = typeof window !== 'undefined' && window.innerWidth < 768

    field = generateField({
      palette: SAFEHER_AURORA_PALETTE,
      density: isCompactViewport ? 0.55 : undefined,
    })
    animation = createAnimation(field, { reducedMotion })
    resources = createResources(gpu, field)
    effects = createEffects(gpu, field, resources)
    targets = createTargets(gpu, canvasSurface.size)
    setBindings(effects, targets, resources, { pixelRatio, repelRadius: animation.repelRadius })
    await prewarm(effects, targets, resources, canvasSurface)
    if (disposed) return
    bakeDirt(gpu, effects, resources)
    setLook(effects, {
      lensFlare: DEFAULT_LOOK.lensFlare.enabled,
      dirtyGlass: DEFAULT_LOOK.dirtyGlass.enabled,
    })
    animation.setRepel(animation.repelEnabled)

    input = installFieldInput(canvas, animation)
    observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure)
    observer?.observe(canvas)
    window.addEventListener('resize', onWindowResize)
    measure()

    const gpuClock = clock(gpu)
    frameLoop(gpu, (currentFrame) => {
      if (disposed || !effects || !targets || !resources || !field || !animation || !canvasSurface) return
      stepSimulation(currentFrame, effects, resources, field, animation, gpuClock.deltaTime)
      renderChain(currentFrame, effects, targets, canvasSurface)
    })
  }

  function fail(error: unknown): never {
    dispose()
    throw error
  }

  const ready = initialize().catch((error: unknown) => {
    if (disposed) return
    fail(error)
  })

  return { ready, resize, dispose }
}
