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

    // 1. WebGL Support Check
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
    const width = container.clientWidth || 160;
    const height = container.clientHeight || 160;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 4.2;

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

    // 3. Lighting (Dynamic brutalist chrome specular setup)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(3, 4, 4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x99bbdd, 2.0);
    rimLight.position.set(-3, -2, -3);
    scene.add(rimLight);

    const pointLight = new THREE.PointLight(0xffffff, 3.5, 12);
    pointLight.position.set(0, 0, 3);
    scene.add(pointLight);

    // 4. Logo Group & Materials
    const logoGroup = new THREE.Group();
    scene.add(logoGroup);

    const textureLoader = new THREE.TextureLoader();
    const chromeTexture = textureLoader.load(
      "/assets/brand/emblem-3d-chrome.png",
      () => {
        setIsLoaded(true);
      }
    );
    chromeTexture.colorSpace = THREE.SRGBColorSpace;
    chromeTexture.generateMipmaps = true;
    chromeTexture.minFilter = THREE.LinearMipmapLinearFilter;

    const bumpTexture = textureLoader.load("/assets/brand/emblem-3d-bump.png");

    const materialConfig = {
      map: chromeTexture,
      bumpMap: bumpTexture,
      bumpScale: 0.035,
      transparent: true,
      metalness: 0.92,
      roughness: 0.14,
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

    const planeGeo = new THREE.PlaneGeometry(2.35, 2.35, 24, 24);

    // Front Face
    const frontMesh = new THREE.Mesh(planeGeo, frontMaterial);
    frontMesh.position.z = 0.06;
    logoGroup.add(frontMesh);

    // Back Face
    const backMesh = new THREE.Mesh(planeGeo, backMaterial);
    backMesh.position.z = -0.06;
    backMesh.rotation.y = Math.PI;
    logoGroup.add(backMesh);

    // 3D Rim / Volumetric Depth Layers for solid metallic look
    const rimCount = 5;
    const rimMeshes: THREE.Mesh[] = [];
    const rimMaterial = new THREE.MeshStandardMaterial({
      map: chromeTexture,
      transparent: true,
      opacity: 0.7,
      color: 0xcccccc,
      metalness: 0.96,
      roughness: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    for (let i = 0; i < rimCount; i++) {
      const offsetZ = -0.05 + (0.1 / (rimCount - 1)) * i;
      if (Math.abs(offsetZ) < 0.01) continue;
      const rimMesh = new THREE.Mesh(planeGeo, rimMaterial);
      rimMesh.position.z = offsetZ;
      rimMesh.scale.set(0.995, 0.995, 1);
      logoGroup.add(rimMesh);
      rimMeshes.push(rimMesh);
    }

    // 5. Interaction State (Mouse tracking & Drag physics)
    let pointerX = 0;
    let pointerY = 0;
    let targetTiltX = 0;
    let targetTiltZ = 0;
    let isDragging = false;
    let prevPointerX = 0;
    let dragVelocity = 0;
    let autoRotationSpeed = 0.014;

    const onPointerMove = (e: PointerEvent) => {
      const clientX = e.clientX;
      const clientY = e.clientY;

      // Global window parallax tilt
      const normX = (clientX / window.innerWidth) * 2 - 1;
      const normY = (clientY / window.innerHeight) * 2 - 1;

      pointerX = normX;
      pointerY = normY;

      targetTiltX = pointerY * 0.35;
      targetTiltZ = -pointerX * 0.15;

      pointLight.position.x = pointerX * 2.5;
      pointLight.position.y = -pointerY * 2.5;

      if (isDragging) {
        const deltaX = clientX - prevPointerX;
        dragVelocity = deltaX * 0.008;
        logoGroup.rotation.y += dragVelocity;
        prevPointerX = clientX;
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevPointerX = e.clientX;
      autoRotationSpeed = 0.004; // Gentle slow-down when held
    };

    const onPointerUp = () => {
      isDragging = false;
      autoRotationSpeed = 0.014;
    };

    container.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp);

    // 6. Resize Handling
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

    // 8. Main Render Loop
    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (!isVisible) return;

      // Continuous Idle Y Rotation + Drag Momentum Decay
      if (!isDragging) {
        dragVelocity *= 0.92;
        logoGroup.rotation.y += autoRotationSpeed + dragVelocity;
      }

      // Smooth Lerp Tilt (Pitch & Roll)
      logoGroup.rotation.x += (targetTiltX - logoGroup.rotation.x) * 0.08;
      logoGroup.rotation.z += (targetTiltZ - logoGroup.rotation.z) * 0.08;

      renderer.render(scene, camera);
    };

    animate();

    // 9. Teardown / Memory Disposal
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
      chromeTexture.dispose();
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
          src="/assets/brand/emblem-3d-chrome.png"
          alt="Cyrux Studio 3D Emblem"
          fill
          sizes="(max-width: 768px) 25vw, 160px"
          className="object-contain animate-[spin_12s_linear_infinite]"
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
      {/* Subtle loader fallback until Three.js texture paints */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center opacity-40">
          <Image
            src="/assets/brand/emblem-3d-chrome.png"
            alt=""
            fill
            sizes="(max-width: 768px) 25vw, 160px"
            className="object-contain"
          />
        </div>
      )}
    </div>
  );
}
