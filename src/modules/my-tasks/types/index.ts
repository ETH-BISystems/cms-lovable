import type { TaskStatus } from '@/modules/pipeline';

export type TaskPriority = 'High' | 'Medium' | 'Low';

export type TaskSource = 'Blog Engine' | 'Newsletter' | 'Card Data' | 'Client Dashboard' | 'Content Creation';

export const ALL_SOURCES: TaskSource[] = ['Blog Engine', 'Newsletter', 'Card Data', 'Client Dashboard', 'Content Creation'];

export interface MyTask {
  id: string;
  articleId: string;
  articleTitle: string; // denormalized from articles collection
  name: string;
  icon: string;
  taskType: string; // e.g. "Write Draft", "SEO Review", "Compliance Review"
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  avatar: string;
  dueDate: Date | null;
  comments: number;
  source: TaskSource;
  blockReason?: string;
  blocksAdvancement?: boolean;
  description?: string;
  autoAssigned?: boolean;
}

// Source-specific task types (from Lovable prototype)
export const SOURCE_TYPES: Record<TaskSource, string[]> = {
  'Blog Engine': [
    'Copyedit / Proofread', 'Fact-Check Card Terms', 'Add/Verify Backlinks', 'Image Sourcing & Optimization',
    'Add Social Embeds', 'SEO Review', 'Research Topic', 'Write Draft', 'Compliance Review', 'Update Stale Content'
  ],
  'Newsletter': [
    'Curate Content Blocks', 'Write Lead Story', 'Review Affiliate Links', 'Proofread & Approve',
    'Generate Social Posts', 'Review Competitor Debrief', 'A/B Test Subject Lines', 'Sync to Beehiiv', 'Update Section Headers'
  ],
  'Card Data': [
    'Update Card Data', 'Verify Card Terms Accuracy', 'Review Scraper Results', 'Update Editorial Content',
    'Update Benefits & Credits', 'Sync to Webflow', 'Review Transfer Bonuses', 'Add New Card',
    'Update Transfer Partner Data', 'Review Override Conflicts'
  ],
  'Client Dashboard': [
    'Flight Search', 'Hotel Search', 'Booking Confirmation', 'Client Communication',
    'Trip Prep & Logistics', 'Document Collection', 'Strategy Session Prep', 'Billing & Invoice',
    'Renewal Follow-Up', 'Post-Trip Follow-Up', 'Client Onboarding', 'Card Portfolio Review'
  ],
  'Content Creation': [
    'Create Post', 'Schedule Post', 'Review Analytics', 'Respond to Comments/DMs',
    'Content Calendar Planning', 'Brand Asset Creation', 'Video Editing', 'Caption Writing',
    'Repurpose Blog Content', 'Repurpose Newsletter Content'
  ],
};
