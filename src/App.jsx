import { useState } from 'react';
import StepIndicator from './components/StepIndicator';
import CaseUpload from './components/CaseUpload';
import ConceptMapEditor from './components/ConceptMapEditor';
import ChatInterface from './components/ChatInterface';
import { initOpenAI, generateExpertMap, chatCompletion } from './services/openai';
import {
  EXPERT_MAP_PROMPT,
  REASONING_CHECKER_PROMPT,
  CONCEPTUAL_SCAFFOLDING_PROMPT,
  METACOGNITIVE_SCAFFOLDING_PROMPT,
  fillPrompt,
} from './prompts/systemPrompts';
import { Loader2, Key, RotateCcw, CheckCircle2 } from 'lucide-react';
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
};

export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [apiKeySet, setApiKeySet] = useState(false);

  const [step, setStep] = useState('upload');
  const [phase, setPhase] = useState('chat');
  const [round, setRound] = useState(1);

  const [caseStudy, setCaseStudy] = useState('');
  const [caseTitle, setCaseTitle] = useState('');
  const [expertMap, setExpertMap] = useState(null);
  const [studentMap, setStudentMap] = useState({ nodes: [], edges: [] });

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
    setStudentMap(mapData);
    startAgentChat('reasoning', mapData);
  };

  const startAgentChat = async (agentKey, mapOverride) => {
    const config = AGENT_CONFIG[agentKey];
    const currentMap = mapOverride || studentMap;

    setStep(agentKey);
    setPhase('chat');
    setIsLoading(true);
    setChatMessages([]);

    const systemPrompt = fillPrompt(config.prompt, {
      caseStudy,
      expertMap,
      studentMap: currentMap,
    });

    try {
      const firstMessage = await chatCompletion(systemPrompt, [
        { role: 'user', content: 'I have submitted my concept map. Please review it.' },
      ]);
      setChatMessages([
        { role: 'user', content: 'I have submitted my concept map. Please review it.', hidden: true },
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

    const systemPrompt = fillPrompt(config.prompt, {
      caseStudy,
      expertMap,
      studentMap,
    });

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
    setStudentMap(mapData);
    if (step === 'reasoning') startAgentChat('conceptual', mapData);
    else if (step === 'conceptual') startAgentChat('metacognitive', mapData);
    else if (step === 'metacognitive') setStep('done');
  };

  const handleAnotherRound = () => {
    setRound(r => r + 1);
    startAgentChat('reasoning', studentMap);
  };

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
    return (
      <div className="app-container">
        <StepIndicator currentStep="draw" round={round} />
        <div className="step-header">
          <h2>Draw Your Concept Map</h2>
          <p>Read the case study and create a concept map showing the key concepts and their relationships.</p>
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
          <StepIndicator currentStep={step} round={round} />
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
        <StepIndicator currentStep={step} round={round} />
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
              <RotateCcw size={16} /> Another Round
            </button>
            <button className="btn-primary" onClick={() => alert('In production, this would save your final map and session data.')}>
              <CheckCircle2 size={16} /> I'm Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
