import { useRef, useState, useEffect } from 'react';
import { PivotControls } from '@react-three/drei';
import useStore from '../../store';

export default function RackMesh({ rack, isSelected, onClick, aisleColliding }) {
  const { id, posX, posZ, width, height, depth, shelves = [], side } = rack;
  const updateRackPosition = useStore((state) => state.updateRackPosition);
  const setDragging = useStore((state) => state.setDragging);
  const checkRackCollision = useStore((state) => state.checkRackCollision);
  const findRackStackingY = useStore((state) => state.findRackStackingY);

  const posY = rack.posY ?? 0;
  // savedPos[1] = posY (vertical offset) + height/2 (mesh center)
  const [savedPos, setSavedPos] = useState([posX, posY + height / 2, posZ]);
  const [pivotKey, setPivotKey] = useState(0);
  const [wouldCollide, setWouldCollide] = useState(false);
  const livePosRef = useRef({ x: posX, y: posY, z: posZ });

  useEffect(() => {
    const py = rack.posY ?? 0;
    setSavedPos([posX, py + height / 2, posZ]);
    livePosRef.current = { x: posX, y: py, z: posZ };
  }, [posX, rack.posY, posZ, height]);

  const isColliding = aisleColliding || wouldCollide;

  let color = '#8e44ad';
  if (isColliding) color = '#e74c3c';
  else if (isSelected) color = '#f39c12';
  else if (side === 'left') color = '#2980b9';
  else if (side === 'right') color = '#27ae60';

  const handleClick = (e) => {
    e.stopPropagation();
    onClick && onClick(e);
  };

  const cornerPositions = [
    [ width / 2 - 0.025, 0,  depth / 2 - 0.025],
    [-width / 2 + 0.025, 0,  depth / 2 - 0.025],
    [ width / 2 - 0.025, 0, -depth / 2 + 0.025],
    [-width / 2 + 0.025, 0, -depth / 2 + 0.025],
  ];

  const rackBody = (
    <>
      <mesh>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={color} opacity={isColliding ? 0.45 : 0.15} transparent />
      </mesh>
      {cornerPositions.map((pos, i) => (
        <mesh key={i} position={pos}>
          <boxGeometry args={[0.05, height, 0.05]} />
          <meshStandardMaterial color={isColliding ? '#ff4444' : '#aaaaaa'} />
        </mesh>
      ))}
      {shelves.map((shelf) => (
        <mesh key={shelf.id} position={[0, shelf.heightFromGround - height / 2, 0]}>
          <boxGeometry args={[width, 0.04, depth]} />
          <meshStandardMaterial color="#888888" />
        </mesh>
      ))}
      <mesh position={[0, -height / 2 + 0.02, 0]}>
        <boxGeometry args={[width, 0.04, depth]} />
        <meshStandardMaterial color="#666666" />
      </mesh>
      <mesh position={[0, height / 2 - 0.02, 0]}>
        <boxGeometry args={[width, 0.04, depth]} />
        <meshStandardMaterial color="#666666" />
      </mesh>
    </>
  );

  if (isSelected) {
    return (
      <group position={savedPos}>
        <PivotControls
          key={pivotKey}
          depthTest={false}
          fixed={false}
          scale={0.6}
          lineWidth={2}
          disableRotations
          disableScaling
          onDragStart={() => {
            setDragging(true);
            livePosRef.current = { x: savedPos[0], y: savedPos[1] - height / 2, z: savedPos[2] };
          }}
          onDrag={(l) => {
            const x = savedPos[0] + l.elements[12];
            const yOffset = (savedPos[1] - height / 2) + l.elements[13];
            const z = savedPos[2] + l.elements[14];
            livePosRef.current = { x, y: yOffset, z };
            setWouldCollide(checkRackCollision(id, x, yOffset, z));
          }}
          onDragEnd={() => {
            setDragging(false);
            const { x, y, z } = livePosRef.current;
            const collides = checkRackCollision(id, x, y, z);

            if (!collides) {
              setSavedPos([x, y + height / 2, z]);
              updateRackPosition(id, x, y, z);
            } else {
              const snappedY = findRackStackingY(id, x, z);
              setSavedPos([x, snappedY + height / 2, z]);
              updateRackPosition(id, x, snappedY, z);
              livePosRef.current = { x, y: snappedY, z };
            }
            setWouldCollide(false);
            setPivotKey((k) => k + 1);
          }}
        >
          <group onClick={handleClick}>
            {rackBody}
          </group>
        </PivotControls>
      </group>
    );
  }

  return (
    <group position={savedPos} onClick={handleClick}>
      {rackBody}
    </group>
  );
}
