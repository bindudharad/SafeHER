import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

export type ScannerStatus = 'idle' | 'staged' | 'scanning' | 'safe' | 'suspicious' | 'critical'

interface MediaScanner3DProps {
  status?: ScannerStatus
  className?: string
}

const STATUS_COLORS: Record<ScannerStatus, { primary: number; accent: number; hex: string }> = {
  idle: { primary: 0xd5ff54, accent: 0xa8db35, hex: '#d5ff54' },
  staged: { primary: 0xd5ff54, accent: 0xa8db35, hex: '#d5ff54' },
  scanning: { primary: 0xd5ff54, accent: 0xf0f2eb, hex: '#d5ff54' },
  safe: { primary: 0xa8db35, accent: 0xd5ff54, hex: '#a8db35' },
  suspicious: { primary: 0xff927e, accent: 0xd5ff54, hex: '#ff927e' },
  critical: { primary: 0xff927e, accent: 0xf0f2eb, hex: '#ff927e' },
}

/**
 * Interactive 3D Holographic Media Scanner Chamber.
 * Supports pointer-drag orbit rotation, continuous telemetry particle lattice,
 * dual gyroscope rings, laser scan sweep, and an animated 2D Canvas fallback.
 */
export const MediaScanner3D: React.FC<MediaScanner3DProps> = ({
  status = 'idle',
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement>(null)
  const canvas2dRef = useRef<HTMLCanvasElement>(null)
  const statusRef = useRef<ScannerStatus>(status)
  const [hasWebGL, setHasWebGL] = useState(true)

  useEffect(() => {
    statusRef.current = status
  }, [status])

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' })
    } catch {
      setHasWebGL(false)
      return
    }

    const width = container.clientWidth || 300
    const height = container.clientHeight || 260

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100)
    camera.position.set(0, 0.1, 6.2)

    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    container.appendChild(renderer.domElement)

    const rootGroup = new THREE.Group()
    scene.add(rootGroup)

    // Core Holographic Shield Crystal
    const coreGroup = new THREE.Group()
    rootGroup.add(coreGroup)

    const shieldShape = new THREE.Shape()
    shieldShape.moveTo(0, 1.35)
    shieldShape.lineTo(1.05, 0.96)
    shieldShape.bezierCurveTo(1.02, 0.12, 0.72, -0.78, 0, -1.42)
    shieldShape.bezierCurveTo(-0.72, -0.78, -1.02, 0.12, -1.05, 0.96)
    shieldShape.closePath()

    const shieldGeo = new THREE.ExtrudeGeometry(shieldShape, {
      depth: 0.22,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.06,
      bevelThickness: 0.07,
    })
    shieldGeo.center()

    const shieldMat = new THREE.MeshPhysicalMaterial({
      color: 0x111716,
      emissive: 0xd5ff54,
      emissiveIntensity: 0.3,
      metalness: 0.65,
      roughness: 0.16,
      transparent: true,
      opacity: 0.88,
      clearcoat: 1.0,
    })
    const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat)
    coreGroup.add(shieldMesh)

    const edgeGeo = new THREE.EdgesGeometry(shieldGeo, 25)
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0xd5ff54,
      transparent: true,
      opacity: 0.72,
    })
    const edgeLines = new THREE.LineSegments(edgeGeo, edgeMat)
    coreGroup.add(edgeLines)

    // Wireframe outer scanner containment octahedron
    const shellGeo = new THREE.OctahedronGeometry(1.68, 1)
    const shellMat = new THREE.MeshBasicMaterial({
      color: 0xa8db35,
      wireframe: true,
      transparent: true,
      opacity: 0.14,
    })
    const shellMesh = new THREE.Mesh(shellGeo, shellMat)
    rootGroup.add(shellMesh)

    // Twin Concentric Gyroscope Rings
    const ring1Geo = new THREE.TorusGeometry(1.88, 0.018, 16, 96)
    const ring1Mat = new THREE.MeshBasicMaterial({
      color: 0xd5ff54,
      transparent: true,
      opacity: 0.58,
    })
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat)
    ring1.rotation.set(1.22, 0.2, 0)
    rootGroup.add(ring1)

    const ring2Geo = new THREE.TorusGeometry(2.16, 0.012, 16, 96)
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: 0xd5ff54,
      transparent: true,
      opacity: 0.42,
    })
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat)
    ring2.rotation.set(1.05, -0.35, 0.2)
    rootGroup.add(ring2)

    // Laser Sweep Plane
    const sweepGeo = new THREE.TorusGeometry(1.48, 0.018, 12, 64)
    const sweepMat = new THREE.MeshBasicMaterial({
      color: 0xd5ff54,
      transparent: true,
      opacity: 0.28,
    })
    const sweepRing = new THREE.Mesh(sweepGeo, sweepMat)
    sweepRing.rotation.x = Math.PI / 2
    rootGroup.add(sweepRing)

    // Orbiting telemetry points
    const pCount = 240
    const pPos = new Float32Array(pCount * 3)
    for (let i = 0; i < pCount; i += 1) {
      const r = 1.9 + Math.random() * 1.4
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      pPos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pPos[i * 3 + 1] = r * Math.cos(phi)
      pPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    }
    const particleGeo = new THREE.BufferGeometry()
    particleGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
    const particleMat = new THREE.PointsMaterial({
      color: 0xd5ff54,
      size: 0.026,
      transparent: true,
      opacity: 0.48,
      sizeAttenuation: true,
    })
    const cloud = new THREE.Points(particleGeo, particleMat)
    rootGroup.add(cloud)

    // Lighting
    const hemi = new THREE.HemisphereLight(0xe2ff84, 0x070908, 1.15)
    const key = new THREE.DirectionalLight(0xf0f2eb, 2.4)
    key.position.set(3, 4, 5)
    const rim = new THREE.PointLight(0xd5ff54, 4.5, 14)
    rim.position.set(-3, 1.5, 3)
    scene.add(hemi, key, rim)

    // Interactive drag + pointer hover tilt
    let dragging = false
    let prevX = 0
    let prevY = 0
    let dragYaw = 0
    let dragPitch = 0
    let hoverYaw = 0
    let hoverPitch = 0

    const onPointerDown = (e: PointerEvent) => {
      dragging = true
      prevX = e.clientX
      prevY = e.clientY
    }

    const onPointerUp = () => {
      dragging = false
    }

    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect()
      if (dragging) {
        dragYaw += (e.clientX - prevX) * 0.012
        dragPitch = Math.max(-0.55, Math.min(0.55, dragPitch + (e.clientY - prevY) * 0.008))
        prevX = e.clientX
        prevY = e.clientY
      } else if (rect.width > 0 && rect.height > 0) {
        hoverYaw = ((e.clientX - rect.left) / rect.width - 0.5) * 0.55
        hoverPitch = ((e.clientY - rect.top) / rect.height - 0.5) * 0.35
      }
    }

    const onPointerLeave = () => {
      hoverYaw = 0
      hoverPitch = 0
    }

    container.addEventListener('pointerdown', onPointerDown)
    container.addEventListener('pointermove', onPointerMove)
    container.addEventListener('pointerleave', onPointerLeave)
    window.addEventListener('pointerup', onPointerUp)

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect
        if (w > 0 && h > 0) {
          camera.aspect = w / h
          camera.updateProjectionMatrix()
          renderer.setSize(w, h)
        }
      }
    })
    resizeObserver.observe(container)

    const clock = new THREE.Clock()
    let rafId = 0

    const applyStatusColors = (s: ScannerStatus) => {
      const cfg = STATUS_COLORS[s]
      shieldMat.emissive.setHex(cfg.primary)
      edgeMat.color.setHex(cfg.accent)
      ring1Mat.color.setHex(cfg.primary)
      ring2Mat.color.setHex(cfg.accent)
      particleMat.color.setHex(cfg.accent)
      rim.color.setHex(cfg.accent)
      sweepMat.color.setHex(s === 'suspicious' || s === 'critical' ? 0xff927e : 0xd5ff54)
    }

    if (prefersReducedMotion) {
      applyStatusColors(statusRef.current)
      coreGroup.rotation.y = 0.22
      renderer.render(scene, camera)
    } else {
      const animate = () => {
        rafId = requestAnimationFrame(animate)
        const delta = clock.getDelta()
        const t = clock.getElapsedTime()
        const current = statusRef.current
        const isScanning = current === 'scanning'

        applyStatusColors(current)

        if (!dragging) {
          dragYaw *= 0.96
          dragPitch *= 0.96
        }

        rootGroup.rotation.y += (dragYaw + hoverYaw - rootGroup.rotation.y) * 0.08
        rootGroup.rotation.x += (dragPitch + hoverPitch - rootGroup.rotation.x) * 0.08

        coreGroup.position.y = Math.sin(t * 1.4) * 0.08
        coreGroup.rotation.y += delta * (isScanning ? 1.4 : 0.38)
        shellMesh.rotation.y -= delta * (isScanning ? 0.85 : 0.16)
        cloud.rotation.y += delta * 0.09

        ring1.rotation.z += delta * (isScanning ? 1.05 : 0.24)
        ring2.rotation.z -= delta * (isScanning ? 0.8 : 0.18)

        sweepRing.position.y = Math.sin(t * (isScanning ? 3.6 : 1.1)) * 1.1
        sweepMat.opacity = isScanning ? 0.82 : 0.22

        renderer.render(scene, camera)
      }
      animate()
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      container.removeEventListener('pointerdown', onPointerDown)
      container.removeEventListener('pointermove', onPointerMove)
      container.removeEventListener('pointerleave', onPointerLeave)
      window.removeEventListener('pointerup', onPointerUp)
      resizeObserver.disconnect()
      ;[shieldGeo, edgeGeo, shellGeo, ring1Geo, ring2Geo, sweepGeo, particleGeo].forEach((g) => g.dispose())
      ;[shieldMat, edgeMat, shellMat, ring1Mat, ring2Mat, sweepMat, particleMat].forEach((m) => m.dispose())
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  // Animated Canvas 2D fallback when WebGL is unavailable
  useEffect(() => {
    if (hasWebGL) return
    const c = canvas2dRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return

    let raf = 0
    let t = 0
    const render2d = () => {
      t += 0.025
      const w = (c.width = c.clientWidth || 300)
      const h = (c.height = c.clientHeight || 240)
      const cx = w / 2
      const cy = h / 2
      const col = STATUS_COLORS[statusRef.current].hex

      ctx.clearRect(0, 0, w, h)
      ctx.save()
      ctx.translate(cx, cy)

      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath()
        ctx.ellipse(0, 0, 56 + i * 24, 22 + i * 10, t * (i % 2 ? 0.4 : -0.3), 0, Math.PI * 2)
        ctx.strokeStyle = col
        ctx.globalAlpha = 0.28 + i * 0.14
        ctx.lineWidth = 1.2
        ctx.stroke()
      }

      ctx.globalAlpha = 0.9
      ctx.strokeStyle = col
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, -34)
      ctx.lineTo(28, -22)
      ctx.lineTo(22, 16)
      ctx.lineTo(0, 36)
      ctx.lineTo(-22, 16)
      ctx.lineTo(-28, -22)
      ctx.closePath()
      ctx.stroke()

      const sy = Math.sin(t * 1.5) * 32
      ctx.strokeStyle = col
      ctx.globalAlpha = 0.7
      ctx.beginPath()
      ctx.moveTo(-48, sy)
      ctx.lineTo(48, sy)
      ctx.stroke()

      ctx.restore()
      raf = requestAnimationFrame(render2d)
    }
    render2d()
    return () => cancelAnimationFrame(raf)
  }, [hasWebGL])

  if (!hasWebGL) {
    const color = STATUS_COLORS[status].hex
    return (
      <div
        className={`relative flex items-center justify-center w-full h-full ${className}`}
        aria-label="Holographic Media Scanner"
      >
        <canvas ref={canvas2dRef} className="w-full h-full block" />
        <div
          className="pointer-events-none absolute w-14 h-14 rounded-full border border-dashed"
          style={{ borderColor: color }}
        />
      </div>
    )
  }

  return (
    <div
      ref={mountRef}
      title="Interactive 3D Holographic Scanner — drag or hover to inspect"
      className={`relative w-full h-full cursor-grab active:cursor-grabbing ${className}`}
      aria-label="Interactive 3D Holographic Media Scanner"
    />
  )
}
