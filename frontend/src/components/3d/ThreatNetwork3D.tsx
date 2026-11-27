import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

export interface ThreatNodeItem {
  id: string
  label: string
  color?: string
}

interface ThreatNetwork3DProps {
  nodes: ThreatNodeItem[]
  selectedId: string
  onSelectNode: (id: string) => void
  className?: string
}

export const ThreatNetwork3D: React.FC<ThreatNetwork3DProps> = ({
  nodes,
  selectedId,
  onSelectNode,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement>(null)
  const selectedIdRef = useRef(selectedId)
  const onSelectRef = useRef(onSelectNode)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [hasWebGL, setHasWebGL] = useState(true)

  useEffect(() => {
    selectedIdRef.current = selectedId
  }, [selectedId])

  useEffect(() => {
    onSelectRef.current = onSelectNode
  }, [onSelectNode])

  useEffect(() => {
    const container = mountRef.current
    if (!container || nodes.length === 0) return

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const width = container.clientWidth || 420
    const height = container.clientHeight || 300

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100)
    camera.position.set(0, 0.4, 7.2)

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
    container.appendChild(renderer.domElement)

    const networkGroup = new THREE.Group()
    scene.add(networkGroup)

    // Central SafeHER Trust Core
    const coreGeo = new THREE.OctahedronGeometry(0.58, 1)
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: 0x111716,
      emissive: 0xd5ff54,
      emissiveIntensity: 0.45,
      metalness: 0.7,
      roughness: 0.18,
      wireframe: false,
    })
    const coreMesh = new THREE.Mesh(coreGeo, coreMat)
    networkGroup.add(coreMesh)

    const coreWireGeo = new THREE.EdgesGeometry(coreGeo)
    const coreWireMat = new THREE.LineBasicMaterial({
      color: 0xd5ff54,
      transparent: true,
      opacity: 0.65,
    })
    const coreWire = new THREE.LineSegments(coreWireGeo, coreWireMat)
    networkGroup.add(coreWire)

    // Threat Nodes arranged in 3D constellation
    const nodeMeshes: { mesh: THREE.Mesh; id: string; basePos: THREE.Vector3 }[] = []
    const disposableGeos: THREE.BufferGeometry[] = [coreGeo, coreWireGeo]
    const disposableMats: THREE.Material[] = [coreMat, coreWireMat]

    const count = nodes.length
    const positions: THREE.Vector3[] = nodes.map((_, i) => {
      const angle = (i / count) * Math.PI * 2
      const radius = 2.25 + (i % 2) * 0.35
      const y = Math.sin(angle * 2) * 0.75
      return new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius)
    })

    nodes.forEach((node, idx) => {
      const geo = new THREE.SphereGeometry(0.22, 24, 24)
      const mat = new THREE.MeshPhysicalMaterial({
        color: 0x111716,
        emissive: 0xd5ff54,
        emissiveIntensity: 0.4,
        metalness: 0.5,
        roughness: 0.2,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.copy(positions[idx])
      mesh.userData = { nodeId: node.id }
      networkGroup.add(mesh)
      nodeMeshes.push({ mesh, id: node.id, basePos: positions[idx] })
      disposableGeos.push(geo)
      disposableMats.push(mat)
    })

    // Connect every node to center + adjacent neighbors
    const linePoints: THREE.Vector3[] = []
    positions.forEach((pos, i) => {
      linePoints.push(new THREE.Vector3(0, 0, 0), pos)
      const next = positions[(i + 1) % positions.length]
      linePoints.push(pos, next)
    })
    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints)
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xd5ff54,
      transparent: true,
      opacity: 0.35,
    })
    const connections = new THREE.LineSegments(lineGeo, lineMat)
    networkGroup.add(connections)
    disposableGeos.push(lineGeo)
    disposableMats.push(lineMat)

    // Lighting
    const hemi = new THREE.HemisphereLight(0xe2ff84, 0x070908, 1.1)
    scene.add(hemi)
    const key = new THREE.DirectionalLight(0xf0f2eb, 2.2)
    key.position.set(4, 5, 5)
    scene.add(key)

    // Raycasting for hover & click + interactive 3D drag orbit
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let isDragging = false
    let draggedDistance = 0
    let prevX = 0
    let prevY = 0
    let dragYaw = 0
    let dragPitch = 0

    const updatePointer = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((e.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1
      pointer.y = -((e.clientY - rect.top) / Math.max(rect.height, 1)) * 2 + 1
    }

    const handlePointerDown = (e: MouseEvent) => {
      isDragging = true
      draggedDistance = 0
      prevX = e.clientX
      prevY = e.clientY
    }

    const handlePointerUp = () => {
      isDragging = false
    }

    const handlePointerMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - prevX
        const dy = e.clientY - prevY
        draggedDistance += Math.abs(dx) + Math.abs(dy)
        dragYaw += dx * 0.01
        dragPitch = Math.max(-0.5, Math.min(0.5, dragPitch + dy * 0.008))
        prevX = e.clientX
        prevY = e.clientY
        return
      }
      updatePointer(e)
      raycaster.setFromCamera(pointer, camera)
      const hits = raycaster.intersectObjects(nodeMeshes.map((n) => n.mesh))
      if (hits.length > 0) {
        const id = hits[0].object.userData.nodeId as string
        setHoveredId(id)
        renderer.domElement.style.cursor = 'pointer'
      } else {
        setHoveredId(null)
        renderer.domElement.style.cursor = 'grab'
      }
    }

    const handleClick = (e: MouseEvent) => {
      if (draggedDistance > 6) return
      updatePointer(e)
      raycaster.setFromCamera(pointer, camera)
      const hits = raycaster.intersectObjects(nodeMeshes.map((n) => n.mesh))
      if (hits.length > 0) {
        const id = hits[0].object.userData.nodeId as string
        onSelectRef.current(id)
      }
    }

    renderer.domElement.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('mouseup', handlePointerUp)
    renderer.domElement.addEventListener('mousemove', handlePointerMove)
    renderer.domElement.addEventListener('click', handleClick)

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

    const updateVisualStates = (t: number) => {
      nodeMeshes.forEach(({ mesh, id, basePos }, idx) => {
        const mat = mesh.material as THREE.MeshPhysicalMaterial
        const isSelected = id === selectedIdRef.current
        if (isSelected) {
          mat.emissive.setHex(0xd5ff54)
          mat.emissiveIntensity = 0.95
          mesh.scale.setScalar(1.38)
        } else {
          mat.emissive.setHex(0xd5ff54)
          mat.emissiveIntensity = 0.38
          mesh.scale.setScalar(1.0)
        }
        if (!prefersReducedMotion) {
          mesh.position.y = basePos.y + Math.sin(t * 1.4 + idx) * 0.08
        }
      })
    }

    if (prefersReducedMotion) {
      networkGroup.rotation.y = 0.35
      updateVisualStates(0)
      renderer.render(scene, camera)
    } else {
      const animate = () => {
        rafId = requestAnimationFrame(animate)
        const delta = clock.getDelta()
        const t = clock.getElapsedTime()

        if (!isDragging) {
          networkGroup.rotation.y += delta * 0.16
          dragYaw *= 0.94
          dragPitch *= 0.94
        }
        networkGroup.rotation.y += dragYaw * 0.15
        dragYaw *= 0.85
        networkGroup.rotation.x += (dragPitch - networkGroup.rotation.x) * 0.08
        coreMesh.rotation.y -= delta * 0.25
        coreWire.rotation.y -= delta * 0.25
        updateVisualStates(t)

        renderer.render(scene, camera)
      }
      animate()
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      renderer.domElement.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('mouseup', handlePointerUp)
      renderer.domElement.removeEventListener('mousemove', handlePointerMove)
      renderer.domElement.removeEventListener('click', handleClick)
      resizeObserver.disconnect()
      disposableGeos.forEach((g) => g.dispose())
      disposableMats.forEach((m) => m.dispose())
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [nodes])

  if (!hasWebGL) {
    return (
      <div className={`flex items-center justify-center w-full h-full ${className}`}>
        <div className="text-xs font-mono text-[#929b93]">Interactive Threat Constellation</div>
      </div>
    )
  }

  const hoveredNode = nodes.find((n) => n.id === hoveredId)

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        aria-label="Interactive 3D Threat Intelligence Network"
      />
      {hoveredNode && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#070908]/90 border border-[#d5ff54]/40 text-[11px] font-mono text-[#f0f2eb] whitespace-nowrap shadow-lg">
          {hoveredNode.label} — Click to inspect
        </div>
      )}
    </div>
  )
}
