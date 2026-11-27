import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export interface HeroSpatialSceneProps {
  reducedMotion?: boolean;
  className?: string;
}

/**
 * Interactive 3D spatial safety network built with bundled Three.js and a matching
 * Canvas 2D fallback when WebGL is unavailable. Supports smooth pointer parallax,
 * interactive drag-to-orbit rotation, animated photon packets travelling along
 * quadratic Bezier routes, city block geometry, and offscreen frame pausing.
 */
export const HeroSpatialScene: React.FC<HeroSpatialSceneProps> = ({
  reducedMotion = false,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let rafId = 0;
    let isDisposed = false;
    let isVisible = true;
    let cleanupMode: (() => void) | null = null;

    const handleVisibility = () => {
      isVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibility);

    let intersectionObserver: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry) {
            isVisible = entry.isIntersecting && !document.hidden;
          }
        },
        { threshold: 0.05 }
      );
      intersectionObserver.observe(canvas);
    }

    const startCanvas2DFallback = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let width = canvas.clientWidth || 700;
      let height = canvas.clientHeight || 600;
      let t = 0;
      let mx = 0;
      let my = 0;
      let dragYaw = 0;
      let dragging = false;
      let lastX = 0;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.7);

      const stars = Array.from({ length: 170 }, () => ({
        x: Math.random(),
        y: Math.random(),
        r: 0.4 + Math.random() * 1.1,
        a: 0.12 + Math.random() * 0.45,
        phase: Math.random() * Math.PI * 2,
      }));

      interface CityBlock {
        x: number;
        z: number;
        w: number;
        d: number;
        h: number;
      }

      const buildings: CityBlock[] = [];
      for (let x = -7; x <= 7; x += 1) {
        for (let z = -5; z <= 4; z += 1) {
          if (Math.abs(x) < 2 && z > -2) continue;
          if (Math.random() > 0.28) {
            buildings.push({
              x: x * 0.7,
              z: z * 0.68 - 1.2,
              w: 0.32 + Math.random() * 0.12,
              d: 0.3 + Math.random() * 0.12,
              h: 0.35 + Math.random() * 1.65,
            });
          }
        }
      }

      const resize = () => {
        width = canvas.clientWidth || 700;
        height = canvas.clientHeight || 600;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };

      const onPointerMove = (e: PointerEvent) => {
        if (dragging) {
          dragYaw += (e.clientX - lastX) * 0.005;
          lastX = e.clientX;
        } else {
          mx = (e.clientX / Math.max(1, window.innerWidth) - 0.5) * 0.28;
          my = (e.clientY / Math.max(1, window.innerHeight) - 0.5) * 0.12;
        }
      };

      const onPointerDown = (e: PointerEvent) => {
        dragging = true;
        lastX = e.clientX;
      };

      const onPointerUp = () => {
        dragging = false;
      };

      resize();
      window.addEventListener('resize', resize);
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      canvas.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointerup', onPointerUp);

      const project = (x: number, y: number, z: number): [number, number, number, number] => {
        const ry = mx + dragYaw + Math.sin(t * 0.12) * 0.025;
        const rx = my;
        const xx = x * Math.cos(ry) + z * Math.sin(ry);
        const zz = -x * Math.sin(ry) + z * Math.cos(ry);
        const yy = y * Math.cos(rx) - zz * Math.sin(rx);
        const depth = y * Math.sin(rx) + zz * Math.cos(rx);
        const k = 430 / (depth + 13);
        return [width * 0.54 + xx * k, height * 0.56 - yy * k, k, depth];
      };

      const strokeLine = (a: number[], b: number[], color: string, lineWidth = 1) => {
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      };

      const renderFrame = () => {
        if (!reducedMotion) {
          t += 0.008;
          if (!dragging) {
            dragYaw *= 0.96;
          }
        }
        ctx.clearRect(0, 0, width, height);
        const cx = width * 0.54;
        const cy = height * 0.5;

        stars.forEach((s) => {
          const alpha = s.a * (0.7 + 0.3 * Math.sin(t * 1.2 + s.phase));
          ctx.fillStyle = `rgba(213,255,84,${alpha})`;
          ctx.beginPath();
          ctx.arc(s.x * width, s.y * height, s.r, 0, Math.PI * 2);
          ctx.fill();
        });

        const ground = -2.55;
        const sorted = [...buildings].sort((a, b) => b.z - a.z);
        for (let i = -9; i <= 9; i += 1) {
          strokeLine(
            project(i * 0.55, ground, -5.7),
            project(i * 0.55, ground, 4.2),
            'rgba(177,214,148,.075)',
            0.7
          );
        }
        for (let i = -8; i <= 7; i += 1) {
          strokeLine(
            project(-6, ground, i * 0.55),
            project(6, ground, i * 0.55),
            'rgba(177,214,148,.065)',
            0.7
          );
        }

        sorted.forEach((b) => {
          const hw = b.w / 2;
          const hd = b.d / 2;
          const y0 = ground;
          const y1 = ground + b.h;
          const p = [
            project(b.x - hw, y0, b.z - hd),
            project(b.x + hw, y0, b.z - hd),
            project(b.x + hw, y0, b.z + hd),
            project(b.x - hw, y0, b.z + hd),
            project(b.x - hw, y1, b.z - hd),
            project(b.x + hw, y1, b.z - hd),
            project(b.x + hw, y1, b.z + hd),
            project(b.x - hw, y1, b.z + hd),
          ];
          const shade = Math.max(0.02, Math.min(0.11, (p[0][2] / 40) * 0.12));
          ctx.beginPath();
          ctx.moveTo(p[4][0], p[4][1]);
          ctx.lineTo(p[5][0], p[5][1]);
          ctx.lineTo(p[6][0], p[6][1]);
          ctx.lineTo(p[7][0], p[7][1]);
          ctx.closePath();
          ctx.fillStyle = `rgba(23,42,27,${shade + 0.05})`;
          ctx.fill();

          const edges: Array<[number, number]> = [
            [4, 5], [5, 6], [6, 7], [7, 4],
            [0, 4], [1, 5], [2, 6], [3, 7],
            [0, 1], [1, 2], [2, 3], [3, 0],
          ];
          edges.forEach(([a, bx]) => strokeLine(p[a], p[bx], 'rgba(163,211,119,.24)', 0.65));
        });

        const hub: [number, number] = [cx, cy - 22];
        const beaconOffsets: Array<[number, number]> = [
          [-0.36, -0.22],
          [0.36, -0.2],
          [0.3, 0.22],
          [-0.32, 0.24],
          [0.02, -0.42],
        ];
        beaconOffsets.forEach(([ox, oy], i) => {
          const ex = cx + ox * width * 0.43;
          const ey = cy + oy * height * 0.55;
          const c1x = hub[0] + (ex - hub[0]) * 0.2;
          const c1y = hub[1] + (ey - hub[1]) * 0.15;
          const c2x = hub[0] + (ex - hub[0]) * 0.8;
          const c2y = ey + (hub[1] - ey) * 0.17;

          ctx.beginPath();
          ctx.moveTo(hub[0], hub[1]);
          ctx.bezierCurveTo(c1x, c1y, c2x, c2y, ex, ey);
          ctx.strokeStyle = i === 2 ? 'rgba(255,146,126,.65)' : 'rgba(213,255,84,.48)';
          ctx.lineWidth = 1.1;
          ctx.stroke();

          // Travelling signal photon dot along Bezier
          const u = (t * 0.45 + i * 0.21) % 1;
          const inv = 1 - u;
          const px =
            inv ** 3 * hub[0] +
            3 * inv ** 2 * u * c1x +
            3 * inv * u ** 2 * c2x +
            u ** 3 * ex;
          const py =
            inv ** 3 * hub[1] +
            3 * inv ** 2 * u * c1y +
            3 * inv * u ** 2 * c2y +
            u ** 3 * ey;

          ctx.fillStyle = i === 2 ? '#ff927e' : '#f0f2eb';
          ctx.beginPath();
          ctx.arc(px, py, 2.2, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = i === 2 ? '#ff927e' : '#d5ff54';
          ctx.shadowBlur = 15;
          ctx.shadowColor = ctx.fillStyle;
          ctx.beginPath();
          ctx.arc(ex, ey, 3.3 + Math.sin(t * 2 + i) * 0.9, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        });

        ctx.save();
        ctx.translate(hub[0], hub[1]);
        for (let i = 0; i < 4; i += 1) {
          ctx.beginPath();
          ctx.ellipse(0, 0, 54 + i * 27, 19 + i * 11, Math.sin(t * 0.22 + i) * 0.12, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(213,255,84,${0.12 + i * 0.055})`;
          ctx.lineWidth = i === 0 ? 1.5 : 0.8;
          ctx.stroke();
        }
        ctx.restore();

        const radialGlow = ctx.createRadialGradient(hub[0], hub[1], 2, hub[0], hub[1], 45);
        radialGlow.addColorStop(0, 'rgba(225,255,155,.85)');
        radialGlow.addColorStop(0.16, 'rgba(213,255,84,.28)');
        radialGlow.addColorStop(1, 'rgba(213,255,84,0)');
        ctx.fillStyle = radialGlow;
        ctx.beginPath();
        ctx.arc(hub[0], hub[1], 45, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#e2ff9b';
        ctx.shadowColor = '#d5ff54';
        ctx.shadowBlur = 24;
        ctx.beginPath();
        ctx.arc(hub[0], hub[1], 8 + Math.sin(t * 1.5) * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        for (let i = 0; i < 36; i += 1) {
          const angle = (i * Math.PI) / 18 + t * 0.12;
          const radius = 85 + (i % 3) * 5;
          ctx.strokeStyle = 'rgba(213,255,84,.24)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(hub[0] + Math.cos(angle) * radius, hub[1] + Math.sin(angle) * radius * 0.42);
          ctx.lineTo(hub[0] + Math.cos(angle) * (radius + 5), hub[1] + Math.sin(angle) * (radius + 5) * 0.42);
          ctx.stroke();
        }
      };

      const loop = () => {
        if (isDisposed) return;
        if (isVisible) {
          renderFrame();
        }
        if (!reducedMotion) {
          rafId = window.requestAnimationFrame(loop);
        }
      };

      renderFrame();
      if (!reducedMotion) {
        rafId = window.requestAnimationFrame(loop);
      }

      cleanupMode = () => {
        window.removeEventListener('resize', resize);
        window.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointerup', onPointerUp);
      };
    };

    try {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
      camera.position.set(0, 1.2, 13.2);

      const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const disposableGeometries: THREE.BufferGeometry[] = [];
      const disposableMaterials: THREE.Material[] = [];

      const ambient = new THREE.AmbientLight(0xc8e6b0, 0.82);
      const keyLight = new THREE.PointLight(0xd5ff54, 2.2, 24);
      keyLight.position.set(1, 4, 5);
      const fillLight = new THREE.PointLight(0x9bb8a0, 1.15, 22);
      fillLight.position.set(-5, -2, 3);
      scene.add(ambient, keyLight, fillLight);

      const world = new THREE.Group();
      scene.add(world);

      // City grid blocks beneath the orbital route network
      const city = new THREE.Group();
      world.add(city);
      const boxGeo = new THREE.BoxGeometry(0.48, 1, 0.48);
      const boxEdgesGeo = new THREE.EdgesGeometry(boxGeo);
      const boxMat = new THREE.MeshStandardMaterial({
        color: 0x18231b,
        metalness: 0.6,
        roughness: 0.48,
        transparent: true,
        opacity: 0.78,
      });
      const edgeMat = new THREE.LineBasicMaterial({
        color: 0x89a76d,
        transparent: true,
        opacity: 0.25,
      });
      disposableGeometries.push(boxGeo, boxEdgesGeo);
      disposableMaterials.push(boxMat, edgeMat);

      for (let x = -9; x <= 9; x += 1) {
        for (let z = -5; z <= 3; z += 1) {
          if (Math.abs(x) < 2 && z > -2) continue;
          if (Math.random() > 0.22) {
            const h = 0.25 + Math.random() * 1.9;
            const mesh = new THREE.Mesh(boxGeo, boxMat);
            mesh.scale.y = h;
            mesh.position.set(x * 0.63, -3.6 + h * 0.5, z * 0.72 - 1.2);
            city.add(mesh);
            if (Math.random() > 0.4) {
              const edges = new THREE.LineSegments(boxEdgesGeo, edgeMat);
              edges.scale.copy(mesh.scale);
              edges.position.copy(mesh.position);
              city.add(edges);
            }
          }
        }
      }

      const floor = new THREE.GridHelper(22, 36, 0x657f4a, 0x344333);
      floor.position.y = -3.55;
      if (Array.isArray(floor.material)) {
        floor.material.forEach((m) => {
          m.transparent = true;
          m.opacity = 0.22;
          disposableMaterials.push(m);
        });
      } else {
        floor.material.transparent = true;
        floor.material.opacity = 0.22;
        disposableMaterials.push(floor.material);
      }
      disposableGeometries.push(floor.geometry);
      world.add(floor);

      // Central orbiting safety node
      const core = new THREE.Group();
      core.position.set(0, 0.1, 0.35);
      world.add(core);

      const orbGeo = new THREE.IcosahedronGeometry(1.02, 4);
      const orbMat = new THREE.MeshPhysicalMaterial({
        color: 0xcaff5d,
        metalness: 0.48,
        roughness: 0.19,
        emissive: 0x5d8919,
        emissiveIntensity: 0.68,
        clearcoat: 1,
        clearcoatRoughness: 0.12,
      });
      const orb = new THREE.Mesh(orbGeo, orbMat);
      core.add(orb);

      const wireGeo = new THREE.IcosahedronGeometry(1.22, 2);
      const wireMat = new THREE.MeshBasicMaterial({
        color: 0xd5ff54,
        wireframe: true,
        transparent: true,
        opacity: 0.24,
      });
      const wire = new THREE.Mesh(wireGeo, wireMat);
      core.add(wire);
      disposableGeometries.push(orbGeo, wireGeo);
      disposableMaterials.push(orbMat, wireMat);

      const rings: THREE.Mesh[] = [];
      const ringSpecs: Array<[number, number, number, number]> = [
        [2.1, 0.035, 0.45, 0],
        [2.65, 0.018, -0.68, 0.24],
        [3.1, 0.012, 0.12, -0.5],
      ];
      ringSpecs.forEach((r, i) => {
        const ringGeo = new THREE.TorusGeometry(r[0], r[1], 8, 160);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xd5ff54,
          transparent: true,
          opacity: 0.52,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.set(Math.PI / 2 + r[2], r[3], 0.15 * i);
        core.add(ring);
        rings.push(ring);
        disposableGeometries.push(ringGeo);
        disposableMaterials.push(ringMat);
      });

      // Curved Bezier safety paths + distant connected beacons + animated travelling signal photons
      interface BeaconNode {
        bead: THREE.Mesh;
        glowMesh: THREE.Mesh;
        packet: THREE.Mesh;
        curve: THREE.QuadraticBezierCurve3;
        p: THREE.Vector3;
        i: number;
      }

      const beacons: BeaconNode[] = [];
      const points = [
        new THREE.Vector3(-4.7, 1.55, -0.7),
        new THREE.Vector3(4.7, 1.9, -1),
        new THREE.Vector3(3.7, -1.15, 1),
        new THREE.Vector3(-3.8, -1.5, 1.4),
        new THREE.Vector3(0.2, 3.1, -2),
      ];
      points.forEach((p, i) => {
        const colorHex = i === 2 ? 0xff927e : 0xd5ff54;
        const curve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(0, 0.1, 0.35),
          new THREE.Vector3(p.x * 0.45, p.y + 0.7, p.z),
          p
        );
        const tubeGeo = new THREE.TubeGeometry(curve, 54, 0.012, 5, false);
        const tubeMat = new THREE.MeshBasicMaterial({
          color: colorHex,
          transparent: true,
          opacity: 0.72,
        });
        world.add(new THREE.Mesh(tubeGeo, tubeMat));

        const beadGeo = new THREE.SphereGeometry(0.12, 16, 16);
        const beadMat = new THREE.MeshBasicMaterial({ color: colorHex });
        const bead = new THREE.Mesh(beadGeo, beadMat);
        bead.position.copy(p);
        world.add(bead);

        const glowGeo = new THREE.SphereGeometry(0.27, 16, 16);
        const glowMat = new THREE.MeshBasicMaterial({
          color: colorHex,
          transparent: true,
          opacity: 0.14,
        });
        const glowMesh = new THREE.Mesh(glowGeo, glowMat);
        glowMesh.position.copy(p);
        world.add(glowMesh);

        const packetGeo = new THREE.SphereGeometry(0.055, 10, 10);
        const packetMat = new THREE.MeshBasicMaterial({
          color: i === 2 ? 0xff927e : 0xf0f2eb,
        });
        const packet = new THREE.Mesh(packetGeo, packetMat);
        world.add(packet);

        disposableGeometries.push(tubeGeo, beadGeo, glowGeo, packetGeo);
        disposableMaterials.push(tubeMat, beadMat, glowMat, packetMat);
        beacons.push({ bead, glowMesh, packet, curve, p, i });
      });

      // Sparse atmospheric depth particles
      const particleCount = 950;
      const positions = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount; i += 1) {
        positions[i * 3] = (Math.random() - 0.5) * 17;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 9 - 1;
      }
      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const pMat = new THREE.PointsMaterial({
        color: 0xc7e9a0,
        size: 0.018,
        transparent: true,
        opacity: 0.46,
        sizeAttenuation: true,
      });
      const particles = new THREE.Points(pGeo, pMat);
      world.add(particles);
      disposableGeometries.push(pGeo);
      disposableMaterials.push(pMat);

      let targetX = 0;
      let targetY = 0;
      let dragOffsetX = 0;
      let dragOffsetY = 0;
      let isDragging = false;
      let prevPointerX = 0;
      let prevPointerY = 0;

      const onPointerDown = (e: PointerEvent) => {
        isDragging = true;
        prevPointerX = e.clientX;
        prevPointerY = e.clientY;
      };

      const onPointerUp = () => {
        isDragging = false;
      };

      const onPointerMove = (e: PointerEvent) => {
        if (isDragging) {
          dragOffsetX += (e.clientX - prevPointerX) * 0.005;
          dragOffsetY = Math.max(-0.45, Math.min(0.45, dragOffsetY + (e.clientY - prevPointerY) * 0.003));
          prevPointerX = e.clientX;
          prevPointerY = e.clientY;
        } else {
          targetX = (e.clientX / Math.max(1, window.innerWidth) - 0.5) * 0.65;
          targetY = (e.clientY / Math.max(1, window.innerHeight) - 0.5) * 0.35;
        }
      };

      canvas.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointermove', onPointerMove, { passive: true });

      const resize = () => {
        const w = canvas.clientWidth || 700;
        const h = canvas.clientHeight || 600;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      resize();
      window.addEventListener('resize', resize);

      let resizeObserver: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(canvas);
      }

      const clock = new THREE.Clock();
      const renderLoop = () => {
        if (isDisposed) return;
        if (isVisible) {
          const t = clock.getElapsedTime();
          if (!reducedMotion) {
            if (!isDragging) {
              dragOffsetX *= 0.965;
              dragOffsetY *= 0.965;
            }
            core.rotation.y = t * 0.16;
            core.rotation.x = Math.sin(t * 0.22) * 0.1;
            wire.rotation.y = -t * 0.1;
            orb.scale.setScalar(1 + Math.sin(t * 1.4) * 0.018);
            rings.forEach((r, i) => {
              r.rotation.z = t * (i % 2 ? 0.12 : -0.09);
              r.rotation.x += 0.0005 * (i + 1);
            });
            world.rotation.y += (targetX + dragOffsetX - world.rotation.y) * 0.04;
            world.rotation.x += (targetY + dragOffsetY - world.rotation.x) * 0.04;
            particles.rotation.y = t * 0.012;
            beacons.forEach(({ bead, glowMesh, packet, curve, p, i }) => {
              const pulse = 1 + Math.sin(t * 2 + i) * 0.18;
              glowMesh.scale.setScalar(pulse);
              bead.position.y = p.y + Math.sin(t * 1.2 + i) * 0.08;
              const u = (t * 0.34 + i * 0.21) % 1;
              curve.getPointAt(u, packet.position);
            });
          }
          renderer.render(scene, camera);
        }
        if (!reducedMotion) {
          rafId = window.requestAnimationFrame(renderLoop);
        }
      };

      renderer.render(scene, camera);
      if (!reducedMotion) {
        rafId = window.requestAnimationFrame(renderLoop);
      }

      cleanupMode = () => {
        canvas.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('resize', resize);
        resizeObserver?.disconnect();
        disposableGeometries.forEach((g) => g.dispose());
        disposableMaterials.forEach((m) => m.dispose());
        renderer.dispose();
      };
    } catch {
      startCanvas2DFallback();
    }

    return () => {
      isDisposed = true;
      if (rafId) window.cancelAnimationFrame(rafId);
      document.removeEventListener('visibilitychange', handleVisibility);
      intersectionObserver?.disconnect();
      cleanupMode?.();
    };
  }, [reducedMotion]);

  return (
    <canvas
      id="hero3d"
      ref={canvasRef}
      className={`cursor-grab active:cursor-grabbing ${className}`.trim()}
      title="Interactive 3D safety network — drag to inspect in 3D space"
      aria-hidden="true"
    />
  );
};

export default HeroSpatialScene;
