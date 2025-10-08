"use client";

import React, { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Html } from "@react-three/drei";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Loader2 } from "lucide-react";

type Vector3Config = { x: number; y: number; z: number };

export type ModelTextureTextStyle = {
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  textAlign?: CanvasTextAlign;
  backgroundColor?: string;
  padding?: number;
  lineHeight?: number;
  uppercase?: boolean;
};

type CylinderTextureConfig = {
  radius: number;
  height: number;
  /** Número de segmentos laterais da geometria (quanto maior, mais suave). */
  segments?: number;
  /** Ângulo inicial em radianos para posicionar a arte ao redor do cilindro. */
  thetaStart?: number;
  /** Comprimento angular da arte aplicada no cilindro em radianos. */
  thetaLength?: number;
};

export interface ModelTextureConfig {
  areaId: string;
  imageUrl?: string;
  text?: string;
  position?: Vector3Config;
  rotation?: Vector3Config;
  dimensions?: { width: number; height: number };
  textStyle?: ModelTextureTextStyle;
  mapping?: "plane" | "cylinder";
  cylinder?: CylinderTextureConfig;
}

interface Model3DViewerProps {
  modelUrl?: string;
  textures?: ModelTextureConfig[];
  className?: string;
  materialColor?: string;
  autoRotate?: boolean;
  rotateSpeed?: number;
  baseScale?: number;
}

type ModelProps = {
  modelUrl: string;
  materialColor?: string;
  autoRotate?: boolean;
  rotateSpeed?: number;
  baseScale: number;
};

// Componente interno que carrega o modelo 3D
function Model({
  modelUrl,
  materialColor,
  autoRotate = true,
  rotateSpeed = 0.3,
  baseScale,
}: ModelProps) {
  const gltf = useLoader(GLTFLoader, modelUrl);
  const meshRef = useRef<THREE.Group>(null);
  const originalMaterials = useRef<
    Map<string, THREE.Material | THREE.Material[]>
  >(new Map());

  const scene = useMemo(() => {
    const cloned = gltf.scene.clone(true);
    cloned.scale.setScalar(baseScale);
    cloned.position.set(0, -0.15, 0);
    return cloned;
  }, [baseScale, gltf.scene]);

  useEffect(() => {
    if (!meshRef.current) return;

    originalMaterials.current.clear();
    meshRef.current.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        originalMaterials.current.set(mesh.uuid, mesh.material);
      }
    });
  }, [scene]);

  useEffect(() => {
    if (!meshRef.current) return;

    // Restaurar materiais originais quando nenhuma cor customizada é fornecida
    if (!materialColor) {
      meshRef.current.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const original = originalMaterials.current.get(mesh.uuid);

          if (original) {
            mesh.material = original;
          }
        }
      });
      return;
    }

    const color = new THREE.Color(materialColor);

    const tintMaterial = (material: THREE.Material) => {
      // Converter para MeshBasicMaterial para evitar sombreamento
      const basicMaterial = new THREE.MeshBasicMaterial({
        color: color.clone(),
        transparent: material.transparent,
        opacity: material.opacity,
        side: material.side,
      });

      // Preservar textura se existir
      if ("map" in material && (material as THREE.MeshStandardMaterial).map) {
        basicMaterial.map = (material as THREE.MeshStandardMaterial).map;
      }

      return basicMaterial;
    };

    meshRef.current.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const original = originalMaterials.current.get(mesh.uuid);

        if (!original) return;

        if (Array.isArray(original)) {
          mesh.material = original.map((material) => tintMaterial(material));
        } else {
          mesh.material = tintMaterial(original);
        }
      }
    });
  }, [materialColor, scene]);

  useFrame((_, delta) => {
    if (autoRotate && meshRef.current) {
      meshRef.current.rotation.y += delta * rotateSpeed;
    }
  });

  return <primitive ref={meshRef} object={scene} />;
}

// Componente para aplicar textura de imagem
function ImageTexture({
  imageUrl,
  position,
  rotation,
  dimensions,
}: {
  imageUrl: string;
  position: Vector3Config;
  rotation?: Vector3Config;
  dimensions: { width: number; height: number };
}) {
  const texture = useLoader(THREE.TextureLoader, imageUrl);

  return (
    <mesh
      position={[position.x, position.y, position.z]}
      rotation={rotation ? [rotation.x, rotation.y, rotation.z] : undefined}
    >
      <planeGeometry args={[dimensions.width, dimensions.height]} />
      <meshStandardMaterial
        map={texture}
        transparent
        side={THREE.DoubleSide}
        toneMapped={false}
        color="#ffffff"
        roughness={0.4}
        metalness={0.1}
      />
    </mesh>
  );
}

function CylinderImageTexture({
  imageUrl,
  position,
  cylinder,
  autoRotate = false,
  rotateSpeed = 0.3,
}: {
  imageUrl: string;
  position: Vector3Config;
  cylinder: CylinderTextureConfig;
  autoRotate?: boolean;
  rotateSpeed?: number;
}) {
  const texture = useLoader(THREE.TextureLoader, imageUrl);
  const meshRef = useRef<THREE.Mesh>(null);
  const {
    radius,
    height,
    segments = 128,
    thetaStart = 0,
    thetaLength = Math.PI / 2,
  } = cylinder;

  const geometry = useMemo(
    () =>
      new THREE.CylinderGeometry(
        radius,
        radius,
        height,
        segments,
        1,
        true,
        thetaStart,
        thetaLength
      ),
    [radius, height, segments, thetaStart, thetaLength]
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  useEffect(() => {
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
  }, [texture]);

  useFrame((_, delta) => {
    if (autoRotate && meshRef.current) {
      meshRef.current.rotation.y += delta * rotateSpeed;
    }
  });

  return (
    <mesh ref={meshRef} position={[position.x, position.y, position.z]}>
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial
        map={texture}
        transparent
        side={THREE.DoubleSide}
        toneMapped={false}
        color="#ffffff"
        roughness={0.4}
        metalness={0.1}
      />
    </mesh>
  );
}

// Componente para renderizar texto 3D
function TextTexture({
  text,
  position,
  rotation,
  dimensions,
  textStyle,
}: {
  text: string;
  position: Vector3Config;
  rotation?: Vector3Config;
  dimensions: { width: number; height: number };
  textStyle?: ModelTextureTextStyle;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [texture, setTexture] = React.useState<THREE.CanvasTexture | null>(
    null
  );

  useEffect(() => {
    if (!text || text.trim().length === 0) {
      setTexture(null);
      return;
    }

    const {
      color = "#000000",
      fontFamily = "Arial",
      fontWeight = "bold",
      fontSize = 48,
      textAlign = "center",
      backgroundColor,
      padding = 32,
      lineHeight = 1.2,
      uppercase = false,
    } = textStyle || {};

    const normalizedText = uppercase ? text.toUpperCase() : text;
    const lines = normalizedText.split(/\r?\n/);

    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (backgroundColor) {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.fillStyle = color;
      ctx.textAlign = textAlign;
      ctx.textBaseline = "middle";

      const textAreaWidth = canvas.width - padding * 2;
      const alignX =
        textAlign === "left"
          ? padding
          : textAlign === "right"
          ? canvas.width - padding
          : canvas.width / 2;

      const computedLineHeight = fontSize * lineHeight;
      const totalHeight = computedLineHeight * (lines.length - 1);
      const startY = canvas.height / 2 - totalHeight / 2;

      lines.forEach((line, index) => {
        // Quebra de linha simples para caber na largura disponível
        const words = line.split(" ");
        let currentLine = "";
        const flushedLines: string[] = [];

        words.forEach((word) => {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const metrics = ctx.measureText(testLine);
          if (metrics.width > textAreaWidth && currentLine) {
            flushedLines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        });

        if (currentLine) {
          flushedLines.push(currentLine);
        }

        flushedLines.forEach((flushedLine, flushedIndex) => {
          const y =
            startY +
            index * computedLineHeight +
            flushedIndex * computedLineHeight;
          ctx.fillText(flushedLine, alignX, y);
        });
      });

      const canvasTexture = new THREE.CanvasTexture(canvas);
      canvasTexture.needsUpdate = true;
      setTexture(canvasTexture);
    }

    canvasRef.current = canvas;

    return () => {
      if (texture) {
        texture.dispose();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    text,
    textStyle?.backgroundColor,
    textStyle?.color,
    textStyle?.fontFamily,
    textStyle?.fontSize,
    textStyle?.fontWeight,
    textStyle?.lineHeight,
    textStyle?.padding,
    textStyle?.textAlign,
    textStyle?.uppercase,
  ]);

  if (!texture) return null;

  return (
    <mesh
      position={[position.x, position.y, position.z]}
      rotation={rotation ? [rotation.x, rotation.y, rotation.z] : undefined}
    >
      <planeGeometry args={[dimensions.width, dimensions.height]} />
      <meshBasicMaterial
        map={texture}
        transparent
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}

// Componente de Loading
function LoadingFallback() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2 text-white">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">Carregando modelo 3D...</p>
      </div>
    </Html>
  );
}

export function Model3DViewer({
  modelUrl,
  textures = [],
  className = "",
  materialColor,
  autoRotate = true,
  rotateSpeed = 0.3,
  baseScale = 6,
}: Model3DViewerProps) {
  // Se não há modelo, mostrar placeholder
  if (!modelUrl) {
    return (
      <div
        className={`relative flex items-center justify-center rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 ${className}`}
      >
        <div className="text-center text-gray-500">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gray-300">
            <svg
              className="h-8 w-8"
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
          <p className="mt-1 text-xs">Não disponível para este produto</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-900 to-slate-800 ${className}`}
    >
      <Canvas className="h-full w-full">
        {/* Câmera */}
        <PerspectiveCamera makeDefault position={[0, 0.35, 3.1]} fov={40} />

        {/* Luz ambiente uniforme sem sombreamento */}
        <ambientLight intensity={2.5} color="#ffffff" />

        {/* Controles de órbita */}
        <OrbitControls
          enableZoom
          enablePan={false}
          minDistance={1.4}
          maxDistance={5}
          target={[0, 0.3, 0]}
          autoRotate={autoRotate}
          autoRotateSpeed={rotateSpeed / 0.3}
        />

        {/* Modelo 3D */}
        <Suspense fallback={<LoadingFallback />}>
          <Model
            modelUrl={modelUrl}
            materialColor={materialColor}
            autoRotate={autoRotate}
            rotateSpeed={rotateSpeed}
            baseScale={baseScale}
          />

          {/* Aplicar texturas customizadas */}
          {textures.map((textureConfig, index) => {
            if (!textureConfig.position || !textureConfig.dimensions) {
              return null;
            }

            const rotation = textureConfig.rotation;
            const mapping = textureConfig.mapping ?? "plane";
            const position = textureConfig.position;

            if (textureConfig.imageUrl) {
              if (mapping === "cylinder" && textureConfig.cylinder) {
                return (
                  <CylinderImageTexture
                    key={`img-cylinder-${textureConfig.areaId}-${index}`}
                    imageUrl={textureConfig.imageUrl}
                    position={position}
                    cylinder={textureConfig.cylinder}
                    autoRotate={autoRotate}
                    rotateSpeed={rotateSpeed}
                  />
                );
              }

              return (
                <ImageTexture
                  key={`img-${textureConfig.areaId}-${index}`}
                  imageUrl={textureConfig.imageUrl}
                  position={position}
                  rotation={rotation}
                  dimensions={textureConfig.dimensions}
                />
              );
            }

            if (textureConfig.text) {
              return (
                <TextTexture
                  key={`text-${textureConfig.areaId}-${index}`}
                  text={textureConfig.text}
                  position={position}
                  rotation={rotation}
                  dimensions={textureConfig.dimensions}
                  textStyle={textureConfig.textStyle}
                />
              );
            }

            return null;
          })}
        </Suspense>
      </Canvas>

      {/* Controles de ajuda */}
      <div className="pointer-events-none absolute bottom-4 right-4 rounded-lg bg-black/50 px-3 py-2 text-xs text-white backdrop-blur-sm">
        <p className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-400" />
          Arraste para rotacionar • Scroll para zoom
        </p>
      </div>
    </div>
  );
}
