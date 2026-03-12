import { useRef, useState, useEffect } from 'react';
import { Text, PivotControls } from '@react-three/drei';
import useStore from '../../store';
import RackMesh from './RackMesh';

export default function AisleMesh({ aisle }) {
  const selected = useStore((state) => state.selected);
  const setSelected = useStore((state) => state.setSelected);
  const updateAislePosition = useStore((state) => state.updateAislePosition);
  const setDragging = useStore((state) => state.setDragging);
  const checkAisleCollision = useStore((state) => state.checkAisleCollision);
  const findAisleStackingY = useStore((state) => state.findAisleStackingY);
  const collisions = useStore((state) => state.collisions);

  const isSelected = selected?.type === 'aisle' && selected?.id === aisle.id;
  // persistent collision (saved positions overlap) OR live drag collision
  const hasPersistentCollision = collisions.includes(aisle.id);

  const [savedPos, setSavedPos] = useState([aisle.posX, aisle.posY ?? 0, aisle.posZ]);
  const [pivotKey, setPivotKey] = useState(0);
  const [wouldCollide, setWouldCollide] = useState(false);

  const livePosRef = useRef({ x: aisle.posX, y: aisle.posY ?? 0, z: aisle.posZ });

  useEffect(() => {
    setSavedPos([aisle.posX, aisle.posY ?? 0, aisle.posZ]);
    livePosRef.current = { x: aisle.posX, y: aisle.posY ?? 0, z: aisle.posZ };
  }, [aisle.id]);

  const handleGroupClick = (e) => {
    e.stopPropagation();
    setSelected({ type: 'aisle', id: aisle.id, data: aisle });
  };

  const isColliding = hasPersistentCollision || wouldCollide;

  let boundsW = 3, boundsD = 3, labelX = 0, labelY = 3.5, labelZ = 0;
  if (aisle.racks?.length > 0) {
    const xs = aisle.racks.map((r) => r.posX);
    const zs = aisle.racks.map((r) => r.posZ);
    const w = aisle.racks[0]?.width ?? 1;
    const d = aisle.racks[0]?.depth ?? 0.8;
    boundsW = Math.max(...xs) - Math.min(...xs) + w + 0.4;
    boundsD = Math.max(...zs) - Math.min(...zs) + d + 0.4;
    labelX = (Math.min(...xs) + Math.max(...xs)) / 2;
    labelZ = (Math.min(...zs) + Math.max(...zs)) / 2;
    const maxRackHeight = Math.max(...aisle.racks.map((r) => (r.posY ?? 0) + r.height));
    labelY = maxRackHeight + 0.6;
  }

  const racksContent = (
    <>
      {aisle.racks?.map((rack) => (
        <RackMesh
          key={rack.id}
          rack={rack}
          aisleColliding={isColliding}
          isSelected={selected?.type === 'rack' && selected?.id === rack.id}
          onClick={(e) => {
            e.stopPropagation();
            setSelected({ type: 'rack', id: rack.id, data: rack });
          }}
        />
      ))}
      <Text position={[labelX, labelY, labelZ]} fontSize={0.5} color="white" anchorX="center" anchorY="middle">
        {aisle.label}
      </Text>
      {/* Collision overlay */}
      {isColliding && (
        <mesh position={[labelX, 0.01, labelZ]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[boundsW, boundsD]} />
          <meshStandardMaterial color="#ff0000" opacity={0.3} transparent />
        </mesh>
      )}
    </>
  );

  if (isSelected) {
    return (
      <group position={savedPos}>
        <PivotControls
          key={pivotKey}
          depthTest={false}
          fixed={false}
          scale={1}
          lineWidth={3}
          disableRotations
          disableScaling
          onDragStart={() => {
            setDragging(true);
            livePosRef.current = { x: savedPos[0], y: savedPos[1], z: savedPos[2] };
          }}
          onDrag={(l) => {
            const x = savedPos[0] + l.elements[12];
            const y = savedPos[1] + l.elements[13];
            const z = savedPos[2] + l.elements[14];
            livePosRef.current = { x, y, z };
            setWouldCollide(checkAisleCollision(aisle.id, x, y, z));
          }}
          onDragEnd={() => {
            setDragging(false);
            const { x, y, z } = livePosRef.current;
            const collides = checkAisleCollision(aisle.id, x, y, z);

            if (!collides) {
              setSavedPos([x, y, z]);
              updateAislePosition(aisle.id, x, y, z);
            } else {
              const snappedY = findAisleStackingY(aisle.id, x, z);
              setSavedPos([x, snappedY, z]);
              updateAislePosition(aisle.id, x, snappedY, z);
              livePosRef.current = { x, y: snappedY, z };
            }
            setWouldCollide(false);
            setPivotKey((k) => k + 1);
          }}
        >
          <group onClick={handleGroupClick}>
            {racksContent}
          </group>
        </PivotControls>
      </group>
    );
  }

  return (
    <group position={savedPos} onClick={handleGroupClick}>
      {racksContent}
    </group>
  );
}
