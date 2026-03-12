import useStore from '../../store';

const sectionTitleStyle = {
  fontSize: '11px',
  color: '#888',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '6px',
  marginTop: '14px',
};

const valueStyle = {
  color: '#ddd',
  fontSize: '13px',
  marginBottom: '4px',
};

const redBtnStyle = {
  background: '#c0392b',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  padding: '7px 14px',
  cursor: 'pointer',
  fontSize: '13px',
  width: '100%',
  marginTop: '10px',
};

const blueBtnStyle = {
  background: '#2563eb',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  padding: '7px 14px',
  cursor: 'pointer',
  fontSize: '13px',
  width: '100%',
  marginTop: '6px',
};

const rackItemStyle = {
  background: '#1a1a2e',
  border: '1px solid #2a2a4a',
  borderRadius: '6px',
  padding: '6px 8px',
  marginBottom: '6px',
  fontSize: '12px',
  color: '#ccc',
};

export default function Sidebar() {
  const selected = useStore((state) => state.selected);
  const deleteAisle = useStore((state) => state.deleteAisle);
  const deleteRack = useStore((state) => state.deleteRack);
  const addShelf = useStore((state) => state.addShelf);
  const currentArea = useStore((state) => state.currentArea);

  // Get live data from the store instead of stale selected.data
  let liveData = selected?.data;
  if (selected?.type === 'aisle' && currentArea) {
    const found = currentArea.aisles?.find((a) => a.id === selected.id);
    if (found) liveData = found;
  } else if (selected?.type === 'rack' && currentArea) {
    for (const aisle of currentArea.aisles ?? []) {
      const found = aisle.racks?.find((r) => r.id === selected.id);
      if (found) { liveData = found; break; }
    }
  }

  if (!selected) {
    return (
      <div
        style={{
          width: '300px',
          height: '100%',
          background: '#0d0d1a',
          borderLeft: '1px solid #2a2a4a',
          padding: '16px',
          color: '#888',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          fontSize: '13px',
          boxSizing: 'border-box',
        }}
      >
        Clicca su uno scaffale o una corsia per vedere i dettagli
      </div>
    );
  }

  const containerStyle = {
    width: '300px',
    height: '100%',
    background: '#0d0d1a',
    borderLeft: '1px solid #2a2a4a',
    padding: '16px',
    color: 'white',
    overflowY: 'auto',
    boxSizing: 'border-box',
  };

  if (selected.type === 'aisle') {
    const data = liveData;
    if (!data) return <div style={containerStyle}><span style={{ color: '#888' }}>Corsia non trovata</span></div>;

    const racks = data.racks ?? [];
    const leftCount = racks.filter((r) => r.side === 'left').length;
    const rightCount = racks.filter((r) => r.side === 'right').length;
    const singleCount = racks.filter((r) => r.side === 'single').length;

    const handleDelete = () => {
      if (window.confirm(`Eliminare la corsia "${data.label}"? Tutti gli scaffali verranno eliminati.`)) {
        deleteAisle(data.id);
      }
    };

    return (
      <div style={containerStyle}>
        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>
          Corsia {data.label}
        </div>

        <div style={sectionTitleStyle}>Tipo</div>
        <div style={valueStyle}>{data.type === 'double' ? 'Doppia' : 'Singola'}</div>

        <div style={sectionTitleStyle}>Posizione</div>
        <div style={valueStyle}>
          X = {(data.posX ?? 0).toFixed(2)}, Z = {(data.posZ ?? 0).toFixed(2)}
        </div>

        <div style={sectionTitleStyle}>Scaffali</div>
        <div style={valueStyle}>{racks.length} scaffali totali</div>
        {data.type === 'double' && (
          <div style={{ ...valueStyle, color: '#aaa', fontSize: '12px' }}>
            Sinistra: {leftCount} &nbsp;|&nbsp; Destra: {rightCount}
          </div>
        )}
        {data.type === 'single' && singleCount > 0 && (
          <div style={{ ...valueStyle, color: '#aaa', fontSize: '12px' }}>
            Singoli: {singleCount}
          </div>
        )}

        <div style={sectionTitleStyle}>Lista scaffali</div>
        <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
          {racks.map((r) => (
            <div key={r.id} style={rackItemStyle}>
              <span style={{ color: r.side === 'left' ? '#2980b9' : r.side === 'right' ? '#27ae60' : '#8e44ad', fontWeight: 'bold' }}>
                #{r.id}
              </span>
              {' '}
              {r.width?.toFixed(1)}x{r.height?.toFixed(1)}x{r.depth?.toFixed(1)}m &nbsp;|&nbsp; {r.shelves?.length ?? 0} ripiani
            </div>
          ))}
        </div>

        <button style={redBtnStyle} onClick={handleDelete}>
          Elimina Corsia
        </button>
      </div>
    );
  }

  if (selected.type === 'rack') {
    const data = liveData;
    if (!data) return <div style={containerStyle}><span style={{ color: '#888' }}>Scaffale non trovato</span></div>;

    const shelves = data.shelves ?? [];
    const sideLabel = data.side === 'left' ? 'Sinistra' : data.side === 'right' ? 'Destra' : 'Singolo';

    const handleAddShelf = () => {
      const hStr = window.prompt('Altezza dal suolo (m):');
      if (!hStr) return;
      const h = parseFloat(hStr);
      if (isNaN(h) || h <= 0) { alert('Altezza non valida'); return; }
      const labelStr = window.prompt('Etichetta ripiano:', 'P' + (shelves.length + 1)) ?? '';
      addShelf(data.id, h, labelStr);
    };

    const handleDelete = () => {
      if (window.confirm(`Eliminare lo scaffale #${data.id}?`)) {
        deleteRack(data.id);
      }
    };

    return (
      <div style={containerStyle}>
        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>
          Scaffale #{data.id}
        </div>

        <div style={sectionTitleStyle}>Lato</div>
        <div style={valueStyle}>{sideLabel}</div>

        <div style={sectionTitleStyle}>Dimensioni</div>
        <div style={valueStyle}>
          {data.width?.toFixed(2)}m (L) &times; {data.height?.toFixed(2)}m (A) &times; {data.depth?.toFixed(2)}m (P)
        </div>

        <div style={sectionTitleStyle}>Ripiani ({shelves.length})</div>
        <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
          {shelves.length === 0 && (
            <div style={{ color: '#666', fontSize: '12px' }}>Nessun ripiano</div>
          )}
          {shelves.map((s) => (
            <div key={s.id} style={rackItemStyle}>
              <span style={{ color: '#f0a500', fontWeight: 'bold' }}>{s.label}</span>
              {' '}&mdash; {s.heightFromGround?.toFixed(2)}m dal suolo
            </div>
          ))}
        </div>

        <button style={blueBtnStyle} onClick={handleAddShelf}>
          + Aggiungi Ripiano
        </button>

        <button style={redBtnStyle} onClick={handleDelete}>
          Elimina Scaffale
        </button>
      </div>
    );
  }

  return null;
}
