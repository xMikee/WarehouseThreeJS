import useStore from '../../store';

const selectStyle = {
  background: '#1a1a2e',
  color: 'white',
  border: '1px solid #2a2a4a',
  borderRadius: '6px',
  padding: '4px 8px',
  cursor: 'pointer',
  fontSize: '13px',
};

const iconBtnStyle = {
  background: '#2a2a4a',
  color: 'white',
  border: '1px solid #3a3a6a',
  borderRadius: '4px',
  width: '24px',
  height: '24px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '16px',
  lineHeight: 1,
  padding: 0,
  flexShrink: 0,
};

export default function Topbar() {
  const warehouses = useStore((state) => state.warehouses);
  const currentWarehouse = useStore((state) => state.currentWarehouse);
  const currentArea = useStore((state) => state.currentArea);
  const createWarehouse = useStore((state) => state.createWarehouse);
  const selectWarehouse = useStore((state) => state.selectWarehouse);
  const createArea = useStore((state) => state.createArea);
  const selectArea = useStore((state) => state.selectArea);

  const handleAddWarehouse = () => {
    const name = window.prompt('Nome del nuovo magazzino:');
    if (name && name.trim()) {
      createWarehouse(name.trim());
    }
  };

  const handleAddArea = () => {
    if (!currentWarehouse) {
      alert('Seleziona prima un magazzino');
      return;
    }
    const name = window.prompt('Nome della nuova area:');
    if (name && name.trim()) {
      createArea(name.trim());
    }
  };

  const aisleCount = currentArea?.aisles?.length ?? 0;

  return (
    <div
      style={{
        height: '52px',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        padding: '0 16px',
        background: '#0d0d1a',
        borderBottom: '1px solid #2a2a4a',
        gap: '12px',
      }}
    >
      {/* Left: App name */}
      <div style={{ color: 'white', fontWeight: 'bold', fontSize: '16px', flexShrink: 0 }}>
        Magazzino 3D
      </div>

      {/* Center: Warehouse + Area selectors */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
        {warehouses.length === 0 ? (
          <span style={{ color: '#888', fontSize: '13px' }}>Nessun magazzino</span>
        ) : (
          <>
            <select
              style={selectStyle}
              value={currentWarehouse?.id ?? ''}
              onChange={(e) => selectWarehouse(parseInt(e.target.value))}
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>

            <button style={iconBtnStyle} onClick={handleAddWarehouse} title="Nuovo magazzino">
              +
            </button>

            <span style={{ color: '#555', fontSize: '14px', margin: '0 4px' }}>&gt;</span>

            <select
              style={selectStyle}
              value={currentArea?.id ?? ''}
              onChange={(e) => selectArea(parseInt(e.target.value))}
              disabled={!currentWarehouse || (currentWarehouse?.areas?.length ?? 0) === 0}
            >
              {currentWarehouse?.areas?.length === 0 && (
                <option value="">Nessuna area</option>
              )}
              {(currentWarehouse?.areas ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>

            <button style={iconBtnStyle} onClick={handleAddArea} title="Nuova area">
              +
            </button>
          </>
        )}

        {warehouses.length === 0 && (
          <button style={{ ...iconBtnStyle, width: 'auto', padding: '4px 10px' }} onClick={handleAddWarehouse}>
            + Magazzino
          </button>
        )}
      </div>

      {/* Right: aisle count */}
      <div style={{ color: '#888', fontSize: '12px', flexShrink: 0 }}>
        {currentArea ? `${aisleCount} cors${aisleCount === 1 ? 'ia' : 'ie'}` : ''}
      </div>
    </div>
  );
}
