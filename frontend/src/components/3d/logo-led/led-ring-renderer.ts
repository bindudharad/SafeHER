import { clock, effect, frameLoop, init, surface, type Gpu, type Surface } from 'vgpu'
import circularLedWgsl from './circular-led-ring.wgsl'

export function createLedRingRenderer(canvas: HTMLCanvasElement) {
  let disposed = false
  let gpu: Gpu | undefined
  let canvasSurface: Surface | undefined
  let loop: { stop(): void } | undefined
  let observer: ResizeObserver | undefined
  let removeInput = () => {}

  const dispose = () => {
    if (disposed) return
    disposed = true
    loop?.stop()
    loop = undefined
    observer?.disconnect()
    observer = undefined
    removeInput()
    canvasSurface?.dispose()
    canvasSurface = undefined
    gpu?.dispose()
    gpu = undefined
  }

  const ready = (async () => {
    const context = await init()
    if (disposed) {
      context.dispose()
      return
    }
    gpu = context
    const output = surface(context, canvas, { dpr: [1, 2], alphaMode: 'premultiplied' })
    canvasSurface = output

    const motion =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null

    const shader = effect(context, circularLedWgsl, {
      label: 'safeher-circular-led-ring',
      set: {
        params: {
          resolution: output.size,
          time: 0,
          hover: 0,
          pointer: [0, 0],
          reduced: motion?.matches ? 1 : 0,
          _pad: 0,
        },
      },
    })
    await shader.compile({ colors: [output.format] })
    if (disposed) return

    let targetHover = 0
    let hover = 0
    let pointerX = 0
    let pointerY = 0

    const onMove = (e: PointerEvent) => {
      if (!e.isPrimary) return
      const rect = canvas.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return
      const minDim = Math.min(rect.width, rect.height)
      pointerX = (e.clientX - rect.left - rect.width * 0.5) / (minDim * 0.5)
      pointerY = (e.clientY - rect.top - rect.height * 0.5) / (minDim * 0.5)
      targetHover = 1
    }

    const onLeave = () => {
      targetHover = 0
    }

    canvas.addEventListener('pointermove', onMove, { passive: true })
    canvas.addEventListener('pointerdown', onMove, { passive: true })
    canvas.addEventListener('pointerleave', onLeave)
    canvas.addEventListener('pointercancel', onLeave)

    const unsubResize = output.onResize(() => {
      shader.set({ params: { resolution: output.size } })
    })

    observer =
      typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver(() => {
            // Surface tracks canvas size; trigger uniform refresh
            shader.set({ params: { resolution: output.size } })
          })
    observer?.observe(canvas)

    removeInput = () => {
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerdown', onMove)
      canvas.removeEventListener('pointerleave', onLeave)
      canvas.removeEventListener('pointercancel', onLeave)
      unsubResize()
    }

    const time = clock(context)
    let elapsed = 0
    loop = frameLoop(
      context,
      (currentFrame) => {
        if (disposed) return
        const dt = Math.min(time.deltaTime, 0.1)
        elapsed += dt
        const blend = 1 - Math.exp(-8 * dt)
        hover += (targetHover - hover) * blend
        shader.set({
          params: {
            resolution: output.size,
            time: elapsed,
            hover,
            pointer: [pointerX, pointerY],
            reduced: motion?.matches ? 1 : 0,
          },
        })
        currentFrame.pass(output, shader)
      },
      { fps: 60 }
    )
  })().catch((err: unknown) => {
    if (disposed) return
    dispose()
    throw err
  })

  return { ready, dispose }
}
