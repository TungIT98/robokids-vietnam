---
name: react-dev
description: >
  Use when: Building React frontend components, pages, or UI
  Do NOT use when: Backend-only work, hardware, or AI tasks
---

# React Development Skill

## Core Skills
- React 18+ with hooks
- TypeScript for type safety
- State management (useState, useContext)
- Component architecture

## RoboKids Specific
- Blockly integration for drag-drop coding
- Kid-friendly UI design
- Mobile-first responsive design

## Tech Stack
| Area | Technology |
|------|------------|
| Framework | React 18 |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Build | Vite |

## Example Component
```tsx
import { useState } from 'react';

interface RobotBlock {
  type: string;
  params: Record<string, number>;
}

export function BlocklyWorkspace() {
  const [blocks, setBlocks] = useState<RobotBlock[]>([]);

  return (
    <div className="workspace">
      <BlockPalette />
      <BlockCanvas blocks={blocks} />
      <RunButton onRun={() => generateCode(blocks)} />
    </div>
  );
}
```

## Best Practices
1. Use functional components
2. Keep components small
3. Type everything
4. Mobile-first design
5. Accessible colors
