/**
 * useVoxelShortcuts - Keyboard shortcuts for Voxel Builder
 *
 * Shortcuts:
 * - Ctrl+Z: Undo
 * - Ctrl+Y: Redo
 * - Delete: Remove selected voxel
 * - Escape: Deselect
 */

import { useEffect } from 'react';
import { useVoxelBuilderStore } from '../stores/voxelStore';

export function useVoxelShortcuts() {
  const {
    undo,
    redo,
    selectedVoxel,
    removeVoxel,
    setSelectedVoxel,
    historyIndex,
    history,
  } = useVoxelBuilderStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Ctrl+Z: Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Ctrl+Y or Ctrl+Shift+Z: Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }

      // Delete or Backspace: Remove selected voxel
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedVoxel) {
        e.preventDefault();
        removeVoxel(selectedVoxel.x, selectedVoxel.y, selectedVoxel.z);
        setSelectedVoxel(null);
        return;
      }

      // Escape: Deselect
      if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedVoxel(null);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, selectedVoxel, removeVoxel, setSelectedVoxel]);
}

export default useVoxelShortcuts;