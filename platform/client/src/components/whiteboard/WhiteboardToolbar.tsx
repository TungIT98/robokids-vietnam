/**
 * WhiteboardToolbar - Drawing tools and color picker for whiteboard
 */

import React from 'react';
import { useWhiteboardStore, type DrawingTool, type ShapeType, WHITEBOARD_COLORS } from '../../stores/whiteboardStore';
import styles from './WhiteboardToolbar.module.css';

interface WhiteboardToolbarProps {
  onClear?: () => void;
}

const TOOLS: { id: DrawingTool; label: string; icon: string }[] = [
  { id: 'select', label: 'Chọn', icon: '⬚' },
  { id: 'pen', label: 'Bút', icon: '✏️' },
  { id: 'highlighter', label: 'Đánh dấu', icon: '🖍️' },
  { id: 'eraser', label: 'Tẩy', icon: '🧽' },
  { id: 'shapes', label: 'Hình', icon: '▢' },
  { id: 'text', label: 'Chữ', icon: 'T' },
];

const SHAPES: { id: ShapeType; label: string; icon: string }[] = [
  { id: 'rectangle', label: 'Hình chữ nhật', icon: '▢' },
  { id: 'circle', label: 'Hình tròn', icon: '○' },
  { id: 'line', label: 'Đường thẳng', icon: '/' },
  { id: 'arrow', label: 'Mũi tên', icon: '→' },
];

const STROKE_WIDTHS = [1, 2, 3, 5, 8];

export default function WhiteboardToolbar({ onClear }: WhiteboardToolbarProps) {
  const {
    currentTool,
    currentColor,
    strokeWidth,
    opacity,
    shapeType,
    setTool,
    setColor,
    setStrokeWidth,
    setOpacity,
    setShapeType,
    undo,
    redo,
    history,
    historyIndex,
  } = useWhiteboardStore();

  return (
    <div className={styles.toolbar}>
      {/* Tool Selection */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Công cụ</div>
        <div className={styles.toolGrid}>
          {TOOLS.map(tool => (
            <button
              key={tool.id}
              className={`${styles.toolBtn} ${currentTool === tool.id ? styles.active : ''}`}
              onClick={() => setTool(tool.id)}
              title={tool.label}
            >
              <span className={styles.toolIcon}>{tool.icon}</span>
              <span className={styles.toolLabel}>{tool.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Shape Selection (only show when shapes tool is selected) */}
      {currentTool === 'shapes' && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Hình dạng</div>
          <div className={styles.shapeGrid}>
            {SHAPES.map(shape => (
              <button
                key={shape.id}
                className={`${styles.shapeBtn} ${shapeType === shape.id ? styles.active : ''}`}
                onClick={() => setShapeType(shape.id)}
                title={shape.label}
              >
                {shape.icon}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Color Selection */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Màu sắc</div>
        <div className={styles.colorGrid}>
          {WHITEBOARD_COLORS.map(color => (
            <button
              key={color}
              className={`${styles.colorBtn} ${currentColor === color ? styles.active : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => setColor(color)}
              title={color}
            >
              {currentColor === color && <span className={styles.checkmark}>✓</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Stroke Width */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Độ dày nét</div>
        <div className={styles.strokeGrid}>
          {STROKE_WIDTHS.map(width => (
            <button
              key={width}
              className={`${styles.strokeBtn} ${strokeWidth === width ? styles.active : ''}`}
              onClick={() => setStrokeWidth(width)}
              title={`${width}px`}
            >
              <div
                className={styles.strokePreview}
                style={{ height: width, backgroundColor: currentColor }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Opacity */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Độ mờ</div>
        <div className={styles.opacityRow}>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={opacity}
            onChange={e => setOpacity(parseFloat(e.target.value))}
            className={styles.opacitySlider}
          />
          <span className={styles.opacityValue}>{Math.round(opacity * 100)}%</span>
        </div>
      </div>

      {/* Actions */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Hành động</div>
        <div className={styles.actionRow}>
          <button
            className={styles.actionBtn}
            onClick={undo}
            disabled={historyIndex <= 0}
            title="Hoàn tác (Ctrl+Z)"
          >
            ↩️ Hoàn tác
          </button>
          <button
            className={styles.actionBtn}
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            title="Làm lại (Ctrl+Shift+Z)"
          >
            ↪️ Làm lại
          </button>
        </div>
        <button className={styles.clearBtn} onClick={onClear} title="Xóa tất cả">
          🗑️ Xóa tất cả
        </button>
      </div>
    </div>
  );
}