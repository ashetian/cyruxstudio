"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import * as THREE from "three";

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
    renderer.toneMappingExposure = 1.25;

    container.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    // 3. Lighting Setup (Brutalist specular metallic reflection)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.8);
    keyLight.position.set(3.5, 4.0, 4.5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x88aacc, 2.5);
    rimLight.position.set(-3.5, -2.5, -3.5);
    scene.add(rimLight);

    const dynamicPointLight = new THREE.PointLight(0xffffff, 4.5, 15);
    dynamicPointLight.position.set(0, 0, 3.5);
    scene.add(dynamicPointLight);

    // 4. Mesh Creation using transparent logo cutout
    const logoGroup = new THREE.Group();
    scene.add(logoGroup);

    const textureLoader = new THREE.TextureLoader();
    const logoTexture = textureLoader.load(
      "/assets/brand/cyrux-poster-transparent.png",
      () => {
        setIsLoaded(true);
      }
    );
    logoTexture.colorSpace = THREE.SRGBColorSpace;
    logoTexture.generateMipmaps = true;
    logoTexture.minFilter = THREE.LinearMipmapLinearFilter;

    const bumpTexture = textureLoader.load("/assets/brand/cyrux-poster-bump.png");
    bumpTexture.generateMipmaps = true;

    // Multi-plane volumetric geometry for sculpted physical 3D thickness
    const planeGeo = new THREE.PlaneGeometry(2.6, 2.6, 24, 24);

    const materialConfig = {
      map: logoTexture,
      bumpMap: bumpTexture,
      bumpScale: 0.04,
      metalness: 0.95,
      roughness: 0.14,
      transparent: true,
      alphaTest: 0.08,
      depthWrite: true,
    };

    const frontMaterial = new THREE.MeshStandardMaterial({
      ...materialConfig,
      side: THREE.FrontSide,
    });

    const backMaterial = new THREE.MeshStandardMaterial({
      ...materialConfig,
      side: THREE.FrontSide,
    });

    // Front Face
    const frontMesh = new THREE.Mesh(planeGeo, frontMaterial);
    frontMesh.position.z = 0.05;
    logoGroup.add(frontMesh);

    // Back Face (Rotated 180° around Y so CYRUX reads correctly from the back)
    const backMesh = new THREE.Mesh(planeGeo, backMaterial);
    backMesh.position.z = -0.05;
    backMesh.rotation.y = Math.PI;
    logoGroup.add(backMesh);

    // Volumetric 3D Rim / Depth Layers for solid metallic body
    const rimCount = 5;
    const rimMeshes: THREE.Mesh[] = [];
    const rimMaterial = new THREE.MeshStandardMaterial({
      map: logoTexture,
      color: 0x888888,
      metalness: 0.98,
      roughness: 0.22,
      transparent: true,
      alphaTest: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    for (let i = 0; i < rimCount; i++) {
      const offsetZ = -0.04 + (0.08 / (rimCount - 1)) * i;
      if (Math.abs(offsetZ) < 0.005) continue;
      const rimMesh = new THREE.Mesh(planeGeo, rimMaterial);
      rimMesh.position.z = offsetZ;
      rimMesh.scale.set(0.996, 0.996, 1);
      logoGroup.add(rimMesh);
      rimMeshes.push(rimMesh);
    }

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
    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (!isVisible) return;

      // Continuous Idle Y Rotation + Drag Momentum Decay
      if (!isDragging) {
        dragVelocity *= 0.92;
        logoGroup.rotation.y += autoRotationSpeed + dragVelocity;
      }

      // Smooth Tilt Lerp
      logoGroup.rotation.x += (targetTiltX - logoGroup.rotation.x) * 0.08;
      logoGroup.rotation.z += (targetTiltZ - logoGroup.rotation.z) * 0.08;

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

      planeGeo.dispose();
      frontMaterial.dispose();
      backMaterial.dispose();
      rimMaterial.dispose();
      logoTexture.dispose();
      bumpTexture.dispose();
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
          sizes="(max-width: 768px) 85vw, 600px"
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
      className={`relative aspect-square cursor-grab active:cursor-grabbing select-none touch-none ${className}`}
      style={size ? { width: size, height: size } : undefined}
    >
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center opacity-40">
          <Image
            src="/assets/brand/cyrux-poster-transparent.webp"
            alt=""
            fill
            priority
            sizes="(max-width: 768px) 85vw, 600px"
            className="object-contain"
          />
        </div>
      )}
    </div>
  );
}
