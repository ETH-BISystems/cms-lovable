/**
 * CMS-154: Research-plan derivation for the Deep Research "plan & steer"
 * review. The brief itself carries findings — the PLAN statement ("here is
 * what I plan to present, here is how I'll use your inputs") is derived
 * deterministically from the article + brief structure so it renders for
 * every brief, including ones generated before this feature existed.
 */

import type { PipelineArticle, ResearchFinding, SourceUrl } from '../types';

export interface PlanInputUsage {
  /** Stable key for React lists and tests. */
  key: 'voiceNotes' | 'keywords' | 'experience' | 'brief';
  label: string;
  /** One-line explanation of how the input is used by the writing agent. */
  detail: string;
  /** False when the input is absent — the UI renders these muted with a
   * call-to-action rather than hiding them (the plan should surface gaps). */
  active: boolean;
}

export interface ResearchPlan {
  /** "What I plan to present" — ordered bullet lines for the writer. */
  presentItems: string[];
  /** "How I'll use your inputs" — voice note / keywords / experience usage. */
  inputUsage: PlanInputUsage[];
  /** Distinct supporting-research categories covered by the brief. */
  coverageCategories: string[];
}

export interface BuildResearchPlanInput {
  primaryKeyword: string;
  secondaryKeywords: string[];
  /** Article brief fields (Overview tab) — all optional. */
  context?: string;
  angle?: string;
  targetAudience?: string;
  /** SEO research recommended structure, when the SEO brief has run. */
  headingStructure?: { h1: string; h2s: string[]; targetWordCount: number } | null;
  findings: ResearchFinding[];
  /** Count of voice notes with a usable transcript on the article. */
  voiceNoteCount: number;
  /** Count of Experience Library items attached to the article. */
  experienceCount: number;
}

/**
 * Derive the writing plan from the article + brief structure. Pure — no
 * Firestore, no Date.now — so the rendered plan is stable per snapshot.
 */
export function buildResearchPlan(input: BuildResearchPlanInput): ResearchPlan {
  const presentItems: string[] = [];

  presentItems.push(
    `Lead with the primary sources above, targeting "${input.primaryKeyword}"${
      input.secondaryKeywords.length > 0
        ? ` (secondary: ${input.secondaryKeywords.slice(0, 4).join(', ')}${input.secondaryKeywords.length > 4 ? ` +${input.secondaryKeywords.length - 4} more` : ''})`
        : ''
    }.`
  );

  if (input.angle?.trim()) {
    presentItems.push(`Angle: ${input.angle.trim()}`);
  }
  if (input.context?.trim()) {
    presentItems.push(`Context: ${input.context.trim()}`);
  }
  if (input.targetAudience?.trim()) {
    presentItems.push(`Written for: ${input.targetAudience.trim()}`);
  }

  if (input.headingStructure && (input.headingStructure.h1 || input.headingStructure.h2s.length > 0)) {
    presentItems.push(
      `Structure from the SEO brief: ${input.headingStructure.h2s.length} sections under the H1, ~${input.headingStructure.targetWordCount.toLocaleString()} words.`
    );
  } else {
    presentItems.push('Structure: standard long-form ETH guide (~2,500–3,500 words) — no SEO outline generated yet.');
  }

  const coverageCategories = Array.from(
    new Set(input.findings.map((f) => f.category).filter(Boolean))
  );
  if (input.findings.length > 0) {
    presentItems.push(
      `Support the primary sources with ${input.findings.length} research findings across ${coverageCategories.length} categories (facts, stats, developments, expert takes).`
    );
  }

  const inputUsage: PlanInputUsage[] = [
    {
      key: 'voiceNotes',
      label: input.voiceNoteCount === 1 ? '1 voice note' : `${input.voiceNoteCount} voice notes`,
      detail:
        'Woven through the draft as first-person narrative — not parked in a separate section.',
      active: input.voiceNoteCount > 0,
    },
    {
      key: 'keywords',
      label: `${1 + input.secondaryKeywords.length} keyword${input.secondaryKeywords.length > 0 ? 's' : ''}`,
      detail: `"${input.primaryKeyword}" drives the H1, intro, and headings; secondary terms are worked in naturally.`,
      active: true,
    },
    {
      key: 'experience',
      label: input.experienceCount === 1 ? '1 experience' : `${input.experienceCount} experiences`,
      detail:
        'Experience Library transcripts attached to this article are quoted as authentic anecdotes.',
      active: input.experienceCount > 0,
    },
    {
      key: 'brief',
      label: 'Article brief',
      detail:
        input.context?.trim() || input.angle?.trim() || input.targetAudience?.trim()
          ? 'Context, angle, and audience from the Overview tab steer the framing.'
          : 'No brief context set on the Overview tab — the draft follows the keyword alone.',
      active: !!(input.context?.trim() || input.angle?.trim() || input.targetAudience?.trim()),
    },
  ];

  return { presentItems, inputUsage, coverageCategories };
}

/** Primary sources the plan review includes: article sources minus exclusions. */
export function includedPrimarySources(
  sourceUrls: SourceUrl[] | undefined,
  excludedSourceUrls: string[] | undefined
): SourceUrl[] {
  const excluded = new Set(excludedSourceUrls ?? []);
  return (sourceUrls ?? []).filter((s) => !excluded.has(s.url));
}
