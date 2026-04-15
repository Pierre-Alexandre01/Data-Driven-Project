import { useState } from 'react';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';

const LAYER_COLORS = ['#60a5fa', '#f97316', '#4ade80', '#c084fc', '#fb7185'];
const MAX_LAYERS = 5;

export default function LayerCreation({ initialLayers = [], onStartDrawing, onCancel }) {
  const [layers, setLayers] = useState(initialLayers);
  const [draftName, setDraftName] = useState('');
  const usedColors = new Set(layers.map(l => l.color));
  const firstAvailable = LAYER_COLORS.find(c => !usedColors.has(c)) || LAYER_COLORS[0];
  const [draftColor, setDraftColor] = useState(firstAvailable);

  const canAdd = draftName.trim().length > 0 && layers.length < MAX_LAYERS && !usedColors.has(draftColor);

  const handleAdd = () => {
    if (!canAdd) return;
    const idx = layers.length;
    const newLayer = {
      id: `layer_${Date.now()}_${idx}`,
      name: draftName.trim(),
      color: draftColor,
      solutionNodeId: `solution_node_${Date.now()}_${idx}`,
      solutionNodePosition: { x: 350, y: 30 },
      edges: [],
    };
    const next = [...layers, newLayer];
    setLayers(next);
    setDraftName('');
    const nextUsed = new Set(next.map(l => l.color));
    const nextAvailable = LAYER_COLORS.find(c => !nextUsed.has(c));
    if (nextAvailable) setDraftColor(nextAvailable);
  };

  const handleDelete = (id) => {
    setLayers(layers.filter(l => l.id !== id));
  };

  const handleStart = () => {
    if (layers.length < 1) return;
    onStartDrawing(layers);
  };

  return (
    <div className="layer-creation">
      <div className="layer-creation-inner">
        <h1>Define Your Strategic Options</h1>
        <p className="subtitle">
          Name each strategy you want to analyze. You won&apos;t be able to add more layers later — only in a new cycle.
        </p>

        <div className="warning-banner">
          <AlertTriangle size={18} />
          <span>
            You cannot add more solution layers after this step. Make sure you&apos;ve included all the strategies
            you want to evaluate.
          </span>
        </div>

        <div className="layer-form">
          <div className="layer-form-row">
            <input
              type="text"
              className="toolbar-input"
              placeholder="Strategy name (e.g., Geographic Expansion)"
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              maxLength={60}
            />
            <button
              onClick={handleAdd}
              className="btn-primary"
              disabled={!canAdd}
              title={layers.length >= MAX_LAYERS ? `Max ${MAX_LAYERS} layers` : 'Add layer'}
            >
              <Plus size={16} /> Add Layer
            </button>
          </div>
          <div className="color-picker">
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginRight: 4 }}>Color:</span>
            {LAYER_COLORS.map(c => {
              const isUsed = usedColors.has(c);
              const isSelected = draftColor === c;
              return (
                <button
                  key={c}
                  className={`color-swatch ${isSelected ? 'selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => setDraftColor(c)}
                  disabled={isUsed}
                  title={isUsed ? 'Already in use' : c}
                  type="button"
                />
              );
            })}
          </div>
          {layers.length >= MAX_LAYERS && (
            <div className="layer-form-hint">Maximum of {MAX_LAYERS} layers reached.</div>
          )}
        </div>

        <div className="layer-list">
          {layers.length === 0 ? (
            <div className="layer-list-empty">No layers yet — add at least one to continue.</div>
          ) : (
            layers.map(l => (
              <div key={l.id} className="layer-list-item">
                <span className="layer-color-dot" style={{ background: l.color }} />
                <span className="layer-name">{l.name}</span>
                <button
                  onClick={() => handleDelete(l.id)}
                  className="btn-icon btn-danger"
                  title="Delete layer"
                  type="button"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="layer-creation-footer">
          <button onClick={onCancel} className="btn-secondary">← Back</button>
          <button onClick={handleStart} className="btn-primary" disabled={layers.length < 1}>
            Start Drawing →
          </button>
        </div>
      </div>
    </div>
  );
}
