# Data-Driven Scaffolding Prototype

A multi-agent scaffolding tool for business case study analysis. Students build concept maps and receive guided feedback through three AI agents: Reasoning Checker, Conceptual Scaffolding, and Metacognitive Scaffolding.

Built with React, Vite, and React Flow.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- An [OpenRouter](https://openrouter.ai/) API key (provided by the instructor)

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/Pierre-Alexandre01/Data-Driven-Project.git

# 2. Navigate into the project folder
cd Data-Driven-Project

# 3. Install dependencies
npm install

# 4. Start the development server
npm run dev
```

The terminal will display a local URL (e.g. `http://localhost:5173`). Open it in your browser.

## Usage

1. Enter your API key when prompted (the `sk-or-v1-...` key provided by your instructor).
2. Upload or paste a business case study.
3. Draw your initial concept map by adding concepts and linking them.
4. Interact with the three scaffolding agents in sequence:
   - **Reasoning Checker** — Identifies errors in your connections via Socratic questioning.
   - **Conceptual Scaffolding** — Helps you find blind spots and missing concepts.
   - **Metacognitive Scaffolding** — Guides reflection on your thinking process.
5. Revise your map after each agent conversation.
6. Optionally start another round for deeper analysis.

## Build for Production

```bash
npm run build
```

Output goes to the `dist/` folder.
