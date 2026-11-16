"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

interface HeroThreeLogoProps {
  className?: string;
  size?: number;
}

export function HeroThreeLogo({ className = "", size }: HeroThreeLogoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [webglSupported, setWebglSupported] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. WebGL Support Verification
    try {
      const testCanvas = document.createElement("canvas");
      const gl =
        testCanvas.getContext("webgl2") ||
        testCanvas.getContext("webgl") ||
        testCanvas.getContext("experimental-webgl");
      if (!gl) {
        setWebglSupported(false);
        return;
      }
    } catch {
      setWebglSupported(false);
      return;
    }

    let animId: number;
    let isVisible = true;

    // 2. Scene Setup
    const width = container.clientWidth || 320;
    const height = container.clientHeight || 320;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 3.6;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;

    container.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    // 3. Lighting Setup (Brutalist specular chrome reflections)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 4.0);
    keyLight.position.set(4.0, 4.5, 4.0);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x88aacc, 3.0);
    rimLight.position.set(-4.0, -3.0, -3.5);
    scene.add(rimLight);

    const topLight = new THREE.DirectionalLight(0xffffff, 2.0);
    topLight.position.set(0, 5.0, 0);
    scene.add(topLight);

    const dynamicPointLight = new THREE.PointLight(0xffffff, 5.0, 18);
    dynamicPointLight.position.set(0, 0, 3.5);
    scene.add(dynamicPointLight);

    // 4. Mesh Creation using true solid 3D geometry (watertight, beveled chrome mesh)
    const logoGroup = new THREE.Group();
    scene.add(logoGroup);

    const chromeMaterial = new THREE.MeshStandardMaterial({
      color: 0xf2f2f2,
      metalness: 0.96,
      roughness: 0.12,
    });

    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
      "/assets/brand/cyrux-logo-solid.glb",
      (gltf) => {
        const model = gltf.scene;
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.material = chromeMaterial;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          }
        });
        logoGroup.add(model);
        setIsLoaded(true);
      },
      undefined,
      (err) => {
        console.error("Failed to load solid 3D logo GLB:", err);
      }
    );

    // 5. Interaction State (Mouse Tracking & Drag Momentum Physics)
    let pointerX = 0;
    let pointerY = 0;
    let targetTiltX = 0;
    let targetTiltZ = 0;
    let isDragging = false;
    let prevPointerX = 0;
    let dragVelocity = 0;
    let autoRotationSpeed = 0.013;

    const onPointerMove = (e: PointerEvent) => {
      const clientX = e.clientX;
      const clientY = e.clientY;

      const normX = (clientX / window.innerWidth) * 2 - 1;
      const normY = (clientY / window.innerHeight) * 2 - 1;

      pointerX = normX;
      pointerY = normY;

      targetTiltX = pointerY * 0.32;
      targetTiltZ = -pointerX * 0.14;

      dynamicPointLight.position.x = pointerX * 3.0;
      dynamicPointLight.position.y = -pointerY * 3.0;

      if (isDragging) {
        const deltaX = clientX - prevPointerX;
        dragVelocity = deltaX * 0.007;
        logoGroup.rotation.y += dragVelocity;
        prevPointerX = clientX;
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevPointerX = e.clientX;
      autoRotationSpeed = 0.003;
    };

    const onPointerUp = () => {
      isDragging = false;
      autoRotationSpeed = 0.013;
    };

    container.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp);

    // 6. Responsive Resize Handling
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    // 7. Visibility IntersectionObserver (Pauses loop when scrolled off-screen)
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.05 }
    );
    intersectionObserver.observe(container);

    // 8. Animation Loop
    let clock = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (!isVisible) return;
      clock += 0.02;

      // Continuous Idle Y Rotation + Drag Momentum Decay
      if (!isDragging) {
        dragVelocity *= 0.92;
        logoGroup.rotation.y += autoRotationSpeed + dragVelocity;
      }

      // Gentle ambient floating motion so mobile touchscreens also enjoy shifting chrome highlights
      const ambientFloatX = Math.sin(clock * 0.7) * 0.04;
      const ambientFloatZ = Math.cos(clock * 0.5) * 0.03;

      // Smooth Tilt Lerp (combines cursor tilt + ambient micro-float)
      logoGroup.rotation.x += (targetTiltX + ambientFloatX - logoGroup.rotation.x) * 0.08;
      logoGroup.rotation.z += (targetTiltZ + ambientFloatZ - logoGroup.rotation.z) * 0.08;

      renderer.render(scene, camera);
    };

    animate();

    // 9. Teardown / Cleanup
    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      container.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);

      chromeMaterial.dispose();
      logoGroup.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry?.dispose();
        }
      });
      renderer.dispose();

      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  if (!webglSupported) {
    return (
      <div
        className={`relative aspect-square flex items-center justify-center ${className}`}
        style={size ? { width: size, height: size } : undefined}
      >
        <Image
          src="/assets/brand/cyrux-poster-transparent.webp"
          alt="Cyrux Studio 3D Rotating Logo"
          fill
          priority
          sizes="(max-width: 640px) 75vw, (max-width: 1024px) 45vw, 36rem"
          className="object-contain"
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label="Cyrux Studio 3D Rotating Logo"
      className={`relative aspect-square cursor-grab active:cursor-grabbing select-none touch-pan-y ${className}`}
      style={size ? { width: size, height: size } : undefined}
    >
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center opacity-40">
          <Image
            src="/assets/brand/cyrux-poster-transparent.webp"
            alt=""
            fill
            priority
            sizes="(max-width: 640px) 75vw, (max-width: 1024px) 45vw, 36rem"
            className="object-contain"
          />
        </div>
      )}
    </div>
  );
}
