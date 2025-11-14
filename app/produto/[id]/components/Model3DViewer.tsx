"use client";

import React, { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import {
  OrbitControls,
  PerspectiveCamera,
  Html,
  Environment,
} from "@react-three/drei";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Loader2, AlertCircle } from "lucide-react";

// Error Boundary para capturar erros de carregamento
class Model3DErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Erro ao carregar modelo 3D:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Html center>
          <div className="flex flex-col items-center gap-2 text-gray-600 bg-white/90 p-4 rounded-lg shadow-lg">
            <AlertCircle className="h-8 w-8 text-amber-500" />
            <p className="text-sm font-medium">Erro ao carregar modelo 3D</p>
            <p className="text-xs text-gray-500 max-w-xs text-center">
              {this.state.error?.message || "Tente recarregar a página"}
            </p>
          </div>
        </Html>
      );
    }

    return this.props.children;
  }
}

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
  // Aumentar timeout do loader para 60 segundos
  const gltf = useLoader(GLTFLoader, modelUrl, (loader) => {
    if (loader.manager) {
      loader.manager.itemStart = () => {};
      loader.manager.itemEnd = () => {};
      loader.manager.itemError = () => {};
    }
  });
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
            // Disable shadows to keep the product surface uniformly lit
            mesh.castShadow = false;
            mesh.receiveShadow = false;
          }
        }
      });
      return;
    }

    const color = new THREE.Color(materialColor);

    const tintMaterial = (material: THREE.Material) => {
      // Use MeshPhysicalMaterial (PBR) for more advanced parameters like clearcoat
      const standard = new THREE.MeshPhysicalMaterial({
        color: color.clone(),
        roughness: 0.28,
        metalness: 0.08,
        envMapIntensity: 1.4,
        clearcoat: 0.12,
        clearcoatRoughness: 0.15,
      });

      // Tentar preservar propriedades quando disponíveis (sem usar any)
      const matProps = material as unknown as {
        transparent?: boolean;
        opacity?: number;
        side?: number;
      };

      if (typeof matProps.transparent === "boolean") {
        standard.transparent = matProps.transparent;
      }
      if (typeof matProps.opacity === "number") {
        standard.opacity = matProps.opacity;
      }
      if (typeof matProps.side === "number") {
        // Assign only known side constants to satisfy TS
        if (
          matProps.side === THREE.FrontSide ||
          matProps.side === THREE.BackSide ||
          matProps.side === THREE.DoubleSide
        ) {
          standard.side = matProps.side as THREE.Side;
        }
      }

      // Preservar textura se existir
      if ("map" in material && (material as THREE.MeshStandardMaterial).map) {
        const map = (material as THREE.MeshStandardMaterial).map;
        if (map) {
          // Não forçar encoding por causa de diferenças nas defs do projeto
          // Ajustar flipY para true para imagens vindas de canvas/dataURL
          map.flipY = true;
          standard.map = map;
          standard.needsUpdate = true;
        }
      }

      return standard;
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

        // Disable shadows on cloned meshes so the result is cleaner and more
        // reflective; rely on IBL/environment for realism
        mesh.castShadow = false;
        mesh.receiveShadow = false;
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
  const texture = useLoader(THREE.TextureLoader, imageUrl, (loader) => {
    if (loader.manager) {
      loader.manager.itemStart = () => {};
      loader.manager.itemEnd = () => {};
      loader.manager.itemError = () => {};
    }
  });

  useEffect(() => {
    // Ajustes para texturas provenientes de canvas/dataURL
    texture.flipY = true;
    texture.needsUpdate = true;
  }, [texture]);

  return (
    <mesh
      position={[position.x, position.y, position.z]}
      rotation={rotation ? [rotation.x, rotation.y, rotation.z] : undefined}
      // No shadows for decals/textures to keep them bright and even
      castShadow={false}
      receiveShadow={false}
    >
      <planeGeometry args={[dimensions.width, dimensions.height]} />
      <meshPhysicalMaterial
        map={texture}
        transparent
        side={THREE.DoubleSide}
        toneMapped={false}
        color="#ffffff"
        roughness={0.45}
        metalness={0.06}
        envMapIntensity={0.7}
        clearcoat={0.06}
        clearcoatRoughness={0.25}
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
  const texture = useLoader(THREE.TextureLoader, imageUrl, (loader) => {
    if (loader.manager) {
      loader.manager.itemStart = () => {};
      loader.manager.itemEnd = () => {};
      loader.manager.itemError = () => {};
    }
  });
  const meshRef = useRef<THREE.Mesh>(null);
  const [roughnessTexture, setRoughnessTexture] =
    React.useState<THREE.CanvasTexture | null>(null);
  const roughnessRef = useRef<THREE.CanvasTexture | null>(null);
  const {
    radius,
    height,
    segments = 128,
    thetaStart: rawThetaStart,
    thetaLength: rawThetaLength,
  } = cylinder;

  // Defaults em radianos (110deg e 313deg)
  const DEFAULT_THETA_START = (116 * Math.PI) / 180;
  const DEFAULT_THETA_LENGTH = (310 * Math.PI) / 180;

  const thetaStart =
    typeof rawThetaStart === "number" && isFinite(rawThetaStart)
      ? rawThetaStart
      : DEFAULT_THETA_START;
  const thetaLength =
    typeof rawThetaLength === "number" && isFinite(rawThetaLength)
      ? rawThetaLength
      : DEFAULT_THETA_LENGTH;

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
    // Não forçar encoding por compatibilidade com tipos
    texture.flipY = true;
    texture.needsUpdate = true;
    // Generate roughness map to attenuate bright highlights
    try {
      const img = texture.image as
        | HTMLImageElement
        | HTMLCanvasElement
        | undefined;
      if (img) {
        const w = Math.max(
          256,
          img instanceof HTMLImageElement
            ? img.naturalWidth || 512
            : (img as HTMLCanvasElement).width || 512
        );
        const h = Math.max(
          64,
          img instanceof HTMLImageElement
            ? img.naturalHeight || 256
            : (img as HTMLCanvasElement).height || 256
        );
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const ctx = c.getContext("2d");
        if (ctx) {
          // Dispose previous roughness texture if present
          if (roughnessRef.current) {
            roughnessRef.current.dispose();
            roughnessRef.current = null;
          }
          // drawImage can accept both HTMLImageElement and HTMLCanvasElement
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ctx.drawImage(img as any, 0, 0, w, h);
          const data = ctx.getImageData(0, 0, w, h).data;
          const out = ctx.createImageData(w, h);
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            // Normalize luminance to [0,1]
            const norm = Math.min(1, Math.max(0, lum / 255));
            // Map brightness to roughness aggressively: dark areas slightly rough, bright areas fully rough
            // So highlights are removed in the bright segments
            const roughnessFactor = 0.65 + 0.35 * norm; // 0.65..1.0
            const roughVal = Math.round(255 * roughnessFactor);
            out.data[i] = roughVal;
            out.data[i + 1] = roughVal;
            out.data[i + 2] = roughVal;
            out.data[i + 3] = 255;
          }
          ctx.putImageData(out, 0, 0);
          const rTex = new THREE.CanvasTexture(c);
          rTex.flipY = true;
          rTex.needsUpdate = true;
          roughnessRef.current = rTex;
          setRoughnessTexture(rTex);
        }
      }
    } catch (err) {
      // Ignore cross-origin or other errors
      void err;
    }
    return () => {
      if (roughnessRef.current) {
        roughnessRef.current.dispose();
        roughnessRef.current = null;
      }
      // Ensure state cleared to avoid holding disposed texture
      setRoughnessTexture(null);
    };
  }, [texture]);

  useFrame((_, delta) => {
    if (autoRotate && meshRef.current) {
      meshRef.current.rotation.y += delta * rotateSpeed;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[position.x, position.y, position.z]}
      castShadow={false}
      receiveShadow={false}
    >
      <primitive object={geometry} attach="geometry" />
      <meshPhysicalMaterial
        // Show artwork as emissive so scene lighting does not brighten hotspots
        emissiveMap={texture}
        emissive={new THREE.Color(0xffffff)}
        emissiveIntensity={1.0}
        map={undefined}
        transparent
        side={THREE.DoubleSide}
        toneMapped={false}
        color="#000000"
        // Use very high base roughness, modulated by roughnessMap
        roughness={1.0}
        metalness={1.0}
        envMapIntensity={0.4}
        clearcoat={0.0}
        clearcoatRoughness={1.0}
        roughnessMap={roughnessTexture ?? undefined}
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
      canvasTexture.flipY = true;
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
      className={`relative overflow-hidden rounded-lg bg-gradient-to-br from-gray-200 to-gray-100 ${className}`}
    >
      <Canvas
        className="h-full w-full"
        // Disable default shadow map rendering and use physically correct lights
        shadows={false}
        dpr={[1, 1.7]}
        gl={{ antialias: true }}
        onCreated={(state) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const gl = state.gl as any;
          gl.physicallyCorrectLights = true;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          gl.outputColorSpace = (THREE as any).SRGBColorSpace;
          gl.toneMappingExposure = 1.0;
        }}
      >
        {/* Câmera */}
        <PerspectiveCamera makeDefault position={[0, 0.35, 3.1]} fov={40} />

        {/* Iluminação ambiente muito reduzida — priorizar IBL (Environment) para reflexos */}
        <hemisphereLight intensity={0.05} groundColor={0x333333} />
        <ambientLight intensity={0.01} color="#ffffff" />

        {/* Direcional praticamente desativado para evitar hotspots locais */}
        <directionalLight
          castShadow={false}
          intensity={0.0}
          position={[5, 8, 5]}
        />

        {/* Controles de órbita */}
        <OrbitControls
          enableZoom
          enablePan={false}
          minDistance={1.4}
          maxDistance={5}
          target={[0, 0.3, 0]}
          autoRotate={autoRotate}
          autoRotateSpeed={rotateSpeed / 0.3}
          minPolarAngle={Math.PI / 2}
          maxPolarAngle={Math.PI / 2}
        />

        {/* Modelo 3D */}
        <Suspense fallback={<LoadingFallback />}>
          <Model3DErrorBoundary>
            <Model
              modelUrl={modelUrl}
              materialColor={materialColor}
              autoRotate={autoRotate}
              rotateSpeed={rotateSpeed}
              baseScale={baseScale}
            />
          </Model3DErrorBoundary>

          {/* IBL environment para reflexos sutis */}
          {/* Ambiente IBL — mantém background=false para não alterar a cena */}
          <Environment preset="studio" background={false} />

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

          {/* Ground plane removed to eliminate shadow contact and darkening */}
        </Suspense>
      </Canvas>
    </div>
  );
}
