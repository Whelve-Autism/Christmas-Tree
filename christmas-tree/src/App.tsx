import { useState, useMemo, useRef, useEffect, Suspense } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import {
  OrbitControls,
  Environment,
  PerspectiveCamera,
  shaderMaterial,
  Float,
  Stars,
  Sparkles
} from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { MathUtils } from 'three';
import * as random from 'maath/random';
import { GestureRecognizer, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";

// --- 类型定义 ---
type SceneState = 'CHAOS' | 'FORMED';

// --- 视觉配置 ---
const CONFIG = {
  colors: {
    emerald: '#004225',
    gold: '#FFD700',
    silver: '#ECEFF1',
    red: '#D32F2F',
    white: '#FFFFFF',
    warmLight: '#FFD54F',
    lights: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00'],
    magicColors: ['#FF6B9D', '#C44569', '#FFD700', '#00D4FF', '#9D50BB', '#FF8C00', '#00FF88', '#FF4081'],
    giftColors: ['#D32F2F', '#FFD700', '#1976D2', '#2E7D32']
  },
  counts: {
    foliage: 15000,
    magicOrbs: 300,
    elements: 200,
    lights: 400,
    stars: 150,
    energyRings: 80
  },
  tree: { height: 22, radius: 9 }
} as const;

// --- Shader Material (Foliage) ---
const FoliageMaterial = shaderMaterial(
  { uTime: 0, uColor: new THREE.Color(CONFIG.colors.emerald), uProgress: 0 },
  `uniform float uTime; uniform float uProgress; attribute vec3 aTargetPos; attribute float aRandom;
  varying vec2 vUv; varying float vMix;
  float cubicInOut(float t) { return t < 0.5 ? 4.0 * t * t * t : 0.5 * pow(2.0 * t - 2.0, 3.0) + 1.0; }
  void main() {
    vUv = uv;
    vec3 noise = vec3(sin(uTime * 1.5 + position.x), cos(uTime + position.y), sin(uTime * 1.5 + position.z)) * 0.15;
    float t = cubicInOut(uProgress);
    vec3 finalPos = mix(position, aTargetPos + noise, t);
    vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
    gl_PointSize = (60.0 * (1.0 + aRandom)) / -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;
    vMix = t;
  }`,
  `uniform vec3 uColor; varying float vMix;
  void main() {
    float r = distance(gl_PointCoord, vec2(0.5)); if (r > 0.5) discard;
    vec3 finalColor = mix(uColor * 0.3, uColor * 1.2, vMix);
    gl_FragColor = vec4(finalColor, 1.0);
  }`
);
extend({ FoliageMaterial });

// --- 工具函数 ---
const getTreePosition = (): [number, number, number] => {
  const { height: h, radius: rBase } = CONFIG.tree;
  const y = (Math.random() * h) - (h / 2);
  const normalizedY = (y + h / 2) / h;
  const currentRadius = rBase * (1 - normalizedY);
  const theta = Math.random() * Math.PI * 2;
  const r = Math.random() * currentRadius;
  return [r * Math.cos(theta), y, r * Math.sin(theta)];
};

const getTreeTargetPosition = (offset: number = 0): THREE.Vector3 => {
  const { height: h, radius: rBase } = CONFIG.tree;
  const y = (Math.random() * h) - (h / 2);
  const normalizedY = (y + h / 2) / h;
  const currentRadius = rBase * (1 - normalizedY) + offset;
  const theta = Math.random() * Math.PI * 2;
  return new THREE.Vector3(currentRadius * Math.cos(theta), y, currentRadius * Math.sin(theta));
};

const getRandomChaosPosition = (range: number = 60): THREE.Vector3 => {
  return new THREE.Vector3(
    (Math.random() - 0.5) * range,
    (Math.random() - 0.5) * range,
    (Math.random() - 0.5) * range
  );
};

// --- Component: Foliage ---
const Foliage = ({ state }: { state: SceneState }) => {
  interface FoliageMaterialType extends THREE.ShaderMaterial {
    uTime: number;
    uProgress: number;
  }
  const materialRef = useRef<FoliageMaterialType | null>(null);
  const { positions, targetPositions, randoms } = useMemo(() => {
    const count = CONFIG.counts.foliage;
    const positions = new Float32Array(count * 3); const targetPositions = new Float32Array(count * 3); const randoms = new Float32Array(count);
    const spherePoints = random.inSphere(new Float32Array(count * 3), { radius: 25 }) as Float32Array;
    for (let i = 0; i < count; i++) {
      positions[i*3] = spherePoints[i*3]; positions[i*3+1] = spherePoints[i*3+1]; positions[i*3+2] = spherePoints[i*3+2];
      const [tx, ty, tz] = getTreePosition();
      targetPositions[i*3] = tx; targetPositions[i*3+1] = ty; targetPositions[i*3+2] = tz;
      randoms[i] = Math.random();
    }
    return { positions, targetPositions, randoms };
  }, []);
  useFrame((rootState, delta) => {
    if (materialRef.current) {
      materialRef.current.uTime = rootState.clock.elapsedTime;
      const targetProgress = state === 'FORMED' ? 1 : 0;
      materialRef.current.uProgress = MathUtils.damp(materialRef.current.uProgress, targetProgress, 1.5, delta);
    }
  });
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aTargetPos" args={[targetPositions, 3]} />
        <bufferAttribute attach="attributes-aRandom" args={[randoms, 1]} />
      </bufferGeometry>
      {/* @ts-ignore */}
      <foliageMaterial ref={materialRef} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
};

// --- Component: Magic Orbs ---
const MagicOrbs = ({ state }: { state: SceneState }) => {
  const count = CONFIG.counts.magicOrbs;
  const groupRef = useRef<THREE.Group>(null);
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 16, 16), []);

  const data = useMemo(() => {
    return new Array(count).fill(0).map(() => {
      const chaosPos = getRandomChaosPosition(70);
      const targetPos = getTreeTargetPosition(0.5);

      const isBig = Math.random() < 0.15;
      const baseScale = isBig ? 1.8 : 0.6 + Math.random() * 0.8;
      const weight = 0.8 + Math.random() * 1.2;
      const color = CONFIG.colors.magicColors[Math.floor(Math.random() * CONFIG.colors.magicColors.length)];

      const rotationSpeed = {
        x: (Math.random() - 0.5) * 1.5,
        y: (Math.random() - 0.5) * 1.5,
        z: (Math.random() - 0.5) * 1.5
      };
      const chaosRotation = new THREE.Euler(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);

      return {
        chaosPos, targetPos, scale: baseScale, weight, color,
        currentPos: chaosPos.clone(),
        chaosRotation,
        rotationSpeed,
        wobbleOffset: Math.random() * 10,
        wobbleSpeed: 0.5 + Math.random() * 0.5,
        pulseSpeed: 1 + Math.random() * 2
      };
    });
  }, [count]);

  useFrame((stateObj, delta) => {
    if (!groupRef.current) return;
    const isFormed = state === 'FORMED';
    const time = stateObj.clock.elapsedTime;

    groupRef.current.children.forEach((mesh, i) => {
      const objData = data[i];
      const target = isFormed ? objData.targetPos : objData.chaosPos;

      objData.currentPos.lerp(target, delta * (isFormed ? 0.8 * objData.weight : 0.5));
      (mesh as THREE.Mesh).position.copy(objData.currentPos);

      if (isFormed) {
        const wobbleX = Math.sin(time * objData.wobbleSpeed + objData.wobbleOffset) * 0.08;
        const wobbleZ = Math.cos(time * objData.wobbleSpeed * 0.8 + objData.wobbleOffset) * 0.08;
        (mesh as THREE.Mesh).rotation.x += wobbleX;
        (mesh as THREE.Mesh).rotation.z += wobbleZ;
        (mesh as THREE.Mesh).rotation.y += delta * objData.rotationSpeed.y;

        // 脉冲效果
        const pulse = 1 + Math.sin(time * objData.pulseSpeed + objData.wobbleOffset) * 0.2;
        (mesh as THREE.Mesh).scale.setScalar(objData.scale * pulse);
      } else {
        (mesh as THREE.Mesh).rotation.x += delta * objData.rotationSpeed.x;
        (mesh as THREE.Mesh).rotation.y += delta * objData.rotationSpeed.y;
        (mesh as THREE.Mesh).rotation.z += delta * objData.rotationSpeed.z;
        (mesh as THREE.Mesh).scale.setScalar(objData.scale);
      }

      // 更新发光强度
      const material = (mesh as THREE.Mesh).material as THREE.MeshStandardMaterial;
      if (material) {
        const intensity = isFormed ? 2 + Math.sin(time * objData.pulseSpeed + objData.wobbleOffset) * 1.5 : 0.5;
        material.emissiveIntensity = intensity;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {data.map((obj, i) => (
        <mesh key={i} geometry={geometry} scale={obj.scale} rotation={state === 'CHAOS' ? obj.chaosRotation : [0,0,0]}>
          <meshStandardMaterial
            color={obj.color}
            emissive={obj.color}
            emissiveIntensity={0.5}
            roughness={0.2}
            metalness={0.8}
            transparent
            opacity={0.9}
          />
        </mesh>
      ))}
    </group>
  );
};

// --- Component: Glowing Stars ---
const GlowingStars = ({ state }: { state: SceneState }) => {
  const count = CONFIG.counts.stars;
  const groupRef = useRef<THREE.Group>(null);

  const starShape = useMemo(() => {
    const shape = new THREE.Shape();
    const outerRadius = 0.4;
    const innerRadius = 0.2;
    const points = 5;
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      if (i === 0) {
        shape.moveTo(radius * Math.cos(angle), radius * Math.sin(angle));
      } else {
        shape.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));
      }
    }
    shape.closePath();
    return shape;
  }, []);

  const starGeometry = useMemo(() => {
    return new THREE.ExtrudeGeometry(starShape, {
      depth: 0.1,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 2,
    });
  }, [starShape]);

  const data = useMemo(() => {
    return new Array(count).fill(0).map(() => {
      const chaosPos = getRandomChaosPosition(60);
      const targetPos = getTreeTargetPosition(0.3);

      const color = Math.random() > 0.5 ? CONFIG.colors.gold : CONFIG.colors.silver;
      const scale = 0.5 + Math.random() * 0.8;
      const rotationSpeed = (Math.random() - 0.5) * 2;
      const twinkleSpeed = 1 + Math.random() * 2;

      return {
        chaosPos, targetPos, color, scale, currentPos: chaosPos.clone(),
        rotationSpeed, twinkleSpeed, timeOffset: Math.random() * 10
      };
    });
  }, [count]);

  useFrame((stateObj, delta) => {
    if (!groupRef.current) return;
    const isFormed = state === 'FORMED';
    const time = stateObj.clock.elapsedTime;

    groupRef.current.children.forEach((mesh, i) => {
      const objData = data[i];
      const target = isFormed ? objData.targetPos : objData.chaosPos;

      objData.currentPos.lerp(target, delta * 1.2);
      (mesh as THREE.Mesh).position.copy(objData.currentPos);
      (mesh as THREE.Mesh).rotation.z += delta * objData.rotationSpeed;

      const material = (mesh as THREE.Mesh).material as THREE.MeshStandardMaterial;
      if (material && isFormed) {
        const twinkle = (Math.sin(time * objData.twinkleSpeed + objData.timeOffset) + 1) / 2;
        material.emissiveIntensity = 1.5 + twinkle * 2;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {data.map((obj, i) => (
        <mesh key={i} geometry={starGeometry} scale={obj.scale} position={obj.currentPos}>
          <meshStandardMaterial
            color={obj.color}
            emissive={obj.color}
            emissiveIntensity={0.5}
            roughness={0.1}
            metalness={1.0}
          />
        </mesh>
      ))}
    </group>
  );
};

// --- Component: Energy Rings ---
const EnergyRings = ({ state }: { state: SceneState }) => {
  const count = CONFIG.counts.energyRings;
  const groupRef = useRef<THREE.Group>(null);
  const ringGeometry = useMemo(() => new THREE.TorusGeometry(0.8, 0.15, 8, 32), []);

  const data = useMemo(() => {
    return new Array(count).fill(0).map(() => {
      const chaosPos = getRandomChaosPosition(65);
      const targetPos = getTreeTargetPosition(0.4);

      const color = CONFIG.colors.magicColors[Math.floor(Math.random() * CONFIG.colors.magicColors.length)];
      const scale = 0.6 + Math.random() * 0.6;
      const rotationSpeed = { x: (Math.random()-0.5)*1.5, y: (Math.random()-0.5)*1.5, z: (Math.random()-0.5)*1.5 };
      const pulseSpeed = 1 + Math.random() * 1.5;

      return {
        chaosPos, targetPos, color, scale, currentPos: chaosPos.clone(),
        rotationSpeed, pulseSpeed, timeOffset: Math.random() * 10
      };
    });
  }, [count]);

  useFrame((stateObj, delta) => {
    if (!groupRef.current) return;
    const isFormed = state === 'FORMED';
    const time = stateObj.clock.elapsedTime;

    groupRef.current.children.forEach((mesh, i) => {
      const objData = data[i];
      const target = isFormed ? objData.targetPos : objData.chaosPos;

      objData.currentPos.lerp(target, delta * 1.0);
      (mesh as THREE.Mesh).position.copy(objData.currentPos);

      (mesh as THREE.Mesh).rotation.x += delta * objData.rotationSpeed.x;
      (mesh as THREE.Mesh).rotation.y += delta * objData.rotationSpeed.y;
      (mesh as THREE.Mesh).rotation.z += delta * objData.rotationSpeed.z;

      const material = (mesh as THREE.Mesh).material as THREE.MeshStandardMaterial;
      if (material && isFormed) {
        const pulse = 1 + Math.sin(time * objData.pulseSpeed + objData.timeOffset) * 0.3;
        material.emissiveIntensity = 2 + pulse * 1.5;
        (mesh as THREE.Mesh).scale.setScalar(objData.scale * pulse);
      } else {
        (mesh as THREE.Mesh).scale.setScalar(objData.scale);
      }
    });
  });

  return (
    <group ref={groupRef}>
      {data.map((obj, i) => (
        <mesh key={i} geometry={ringGeometry} scale={obj.scale} position={obj.currentPos}>
          <meshStandardMaterial
            color={obj.color}
            emissive={obj.color}
            emissiveIntensity={1}
            roughness={0.2}
            metalness={0.9}
            transparent
            opacity={0.85}
          />
        </mesh>
      ))}
    </group>
  );
};

// --- Component: Christmas Elements ---
const ChristmasElements = ({ state }: { state: SceneState }) => {
  const count = CONFIG.counts.elements;
  const groupRef = useRef<THREE.Group>(null);

  const boxGeometry = useMemo(() => new THREE.BoxGeometry(0.8, 0.8, 0.8), []);
  const sphereGeometry = useMemo(() => new THREE.SphereGeometry(0.5, 16, 16), []);
  const caneGeometry = useMemo(() => new THREE.CylinderGeometry(0.15, 0.15, 1.2, 8), []);

  const data = useMemo(() => {
    return new Array(count).fill(0).map(() => {
      const chaosPos = getRandomChaosPosition(60);
      const targetPos = getTreeTargetPosition(-0.05);

      const type = Math.floor(Math.random() * 3);
      const giftColor = CONFIG.colors.giftColors[Math.floor(Math.random() * CONFIG.colors.giftColors.length)];
      const color = type === 2 ? (Math.random() > 0.5 ? CONFIG.colors.red : CONFIG.colors.white) : giftColor;
      const scale = type === 0 ? 0.8 + Math.random() * 0.4 : type === 1 ? 0.6 + Math.random() * 0.4 : 0.7 + Math.random() * 0.3;

      const rotationSpeed = { x: (Math.random() - 0.5) * 2.0, y: (Math.random() - 0.5) * 2.0, z: (Math.random() - 0.5) * 2.0 };
      return {
        type,
        chaosPos,
        targetPos,
        color,
        scale,
        currentPos: chaosPos.clone(),
        chaosRotation: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI),
        rotationSpeed
      };
    });
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const isFormed = state === 'FORMED';
    groupRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const objData = data[i];
      const target = isFormed ? objData.targetPos : objData.chaosPos;
      objData.currentPos.lerp(target, delta * 1.5);
      mesh.position.copy(objData.currentPos);
      mesh.rotation.x += delta * objData.rotationSpeed.x;
      mesh.rotation.y += delta * objData.rotationSpeed.y;
      mesh.rotation.z += delta * objData.rotationSpeed.z;
    });
  });

  return (
    <group ref={groupRef}>
      {data.map((obj, i) => {
        const geometry = obj.type === 0 ? boxGeometry : obj.type === 1 ? sphereGeometry : caneGeometry;
        return (
          <mesh key={i} scale={[obj.scale, obj.scale, obj.scale]} geometry={geometry} rotation={obj.chaosRotation}>
            <meshStandardMaterial
              color={obj.color}
              roughness={0.3}
              metalness={0.4}
              emissive={obj.color}
              emissiveIntensity={0.2}
            />
          </mesh>
        );
      })}
    </group>
  );
};

// --- Component: Fairy Lights ---
const FairyLights = ({ state }: { state: SceneState }) => {
  const count = CONFIG.counts.lights;
  const groupRef = useRef<THREE.Group>(null);
  const geometry = useMemo(() => new THREE.SphereGeometry(0.8, 8, 8), []);

  const data = useMemo(() => {
    return new Array(count).fill(0).map(() => {
      const chaosPos = getRandomChaosPosition(60);
      const targetPos = getTreeTargetPosition(0.3);
      const color = CONFIG.colors.lights[Math.floor(Math.random() * CONFIG.colors.lights.length)];
      const speed = 2 + Math.random() * 3;
      return { chaosPos, targetPos, color, speed, currentPos: chaosPos.clone(), timeOffset: Math.random() * 100 };
    });
  }, []);

  useFrame((stateObj, delta) => {
    if (!groupRef.current) return;
    const isFormed = state === 'FORMED';
    const time = stateObj.clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      const objData = data[i];
      const target = isFormed ? objData.targetPos : objData.chaosPos;
      objData.currentPos.lerp(target, delta * 2.0);
      const mesh = child as THREE.Mesh;
      mesh.position.copy(objData.currentPos);
      const intensity = (Math.sin(time * objData.speed + objData.timeOffset) + 1) / 2;
      if (mesh.material) { (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = isFormed ? 3 + intensity * 4 : 0; }
    });
  });

  return (
    <group ref={groupRef}>
      {data.map((obj, i) => (
        <mesh key={i} scale={[0.15, 0.15, 0.15]} geometry={geometry}>
          <meshStandardMaterial color={obj.color} emissive={obj.color} emissiveIntensity={0} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
};

// --- Component: Top Star ---
const TopStar = ({ state }: { state: SceneState }) => {
  const groupRef = useRef<THREE.Group>(null);

  const starShape = useMemo(() => {
    const shape = new THREE.Shape();
    const outerRadius = 1.3;
    const innerRadius = 0.7;
    const points = 5;
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      if (i === 0) {
        shape.moveTo(radius * Math.cos(angle), radius * Math.sin(angle));
      } else {
        shape.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));
      }
    }
    shape.closePath();
    return shape;
  }, []);

  const starGeometry = useMemo(() => {
    return new THREE.ExtrudeGeometry(starShape, {
      depth: 0.4,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.1,
      bevelSegments: 3,
    });
  }, [starShape]);

  const goldMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: CONFIG.colors.gold,
    emissive: CONFIG.colors.gold,
    emissiveIntensity: 1.5,
    roughness: 0.1,
    metalness: 1.0,
  }), []);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.5;
      const targetScale = state === 'FORMED' ? 1 : 0;
      groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 3);
    }
  });

  return (
    <group ref={groupRef} position={[0, CONFIG.tree.height / 2 + 1.8, 0]}>
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.2}>
        <mesh geometry={starGeometry} material={goldMaterial} />
      </Float>
    </group>
  );
};

// --- Main Scene Experience ---
const Experience = ({ sceneState, rotationSpeed }: { sceneState: SceneState; rotationSpeed: number }) => {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  useFrame(() => {
    if (controlsRef.current) {
      controlsRef.current.setAzimuthalAngle(controlsRef.current.getAzimuthalAngle() + rotationSpeed);
      controlsRef.current.update();
    }
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 8, 60]} fov={45} />
      <OrbitControls ref={controlsRef} enablePan={false} enableZoom={true} minDistance={30} maxDistance={120} autoRotate={rotationSpeed === 0 && sceneState === 'FORMED'} autoRotateSpeed={0.3} maxPolarAngle={Math.PI / 1.7} />

      <color attach="background" args={['#000300']} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <Environment preset="night" background={false} />

      <ambientLight intensity={0.4} color="#003311" />
      <pointLight position={[30, 30, 30]} intensity={100} color={CONFIG.colors.warmLight} />
      <pointLight position={[-30, 10, -30]} intensity={50} color={CONFIG.colors.gold} />
      <pointLight position={[0, -20, 10]} intensity={30} color="#ffffff" />

      <group position={[0, -6, 0]}>
        <Foliage state={sceneState} />
        <Suspense fallback={null}>
           <MagicOrbs state={sceneState} />
           <GlowingStars state={sceneState} />
           <EnergyRings state={sceneState} />
           <ChristmasElements state={sceneState} />
           <FairyLights state={sceneState} />
           <TopStar state={sceneState} />
        </Suspense>
        <Sparkles count={600} scale={50} size={8} speed={0.4} opacity={0.4} color={CONFIG.colors.silver} />
      </group>

      <EffectComposer>
        <Bloom luminanceThreshold={0.8} luminanceSmoothing={0.1} intensity={1.5} radius={0.5} mipmapBlur />
        <Vignette eskil={false} offset={0.1} darkness={1.2} />
      </EffectComposer>
    </>
  );
};

// --- Gesture Controller ---
interface GestureControllerProps {
  onGesture: (state: SceneState) => void;
  onMove: (speed: number) => void;
  onStatus: (status: string) => void;
  debugMode: boolean;
}

const GestureController = ({ onGesture, onMove, onStatus, debugMode }: GestureControllerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let gestureRecognizer: GestureRecognizer;
    let requestRef: number | undefined;

    const setup = async () => {
      onStatus("DOWNLOADING AI...");
      try {
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
        gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        onStatus("REQUESTING CAMERA...");
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
            onStatus("AI READY: SHOW HAND");
            predictWebcam();
          }
        } else {
            onStatus("ERROR: CAMERA PERMISSION DENIED");
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'MODEL FAILED';
        onStatus(`ERROR: ${errorMessage}`);
      }
    };

    const predictWebcam = () => {
      if (gestureRecognizer && videoRef.current && canvasRef.current) {
        if (videoRef.current.videoWidth > 0) {
          try {
            const results = gestureRecognizer.recognizeForVideo(videoRef.current, Date.now());
            const ctx = canvasRef.current.getContext("2d");
            
            if (ctx && debugMode) {
              canvasRef.current.width = videoRef.current.videoWidth;
              canvasRef.current.height = videoRef.current.videoHeight;
              ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
              
              if (results.landmarks && results.landmarks.length > 0) {
                for (const landmarks of results.landmarks) {
                  const drawingUtils = new DrawingUtils(ctx);
                  drawingUtils.drawConnectors(landmarks, GestureRecognizer.HAND_CONNECTIONS, { color: "#FFD700", lineWidth: 2 });
                  drawingUtils.drawLandmarks(landmarks, { color: "#FF0000", lineWidth: 1 });
                }
              }
            }

            if (results.gestures && results.gestures.length > 0) {
              const gesture = results.gestures[0];
              if (gesture && gesture.length > 0) {
                const name = gesture[0].categoryName;
                const score = gesture[0].score;
                if (score > 0.4) {
                  if (name === "Open_Palm") onGesture("CHAOS");
                  if (name === "Closed_Fist") onGesture("FORMED");
                  if (debugMode) onStatus(`DETECTED: ${name}`);
                }
              }
            }

            if (results.landmarks && results.landmarks.length > 0 && results.landmarks[0].length > 0) {
              const speed = (0.5 - results.landmarks[0][0].x) * 0.15;
              onMove(Math.abs(speed) > 0.01 ? speed : 0);
            } else {
              onMove(0);
              if (debugMode) onStatus("AI READY: NO HAND");
            }
          } catch (error) {
            console.error("Gesture recognition error:", error);
            onMove(0);
          }
        }
        requestRef = requestAnimationFrame(predictWebcam);
      }
    };
    setup();
    return () => {
      if (requestRef !== undefined) {
        cancelAnimationFrame(requestRef);
      }
    };
  }, [onGesture, onMove, onStatus, debugMode]);

  return (
    <>
      <video ref={videoRef} style={{ opacity: debugMode ? 0.6 : 0, position: 'fixed', top: 0, right: 0, width: debugMode ? '320px' : '1px', zIndex: debugMode ? 100 : -1, pointerEvents: 'none', transform: 'scaleX(-1)' }} playsInline muted autoPlay />
      <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, right: 0, width: debugMode ? '320px' : '1px', height: debugMode ? 'auto' : '1px', zIndex: debugMode ? 101 : -1, pointerEvents: 'none', transform: 'scaleX(-1)' }} />
    </>
  );
};

// --- App Entry ---
export default function GrandTreeApp() {
  const [sceneState, setSceneState] = useState<SceneState>('CHAOS');
  const [rotationSpeed, setRotationSpeed] = useState(0);
  const [aiStatus, setAiStatus] = useState("INITIALIZING...");
  const [debugMode, setDebugMode] = useState(false);
  const [animationTime, setAnimationTime] = useState(0);

  // 动画时间更新 - 使用 requestAnimationFrame 获得流畅动画
  useEffect(() => {
    let animationFrameId: number;
    let startTime = Date.now();
    
    const animate = () => {
      const currentTime = Date.now();
      const elapsed = (currentTime - startTime) / 1000; // 转换为秒
      setAnimationTime(elapsed);
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#000', position: 'relative', overflow: 'hidden' }}>
      <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }}>
        <Canvas dpr={[1, 2]} gl={{ toneMapping: THREE.ReinhardToneMapping }} shadows>
            <Experience sceneState={sceneState} rotationSpeed={rotationSpeed} />
        </Canvas>
      </div>
      <GestureController onGesture={setSceneState} onMove={setRotationSpeed} onStatus={setAiStatus} debugMode={debugMode} />

      {/* UI - Stats */}
      <div style={{ position: 'absolute', bottom: '30px', left: '40px', color: '#888', zIndex: 10, fontFamily: 'sans-serif', userSelect: 'none' }}>
        <div style={{ marginBottom: '15px' }}>
          <p style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>Magic Effects</p>
          <p style={{ fontSize: '24px', color: '#FFD700', fontWeight: 'bold', margin: 0 }}>
            {CONFIG.counts.magicOrbs.toLocaleString()} <span style={{ fontSize: '10px', color: '#555', fontWeight: 'normal' }}>MAGIC ORBS</span>
          </p>
        </div>
        <div>
          <p style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>Foliage</p>
          <p style={{ fontSize: '24px', color: '#004225', fontWeight: 'bold', margin: 0 }}>
            {(CONFIG.counts.foliage / 1000).toFixed(0)}K <span style={{ fontSize: '10px', color: '#555', fontWeight: 'normal' }}>EMERALD NEEDLES</span>
          </p>
        </div>
      </div>

      {/* UI - Buttons */}
      <div style={{ position: 'absolute', bottom: '30px', right: '40px', zIndex: 10, display: 'flex', gap: '10px' }}>
        <button onClick={() => setDebugMode(!debugMode)} style={{ padding: '12px 15px', backgroundColor: debugMode ? '#FFD700' : 'rgba(0,0,0,0.5)', border: '1px solid #FFD700', color: debugMode ? '#000' : '#FFD700', fontFamily: 'sans-serif', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
           {debugMode ? 'HIDE DEBUG' : '🛠 DEBUG'}
        </button>
        <button onClick={() => setSceneState(s => s === 'CHAOS' ? 'FORMED' : 'CHAOS')} style={{ padding: '12px 30px', backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255, 215, 0, 0.5)', color: '#FFD700', fontFamily: 'serif', fontSize: '14px', fontWeight: 'bold', letterSpacing: '3px', textTransform: 'uppercase', cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
           {sceneState === 'CHAOS' ? 'Assemble Tree' : 'Disperse'}
        </button>
      </div>

      {/* UI - AI Status */}
      <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', color: aiStatus.includes('ERROR') ? '#FF0000' : 'rgba(255, 215, 0, 0.4)', fontSize: '10px', letterSpacing: '2px', zIndex: 10, background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '4px' }}>
        {aiStatus}
      </div>

      {/* UI - Merry Christmas 炫动文字 */}
      <div style={{
        position: 'absolute',
        top: '60px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        userSelect: 'none',
        pointerEvents: 'none'
      }}>
        <h1 style={{
          fontSize: 'clamp(36px, 7vw, 72px)',
          fontFamily: "'Georgia', 'Times New Roman', serif",
          fontWeight: 'bold',
          margin: 0,
          padding: '15px 40px',
          background: `linear-gradient(${animationTime * 60}deg, 
            #FFD700 0%, 
            #FF6B9D ${15 + Math.sin(animationTime * 1.2) * 15}%, 
            #00D4FF ${35 + Math.cos(animationTime * 1.5) * 15}%, 
            #9D50BB ${55 + Math.sin(animationTime * 1.8) * 15}%, 
            #FFD700 ${75 + Math.cos(animationTime * 1.3) * 15}%, 
            #FF8C00 ${90 + Math.sin(animationTime * 1.1) * 10}%, 
            #FFD700 100%)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          backgroundSize: '200% 200%',
          textShadow: `
            0 0 30px rgba(255, 215, 0, ${0.6 + Math.sin(animationTime * 2.5) * 0.4}),
            0 0 60px rgba(255, 107, 157, ${0.5 + Math.cos(animationTime * 2) * 0.4}),
            0 0 90px rgba(0, 212, 255, ${0.4 + Math.sin(animationTime * 1.8) * 0.3}),
            0 0 120px rgba(157, 80, 187, ${0.3 + Math.cos(animationTime * 1.5) * 0.2})
          `,
          transform: `
            scale(${1 + Math.sin(animationTime * 3.5) * 0.08}) 
            translateY(${Math.sin(animationTime * 2.2) * 8}px)
            rotateZ(${Math.sin(animationTime * 0.5) * 2}deg)
          `,
          transition: 'none',
          letterSpacing: '6px',
          textTransform: 'uppercase',
          filter: `
            brightness(${1 + Math.sin(animationTime * 4.5) * 0.3})
            drop-shadow(0 0 20px rgba(255, 215, 0, ${0.5 + Math.sin(animationTime * 3) * 0.3}))
          `,
          animation: 'none',
          willChange: 'transform, filter, background-position',
        }}>
          Merry Christmas
        </h1>
      </div>
    </div>
  );
}