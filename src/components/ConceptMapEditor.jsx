import { useState, useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, Trash2, Tag, ArrowLeftRight } from 'lucide-react';

/* ── Custom Node ── */
function ConceptNode({ data, selected }) {
  return (
    <div className={`concept-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} className="handle-target" title="Drop here" />
      <Handle type="target" position={Position.Left} className="handle-target" title="Drop here" />
      <span style={{ pointerEvents: 'none' }}>{data.label}</span>
      <Handle type="source" position={Position.Bottom} className="handle-source" title="Drag from here" />
      <Handle type="source" position={Position.Right} className="handle-source" title="Drag from here" />
    </div>
  );
}

const nodeTypes = { concept: ConceptNode };

const defaultEdgeOptions = {
  type: 'default',
  markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
  style: { strokeWidth: 2 },
};

/* ── Main Editor ── */
export default function ConceptMapEditor({
  initialNodes = [],
  initialEdges = [],
  onSubmit,
  mode = 'free', // 'free' | 'links-only' | 'add-nodes'
  submitLabel = 'Submit Map',
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(
    (() => {
      // Check if passed-in nodes have meaningful spread (not all clumped at origin)
      const hasSpread = initialNodes.length < 2 || initialNodes.some(
        n => n.position && (Math.abs(n.position.x) > 50 || Math.abs(n.position.y) > 50)
      );
      return initialNodes.map((n, i) => ({
        ...n,
        type: 'concept',
        position: (n.position && hasSpread)
          ? n.position
          : { x: (i % 4) * 220 + 100, y: Math.floor(i / 4) * 160 + 100 },
      }));
    })()
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    initialEdges.map(e => ({
      ...e,
      ...defaultEdgeOptions,
      label: e.label || '',
    }))
  );

  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [edgeLabelDraft, setEdgeLabelDraft] = useState('');
  const [pendingEdge, setPendingEdge] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [editingEdgeLabel, setEditingEdgeLabel] = useState('');
  const nodeCounter = useRef(initialNodes.length + 1);

  const canAddNodes = mode === 'free' || mode === 'add-nodes';
  const canEditLinks = true; // always allowed

  /* Add node */
  const handleAddNode = () => {
    if (!newNodeLabel.trim() || !canAddNodes) return;
    const id = `node_${nodeCounter.current++}`;
    setNodes(nds => {
      const i = nds.length;
      return [
        ...nds,
        {
          id,
          type: 'concept',
          position: { x: (i % 4) * 220 + 100, y: Math.floor(i / 4) * 160 + 100 },
          data: { label: newNodeLabel.trim() },
        },
      ];
    });
    setNewNodeLabel('');
  };

  /* Connect nodes */
  const onConnect = useCallback((params) => {
    setPendingEdge(params);
    setEdgeLabelDraft('');
  }, []);

  const confirmEdge = () => {
    if (!pendingEdge) return;
    const newEdge = {
      ...pendingEdge,
      id: `edge_${Date.now()}`,
      label: edgeLabelDraft.trim() || 'relates to',
      ...defaultEdgeOptions,
    };
    setEdges(eds => addEdge(newEdge, eds));
    setPendingEdge(null);
    setEdgeLabelDraft('');
  };

  const cancelEdge = () => {
    setPendingEdge(null);
    setEdgeLabelDraft('');
  };

  const swapPendingEdge = () => {
    setPendingEdge(e => ({ ...e, source: e.target, target: e.source }));
  };

  /* Edge click to edit/delete */
  const onEdgeClick = useCallback((_, edge) => {
    setSelectedEdge(edge.id);
    setEditingEdgeLabel(edge.label || '');
  }, []);

  const updateEdgeLabel = () => {
    if (!selectedEdge) return;
    setEdges(eds => eds.map(e =>
      e.id === selectedEdge ? { ...e, label: editingEdgeLabel.trim() || 'relates to' } : e
    ));
    setSelectedEdge(null);
  };

  const deleteEdge = () => {
    if (!selectedEdge) return;
    setEdges(eds => eds.filter(e => e.id !== selectedEdge));
    setSelectedEdge(null);
  };

  const swapSelectedEdge = () => {
    if (!selectedEdge) return;
    setEdges(eds => eds.map(e =>
      e.id === selectedEdge ? { ...e, source: e.target, target: e.source } : e
    ));
  };

  /* Delete selected nodes */
  const deleteSelected = () => {
    const selectedIds = nodes.filter(n => n.selected).map(n => n.id);
    if (selectedIds.length === 0) return;
    if (mode === 'links-only') return; // can't delete nodes in links-only mode
    setNodes(nds => nds.filter(n => !n.selected));
    setEdges(eds => eds.filter(e => !selectedIds.includes(e.source) && !selectedIds.includes(e.target)));
  };

  /* Submit */
  const handleSubmit = () => {
    const mapData = {
      nodes: nodes.map(n => ({ id: n.id, label: n.data.label, position: n.position })),
      edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, label: e.label || '' })),
    };
    onSubmit(mapData);
  };

  return (
    <div className="map-editor">
      {/* Toolbar */}
      <div className="map-toolbar">
        {canAddNodes && (
          <div className="toolbar-group">
            <input
              type="text"
              placeholder="New concept..."
              value={newNodeLabel}
              onChange={e => setNewNodeLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddNode()}
              className="toolbar-input"
            />
            <button onClick={handleAddNode} className="btn-icon" title="Add concept">
              <Plus size={16} />
            </button>
          </div>
        )}
        {mode === 'links-only' && (
          <div className="toolbar-notice">
            This round: you can modify or delete links, but cannot add new concepts.
          </div>
        )}
        {canAddNodes && (
          <button onClick={deleteSelected} className="btn-icon btn-danger" title="Delete selected">
            <Trash2 size={16} />
          </button>
        )}
        <div className="toolbar-spacer" />
        <div className="map-stats">
          {nodes.length} concepts · {edges.length} links
        </div>
        <button onClick={handleSubmit} className="btn-primary" disabled={nodes.length < 2}>
          {submitLabel}
        </button>
      </div>

      {/* Edge label modal */}
      {pendingEdge && (
        <div className="edge-modal-overlay">
          <div className="edge-modal">
            <h4>Label this connection</h4>
            <div className="edge-modal-direction">
              <span className="edge-modal-nodes">
                {nodes.find(n => n.id === pendingEdge.source)?.data.label}
                {' → '}
                {nodes.find(n => n.id === pendingEdge.target)?.data.label}
              </span>
              <button onClick={swapPendingEdge} className="btn-icon btn-swap" title="Swap direction">
                <ArrowLeftRight size={14} />
              </button>
            </div>
            <input
              type="text"
              placeholder='e.g., "causes", "depends on"'
              value={edgeLabelDraft}
              onChange={e => setEdgeLabelDraft(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmEdge()}
              autoFocus
              className="toolbar-input"
            />
            <div className="edge-modal-actions">
              <button onClick={cancelEdge} className="btn-secondary">Cancel</button>
              <button onClick={confirmEdge} className="btn-primary">Add Link</button>
            </div>
          </div>
        </div>
      )}

      {/* Edge edit panel */}
      {selectedEdge && (
        <div className="edge-edit-panel">
          <Tag size={14} />
          <input
            type="text"
            value={editingEdgeLabel}
            onChange={e => setEditingEdgeLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && updateEdgeLabel()}
            className="toolbar-input"
            autoFocus
          />
          <button onClick={updateEdgeLabel} className="btn-secondary">Update</button>
          <button onClick={swapSelectedEdge} className="btn-icon btn-swap" title="Swap direction"><ArrowLeftRight size={14} /></button>
          <button onClick={deleteEdge} className="btn-icon btn-danger"><Trash2 size={14} /></button>
          <button onClick={() => setSelectedEdge(null)} className="btn-secondary">Close</button>
        </div>
      )}

      {/* Flow Canvas */}
      <div className="map-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={mode !== 'links-only' ? onNodesChange : (changes) => {
            // In links-only mode, allow position changes but not removals
            const filtered = changes.filter(c => c.type !== 'remove');
            onNodesChange(filtered);
          }}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeClick={onEdgeClick}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          deleteKeyCode={canAddNodes ? ['Backspace', 'Delete'] : null}
          className="react-flow-instance"
        >
          <Background variant="dots" gap={20} size={1} />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor="#6366f1"
            maskColor="rgba(0,0,0,0.1)"
            style={{ borderRadius: 8 }}
          />
        </ReactFlow>
      </div>

      <div className="map-help">
        {mode === 'links-only'
          ? 'Click a link to edit or delete it · Drag nodes to reposition'
          : mode === 'add-nodes'
          ? 'Add new concepts and links · Click a link to edit or delete · Drag nodes to reposition'
          : 'Drag between node handles to create links · Click a link to edit or delete · Drag nodes to reposition'}
      </div>
    </div>
  );
}
