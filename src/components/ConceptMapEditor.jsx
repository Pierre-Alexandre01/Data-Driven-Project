import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
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

/* ── Custom Nodes ── */
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

function SolutionNode({ data }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.label);

  useEffect(() => {
    if (!editing) setDraft(data.label);
  }, [data.label, editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== data.label) {
      data.onRename(data.layerId, trimmed);
    } else {
      setDraft(data.label);
    }
    setEditing(false);
  };

  return (
    <div
      className="solution-node"
      style={{ background: data.color }}
      onDoubleClick={() => setEditing(true)}
      title="Double-click to rename"
    >
      <Handle type="target" position={Position.Top} className="handle-target" />
      <Handle type="target" position={Position.Left} className="handle-target" />
      {editing ? (
        <input
          className="solution-node-input"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') {
              setDraft(data.label);
              setEditing(false);
            }
          }}
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
          autoFocus
        />
      ) : (
        <span style={{ pointerEvents: 'none' }}>{data.label}</span>
      )}
      <Handle type="source" position={Position.Bottom} className="handle-source" />
      <Handle type="source" position={Position.Right} className="handle-source" />
    </div>
  );
}

const nodeTypes = { concept: ConceptNode, solution: SolutionNode };

const defaultEdgeOptions = {
  type: 'default',
  markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
  style: { strokeWidth: 2 },
};

/* ── Top-level dispatcher ── */
export default function ConceptMapEditor(props) {
  if (props.solutionMode) {
    return <SolutionMapEditor {...props} />;
  }
  return <SurfaceMapEditor {...props} />;
}

/* ── Surface Mode (existing behavior) ── */
function SurfaceMapEditor({
  initialNodes = [],
  initialEdges = [],
  onSubmit,
  mode = 'free',
  submitLabel = 'Submit Map',
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(
    (() => {
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

  const deleteSelected = () => {
    const selectedIds = nodes.filter(n => n.selected).map(n => n.id);
    if (selectedIds.length === 0) return;
    if (mode === 'links-only') return;
    setNodes(nds => nds.filter(n => !n.selected));
    setEdges(eds => eds.filter(e => !selectedIds.includes(e.source) && !selectedIds.includes(e.target)));
  };

  const handleSubmit = () => {
    const mapData = {
      nodes: nodes.map(n => ({ id: n.id, label: n.data.label, position: n.position })),
      edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, label: e.label || '' })),
    };
    onSubmit(mapData);
  };

  return (
    <div className="map-editor">
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

      <div className="map-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={mode !== 'links-only' ? onNodesChange : (changes) => {
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

/* ── Solution Mode ── */
function SolutionMapEditor({
  surfaceNodes = [],
  surfaceEdges = [],
  solutionLayers = [],
  solutionMapMode = 'sol-free',
  initialActiveLayerId = null,
  onSolutionSubmit,
  submitLabel = 'Submit All Layers for Review →',
}) {
  const [workingLayers, setWorkingLayers] = useState(() =>
    solutionLayers.map(l => ({
      ...l,
      edges: l.edges.map(e => ({ ...e })),
      solutionNodePosition: l.solutionNodePosition || { x: 100, y: 40 },
    }))
  );
  const [activeLayerId, setActiveLayerId] = useState(
    initialActiveLayerId || solutionLayers[0]?.id || null
  );

  const [pendingEdge, setPendingEdge] = useState(null);
  const [edgeLabelDraft, setEdgeLabelDraft] = useState('');
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);
  const [editingEdgeLabel, setEditingEdgeLabel] = useState('');

  const canAddLinks = solutionMapMode === 'sol-add-links' || solutionMapMode === 'sol-free';

  const renameLayer = useCallback((layerId, newName) => {
    setWorkingLayers(prev => prev.map(l => l.id === layerId ? { ...l, name: newName } : l));
  }, []);

  /* Build display nodes & edges from canonical workingLayers state */
  const displayNodes = useMemo(() => {
    const surf = surfaceNodes.map((n, i) => ({
      id: n.id,
      type: 'concept',
      position: n.position || { x: (i % 4) * 220 + 100, y: Math.floor(i / 4) * 160 + 100 },
      data: { label: n.label },
      draggable: false,
      selectable: false,
      deletable: false,
      style: { opacity: 0.55 },
    }));
    const sols = workingLayers.map(l => ({
      id: l.solutionNodeId,
      type: 'solution',
      position: l.solutionNodePosition,
      data: { label: l.name, color: l.color, layerId: l.id, onRename: renameLayer },
      hidden: l.id !== activeLayerId,
      draggable: true,
      selectable: false,
      deletable: false,
    }));
    return [...surf, ...sols];
  }, [surfaceNodes, workingLayers, activeLayerId, renameLayer]);

  const displayEdges = useMemo(() => {
    const surf = surfaceEdges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label || '',
      type: 'default',
      markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: 'rgba(180, 184, 220, 0.4)' },
      style: { strokeWidth: 1.5, stroke: 'rgba(180, 184, 220, 0.35)' },
      labelStyle: { opacity: 0.5 },
      labelBgStyle: { opacity: 0.5 },
      interactionWidth: 0,
      selectable: false,
      deletable: false,
      data: { isSurface: true },
    }));
    const active = workingLayers.find(l => l.id === activeLayerId);
    const layerEdges = active
      ? active.edges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.label || '',
          type: 'default',
          markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: active.color },
          style: { strokeWidth: 2.5, stroke: active.color },
          data: { layerId: active.id },
        }))
      : [];
    return [...surf, ...layerEdges];
  }, [surfaceEdges, workingLayers, activeLayerId]);

  /* Sync display state into RF state */
  const [nodes, setNodes, onNodesChange] = useNodesState(displayNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(displayEdges);

  useEffect(() => {
    setNodes(displayNodes);
  }, [displayNodes, setNodes]);
  useEffect(() => {
    setEdges(displayEdges);
  }, [displayEdges, setEdges]);

  /* Drag stop → persist solution node position (pin Y to keep it at the top) */
  const onNodeDragStop = useCallback((_, node) => {
    if (node.type !== 'solution') return;
    setWorkingLayers(prev => prev.map(l =>
      l.solutionNodeId === node.id
        ? { ...l, solutionNodePosition: { x: node.position.x, y: 30 } }
        : l
    ));
  }, []);

  /* Block removal of all nodes; clamp Y on solution node position changes */
  const solutionNodeIds = useMemo(
    () => new Set(workingLayers.map(l => l.solutionNodeId)),
    [workingLayers]
  );
  const handleNodesChange = useCallback((changes) => {
    const filtered = [];
    for (const c of changes) {
      if (c.type === 'remove') continue;
      if (c.type === 'position' && c.position && solutionNodeIds.has(c.id)) {
        filtered.push({ ...c, position: { x: c.position.x, y: 30 } });
      } else {
        filtered.push(c);
      }
    }
    onNodesChange(filtered);
  }, [onNodesChange, solutionNodeIds]);

  /* Connecting edges (only allowed in add-links / free modes) */
  const onConnect = useCallback((params) => {
    if (!canAddLinks) return;
    // Block connections involving any OTHER layer's solution node
    const activeLayer = workingLayers.find(l => l.id === activeLayerId);
    if (!activeLayer) return;
    const otherSolutionIds = workingLayers
      .filter(l => l.id !== activeLayerId)
      .map(l => l.solutionNodeId);
    if (otherSolutionIds.includes(params.source) || otherSolutionIds.includes(params.target)) return;
    setPendingEdge(params);
    setEdgeLabelDraft('');
  }, [canAddLinks, workingLayers, activeLayerId]);

  const confirmEdge = () => {
    if (!pendingEdge) return;
    const newEdge = {
      id: `sedge_${Date.now()}`,
      source: pendingEdge.source,
      target: pendingEdge.target,
      label: edgeLabelDraft.trim() || 'affects',
    };
    setWorkingLayers(prev => prev.map(l =>
      l.id === activeLayerId ? { ...l, edges: [...l.edges, newEdge] } : l
    ));
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

  /* Edge click — only allow on active layer edges */
  const onEdgeClick = useCallback((_, edge) => {
    if (edge.data?.isSurface) return;
    const active = workingLayers.find(l => l.id === activeLayerId);
    if (!active) return;
    if (!active.edges.some(e => e.id === edge.id)) return;
    setSelectedEdgeId(edge.id);
    setEditingEdgeLabel(edge.label || '');
  }, [workingLayers, activeLayerId]);

  const updateSelectedEdgeLabel = () => {
    if (!selectedEdgeId) return;
    setWorkingLayers(prev => prev.map(l =>
      l.id === activeLayerId
        ? {
            ...l,
            edges: l.edges.map(e =>
              e.id === selectedEdgeId ? { ...e, label: editingEdgeLabel.trim() || 'affects' } : e
            ),
          }
        : l
    ));
    setSelectedEdgeId(null);
  };

  const deleteSelectedEdge = () => {
    if (!selectedEdgeId) return;
    setWorkingLayers(prev => prev.map(l =>
      l.id === activeLayerId
        ? { ...l, edges: l.edges.filter(e => e.id !== selectedEdgeId) }
        : l
    ));
    setSelectedEdgeId(null);
  };

  const swapSelectedEdge = () => {
    if (!selectedEdgeId) return;
    setWorkingLayers(prev => prev.map(l =>
      l.id === activeLayerId
        ? {
            ...l,
            edges: l.edges.map(e =>
              e.id === selectedEdgeId ? { ...e, source: e.target, target: e.source } : e
            ),
          }
        : l
    ));
  };

  /* Submit */
  const totalEdges = workingLayers.reduce((sum, l) => sum + l.edges.length, 0);
  const handleSubmit = () => {
    onSolutionSubmit(workingLayers);
  };

  /* Find label for a node id (for the pending-edge modal) */
  const labelForNodeId = (id) => {
    const surfaceN = surfaceNodes.find(n => n.id === id);
    if (surfaceN) return surfaceN.label;
    const layer = workingLayers.find(l => l.solutionNodeId === id);
    if (layer) return layer.name;
    return id;
  };

  return (
    <div className="map-editor">
      <div className="layer-tabs">
        {workingLayers.map(l => {
          const isActive = l.id === activeLayerId;
          return (
            <button
              key={l.id}
              className={`layer-tab ${isActive ? 'active' : ''}`}
              style={isActive ? { background: l.color, borderColor: l.color } : { borderColor: l.color }}
              onClick={() => {
                setActiveLayerId(l.id);
                setSelectedEdgeId(null);
              }}
              type="button"
            >
              {!isActive && <span className="layer-color-dot" style={{ background: l.color }} />}
              {l.name}
            </button>
          );
        })}
      </div>

      <div className="map-toolbar">
        {solutionMapMode === 'sol-links-only' && (
          <div className="toolbar-notice">
            This round: you can modify or delete connections in your layers, but cannot add new ones.
          </div>
        )}
        <div className="toolbar-spacer" />
        <div className="layer-stats-row">
          {workingLayers.map(l => (
            <span key={l.id} className="layer-stat">
              <span className="layer-color-dot" style={{ background: l.color }} />
              {l.name}: {l.edges.length}
            </span>
          ))}
        </div>
        <button
          onClick={handleSubmit}
          className="btn-primary"
          disabled={totalEdges < 1}
        >
          {submitLabel}
        </button>
      </div>

      {pendingEdge && (
        <div className="edge-modal-overlay">
          <div className="edge-modal">
            <h4>Label this connection</h4>
            <div className="edge-modal-direction">
              <span className="edge-modal-nodes">
                {labelForNodeId(pendingEdge.source)}
                {' → '}
                {labelForNodeId(pendingEdge.target)}
              </span>
              <button onClick={swapPendingEdge} className="btn-icon btn-swap" title="Swap direction">
                <ArrowLeftRight size={14} />
              </button>
            </div>
            <input
              type="text"
              placeholder='e.g., "consumes runway", "boosts revenue"'
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

      {selectedEdgeId && (
        <div className="edge-edit-panel">
          <Tag size={14} />
          <input
            type="text"
            value={editingEdgeLabel}
            onChange={e => setEditingEdgeLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && updateSelectedEdgeLabel()}
            className="toolbar-input"
            autoFocus
          />
          <button onClick={updateSelectedEdgeLabel} className="btn-secondary">Update</button>
          <button onClick={swapSelectedEdge} className="btn-icon btn-swap" title="Swap direction"><ArrowLeftRight size={14} /></button>
          <button onClick={deleteSelectedEdge} className="btn-icon btn-danger"><Trash2 size={14} /></button>
          <button onClick={() => setSelectedEdgeId(null)} className="btn-secondary">Close</button>
        </div>
      )}

      <div className="map-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeClick={onEdgeClick}
          onNodeDragStop={onNodeDragStop}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          deleteKeyCode={null}
          className="react-flow-instance"
        >
          <Background variant="dots" gap={20} size={1} />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={(n) => {
              if (n.type === 'solution') {
                const layer = workingLayers.find(l => l.solutionNodeId === n.id);
                return layer?.color || '#6366f1';
              }
              return '#6366f1';
            }}
            maskColor="rgba(0,0,0,0.1)"
            style={{ borderRadius: 8 }}
          />
        </ReactFlow>
      </div>

      <div className="map-help">
        Draw connections from your strategy to the surface map concepts it affects. You can also add new links between existing concepts.
      </div>
    </div>
  );
}
