import { Check, CircleDot, Circle } from 'lucide-react';

const STEPS = [
  { key: 'upload', label: 'Upload Case' },
  { key: 'draw', label: 'Draw Map' },
  { key: 'reasoning', label: 'Reasoning Check' },
  { key: 'conceptual', label: 'Conceptual' },
  { key: 'metacognitive', label: 'Metacognitive' },
];

export default function StepIndicator({ currentStep, round = 1 }) {
  const currentIdx = STEPS.findIndex(s => s.key === currentStep);

  return (
    <div className="step-indicator">
      {round > 1 && <span className="round-badge">Round {round}</span>}
      <div className="steps-row">
        {STEPS.map((step, i) => {
          const isComplete = i < currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <div key={step.key} className={`step-item ${isComplete ? 'complete' : ''} ${isCurrent ? 'current' : ''}`}>
              <div className="step-icon">
                {isComplete ? <Check size={14} /> : isCurrent ? <CircleDot size={14} /> : <Circle size={14} />}
              </div>
              <span className="step-label">{step.label}</span>
              {i < STEPS.length - 1 && <div className="step-line" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
