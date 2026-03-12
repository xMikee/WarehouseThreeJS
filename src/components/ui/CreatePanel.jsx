import { useState } from 'react';
import useStore from '../../store';

const inputStyle = {
  background: '#1a1a2e',
  color: 'white',
  border: '1px solid #2a2a4a',
  borderRadius: '6px',
  padding: '6px 8px',
  width: '100%',
  boxSizing: 'border-box',
  fontSize: '13px',
};

const labelStyle = {
  display: 'block',
  color: '#aaa',
  fontSize: '11px',
  marginBottom: '4px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const formGroupStyle = {
  marginBottom: '10px',
};

const btnStyle = {
  width: '100%',
  padding: '8px',
  background: '#2563eb',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 'bold',
  marginTop: '8px',
};

function getNextLabel(aisles) {
  if (!aisles || aisles.length === 0) return 'A';
  const letters = aisles.map((a) => a.label || '').filter(Boolean);
  const lastLetter = letters[letters.length - 1];
  if (!lastLetter) return 'A';
  const code = lastLetter.charCodeAt(0);
  if (code >= 65 && code < 90) return String.fromCharCode(code + 1);
  return lastLetter + 'A';
}

export default function CreatePanel() {
  const createAisle = useStore((state) => state.createAisle);
  const createSingleRack = useStore((state) => state.createSingleRack);
  const currentArea = useStore((state) => state.currentArea);

  const [activeTab, setActiveTab] = useState('aisle');

  // Aisle form state
  const [aisleLabel, setAisleLabel] = useState('');
  const [aisleType, setAisleType] = useState('double');
  const [rackCount, setRackCount] = useState(5);
  const [shelfCount, setShelfCount] = useState(4);
  const [rackWidth, setRackWidth] = useState(1.0);
  const [rackHeight, setRackHeight] = useState(2.5);
  const [rackDepth, setRackDepth] = useState(0.8);
  const [aisleLoading, setAisleLoading] = useState(false);
  const [aisleSuccess, setAisleSuccess] = useState(false);

  // Rack form state
  const [rackAisleId, setRackAisleId] = useState('');
  const [rackSide, setRackSide] = useState('left');
  const [rackPosX, setRackPosX] = useState(0);
  const [sRackShelfCount, setSRackShelfCount] = useState(4);
  const [sRackWidth, setSRackWidth] = useState(1.0);
  const [sRackHeight, setSRackHeight] = useState(2.5);
  const [sRackDepth, setSRackDepth] = useState(0.8);
  const [rackLoading, setRackLoading] = useState(false);
  const [rackSuccess, setRackSuccess] = useState(false);

  const suggestedLabel = getNextLabel(currentArea?.aisles ?? []);
  const effectiveAisleLabel = aisleLabel || suggestedLabel;

  const handleCreateAisle = async (e) => {
    e.preventDefault();
    if (!currentArea) {
      alert('Seleziona prima un\'area');
      return;
    }
    setAisleLoading(true);
    try {
      await createAisle({
        label: effectiveAisleLabel,
        type: aisleType,
        rackCount: Number(rackCount),
        shelfCount: Number(shelfCount),
        rackWidth: Number(rackWidth),
        rackHeight: Number(rackHeight),
        rackDepth: Number(rackDepth),
      });
      setAisleSuccess(true);
      setAisleLabel('');
      setTimeout(() => setAisleSuccess(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setAisleLoading(false);
    }
  };

  const handleCreateRack = async (e) => {
    e.preventDefault();
    if (!rackAisleId) {
      alert('Seleziona una corsia');
      return;
    }
    setRackLoading(true);
    try {
      const aisleId = parseInt(rackAisleId);
      const aisle = currentArea?.aisles?.find((a) => a.id === aisleId);
      const aisleWidth = 1.2;
      let posZ = 0;
      if (rackSide === 'left') posZ = -(aisleWidth / 2 + Number(sRackDepth) / 2);
      else if (rackSide === 'right') posZ = +(aisleWidth / 2 + Number(sRackDepth) / 2);

      await createSingleRack({
        aisleId,
        posX: Number(rackPosX),
        posZ,
        width: Number(sRackWidth),
        height: Number(sRackHeight),
        depth: Number(sRackDepth),
        side: rackSide,
        shelfCount: Number(sRackShelfCount),
      });
      setRackSuccess(true);
      setTimeout(() => setRackSuccess(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setRackLoading(false);
    }
  };

  const tabActiveStyle = {
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '6px 6px 0 0',
    padding: '6px 14px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
  };

  const tabInactiveStyle = {
    background: 'transparent',
    color: '#888',
    border: 'none',
    borderRadius: '6px 6px 0 0',
    padding: '6px 14px',
    cursor: 'pointer',
    fontSize: '12px',
  };

  return (
    <div
      style={{
        width: '280px',
        height: '100%',
        background: '#0d0d1a',
        borderRight: '1px solid #2a2a4a',
        padding: '16px',
        overflowY: 'auto',
        color: 'white',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#ddd', marginBottom: '12px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        Crea Elemento
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', marginBottom: '0', borderBottom: '1px solid #2a2a4a' }}>
        <button
          style={activeTab === 'aisle' ? tabActiveStyle : tabInactiveStyle}
          onClick={() => setActiveTab('aisle')}
        >
          Corsia
        </button>
        <button
          style={activeTab === 'rack' ? tabActiveStyle : tabInactiveStyle}
          onClick={() => setActiveTab('rack')}
        >
          Scaffale Singolo
        </button>
      </div>

      <div style={{ paddingTop: '14px' }}>
        {activeTab === 'aisle' && (
          <form onSubmit={handleCreateAisle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Label</label>
              <input
                style={inputStyle}
                type="text"
                value={aisleLabel}
                placeholder={suggestedLabel}
                onChange={(e) => setAisleLabel(e.target.value)}
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Tipo</label>
              <select
                style={inputStyle}
                value={aisleType}
                onChange={(e) => setAisleType(e.target.value)}
              >
                <option value="double">Doppia (Pari/Dispari)</option>
                <option value="single">Singola</option>
              </select>
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Numero scaffali</label>
              <input
                style={inputStyle}
                type="number"
                value={rackCount}
                min={1}
                max={20}
                onChange={(e) => setRackCount(e.target.value)}
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Numero ripiani</label>
              <input
                style={inputStyle}
                type="number"
                value={shelfCount}
                min={1}
                max={10}
                onChange={(e) => setShelfCount(e.target.value)}
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Larghezza scaffale (m)</label>
              <input
                style={inputStyle}
                type="number"
                value={rackWidth}
                step={0.1}
                min={0.1}
                onChange={(e) => setRackWidth(e.target.value)}
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Altezza scaffale (m)</label>
              <input
                style={inputStyle}
                type="number"
                value={rackHeight}
                step={0.1}
                min={0.1}
                onChange={(e) => setRackHeight(e.target.value)}
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Profondit&agrave; scaffale (m)</label>
              <input
                style={inputStyle}
                type="number"
                value={rackDepth}
                step={0.1}
                min={0.1}
                onChange={(e) => setRackDepth(e.target.value)}
              />
            </div>

            <button
              type="submit"
              style={{ ...btnStyle, opacity: aisleLoading ? 0.6 : 1 }}
              disabled={aisleLoading}
            >
              {aisleLoading ? 'Creazione...' : aisleSuccess ? '✓ Creato!' : 'Crea Corsia'}
            </button>
          </form>
        )}

        {activeTab === 'rack' && (
          <form onSubmit={handleCreateRack}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Corsia di appartenenza</label>
              <select
                style={inputStyle}
                value={rackAisleId}
                onChange={(e) => setRackAisleId(e.target.value)}
              >
                <option value="">-- Seleziona corsia --</option>
                {(currentArea?.aisles ?? []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Lato</label>
              <select
                style={inputStyle}
                value={rackSide}
                onChange={(e) => setRackSide(e.target.value)}
              >
                <option value="left">Sinistra/Dispari</option>
                <option value="right">Destra/Pari</option>
                <option value="single">Singolo</option>
              </select>
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Posizione X lungo la corsia</label>
              <input
                style={inputStyle}
                type="number"
                value={rackPosX}
                step={0.1}
                onChange={(e) => setRackPosX(e.target.value)}
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Numero ripiani</label>
              <input
                style={inputStyle}
                type="number"
                value={sRackShelfCount}
                min={1}
                max={10}
                onChange={(e) => setSRackShelfCount(e.target.value)}
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Larghezza (m)</label>
              <input
                style={inputStyle}
                type="number"
                value={sRackWidth}
                step={0.1}
                min={0.1}
                onChange={(e) => setSRackWidth(e.target.value)}
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Altezza (m)</label>
              <input
                style={inputStyle}
                type="number"
                value={sRackHeight}
                step={0.1}
                min={0.1}
                onChange={(e) => setSRackHeight(e.target.value)}
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Profondit&agrave; (m)</label>
              <input
                style={inputStyle}
                type="number"
                value={sRackDepth}
                step={0.1}
                min={0.1}
                onChange={(e) => setSRackDepth(e.target.value)}
              />
            </div>

            <button
              type="submit"
              style={{ ...btnStyle, opacity: rackLoading ? 0.6 : 1 }}
              disabled={rackLoading}
            >
              {rackLoading ? 'Creazione...' : rackSuccess ? '✓ Creato!' : 'Crea Scaffale'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
