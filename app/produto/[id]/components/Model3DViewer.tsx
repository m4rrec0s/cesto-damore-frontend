"use client";

import React, { useRef, useEffect, Suspense } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Html } from "@react-three/drei";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Loader2 } from "lucide-react";

interface Model3DViewerProps {
  modelUrl?: string;
  textures?: {
    areaId: string;
    imageUrl?: string;
    text?: string;
    position?: { x: number; y: number; z: number };
    dimensions?: { width: number; height: number };
  }[];
  className?: string;
}

// Componente interno que carrega o modelo 3D
function Model({ modelUrl }: { modelUrl: string }) {
  const gltf = useLoader(GLTFLoader, modelUrl);
  const meshRef = useRef<THREE.Group>(null);

  // Animação de rotação suave
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  return <primitive ref={meshRef} object={gltf.scene} />;
}

// Componente para aplicar textura de imagem
function ImageTexture({
  imageUrl,
  position,
  dimensions,
}: {
  imageUrl: string;
  position: { x: number; y: number; z: number };
  dimensions: { width: number; height: number };
}) {
  const texture = useLoader(THREE.TextureLoader, imageUrl);

  return (
    <mesh position={[position.x, position.y, position.z]}>
      <planeGeometry args={[dimensions.width, dimensions.height]} />
      <meshBasicMaterial map={texture} transparent />
    </mesh>
  );
}

// Componente para renderizar texto 3D
function TextTexture({
  text,
  position,
  dimensions,
}: {
  text: string;
  position: { x: number; y: number; z: number };
  dimensions: { width: number; height: number };
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [texture, setTexture] = React.useState<THREE.CanvasTexture | null>(
    null
  );

  useEffect(() => {
    // Criar canvas para desenhar texto
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      // Fundo transparente
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Configurar texto
      ctx.font = "bold 48px Arial";
      ctx.fillStyle = "#000000";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Desenhar texto
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);

      // Criar textura
      const canvasTexture = new THREE.CanvasTexture(canvas);
      canvasTexture.needsUpdate = true;
      setTexture(canvasTexture);
    }

    canvasRef.current = canvas;
  }, [text]);

  if (!texture) return null;

  return (
    <mesh position={[position.x, position.y, position.z]}>
      <planeGeometry args={[dimensions.width, dimensions.height]} />
      <meshBasicMaterial map={texture} transparent />
    </mesh>
  );
}

// Componente de Loading
function LoadingFallback() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2 text-white">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm">Carregando modelo 3D...</p>
      </div>
    </Html>
  );
}

export function Model3DViewer({
  modelUrl,
  textures = [],
  className = "",
}: Model3DViewerProps) {
  // Se não há modelo, mostrar placeholder
  if (!modelUrl) {
    return (
      <div
        className={`bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center ${className}`}
      >
        <div className="text-center text-gray-500">
          <div className="w-16 h-16 mx-auto mb-3 bg-gray-300 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
          <p className="text-sm font-medium">Preview 3D</p>
          <p className="text-xs mt-1">Não disponível para este produto</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg overflow-hidden ${className}`}
    >
      <Canvas>
        {/* Câmera */}
        <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={45} />

        {/* Luzes */}
        <ambientLight intensity={0.5} />
        <hemisphereLight
          intensity={1.2}
          color="#ffffff"
          groundColor="#444444"
        />
        <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />

        {/* Controles de órbita */}
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={2}
          maxDistance={10}
          autoRotate={false}
        />

        {/* Modelo 3D */}
        <Suspense fallback={<LoadingFallback />}>
          <Model modelUrl={modelUrl} />

          {/* Aplicar texturas customizadas */}
          {textures.map((textureConfig, index) => {
            if (!textureConfig.position || !textureConfig.dimensions) {
              return null;
            }

            // Renderizar imagem
            if (textureConfig.imageUrl) {
              return (
                <ImageTexture
                  key={`img-${index}`}
                  imageUrl={textureConfig.imageUrl}
                  position={textureConfig.position}
                  dimensions={textureConfig.dimensions}
                />
              );
            }

            // Renderizar texto
            if (textureConfig.text) {
              return (
                <TextTexture
                  key={`text-${index}`}
                  text={textureConfig.text}
                  position={textureConfig.position}
                  dimensions={textureConfig.dimensions}
                />
              );
            }

            return null;
          })}
        </Suspense>
      </Canvas>

      {/* Controles de ajuda */}
      <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-2 rounded-lg">
        <p className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
          Arraste para rotacionar • Scroll para zoom
        </p>
      </div>
    </div>
  );
}
