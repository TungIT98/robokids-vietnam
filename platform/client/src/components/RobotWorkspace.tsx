import React, { useEffect, useRef, useState } from 'react';
import Blockly from 'blockly';
import { robotBlockDefinitions, robotToolboxCategory } from './blocks/robotBlocks';
import { generateRobotCommands } from './generators/robotGenerator';

interface RobotWorkspaceProps {
  onCommandsChange?: (commands: string) => void;
}

export const RobotWorkspace: React.FC<RobotWorkspaceProps> = ({
  onCommandsChange,
}) => {
  const blocklyDivRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string>('');

  useEffect(() => {
    if (!blocklyDivRef.current || workspaceRef.current) return;

    // Register robot block definitions
    Blockly.defineBlocksWithJsonArray(robotBlockDefinitions as any[]);

    // Create Blockly workspace
    const workspace = Blockly.inject(blocklyDivRef.current, {
      toolbox: robotToolboxCategory,
      grid: {
        spacing: 20,
        length: 3,
        colour: '#ccc',
        snap: true,
      },
      trashcan: true,
      zoom: {
        controls: true,
        wheel: true,
        startScale: 1.0,
        maxScale: 3,
        minScale: 0.3,
        scaleSpeed: 1.2,
      },
    });

    workspaceRef.current = workspace;

    // Listen for workspace changes
    workspace.addChangeListener((event: Blockly.Events.Abstract) => {
      if (event.type === Blockly.Events.CHANGE ||
          event.type === Blockly.Events.CREATE ||
          event.type === Blockly.Events.DELETE ||
          event.type === Blockly.Events.MOVE) {
        const code = generateRobotCommands(workspace);
        setGeneratedCode(code);
        onCommandsChange?.(code);
      }
    });

    return () => {
      workspace.dispose();
      workspaceRef.current = null;
    };
  }, []);

  return (
    <div className="robot-workspace">
      <div className="robot-workspace-header">
        <h2>Robot Programming</h2>
        <p>Drag blocks from the Robot category to program your robot</p>
      </div>
      <div ref={blocklyDivRef} className="blockly-container" />
      {generatedCode && (
        <div className="generated-code">
          <h3>Generated Robot Commands:</h3>
          <pre>{generatedCode}</pre>
        </div>
      )}
    </div>
  );
};

export default RobotWorkspace;
