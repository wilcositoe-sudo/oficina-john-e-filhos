import { Component, Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const MODEL_URL = '/models/quaternius-car.glb';
const HOOD_HINGE_Z = 0.34;

function createGeometry(faces) {
  const positions = [];
  const normals = [];

  for (const face of faces) {
    positions.push(...face.positions);
    normals.push(...face.normals);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.computeBoundingSphere();
  geometry.userData.authWorkshopOwned = true;
  return geometry;
}

function splitHood(mesh) {
  if (!mesh.geometry.index || Array.isArray(mesh.material) || mesh.material.name !== 'LightBlue') {
    return null;
  }

  const geometry = mesh.geometry;
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const indices = geometry.index.array;
  const bodyFaces = [];
  const hoodFaces = [];

  for (let offset = 0; offset < indices.length; offset += 3) {
    const vertexIndices = [indices[offset], indices[offset + 1], indices[offset + 2]];
    const vertices = vertexIndices.map((index) => [
      position.getX(index),
      position.getY(index),
      position.getZ(index),
    ]);
    const normals = vertexIndices.map((index) => [
      normal.getX(index),
      normal.getY(index),
      normal.getZ(index),
    ]);
    const center = [0, 1, 2].map((axis) => (
      vertices.reduce((sum, vertex) => sum + vertex[axis], 0) / 3
    ));
    const averageNormalY = normals.reduce((sum, vertex) => sum + vertex[1], 0) / 3;
    const isHoodFace = Math.abs(center[0]) < 0.64
      && center[1] > 0.38
      && center[1] < 0.9
      && center[2] > 0.2
      && center[2] < 1.43
      && averageNormalY > 0.28;
    const face = {
      positions: vertices.flat(),
      normals: normals.flat(),
    };

    (isHoodFace ? hoodFaces : bodyFaces).push(face);
  }

  if (hoodFaces.length < 8) return null;

  const hoodGeometry = createGeometry(hoodFaces);
  const hoodPositions = hoodGeometry.getAttribute('position');
  for (let index = 0; index < hoodPositions.count; index += 1) {
    hoodPositions.setZ(index, hoodPositions.getZ(index) - HOOD_HINGE_Z);
  }
  hoodPositions.needsUpdate = true;
  hoodGeometry.computeBoundingSphere();

  return {
    bodyGeometry: createGeometry(bodyFaces),
    hoodGeometry,
  };
}

function prepareCar(scene) {
  const car = scene.clone(true);
  const meshes = [];

  car.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
    object.material = Array.isArray(object.material)
      ? object.material.map((material) => {
        const clone = material.clone();
        clone.userData.authWorkshopOwned = true;
        return clone;
      })
      : object.material.clone();
    if (!Array.isArray(object.material)) object.material.userData.authWorkshopOwned = true;
    meshes.push(object);
  });

  let hoodCreated = false;
  for (const mesh of meshes) {
    if (hoodCreated) break;
    const split = splitHood(mesh);
    if (!split) continue;

    mesh.geometry = split.bodyGeometry;
    const pivot = new THREE.Group();
    pivot.name = 'auth-workshop-hood-pivot';
    pivot.position.copy(mesh.position);
    pivot.position.z += HOOD_HINGE_Z;
    pivot.quaternion.copy(mesh.quaternion);
    pivot.scale.copy(mesh.scale);

    const hood = new THREE.Mesh(split.hoodGeometry, mesh.material);
    hood.castShadow = true;
    hood.receiveShadow = true;
    pivot.add(hood);
    mesh.parent.add(pivot);
    hoodCreated = true;
  }

  if (!hoodCreated) {
    throw new Error('Não foi possível separar o capô do modelo 3D da viatura.');
  }

  return car;
}

function Vehicle({ vehicleRef, hoodRef, lightsOn }) {
  const { scene } = useLoader(GLTFLoader, MODEL_URL);
  const car = useMemo(() => prepareCar(scene), [scene]);

  useEffect(() => {
    hoodRef.current = car.getObjectByName('auth-workshop-hood-pivot');
    car.traverse((object) => {
      if (!object.isMesh) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (material.name !== 'Headlights') continue;
        material.emissive.set(lightsOn ? '#ffd990' : '#000000');
        material.emissiveIntensity = lightsOn ? 2 : 0;
      }
    });
  }, [car, hoodRef, lightsOn]);

  useEffect(() => () => {
    car.traverse((object) => {
      if (!object.isMesh) return;
      if (object.geometry.userData.authWorkshopOwned) object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (material.userData.authWorkshopOwned) material.dispose();
      }
    });
  }, [car]);

  return <primitive ref={vehicleRef} object={car} />;
}

function Mechanic({ mechanicRef, leftArmRef, rightArmRef }) {
  return (
    <group ref={mechanicRef} position={[2.75, 0, 0.95]} scale={0.9}>
      <mesh position={[0, 1.02, 0]} castShadow>
        <capsuleGeometry args={[0.2, 0.48, 5, 8]} />
        <meshStandardMaterial color="#243b55" roughness={0.82} />
      </mesh>
      <mesh position={[0, 1.64, 0]} castShadow>
        <sphereGeometry args={[0.17, 12, 10]} />
        <meshStandardMaterial color="#b77955" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.8, 0]} castShadow>
        <cylinderGeometry args={[0.19, 0.19, 0.09, 10]} />
        <meshStandardMaterial color="#e79a3b" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.29, 0.018]}>
        <boxGeometry args={[0.36, 0.1, 0.28]} />
        <meshStandardMaterial color="#ee9c3d" roughness={0.7} />
      </mesh>
      <group ref={leftArmRef} position={[-0.22, 1.24, 0]}>
        <mesh position={[-0.08, -0.2, 0.02]} rotation={[0, 0, 0.42]} castShadow>
          <capsuleGeometry args={[0.065, 0.32, 4, 6]} />
          <meshStandardMaterial color="#243b55" roughness={0.82} />
        </mesh>
        <mesh position={[-0.12, -0.39, 0.06]} castShadow>
          <sphereGeometry args={[0.07, 8, 7]} />
          <meshStandardMaterial color="#b77955" roughness={0.9} />
        </mesh>
      </group>
      <group ref={rightArmRef} position={[0.22, 1.24, 0]}>
        <mesh position={[0.08, -0.2, 0.02]} rotation={[0, 0, -0.42]} castShadow>
          <capsuleGeometry args={[0.065, 0.32, 4, 6]} />
          <meshStandardMaterial color="#243b55" roughness={0.82} />
        </mesh>
        <mesh position={[0.12, -0.39, 0.06]} castShadow>
          <sphereGeometry args={[0.07, 8, 7]} />
          <meshStandardMaterial color="#b77955" roughness={0.9} />
        </mesh>
      </group>
      {[-0.12, 0.12].map((x) => (
        <mesh key={x} position={[x, 0.42, 0]} castShadow>
          <capsuleGeometry args={[0.075, 0.42, 4, 6]} />
          <meshStandardMaterial color="#182a3e" roughness={0.9} />
        </mesh>
      ))}
      {[-0.12, 0.12].map((x) => (
        <mesh key={x} position={[x, 0.13, 0.055]} castShadow>
          <boxGeometry args={[0.17, 0.1, 0.28]} />
          <meshStandardMaterial color="#171c23" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

function Engine({ engineRef, progress, running, reducedMotion }) {
  const pistonRefs = useRef([]);
  const beltRef = useRef(null);

  useFrame((state, delta) => {
    if (beltRef.current && running && !reducedMotion) beltRef.current.rotation.z += delta * 2.2;
    pistonRefs.current.forEach((piston, index) => {
      if (!piston) return;
      const pulse = running ? Math.sin(state.clock.elapsedTime * 10 + index * 1.4) * 0.055 : 0;
      piston.position.y = 0.59 + pulse;
    });
  });

  return (
    <group ref={engineRef} position={[0, 0, 0.82]}>
      <mesh position={[0, 0.39, 0]} castShadow>
        <boxGeometry args={[0.68, 0.36, 0.72]} />
        <meshStandardMaterial color="#46596b" metalness={0.56} roughness={0.46} />
      </mesh>
      <mesh position={[0, 0.61, 0]}>
        <boxGeometry args={[0.62, 0.09, 0.68]} />
        <meshStandardMaterial color="#d58a32" metalness={0.45} roughness={0.4} />
      </mesh>
      {[0, 1, 2, 3].map((index) => (
        <group
          key={index}
          ref={(element) => { pistonRefs.current[index] = element; }}
          position={[-0.21 + (index % 2) * 0.42, 0.59, index < 2 ? -0.19 : 0.19]}
          visible={progress > index}
        >
          <mesh castShadow>
            <cylinderGeometry args={[0.07, 0.08, 0.16, 8]} />
            <meshStandardMaterial
              color={index < progress ? '#e7a544' : '#607487'}
              metalness={0.62}
              roughness={0.36}
            />
          </mesh>
        </group>
      ))}
      <mesh ref={beltRef} position={[0.42, 0.39, 0.02]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.13, 0.025, 6, 18]} />
        <meshStandardMaterial color="#202b34" roughness={0.92} />
      </mesh>
      <mesh position={[0.42, 0.39, 0.02]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.07, 0.07, 0.08, 12]} />
        <meshStandardMaterial color="#d58a32" metalness={0.55} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.79, 0]}>
        <sphereGeometry args={[0.055, 8, 8]} />
        <meshStandardMaterial
          color={running ? '#ffd078' : '#678198'}
          emissive={running ? '#ff9c32' : '#000000'}
          emissiveIntensity={running ? 1.7 : 0}
        />
      </mesh>
    </group>
  );
}

function WorkshopContents({
  stage,
  reducedMotion,
  progress,
  onIntroComplete,
}) {
  const vehicleRef = useRef(null);
  const hoodRef = useRef(null);
  const mechanicRef = useRef(null);
  const leftArmRef = useRef(null);
  const rightArmRef = useRef(null);
  const engineRef = useRef(null);
  const partRef = useRef(null);
  const phaseTime = useRef(0);
  const previousStage = useRef(stage);
  const introNotified = useRef(false);
  const running = stage === 'success';
  const lightsOn = stage === 'success';

  useFrame((state, delta) => {
    if (previousStage.current !== stage) {
      previousStage.current = stage;
      phaseTime.current = 0;
    }

    phaseTime.current += delta;
    const elapsed = phaseTime.current;
    const introProgress = reducedMotion ? 1 : THREE.MathUtils.clamp(elapsed / 3.25, 0, 1);
    const arrival = introProgress * introProgress * (3 - 2 * introProgress);
    const openAmount = stage === 'intro'
      ? THREE.MathUtils.clamp((elapsed - 1.12) / 1.18, 0, 1)
      : stage === 'success'
        ? 1 - THREE.MathUtils.clamp((elapsed - 1.12) / 0.55, 0, 1)
        : stage === 'error'
          ? 1
          : 1;
    const hoodAngle = reducedMotion ? -0.85 : -0.85 * openAmount;

    if (stage === 'intro' && mechanicRef.current) {
      mechanicRef.current.position.x = THREE.MathUtils.lerp(2.75, 1.42, arrival);
    } else if (mechanicRef.current) {
      mechanicRef.current.position.x = 1.42;
    }

    if (leftArmRef.current && rightArmRef.current) {
      const working = stage === 'intro' && elapsed > 1.12 && openAmount > 0.85;
      leftArmRef.current.rotation.z = THREE.MathUtils.damp(
        leftArmRef.current.rotation.z,
        working ? 0.64 : 0,
        5,
        delta,
      );
      rightArmRef.current.rotation.z = THREE.MathUtils.damp(
        rightArmRef.current.rotation.z,
        working ? -0.64 : 0,
        5,
        delta,
      );
    }

    if (hoodRef.current) {
      hoodRef.current.rotation.x = reducedMotion
        ? hoodAngle
        : THREE.MathUtils.damp(hoodRef.current.rotation.x, hoodAngle, 4.5, delta);
    }

    if (engineRef.current) {
      const vibration = running && !reducedMotion
        ? Math.sin(state.clock.elapsedTime * 10) * 0.012
        : 0;
      engineRef.current.position.y = vibration;
    }

    if (vehicleRef.current) {
      const departure = stage === 'success' && !reducedMotion
        ? THREE.MathUtils.clamp((elapsed - 2.1) / 1.25, 0, 1)
        : 0;
      vehicleRef.current.position.x = THREE.MathUtils.lerp(0, -5.8, departure);
    }

    if (partRef.current) {
      if (stage === 'success') {
        const progressToEngine = THREE.MathUtils.clamp(elapsed / 0.85, 0, 1);
        partRef.current.position.set(
          THREE.MathUtils.lerp(1.7, 0.08, progressToEngine),
          THREE.MathUtils.lerp(0.9, 0.86, progressToEngine),
          THREE.MathUtils.lerp(1.4, 0.82, progressToEngine),
        );
        partRef.current.rotation.y += delta * 2;
        partRef.current.visible = elapsed < 1.1;
      } else if (stage === 'error') {
        const failedProgress = THREE.MathUtils.clamp(elapsed / 1.2, 0, 1);
        partRef.current.position.set(
          THREE.MathUtils.lerp(1.7, 1.9, failedProgress),
          THREE.MathUtils.lerp(0.9, 0.22, failedProgress),
          1.4,
        );
        partRef.current.visible = elapsed < 1.25;
      } else {
        partRef.current.visible = false;
      }
    }

    if (stage === 'intro' && (elapsed >= 3.25 || reducedMotion) && !introNotified.current) {
      introNotified.current = true;
      onIntroComplete();
    }
  });

  return (
    <>
      <color attach="background" args={['#111c27']} />
      <fog attach="fog" args={['#111c27', 8, 19]} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[4, 7, 5]} intensity={3} castShadow shadow-mapSize={[768, 768]} />
      <pointLight position={[-3, 3.4, -2]} color="#f0a449" intensity={2.2} distance={10} />
      <pointLight position={[1.5, 2.8, 2.4]} color="#64a5d5" intensity={1.7} distance={8} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.015, 0]} receiveShadow>
        <planeGeometry args={[24, 24]} />
        <meshStandardMaterial color="#202c37" roughness={0.82} metalness={0.12} />
      </mesh>
      <gridHelper args={[18, 36, '#526170', '#303c48']} position={[0, 0, 0]} />

      <group position={[-0.15, 0, 0]}>
        <Vehicle
          vehicleRef={vehicleRef}
          hoodRef={hoodRef}
          lightsOn={lightsOn}
        />
        <Engine
          engineRef={engineRef}
          progress={stage === 'success' ? 4 : progress}
          running={running}
          reducedMotion={reducedMotion}
        />
      </group>

      <Mechanic
        mechanicRef={mechanicRef}
        leftArmRef={leftArmRef}
        rightArmRef={rightArmRef}
      />

      <mesh ref={partRef} visible={false} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.12, 8]} />
        <meshStandardMaterial color="#e7a544" metalness={0.72} roughness={0.28} />
      </mesh>

      <mesh position={[-3.4, 1.3, -1.6]} castShadow>
        <boxGeometry args={[0.08, 2.6, 0.08]} />
        <meshStandardMaterial color="#344656" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[-3.4, 2.63, -1.6]}>
        <boxGeometry args={[2.8, 0.06, 0.12]} />
        <meshStandardMaterial color="#e99d43" emissive="#a3561d" emissiveIntensity={0.8} />
      </mesh>
    </>
  );
}

class SceneErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error('A cena 3D da autenticação não pôde ser carregada.', error);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="auth-scene-fallback" role="status">
          A cena 3D não está disponível neste dispositivo. Pode continuar com o acesso.
        </div>
      );
    }
    return this.props.children;
  }
}

export default function AuthWorkshopScene({
  stage,
  reducedMotion,
  registrationProgress = 0,
  onIntroComplete,
}) {
  const lowPower = typeof navigator !== 'undefined'
    && ((!navigator.hardwareConcurrency || navigator.hardwareConcurrency <= 4)
      || window.matchMedia('(max-width: 700px)').matches);

  return (
    <div className="auth-workshop-canvas">
      <SceneErrorBoundary>
        <Canvas
          camera={{ position: [4.1, 3.25, 6.4], fov: 36 }}
          dpr={lowPower ? [1, 1] : [1, 1.35]}
          gl={{ antialias: false, powerPreference: 'low-power' }}
          onCreated={({ camera }) => camera.lookAt(0, 0.65, 0)}
          aria-hidden="true"
        >
          <Suspense fallback={null}>
            <WorkshopContents
              stage={stage}
              reducedMotion={reducedMotion}
              progress={registrationProgress}
              onIntroComplete={onIntroComplete}
            />
          </Suspense>
        </Canvas>
      </SceneErrorBoundary>
    </div>
  );
}
