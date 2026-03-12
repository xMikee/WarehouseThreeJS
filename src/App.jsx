import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, ContactShadows } from '@react-three/drei';
import useStore from './store';
import Topbar from './components/ui/Topbar';
import Sidebar from './components/ui/Sidebar';
import CreatePanel from './components/ui/CreatePanel';
import AisleMesh from './components/3d/AisleMesh';

export default function App() {
  const fetchWarehouses = useStore((state) => state.fetchWarehouses);
  const currentWarehouse = useStore((state) => state.currentWarehouse);
  const setSelected = useStore((state) => state.setSelected);
  const isDragging = useStore((state) => state.isDragging);

  const allAisles = currentWarehouse?.areas?.flatMap((a) => a.aisles || []) ?? [];

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <div style={{ height: '52px', flexShrink: 0 }}>
        <Topbar />
      </div>
      <div style={{ display: 'flex', flexDirection: 'row', flex: 1, overflow: 'hidden' }}>
        <div style={{ width: '280px', flexShrink: 0 }}>
          <CreatePanel />
        </div>
        <div
          style={{ flex: 1, background: '#1a1a2e', position: 'relative' }}
        >
          <Canvas
            shadows
            camera={{ position: [12, 12, 12], fov: 50 }}
            style={{ width: '100%', height: '100%' }}
            onPointerMissed={() => setSelected(null)}
          >
            <ambientLight intensity={0.5} />
            <directionalLight
              position={[10, 20, 10]}
              intensity={1.2}
              castShadow
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
            />
            <hemisphereLight skyColor="#87ceeb" groundColor="#4a4a4a" intensity={0.3} />

            {allAisles.map((a) => (
              <AisleMesh key={a.id} aisle={a} />
            ))}

            <Grid
              infiniteGrid
              sectionSize={1}
              fadeDistance={40}
              cellColor="#2a2a2a"
              sectionColor="#444"
            />
            <OrbitControls makeDefault enableDamping enabled={!isDragging} />
            <ContactShadows opacity={0.4} scale={30} blur={2} far={8} />
          </Canvas>
        </div>
        <div style={{ width: '300px', flexShrink: 0 }}>
          <Sidebar />
        </div>
      </div>
    </div>
  );
}
