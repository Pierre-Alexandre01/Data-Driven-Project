import { useState } from 'react';
import StepIndicator from './components/StepIndicator';
import CaseUpload from './components/CaseUpload';
import ConceptMapEditor from './components/ConceptMapEditor';
import ChatInterface from './components/ChatInterface';
import LayerCreation from './components/LayerCreation';
import { initOpenAI, generateExpertMap, chatCompletion } from './services/openai';
import {
  EXPERT_MAP_PROMPT,
  REASONING_CHECKER_PROMPT,
  CONCEPTUAL_SCAFFOLDING_PROMPT,
  METACOGNITIVE_SCAFFOLDING_PROMPT,
  SOLUTION_REASONING_CHECKER_PROMPT,
  SOLUTION_CONCEPTUAL_PROMPT,
  SOLUTION_METACOGNITIVE_PROMPT,
  fillPrompt,
} from './prompts/systemPrompts';
import { Loader2, Key, RotateCcw, CheckCircle2, Layers } from 'lucide-react';
import './App.css';

const AGENT_CONFIG = {
  reasoning: {
    name: 'Reasoning Checker',
    prompt: REASONING_CHECKER_PROMPT,
    completeToken: '[REASONING_COMPLETE]',
    mapMode: 'links-only',
    description: 'The Reasoning Checker will examine your concept map and ask you to explain your connections. It won\'t give you answers — instead, it will help you find errors in your own reasoning.',
  },
  conceptual: {
    name: 'Conceptual Scaffolding',
    prompt: CONCEPTUAL_SCAFFOLDING_PROMPT,
    completeToken: '[CONCEPTUAL_COMPLETE]',
    mapMode: 'add-nodes',
    description: 'Now the Conceptual agent will help you identify blind spots — important concepts and relationships you may have missed.',
  },
  metacognitive: {
    name: 'Metacognitive Scaffolding',
    prompt: METACOGNITIVE_SCAFFOLDING_PROMPT,
    completeToken: '[METACOGNITIVE_COMPLETE]',
    mapMode: 'free',
    description: 'Finally, the Metacognitive agent will help you reflect on your thinking process — what assumptions you made, what you\'d do differently, and what you\'ve learned.',
  },
  sol_reasoning: {
    name: 'Solution Reasoning Checker',
    prompt: SOLUTION_REASONING_CHECKER_PROMPT,
    completeToken: '[SOLUTION_REASONING_COMPLETE]',
    solutionMapMode: 'sol-links-only',
    description: 'The Solution Reasoning Checker will examine the connections you drew for each strategy and ask you to defend them. It looks for wrong connections, missing connections, and inconsistencies between strategies.',
  },
  sol_conceptual: {
    name: 'Solution Conceptual Scaffolding',
    prompt: SOLUTION_CONCEPTUAL_PROMPT,
    completeToken: '[SOLUTION_CONCEPTUAL_COMPLETE]',
    solutionMapMode: 'sol-add-links',
    description: 'Now the Conceptual agent will push you to think about second-order effects and underdeveloped strategies — what you may have missed in each layer.',
  },
  sol_metacognitive: {
    name: 'Solution Metacognitive Scaffolding',
    prompt: SOLUTION_METACOGNITIVE_PROMPT,
    completeToken: '[SOLUTION_METACOGNITIVE_COMPLETE]',
    solutionMapMode: 'sol-free',
    description: 'Finally, reflect on your strategic thinking process — which strategy was easiest to map, what biases shaped your analysis, and what you would do differently.',
  },
};

const SOLUTION_AGENTS = ['sol_reasoning', 'sol_conceptual', 'sol_metacognitive'];
const isSolutionAgent = (key) => SOLUTION_AGENTS.includes(key);
const isSolutionStep = (step) =>
  step === 'layer_creation' || step === 'sol_draw' || step === 'sol_done' || isSolutionAgent(step);

export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [apiKeySet, setApiKeySet] = useState(false);

  const [step, setStep] = useState('upload');
  const [phase, setPhase] = useState('chat');
  const [round, setRound] = useState(1);

  const [caseStudy, setCaseStudy] = useState('');
  const [caseTitle, setCaseTitle] = useState('');
  const [expertMap, setExpertMap] = useState(null);
  const [studentMap, setStudentMap] = useState({ nodes: [], edges: [], solutionLayers: [] });

  const [chatMessages, setChatMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingMap, setIsGeneratingMap] = useState(false);

  const handleApiKey = () => {
    if (!apiKey.trim()) return;
    initOpenAI(apiKey.trim());
    setApiKeySet(true);
  };

  const handleCaseReady = async (text, title) => {
    setCaseStudy(text);
    setCaseTitle(title);
    setIsGeneratingMap(true);
    try {
      const expert = await generateExpertMap(text, EXPERT_MAP_PROMPT);
      setExpertMap(expert);
      setStep('draw');
    } catch (err) {
      console.error('Expert map generation failed:', err);
      alert('Failed to generate expert map. Check your API key and try again.');
    } finally {
      setIsGeneratingMap(false);
    }
  };

  const handleFirstMapSubmit = (mapData) => {
    setStudentMap(prev => ({ ...prev, nodes: mapData.nodes, edges: mapData.edges }));
    startAgentChat('reasoning', { ...studentMap, ...mapData });
  };

  const startAgentChat = async (agentKey, mapOverride) => {
    const config = AGENT_CONFIG[agentKey];
    const currentMap = mapOverride || studentMap;

    setStep(agentKey);
    setPhase('chat');
    setIsLoading(true);
    setChatMessages([]);

    const templateVars = isSolutionAgent(agentKey)
      ? {
          caseStudy,
          expertMap,
          studentMap: { nodes: currentMap.nodes, edges: currentMap.edges },
          solutionLayers: currentMap.solutionLayers || [],
        }
      : {
          caseStudy,
          expertMap,
          studentMap: { nodes: currentMap.nodes, edges: currentMap.edges },
        };

    const systemPrompt = fillPrompt(config.prompt, templateVars);
    const openingMessage = isSolutionAgent(agentKey)
      ? 'I have submitted my solution layers. Please review them.'
      : 'I have submitted my concept map. Please review it.';

    try {
      const firstMessage = await chatCompletion(systemPrompt, [
        { role: 'user', content: openingMessage },
      ]);
      setChatMessages([
        { role: 'user', content: openingMessage, hidden: true },
        { role: 'assistant', content: firstMessage },
      ]);
    } catch (err) {
      console.error('Agent chat failed:', err);
      setChatMessages([
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChatSend = async (text) => {
    const config = AGENT_CONFIG[step];

    const newMessages = [...chatMessages, { role: 'user', content: text }];
    setChatMessages(newMessages);
    setIsLoading(true);

    const templateVars = isSolutionAgent(step)
      ? {
          caseStudy,
          expertMap,
          studentMap: { nodes: studentMap.nodes, edges: studentMap.edges },
          solutionLayers: studentMap.solutionLayers || [],
        }
      : {
          caseStudy,
          expertMap,
          studentMap: { nodes: studentMap.nodes, edges: studentMap.edges },
        };

    const systemPrompt = fillPrompt(config.prompt, templateVars);
    const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));

    try {
      const reply = await chatCompletion(systemPrompt, apiMessages);
      setChatMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      console.error('Chat error:', err);
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChatComplete = () => setPhase('revise');

  const handleRevisionSubmit = (mapData) => {
    const nextMap = { ...studentMap, nodes: mapData.nodes, edges: mapData.edges };
    setStudentMap(nextMap);
    if (step === 'reasoning') startAgentChat('conceptual', nextMap);
    else if (step === 'conceptual') startAgentChat('metacognitive', nextMap);
    else if (step === 'metacognitive') setStep('done');
  };

  const handleAnotherRound = () => {
    setRound(r => r + 1);
    startAgentChat('reasoning', studentMap);
  };

  /* ── Solution mode handlers ── */

  const handleAddSolutionLayers = () => {
    setStep('layer_creation');
  };

  const handleLayersLockedIn = (layers) => {
    const nextMap = { ...studentMap, solutionLayers: layers };
    setStudentMap(nextMap);
    setStep('sol_draw');
  };

  const handleSolutionFirstSubmit = (layers) => {
    const nextMap = { ...studentMap, solutionLayers: layers };
    setStudentMap(nextMap);
    startAgentChat('sol_reasoning', nextMap);
  };

  const handleSolutionRevisionSubmit = (layers) => {
    const nextMap = { ...studentMap, solutionLayers: layers };
    setStudentMap(nextMap);
    if (step === 'sol_reasoning') startAgentChat('sol_conceptual', nextMap);
    else if (step === 'sol_conceptual') startAgentChat('sol_metacognitive', nextMap);
    else if (step === 'sol_metacognitive') setStep('sol_done');
  };

  const handleImproveSolutionLayers = () => {
    setRound(r => r + 1);
    setStep('sol_draw');
  };

  const handleImproveSurfaceFromSolution = () => {
    setRound(r => r + 1);
    setStep('draw');
  };

  /* ── Helpers for rendering ── */

  const stepIndicatorMode = isSolutionStep(step) ? 'solution' : 'surface';
  const stepIndicatorCurrent = step;

  /* ── RENDER ── */

  if (!apiKeySet) {
    return (
      <div className="app-container">
        <div className="center-screen">
          <Key size={48} strokeWidth={1.5} className="hero-icon" />
          <h1>Multi-Agent Scaffolding</h1>
          <p className="subtitle">Enter your OpenAI API key to get started.<br/>The key stays in your browser and is never stored.</p>
          <div className="inline-form">
            <input
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleApiKey()}
              className="text-input wide"
            />
            <button onClick={handleApiKey} className="btn-primary" disabled={!apiKey.trim()}>
              Start →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isGeneratingMap) {
    return (
      <div className="app-container">
        <div className="center-screen">
          <Loader2 size={40} className="spin hero-icon" />
          <h2>Analyzing case study...</h2>
          <p className="subtitle">Generating expert concept map for evaluation. This takes ~10 seconds.</p>
        </div>
      </div>
    );
  }

  if (step === 'upload') {
    return (
      <div className="app-container">
        <CaseUpload onCaseReady={handleCaseReady} />
      </div>
    );
  }

  if (step === 'draw') {
    const isReturningToSurface = round > 1 || studentMap.nodes.length > 0;
    return (
      <div className="app-container">
        <StepIndicator currentStep="draw" round={round} mode="surface" />
        <div className="step-header">
          <h2>{isReturningToSurface ? 'Improve Your Surface Map' : 'Draw Your Concept Map'}</h2>
          <p>
            {isReturningToSurface
              ? 'Make any edits you want to your surface map — add, modify, or remove concepts and links. When you submit, you\'ll go through the scaffolding cycle again. Your solution layers are preserved.'
              : 'Read the case study and create a concept map showing the key concepts and their relationships.'}
          </p>
          <details className="case-accordion">
            <summary>View Case Study: {caseTitle}</summary>
            <div className="case-text">{caseStudy}</div>
          </details>
        </div>
        <ConceptMapEditor
          initialNodes={studentMap.nodes.map(n => ({ id: n.id, data: { label: n.label }, position: n.position }))}
          initialEdges={studentMap.edges}
          onSubmit={handleFirstMapSubmit}
          mode="free"
          submitLabel="Submit Map for Review →"
        />
      </div>
    );
  }

  if (['reasoning', 'conceptual', 'metacognitive'].includes(step)) {
    const config = AGENT_CONFIG[step];

    if (phase === 'chat') {
      return (
        <div className="app-container">
          <StepIndicator currentStep={step} round={round} mode="surface" />
          <div className="step-header">
            <h2>{config.name}</h2>
            <p>
              {step === 'reasoning' && round > 1
                ? `Round ${round}: Re-evaluating your revised concept map from Round ${round - 1}. The Reasoning Checker will examine what's changed and probe your updated connections.`
                : config.description}
            </p>
            <details className="case-accordion">
              <summary>View Case Study: {caseTitle}</summary>
              <div className="case-text">{caseStudy}</div>
            </details>
          </div>
          <ChatInterface
            messages={chatMessages.filter(m => !m.hidden)}
            onSend={handleChatSend}
            isLoading={isLoading}
            agentName={config.name}
            onComplete={handleChatComplete}
          />
        </div>
      );
    }

    return (
      <div className="app-container">
        <StepIndicator currentStep={step} round={round} mode="surface" />
        <div className="step-header">
          <h2>Revise Your Map</h2>
          <p>
            {config.mapMode === 'links-only'
              ? 'The Reasoning Checker focused on errors in your existing connections. In this revision, you can modify or delete links, but cannot add new concepts yet.'
              : config.mapMode === 'add-nodes'
              ? 'The Conceptual agent highlighted gaps in your map. You can now add new concepts and links to address them.'
              : 'Based on your reflections, make any final revisions you\'d like — you have full editing freedom.'}
          </p>
        </div>
        <ConceptMapEditor
          initialNodes={studentMap.nodes.map(n => ({ id: n.id, data: { label: n.label }, position: n.position }))}
          initialEdges={studentMap.edges}
          onSubmit={handleRevisionSubmit}
          mode={config.mapMode}
          submitLabel={step === 'metacognitive' ? 'Finish Revision →' : 'Submit Revision →'}
        />
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="app-container">
        <div className="center-screen">
          <CheckCircle2 size={56} strokeWidth={1.5} className="hero-icon done-icon" />
          <h1>Round {round} Complete</h1>
          <p className="subtitle">Your concept map has been through all three scaffolding layers.</p>
          <div className="stats-row">
            <div className="stat-card">
              <span className="stat-value">{studentMap.nodes.length}</span>
              <span className="stat-label">Concepts</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{studentMap.edges.length}</span>
              <span className="stat-label">Links</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{round}</span>
              <span className="stat-label">{round === 1 ? 'Round' : 'Rounds'}</span>
            </div>
          </div>
          <div className="done-actions">
            <button onClick={handleAnotherRound} className="btn-secondary">
              <RotateCcw size={16} /> Improve Surface Map
            </button>
            <button onClick={handleAddSolutionLayers} className="btn-primary">
              <Layers size={16} /> Add Solution Layers
            </button>
            <button className="btn-secondary" onClick={() => alert('In production, this would save your final map and session data.')}>
              <CheckCircle2 size={16} /> I&apos;m Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'layer_creation') {
    return (
      <div className="app-container">
        <StepIndicator currentStep="layer_creation" round={round} mode="solution" />
        <LayerCreation
          initialLayers={studentMap.solutionLayers || []}
          onStartDrawing={handleLayersLockedIn}
          onCancel={() => setStep('done')}
        />
      </div>
    );
  }

  if (step === 'sol_draw') {
    return (
      <div className="app-container">
        <StepIndicator currentStep="sol_draw" round={round} mode="solution" />
        <div className="step-header">
          <h2>Draw Your Solution Layers</h2>
          <p>
            Switch between strategy tabs to draw connections from each strategy to the surface map concepts it
            affects. The surface map is read-only; only your strategy connections are editable.
          </p>
          <details className="case-accordion">
            <summary>View Case Study: {caseTitle}</summary>
            <div className="case-text">{caseStudy}</div>
          </details>
        </div>
        <ConceptMapEditor
          solutionMode
          surfaceNodes={studentMap.nodes}
          surfaceEdges={studentMap.edges}
          solutionLayers={studentMap.solutionLayers}
          solutionMapMode="sol-free"
          onSolutionSubmit={handleSolutionFirstSubmit}
          submitLabel="Submit All Layers for Review →"
        />
      </div>
    );
  }

  if (isSolutionAgent(step)) {
    const config = AGENT_CONFIG[step];

    if (phase === 'chat') {
      return (
        <div className="app-container">
          <StepIndicator currentStep={step} round={round} mode="solution" />
          <div className="step-header">
            <h2>{config.name}</h2>
            <p>{config.description}</p>
            <details className="case-accordion">
              <summary>View Case Study: {caseTitle}</summary>
              <div className="case-text">{caseStudy}</div>
            </details>
          </div>
          <ChatInterface
            messages={chatMessages.filter(m => !m.hidden)}
            onSend={handleChatSend}
            isLoading={isLoading}
            agentName={config.name}
            onComplete={handleChatComplete}
          />
        </div>
      );
    }

    return (
      <div className="app-container">
        <StepIndicator currentStep={step} round={round} mode="solution" />
        <div className="step-header">
          <h2>Revise Your Solution Layers</h2>
          <p>
            {config.solutionMapMode === 'sol-links-only'
              ? 'The Solution Reasoning Checker focused on errors in your existing layer connections. In this revision, you can modify or delete connections, but cannot add new ones yet.'
              : config.solutionMapMode === 'sol-add-links'
              ? 'The Conceptual agent highlighted gaps in your strategies. You can now add new connections to address them.'
              : 'Based on your reflections, make any final revisions you\'d like to your layer connections.'}
          </p>
        </div>
        <ConceptMapEditor
          solutionMode
          surfaceNodes={studentMap.nodes}
          surfaceEdges={studentMap.edges}
          solutionLayers={studentMap.solutionLayers}
          solutionMapMode={config.solutionMapMode}
          onSolutionSubmit={handleSolutionRevisionSubmit}
          submitLabel={step === 'sol_metacognitive' ? 'Finish Revision →' : 'Submit Revision →'}
        />
      </div>
    );
  }

  if (step === 'sol_done') {
    return (
      <div className="app-container">
        <div className="center-screen">
          <CheckCircle2 size={56} strokeWidth={1.5} className="hero-icon done-icon" />
          <h1>Solution Round Complete</h1>
          <p className="subtitle">Your solution layers have been through all three scaffolding layers.</p>
          <div className="layer-summary">
            {(studentMap.solutionLayers || []).map(l => (
              <div key={l.id} className="layer-summary-item">
                <span className="layer-color-dot" style={{ background: l.color }} />
                <span className="layer-name">{l.name}</span>
                <span className="layer-edge-count">{l.edges.length} {l.edges.length === 1 ? 'connection' : 'connections'}</span>
              </div>
            ))}
          </div>
          <div className="done-actions">
            <button onClick={handleImproveSolutionLayers} className="btn-secondary">
              <RotateCcw size={16} /> Improve Solution Layers
            </button>
            <button onClick={handleImproveSurfaceFromSolution} className="btn-secondary">
              <RotateCcw size={16} /> Improve Surface Map
            </button>
            <button className="btn-primary" onClick={() => alert('In production, this would save your final map and session data.')}>
              <CheckCircle2 size={16} /> I&apos;m Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
