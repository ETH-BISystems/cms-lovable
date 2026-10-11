import { ArticleStage, ArticleStatus, STAGE_ORDER, HUMAN_GATE_STAGES, STATUS_TO_STAGE_MAP, isValidStageTransition, getValidForwardStages, getValidBackwardStages } from '../types';

// Re-export for backward compatibility
export { isValidStageTransition as isValidTransition };

export function getValidNextStages(current: ArticleStage): ArticleStage[] {
  return getValidForwardStages(current);
}

export function getAllValidTargetStages(current: ArticleStage): ArticleStage[] {
  return [...getValidForwardStages(current), ...getValidBackwardStages(current)];
}

export function isHumanGate(stage: ArticleStage): boolean {
  return HUMAN_GATE_STAGES.includes(stage);
}

export function mapLegacyStatus(status: ArticleStatus): ArticleStage {
  return STATUS_TO_STAGE_MAP[status] ?? 'New Article';
}

// Legacy compatibility — old VALID_TRANSITIONS map
export const VALID_TRANSITIONS: Record<ArticleStatus, ArticleStatus[]> = {
  'Discovered': ['Researching'],
  'Researching': ['Writing'],
  'Writing': ['In Review'],
  'In Review': ['Approved', 'Writing', 'Archived'],
  'Approved': ['Published', 'In Review'],
  'Published': ['Needs Refresh', 'Approved'],
  'Needs Refresh': ['Refreshing'],
  'Refreshing': ['In Review'],
  'Archived': [],
};

export function getValidNextStatuses(currentStatus: ArticleStatus): ArticleStatus[] {
  return VALID_TRANSITIONS[currentStatus] ?? [];
}

export function getAutoTasks(fromStatus: ArticleStatus | ArticleStage, toStatus: ArticleStatus | ArticleStage): { name: string; icon: string }[] {
  // Auto-tasks are generated when moving between certain stages
  if (toStatus === 'Write Article' || toStatus === 'Writing') {
    return [
      { name: 'Write Draft', icon: 'pencil' },
      { name: 'Add Media', icon: 'image' },
    ];
  }
  if (toStatus === 'Review & Edit' || toStatus === 'In Review') {
    return [
      { name: 'Copyedit', icon: 'pencil' },
      { name: 'Fact-Check', icon: 'shield' },
      { name: 'SEO Review', icon: 'search' },
    ];
  }
  return [];
}
