import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

export type ScannerStatus = 'idle' | 'staged' | 'scanning' | 'safe' | 'suspicious' | 'critical'

interface MediaScanner3DProps {
  status?: ScannerStatus
  className?: string
}

const STATUS_COLORS: Record<ScannerStatus, { primary: number; accent: number; hex: string }> = {
  idle: { primary: 0x8b7cff, accent: 0x55d6e8, hex: '#8B7CFF' },
  staged: { primary: 0x8b7cff, accent: 0x55d6e8, hex: '#55D6E8' },
  scanning: { primary: 0x55d6e8, accent: 0x8b7cff, hex: '#55D6E8' },
  safe: { primary: 0x52d6b2, accent: 0x55d6e8, hex: '#52D6B2' },
  suspicious: { primary: 0xf0b96b, accent: 0x8b7cff, hex: '#F0B96B' },
  critical: { primary: 0xff718a, accent: 0x8b7cff, hex: '#FF718A' },
}

export const MediaScanner3D: React.FC<MediaScanner3DProps> = ({
  status = 'idle',
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement>(null)
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

    const width = container.clientWidth || 300
    const height = container.clientHeight || 240

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100)
    camera.position.set(0, 0.15, 7.6)

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      })
    } catch {
      setHasWebGL(false)
      return
    }

    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    container.appendChild(renderer.domElement)

    // Core Holographic Shield Octa-Prism / Crystal
    const coreGroup = new THREE.Group()
    scene.add(coreGroup)

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
      color: 0x171d35,
      emissive: 0x8b7cff,
      emissiveIntensity: 0.28,
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
      color: 0x55d6e8,
      transparent: true,
      opacity: 0.65,
    })
    const edgeLines = new THREE.LineSegments(edgeGeo, edgeMat)
    coreGroup.add(edgeLines)

    // Concentric Scanning Rings
    const ring1Geo = new THREE.TorusGeometry(1.85, 0.018, 16, 96)
    const ring1Mat = new THREE.MeshBasicMaterial({
      color: 0x8b7cff,
      transparent: true,
      opacity: 0.55,
    })
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat)
    ring1.rotation.set(1.22, 0.2, 0)
    scene.add(ring1)

    const ring2Geo = new THREE.TorusGeometry(2.15, 0.012, 16, 96)
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: 0x55d6e8,
      transparent: true,
      opacity: 0.42,
    })
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat)
    ring2.rotation.set(1.05, -0.35, 0.2)
    scene.add(ring2)

    // Horizontal Laser Sweep Ring (active during scanning)
    const sweepGeo = new THREE.TorusGeometry(1.42, 0.016, 12, 64)
    const sweepMat = new THREE.MeshBasicMaterial({
      color: 0x55d6e8,
      transparent: true,
      opacity: 0.0,
    })
    const sweepRing = new THREE.Mesh(sweepGeo, sweepMat)
    sweepRing.rotation.x = Math.PI / 2
    scene.add(sweepRing)

    // Lighting
    const hemi = new THREE.HemisphereLight(0xa99bff, 0x080b18, 1.1)
    scene.add(hemi)

    const key = new THREE.DirectionalLight(0xf4f5ff, 2.4)
    key.position.set(3, 4, 5)
    scene.add(key)

    const rim = new THREE.PointLight(0x55d6e8, 4.5, 14)
    rim.position.set(-3, 1.5, 3)
    scene.add(rim)

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
      rim.color.setHex(cfg.accent)
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

        coreGroup.position.y = Math.sin(t * 1.4) * 0.08
        coreGroup.rotation.y += delta * (isScanning ? 1.1 : 0.32)

        ring1.rotation.z += delta * (isScanning ? 0.9 : 0.22)
        ring2.rotation.z -= delta * (isScanning ? 0.7 : 0.16)

        if (isScanning) {
          sweepRing.position.y = Math.sin(t * 3.2) * 1.15
          sweepMat.opacity = 0.75
        } else {
          sweepMat.opacity = 0.0
        }

        renderer.render(scene, camera)
      }
      animate()
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      resizeObserver.disconnect()
      ;[shieldGeo, edgeGeo, ring1Geo, ring2Geo, sweepGeo].forEach((g) => g.dispose())
      ;[shieldMat, edgeMat, ring1Mat, ring2Mat, sweepMat].forEach((m) => m.dispose())
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  if (!hasWebGL) {
    const color = STATUS_COLORS[status].hex
    return (
      <div
        className={`flex items-center justify-center w-full h-full ${className}`}
        aria-label="Holographic Media Scanner"
      >
        <div
          className="w-28 h-28 rounded-full border-2 flex items-center justify-center"
          style={{ borderColor: color }}
        >
          <div
            className="w-16 h-16 rounded-full border border-dashed"
            style={{ borderColor: '#55D6E8' }}
          />
        </div>
      </div>
    )
  }

  return (
    <div
      ref={mountRef}
      className={`relative w-full h-full ${className}`}
      aria-label="Interactive 3D Holographic Media Scanner"
    />
  )
}
