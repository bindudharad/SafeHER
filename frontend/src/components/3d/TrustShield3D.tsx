import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { SAFEHER_LOGO_SRC } from '../common/SafeHERLogo'

interface TrustShield3DProps {
  className?: string
  interactive?: boolean
}

/**
 * Creates a true, symmetrical heraldic protection shield silhouette:
 * - Crisp central crown peak
 * - Sharp armored shoulder corners
 * - Tapered flanks sweeping smoothly to a pointed bottom keel
 */
function createHeraldicShieldShape(scale = 1): THREE.Shape {
  const s = new THREE.Shape()
  const w = 1.38 * scale
  const topY = 1.78 * scale
  const shoulderY = 1.44 * scale
  const midY = 0.14 * scale
  const tipY = -1.86 * scale

  s.moveTo(0, topY)
  // Upper-right crown to shoulder corner
  s.quadraticCurveTo(w * 0.56, topY - 0.04 * scale, w, shoulderY)
  // Right armored flank
  s.bezierCurveTo(w * 1.02, shoulderY - 0.45 * scale, w * 0.96, midY + 0.45 * scale, w * 0.88, midY)
  // Right lower keel sweeping to bottom apex
  s.bezierCurveTo(w * 0.72, -0.78 * scale, w * 0.34, -1.42 * scale, 0, tipY)
  // Left lower keel sweeping from bottom apex
  s.bezierCurveTo(-w * 0.34, -1.42 * scale, -w * 0.72, -0.78 * scale, -w * 0.88, midY)
  // Left armored flank
  s.bezierCurveTo(-w * 0.96, midY + 0.45 * scale, -w * 1.02, shoulderY - 0.45 * scale, -w, shoulderY)
  // Upper-left shoulder back to crown peak
  s.quadraticCurveTo(-w * 0.56, topY - 0.04 * scale, 0, topY)

  return s
}

/**
 * Generates a soft radial shadow texture on an offscreen canvas for the floating floor shadow.
 */
function createSoftShadowTexture(): THREE.CanvasTexture | null {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 120)
  grad.addColorStop(0, 'rgba(139, 124, 255, 0.38)')
  grad.addColorStop(0.45, 'rgba(101, 0, 184, 0.16)')
  grad.addColorStop(1, 'rgba(8, 11, 24, 0)')

  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 256, 256)

  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

export const TrustShield3D: React.FC<TrustShield3DProps> = ({
  className = '',
  interactive = true,
}) => {
  const mountRef = useRef<HTMLDivElement>(null)
  const [hasWebGL, setHasWebGL] = useState(true)
  const [isHovered, setIsHovered] = useState(false)
  const hoveredRef = useRef(false)

  useEffect(() => {
    hoveredRef.current = isHovered
  }, [isHovered])

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Verify WebGL availability
    const testCanvas = document.createElement('canvas')
    const gl =
      testCanvas.getContext('webgl') ||
      testCanvas.getContext('experimental-webgl')
    if (!gl) {
      setHasWebGL(false)
      return
    }

    const width = container.clientWidth || 360
    const height = container.clientHeight || 300

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100)
    camera.position.set(0, 0.08, 9.1)

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
    renderer.toneMappingExposure = 1.18
    container.appendChild(renderer.domElement)

    // --------------------------------------------------------
    // 1. SCULPTED 3D PROTECTION SHIELD ASSEMBLY
    // --------------------------------------------------------
    const shieldGroup = new THREE.Group()
    scene.add(shieldGroup)

    // Layer A: Outer Armored Bevel Frame (Deep Midnight / Deep Purple metallic-glass)
    const outerShape = createHeraldicShieldShape(1.0)
    const outerGeo = new THREE.ExtrudeGeometry(outerShape, {
      depth: 0.34,
      bevelEnabled: true,
      bevelSegments: 6,
      steps: 1,
      bevelSize: 0.095,
      bevelThickness: 0.12,
    })
    outerGeo.center()

    const outerMat = new THREE.MeshPhysicalMaterial({
      color: 0x120b2e,
      emissive: 0x52009a,
      emissiveIntensity: 0.24,
      metalness: 0.85,
      roughness: 0.14,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      reflectivity: 0.96,
    })
    const outerMesh = new THREE.Mesh(outerGeo, outerMat)
    shieldGroup.add(outerMesh)

    // Crisp Lavender reflective bevel edge on outer armor
    const outerEdgesGeo = new THREE.EdgesGeometry(outerGeo, 28)
    const outerEdgesMat = new THREE.LineBasicMaterial({
      color: 0xa99bff,
      transparent: true,
      opacity: 0.78,
    })
    const outerEdges = new THREE.LineSegments(outerEdgesGeo, outerEdgesMat)
    shieldGroup.add(outerEdges)

    // Layer B: Sculpted Violet Glass Front Plate
    const frontShape = createHeraldicShieldShape(0.84)
    const frontGeo = new THREE.ExtrudeGeometry(frontShape, {
      depth: 0.15,
      bevelEnabled: true,
      bevelSegments: 5,
      steps: 1,
      bevelSize: 0.048,
      bevelThickness: 0.06,
    })
    frontGeo.center()

    const frontMat = new THREE.MeshPhysicalMaterial({
      color: 0x26165c,
      emissive: 0x6f5cff,
      emissiveIntensity: 0.26,
      metalness: 0.32,
      roughness: 0.10,
      transparent: true,
      opacity: 0.90,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      reflectivity: 0.95,
    })
    const frontMesh = new THREE.Mesh(frontGeo, frontMat)
    frontMesh.position.z = 0.18
    shieldGroup.add(frontMesh)

    // Restrained Ice Cyan inner rim highlight
    const innerRimGeo = new THREE.EdgesGeometry(frontGeo, 26)
    const innerRimMat = new THREE.LineBasicMaterial({
      color: 0x55d6e8,
      transparent: true,
      opacity: 0.50,
    })
    const innerRim = new THREE.LineSegments(innerRimGeo, innerRimMat)
    innerRim.position.z = 0.18
    shieldGroup.add(innerRim)

    // Layer C: Sculpted Inner Crest Backing & Official SafeHER Emblem Medallion
    const crestShape = createHeraldicShieldShape(0.54)
    const crestGeo = new THREE.ExtrudeGeometry(crestShape, {
      depth: 0.06,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.025,
      bevelThickness: 0.025,
    })
    crestGeo.center()

    const crestMat = new THREE.MeshPhysicalMaterial({
      color: 0x0d1224,
      emissive: 0x8b7cff,
      emissiveIntensity: 0.22,
      metalness: 0.55,
      roughness: 0.2,
      clearcoat: 0.9,
    })
    const crestMesh = new THREE.Mesh(crestGeo, crestMat)
    crestMesh.position.z = 0.29
    shieldGroup.add(crestMesh)

    // Official SafeHER Shield Emblem rendered cleanly inside a sculpted 3D bezel
    const textureLoader = new THREE.TextureLoader()
    const emblemTex = textureLoader.load(SAFEHER_LOGO_SRC)
    emblemTex.colorSpace = THREE.SRGBColorSpace
    const emblemGeo = new THREE.CircleGeometry(0.44, 48)
    const emblemMat = new THREE.MeshBasicMaterial({
      map: emblemTex,
      color: 0xedeaff,
      transparent: true,
      opacity: 0.96,
    })
    const emblemMesh = new THREE.Mesh(emblemGeo, emblemMat)
    emblemMesh.position.set(0, 0.04, 0.365)
    shieldGroup.add(emblemMesh)

    const emblemBezelGeo = new THREE.TorusGeometry(0.455, 0.032, 16, 64)
    const emblemBezelMat = new THREE.MeshPhysicalMaterial({
      color: 0x8b7cff,
      emissive: 0x52009a,
      emissiveIntensity: 0.35,
      metalness: 0.82,
      roughness: 0.16,
      clearcoat: 1.0,
    })
    const emblemBezelMesh = new THREE.Mesh(emblemBezelGeo, emblemBezelMat)
    emblemBezelMesh.position.set(0, 0.04, 0.365)
    shieldGroup.add(emblemBezelMesh)

    const emblemHaloGeo = new THREE.TorusGeometry(0.505, 0.009, 12, 64)
    const emblemHaloMat = new THREE.MeshBasicMaterial({
      color: 0x55d6e8,
      transparent: true,
      opacity: 0.48,
    })
    const emblemHaloMesh = new THREE.Mesh(emblemHaloGeo, emblemHaloMat)
    emblemHaloMesh.position.set(0, 0.04, 0.365)
    shieldGroup.add(emblemHaloMesh)

    // Subtle back spine plate for convincing 360-degree depth when rotating
    const backShape = createHeraldicShieldShape(0.72)
    const backGeo = new THREE.ExtrudeGeometry(backShape, {
      depth: 0.08,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.03,
      bevelThickness: 0.03,
    })
    backGeo.center()
    const backMesh = new THREE.Mesh(backGeo, crestMat)
    backMesh.position.z = -0.17
    shieldGroup.add(backMesh)

    // --------------------------------------------------------
    // 2. SOFT FLOATING SHADOW BENEATH THE SHIELD
    // --------------------------------------------------------
    const shadowTex = createSoftShadowTexture()
    const shadowGeo = new THREE.PlaneGeometry(3.2, 1.5)
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    })
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat)
    shadowMesh.rotation.x = -Math.PI / 2
    shadowMesh.position.set(0, -2.38, 0)
    scene.add(shadowMesh)

    // --------------------------------------------------------
    // 3. SOPHISTICATED 3-RING ORBITAL SYSTEM (Outside Shield)
    // --------------------------------------------------------
    const orbitConfigs = [
      {
        radius: 2.22,
        tube: 0.016,
        color: 0x8b7cff,
        opacity: 0.58,
        tilt: new THREE.Euler(1.18, 0.18, 0.22),
        speed: 0.16,
        nodeAngles: [0.4, Math.PI + 0.4],
        nodeColor: 0x8b7cff,
      },
      {
        radius: 2.52,
        tube: 0.013,
        color: 0xa99bff,
        opacity: 0.40,
        tilt: new THREE.Euler(1.05, -0.34, -0.18),
        speed: -0.12,
        nodeAngles: [Math.PI * 0.65],
        nodeColor: 0x55d6e8,
      },
      {
        radius: 2.82,
        tube: 0.011,
        color: 0x55d6e8,
        opacity: 0.34,
        tilt: new THREE.Euler(1.36, 0.24, 0.08),
        speed: 0.09,
        nodeAngles: [Math.PI * 1.45],
        nodeColor: 0x52d6b2,
      },
    ]

    const orbitGroups: { group: THREE.Group; speed: number }[] = []
    const disposableGeos: THREE.BufferGeometry[] = [
      outerGeo,
      outerEdgesGeo,
      frontGeo,
      innerRimGeo,
      crestGeo,
      emblemGeo,
      emblemBezelGeo,
      emblemHaloGeo,
      backGeo,
      shadowGeo,
    ]
    const disposableMats: THREE.Material[] = [
      outerMat,
      outerEdgesMat,
      frontMat,
      innerRimMat,
      crestMat,
      emblemMat,
      emblemBezelMat,
      emblemHaloMat,
      shadowMat,
    ]

    orbitConfigs.forEach((cfg) => {
      const group = new THREE.Group()
      group.rotation.copy(cfg.tilt)

      const ringGeo = new THREE.TorusGeometry(cfg.radius, cfg.tube, 16, 128)
      const ringMat = new THREE.MeshBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: cfg.opacity,
      })
      const ringMesh = new THREE.Mesh(ringGeo, ringMat)
      group.add(ringMesh)
      disposableGeos.push(ringGeo)
      disposableMats.push(ringMat)

      // Mount illuminated nodes directly ON the ring geometry
      cfg.nodeAngles.forEach((ang) => {
        const nx = Math.cos(ang) * cfg.radius
        const ny = Math.sin(ang) * cfg.radius

        const nodeGeo = new THREE.SphereGeometry(0.068, 16, 16)
        const nodeMat = new THREE.MeshBasicMaterial({ color: cfg.nodeColor })
        const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat)
        nodeMesh.position.set(nx, ny, 0)
        group.add(nodeMesh)

        const glowGeo = new THREE.SphereGeometry(0.13, 16, 16)
        const glowMat = new THREE.MeshBasicMaterial({
          color: cfg.nodeColor,
          transparent: true,
          opacity: 0.22,
        })
        const glowMesh = new THREE.Mesh(glowGeo, glowMat)
        glowMesh.position.set(nx, ny, 0)
        group.add(glowMesh)

        disposableGeos.push(nodeGeo, glowGeo)
        disposableMats.push(nodeMat, glowMat)
      })

      scene.add(group)
      orbitGroups.push({ group, speed: cfg.speed })
    })

    // --------------------------------------------------------
    // 4. RESTRAINED AMBIENT MICRO-PARTICLES
    // --------------------------------------------------------
    const particleCount = 42
    const particleGeo = new THREE.BufferGeometry()
    const particlePositions = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 7.5
      particlePositions[i + 1] = (Math.random() - 0.5) * 6.0
      particlePositions[i + 2] = (Math.random() - 0.5) * 4.5 - 1.0
    }
    particleGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(particlePositions, 3)
    )
    const particleMat = new THREE.PointsMaterial({
      color: 0x8b7cff,
      size: 0.035,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
    })
    const particlePoints = new THREE.Points(particleGeo, particleMat)
    scene.add(particlePoints)
    disposableGeos.push(particleGeo)
    disposableMats.push(particleMat)

    // --------------------------------------------------------
    // 5. STUDIO 3-POINT + RIM LIGHTING
    // --------------------------------------------------------
    const hemiLight = new THREE.HemisphereLight(0xa99bff, 0x080b18, 1.05)
    scene.add(hemiLight)

    const keyLight = new THREE.DirectionalLight(0xf4f5ff, 2.8)
    keyLight.position.set(3.8, 4.8, 5.5)
    scene.add(keyLight)

    const violetRimLight = new THREE.PointLight(0x8b7cff, 6.2, 16)
    violetRimLight.position.set(-3.8, 2.2, 3.2)
    scene.add(violetRimLight)

    const cyanAccentLight = new THREE.PointLight(0x55d6e8, 3.6, 14)
    cyanAccentLight.position.set(3.8, -2.5, -1.6)
    scene.add(cyanAccentLight)

    // --------------------------------------------------------
    // 6. MOUSE PARALLAX & RESIZE OBSERVER
    // --------------------------------------------------------
    let targetX = 0
    let targetY = 0

    const handleMouseMove = (e: MouseEvent) => {
      if (prefersReducedMotion) return
      const rect = container.getBoundingClientRect()
      const mx = ((e.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1
      const my = -(((e.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1)
      targetX = THREE.MathUtils.clamp(mx * 0.35, -0.45, 0.45)
      targetY = THREE.MathUtils.clamp(my * 0.25, -0.35, 0.35)
    }

    if (interactive && !prefersReducedMotion) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true })
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect
        if (newW > 0 && newH > 0) {
          camera.aspect = newW / newH
          camera.updateProjectionMatrix()
          renderer.setSize(newW, newH)
        }
      }
    })
    resizeObserver.observe(container)

    // --------------------------------------------------------
    // 7. CALM, CONTROLLED ANIMATION LOOP
    // --------------------------------------------------------
    const clock = new THREE.Clock()
    let animationFrameId = 0

    if (prefersReducedMotion) {
      shieldGroup.rotation.y = 0.12
      renderer.render(scene, camera)
    } else {
      const animate = () => {
        animationFrameId = requestAnimationFrame(animate)

        const delta = clock.getDelta()
        const t = clock.getElapsedTime()

        // Smooth camera parallax
        camera.position.x += (targetX - camera.position.x) * 0.045
        camera.position.y += (targetY + 0.1 - camera.position.y) * 0.045
        camera.lookAt(0, 0, 0)

        // Calm vertical float + dignified slow 3/4 yaw (shows 3D bevel depth)
        const floatY = Math.sin(t * 1.15) * 0.075
        shieldGroup.position.y = floatY
        shieldGroup.rotation.y = 0.20 + Math.sin(t * 0.42) * 0.14 + camera.position.x * 0.14
        shieldGroup.rotation.x = -camera.position.y * 0.14

        // Subtle reflective light movement & glow breathing
        violetRimLight.position.x = -3.6 + Math.sin(t * 0.6) * 0.8
        const breath = 0.5 + 0.5 * Math.sin(t * 1.4)
        frontMat.emissiveIntensity = (hoveredRef.current ? 0.44 : 0.32) + breath * 0.06
        innerRimMat.opacity = 0.36 + breath * 0.14

        // Sync floor shadow scale & opacity with vertical float
        const shadowScale = 1.0 - floatY * 0.5
        shadowMesh.scale.set(shadowScale, shadowScale, 1)
        shadowMat.opacity = 0.62 - floatY * 0.8

        // Smooth orbital ring rotation along each ring's local Z plane
        orbitGroups.forEach(({ group, speed }) => {
          group.rotation.z += delta * speed
        })

        // Gentle particle drift
        particlePoints.rotation.y += delta * 0.03

        renderer.render(scene, camera)
      }
      animate()
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
      if (interactive && !prefersReducedMotion) {
        window.removeEventListener('mousemove', handleMouseMove)
      }
      resizeObserver.disconnect()

      disposableGeos.forEach((g) => g.dispose())
      disposableMats.forEach((m) => m.dispose())
      emblemTex.dispose()
      if (shadowTex) shadowTex.dispose()

      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [interactive])

  // Graceful 2D Heraldic Shield Fallback when WebGL is unavailable
  if (!hasWebGL) {
    return (
      <div
        className={`relative flex items-center justify-center w-full h-full ${className}`}
        aria-label="SafeHER Cryptographic Protection Shield"
      >
        <div className="relative flex items-center justify-center">
          <div className="pointer-events-none absolute -inset-6 rounded-full border border-[#8B7CFF]/30" />
          <div className="pointer-events-none absolute -inset-11 rounded-full border border-[#55D6E8]/20" />
          <svg
            viewBox="0 0 120 140"
            className="w-40 h-44 drop-shadow-[0_12px_32px_rgba(139,124,255,0.35)]"
            fill="none"
          >
            <defs>
              <linearGradient id="shieldFallGrad" x1="0" y1="0" x2="120" y2="140" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#2C1B68" />
                <stop offset="55%" stopColor="#160D36" />
                <stop offset="100%" stopColor="#0D1224" />
              </linearGradient>
            </defs>
            <path
              d="M60 8 L108 26 C109 62 100 98 60 132 C20 98 11 62 12 26 Z"
              fill="url(#shieldFallGrad)"
              stroke="#A99BFF"
              strokeWidth="2.5"
            />
            <path
              d="M60 18 L97 32 C98 62 90 91 60 120 C30 91 22 62 23 32 Z"
              fill="#8B7CFF"
              fillOpacity="0.16"
              stroke="#55D6E8"
              strokeWidth="1.2"
              strokeOpacity="0.55"
            />
          </svg>
          <img
            src={SAFEHER_LOGO_SRC}
            alt="SafeHER Emblem"
            className="absolute w-16 h-16 object-contain rounded-full"
          />
        </div>
      </div>
    )
  }

  return (
    <div
      ref={mountRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative w-full h-full cursor-grab active:cursor-grabbing ${className}`}
      aria-label="Interactive 3D Cryptographic Protection Shield"
    />
  )
}
