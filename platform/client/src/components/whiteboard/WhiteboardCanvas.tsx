/**
 * WhiteboardCanvas - Collaborative whiteboard canvas with drawing support
 * Supports touch, stylus, and mouse input for kids' robotics collaboration
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useWhiteboardStore, type DrawingElement, type Point, type DrawingTool } from '../../stores/whiteboardStore';
import styles from './WhiteboardCanvas.module.css';

interface WhiteboardCanvasProps {
  className?: string;
  readonly?: boolean;
  onElementAdd?: (element: DrawingElement) => void;
}

export default function WhiteboardCanvas({ className, readonly = false, onElementAdd }: WhiteboardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [startPoint, setStartPoint] = useState<Point | null>(null);

  const {
    elements,
    selectedElementId,
    currentTool,
    currentColor,
    strokeWidth,
    opacity,
    shapeType,
    zoom,
    panOffset,
    collaborators,
    setSelectedElement,
    addElement,
    updateElement,
    setZoom,
    setPanOffset,
  } = useWhiteboardStore();

  // Generate unique ID
  const generateId = () => `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Get position from event
  const getPosition = useCallback((e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0]?.clientX || e.changedTouches[0]?.clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0]?.clientY || e.changedTouches[0]?.clientY : e.clientY;

    return {
      x: (clientX - rect.left) / zoom - panOffset.x,
      y: (clientY - rect.top) / zoom - panOffset.y,
    };
  }, [zoom, panOffset]);

  // Draw element on canvas
  const drawElement = useCallback((ctx: CanvasRenderingContext2D, element: DrawingElement) => {
    ctx.save();
    ctx.globalAlpha = element.opacity;
    ctx.strokeStyle = element.color;
    ctx.fillStyle = element.color;
    ctx.lineWidth = element.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (element.type === 'path' && element.points.length > 0) {
      ctx.beginPath();
      ctx.moveTo(element.points[0].x, element.points[0].y);
      for (let i = 1; i < element.points.length; i++) {
        ctx.lineTo(element.points[i].x, element.points[i].y);
      }
      ctx.stroke();
    } else if (element.type === 'shape' && element.startPoint && element.endPoint) {
      const { startPoint: sp, endPoint: ep } = element;
      if (element.shapeType === 'rectangle') {
        ctx.strokeRect(sp.x, sp.y, ep.x - sp.x, ep.y - sp.y);
      } else if (element.shapeType === 'circle') {
        const centerX = (sp.x + ep.x) / 2;
        const centerY = (sp.y + ep.y) / 2;
        const radiusX = Math.abs(ep.x - sp.x) / 2;
        const radiusY = Math.abs(ep.y - sp.y) / 2;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (element.shapeType === 'line' || element.shapeType === 'arrow') {
        ctx.beginPath();
        ctx.moveTo(sp.x, sp.y);
        ctx.lineTo(ep.x, ep.y);
        ctx.stroke();
        if (element.shapeType === 'arrow') {
          // Draw arrowhead
          const angle = Math.atan2(ep.y - sp.y, ep.x - sp.x);
          const headLength = 15;
          ctx.beginPath();
          ctx.moveTo(ep.x, ep.y);
          ctx.lineTo(
            ep.x - headLength * Math.cos(angle - Math.PI / 6),
            ep.y - headLength * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(ep.x, ep.y);
          ctx.lineTo(
            ep.x - headLength * Math.cos(angle + Math.PI / 6),
            ep.y - headLength * Math.sin(angle + Math.PI / 6)
          );
          ctx.stroke();
        }
      }
    } else if (element.type === 'text' && element.text) {
      ctx.font = `${element.fontSize || 16}px ${element.fontSize || 16}px Arial`;
      ctx.fillText(element.text, element.points[0]?.x || 0, element.points[0]?.y || 0);
    }

    // Draw selection highlight
    if (element.id === selectedElementId && element.bounds) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        element.bounds.x - 5,
        element.bounds.y - 5,
        element.bounds.width + 10,
        element.bounds.height + 10
      );
      ctx.setLineDash([]);
    }

    ctx.restore();
  }, [selectedElementId]);

  // Render all elements
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply zoom and pan
    ctx.save();
    ctx.translate(panOffset.x * zoom, panOffset.y * zoom);
    ctx.scale(zoom, zoom);

    // Draw all elements
    elements.forEach(element => drawElement(ctx, element));

    // Draw current drawing stroke
    if (isDrawing && currentPoints.length > 0) {
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = strokeWidth;
      ctx.globalAlpha = opacity;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (currentTool === 'pen' || currentTool === 'highlighter') {
        ctx.beginPath();
        ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
        for (let i = 1; i < currentPoints.length; i++) {
          ctx.lineTo(currentPoints[i].x, currentPoints[i].y);
        }
        ctx.stroke();
      } else if (currentTool === 'shapes' && startPoint) {
        const lastPoint = currentPoints[currentPoints.length - 1];
        if (lastPoint) {
          ctx.beginPath();
          if (shapeType === 'rectangle') {
            ctx.strokeRect(
              startPoint.x,
              startPoint.y,
              lastPoint.x - startPoint.x,
              lastPoint.y - startPoint.y
            );
          } else if (shapeType === 'circle') {
            const centerX = (startPoint.x + lastPoint.x) / 2;
            const centerY = (startPoint.y + lastPoint.y) / 2;
            const radiusX = Math.abs(lastPoint.x - startPoint.x) / 2;
            const radiusY = Math.abs(lastPoint.y - startPoint.y) / 2;
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
            ctx.stroke();
          }
        }
      }
    }

    // Draw collaborator cursors
    collaborators.forEach(collab => {
      if (collab.cursor && collab.isActive) {
        ctx.fillStyle = collab.color;
        ctx.beginPath();
        ctx.moveTo(collab.cursor.x, collab.cursor.y);
        ctx.lineTo(collab.cursor.x + 12, collab.cursor.y + 34);
        ctx.lineTo(collab.cursor.x + 8, collab.cursor.y + 28);
        ctx.lineTo(collab.cursor.x + 2, collab.cursor.y + 32);
        ctx.closePath();
        ctx.fill();

        // Draw name label
        ctx.font = '12px Arial';
        ctx.fillStyle = collab.color;
        ctx.fillText(collab.name, collab.cursor.x + 16, collab.cursor.y + 28);
      }
    });

    ctx.restore();
  }, [elements, isDrawing, currentPoints, currentTool, currentColor, strokeWidth, opacity, shapeType, startPoint, zoom, panOffset, collaborators, drawElement]);

  // Handle mouse/touch down
  const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (readonly) return;

    const pos = getPosition(e);
    setIsDrawing(true);
    setCurrentPoints([pos]);
    if (currentTool === 'shapes') {
      setStartPoint(pos);
    }
  }, [readonly, getPosition, currentTool]);

  // Handle mouse/touch move
  const handlePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || readonly) return;

    const pos = getPosition(e);
    setCurrentPoints(prev => [...prev, pos]);
  }, [isDrawing, readonly, getPosition]);

  // Handle mouse/touch up
  const handlePointerUp = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || readonly) return;

    const pos = getPosition(e);

    if (currentTool === 'pen' || currentTool === 'highlighter') {
      if (currentPoints.length > 1) {
        const element: DrawingElement = {
          id: generateId(),
          type: 'path',
          tool: currentTool,
          points: [...currentPoints],
          color: currentTool === 'highlighter' ? currentColor + '80' : currentColor,
          strokeWidth: currentTool === 'highlighter' ? strokeWidth * 3 : strokeWidth,
          opacity: currentTool === 'highlighter' ? 0.4 : opacity,
          createdBy: 'local',
          createdAt: new Date().toISOString(),
        };
        addElement(element);
        onElementAdd?.(element);
      }
    } else if (currentTool === 'shapes' && startPoint) {
      const element: DrawingElement = {
        id: generateId(),
        type: 'shape',
        tool: 'shapes',
        points: [startPoint],
        startPoint,
        endPoint: pos,
        color: currentColor,
        strokeWidth,
        opacity,
        shapeType,
        createdBy: 'local',
        createdAt: new Date().toISOString(),
        bounds: {
          x: Math.min(startPoint.x, pos.x),
          y: Math.min(startPoint.y, pos.y),
          width: Math.abs(pos.x - startPoint.x),
          height: Math.abs(pos.y - startPoint.y),
        },
      };
      addElement(element);
      onElementAdd?.(element);
      setStartPoint(null);
    } else if (currentTool === 'eraser') {
      // Erase elements at position
      const { elements: currentElements, deleteElement } = useWhiteboardStore.getState();
      const toDelete = currentElements.find(el => {
        // Simple hit testing - check if point is near any point in the element
        return el.points.some(p =>
          Math.abs(p.x - pos.x) < 20 && Math.abs(p.y - pos.y) < 20
        );
      });
      if (toDelete) {
        deleteElement(toDelete.id);
      }
    }

    setIsDrawing(false);
    setCurrentPoints([]);
  }, [isDrawing, readonly, getPosition, currentPoints, currentTool, currentColor, strokeWidth, opacity, shapeType, startPoint, addElement, onElementAdd]);

  // Handle wheel for zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(zoom + delta);
    }
  }, [zoom, setZoom]);

  // Handle canvas resize
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resizeObserver = new ResizeObserver(() => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      render();
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [render]);

  // Render on changes
  useEffect(() => {
    render();
  }, [render]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (readonly) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          useWhiteboardStore.getState().redo();
        } else {
          useWhiteboardStore.getState().undo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readonly]);

  return (
    <div ref={containerRef} className={`${styles.container} ${className || ''}`}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        onWheel={handleWheel}
        style={{
          cursor: readonly ? 'default' :
            currentTool === 'eraser' ? 'crosshair' :
            currentTool === 'text' ? 'text' :
            'crosshair'
        }}
      />
    </div>
  );
}