/**
 * Age-group robot block definitions index.
 * Exports block definitions and toolbox categories per age group.
 */

import { AgeGroup } from '../../models/lesson';
import { beginnerBlockDefinitions, beginnerToolboxCategory } from './robotBlocksBeginner';
import { intermediateBlockDefinitions, intermediateToolboxCategory } from './robotBlocksIntermediate';
import { advancedBlockDefinitions, advancedToolboxCategory } from './robotBlocksAdvanced';
import { variableBlockDefinitions, variableToolboxCategory } from './variableBlocks';

export interface AgeGroupBlocks {
  blockDefinitions: any[];
  toolboxCategory: string;
}

/**
 * Get the appropriate block definitions and toolbox for an age group.
 */
export function getBlocksForAgeGroup(ageGroup: AgeGroup): AgeGroupBlocks {
  switch (ageGroup) {
    case 'beginner':
      return {
        blockDefinitions: beginnerBlockDefinitions,
        toolboxCategory: beginnerToolboxCategory,
      };
    case 'intermediate':
      return {
        blockDefinitions: [...intermediateBlockDefinitions, ...variableBlockDefinitions],
        toolboxCategory: intermediateToolboxCategory + variableToolboxCategory,
      };
    case 'advanced':
      return {
        blockDefinitions: [...advancedBlockDefinitions, ...variableBlockDefinitions],
        toolboxCategory: advancedToolboxCategory + variableToolboxCategory,
      };
    default:
      return {
        blockDefinitions: beginnerBlockDefinitions,
        toolboxCategory: beginnerToolboxCategory,
      };
  }
}

// Re-export block definitions for direct use
export {
  beginnerBlockDefinitions,
  beginnerToolboxCategory,
  intermediateBlockDefinitions,
  intermediateToolboxCategory,
  advancedBlockDefinitions,
  advancedToolboxCategory,
};
