import { useState } from 'react';
import { Upload, FileText, BookOpen } from 'lucide-react';
import { DEMO_CASE } from '../data/demoCase';

export default function CaseUpload({ onCaseReady }) {
  const [mode, setMode] = useState(null); // null | 'demo' | 'custom'
  const [customText, setCustomText] = useState('');

  const handleDemo = () => {
    setMode('demo');
    onCaseReady(DEMO_CASE.content, DEMO_CASE.title);
  };

  const handleCustomSubmit = () => {
    if (!customText.trim()) return;
    onCaseReady(customText.trim(), 'Custom Case Study');
  };

  if (mode === null) {
    return (
      <div className="upload-screen">
        <div className="upload-hero">
          <BookOpen size={48} strokeWidth={1.5} />
          <h1>Scaffolded Learning</h1>
          <p className="upload-subtitle">
            Upload a business case study and build a concept map.
            AI agents will guide your reasoning through Socratic dialogue.
          </p>
        </div>

        <div className="upload-options">
          <button className="upload-card" onClick={handleDemo}>
            <FileText size={28} />
            <h3>Use Demo Case</h3>
            <p>{DEMO_CASE.title}</p>
          </button>

          <button className="upload-card" onClick={() => setMode('custom')}>
            <Upload size={28} />
            <h3>Paste Your Own</h3>
            <p>Enter a case study text</p>
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'custom') {
    return (
      <div className="upload-screen">
        <div className="upload-hero">
          <Upload size={48} strokeWidth={1.5} />
          <h1>Paste Your Case Study</h1>
        </div>
        <div className="custom-upload">
          <textarea
            value={customText}
            onChange={e => setCustomText(e.target.value)}
            placeholder="Paste the full text of your business case study here..."
            rows={14}
            className="case-textarea"
          />
          <div className="custom-upload-actions">
            <button onClick={() => setMode(null)} className="btn-secondary">← Back</button>
            <button
              onClick={handleCustomSubmit}
              className="btn-primary"
              disabled={customText.trim().length < 100}
            >
              Continue →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
