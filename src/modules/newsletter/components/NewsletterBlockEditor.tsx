import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Trash2,
  Plus,
  Undo2,
  Bold,
  Italic,
  Strikethrough,
  Link,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Type,
  Image,
  Code,
  Share2,
  Sparkles,
  CreditCard,
  FileText,
  Minus,
  MousePointerClick,
} from 'lucide-react';
import { toast } from 'sonner';
import { BlockPreviewStrip } from './shared/BlockPreviewStrip';
import { EmbedSocialPostDialog } from '@/modules/pipeline';
import { buildEmailSocialEmbedHtml } from '@/modules/experience';
import { useBlockOperations, getWordCount } from '../hooks/useBlockOperations';
import type { ContentBlock, ContentBlockType } from '../types/index';

const ALL_BLOCK_TYPES: { type: ContentBlockType; description: string }[] = [
  { type: 'Lead Story', description: 'Main feature story' },
  { type: 'Card Alert', description: 'Credit card news or changes' },
  { type: 'Deal Alert', description: 'Travel deal or promotion' },
  { type: 'Article Spotlight', description: 'Featured article link' },
  { type: 'Quick Hits', description: 'Short news items' },
  { type: 'Transfer Bonus', description: 'Points transfer bonus' },
  { type: 'Transfer Bonus Watch', description: 'Transfer bonus monitoring' },
  { type: 'Tip of the Day', description: 'Daily travel tip' },
  { type: 'Personal Note', description: 'Personal message from editor' },
  { type: 'Partner Highlight', description: 'Partner feature' },
  { type: 'Affiliate Feature', description: 'Affiliate product feature' },
  { type: 'Custom', description: 'Custom content block' },
  { type: 'Divider', description: 'Visual separator' },
];

interface NewsletterBlockEditorProps {
  blocks: ContentBlock[];
  editionId: string;
  editable?: boolean;
  onBlocksChange?: (blocks: ContentBlock[]) => void;
  onRewriteBlock?: (blockId: string) => void;
}

/**
 * Block-based content editor with WYSIWYG toolbar.
 *
 * Requirements: 2.1–2.11, 12.2
 */
export function NewsletterBlockEditor({
  blocks: initialBlocks,
  editionId,
  editable = true,
  onBlocksChange,
  onRewriteBlock,
}: NewsletterBlockEditorProps) {
  const {
    blocks,
    addBlock,
    removeBlock,
    reorderBlocks,
    updateBlock,
    undoRemove,
  } = useBlockOperations(initialBlocks);

  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [htmlMode, setHtmlMode] = useState<Set<string>>(new Set());
  const [showUndo, setShowUndo] = useState(false);
  const [addBlockIndex, setAddBlockIndex] = useState<number | null>(null);
  const [socialTargetBlock, setSocialTargetBlock] = useState<string | null>(null);
  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const toggleExpand = useCallback((blockId: string) => {
    setExpandedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(blockId)) next.delete(blockId);
      else next.add(blockId);
      return next;
    });
  }, []);

  const toggleHtmlMode = useCallback((blockId: string) => {
    setHtmlMode((prev) => {
      const next = new Set(prev);
      if (next.has(blockId)) next.delete(blockId);
      else next.add(blockId);
      return next;
    });
  }, []);

  const handleRemoveBlock = useCallback(
    (blockId: string) => {
      removeBlock(blockId);
      setShowUndo(true);
      setTimeout(() => setShowUndo(false), 5000);
    },
    [removeBlock],
  );

  const handleAddBlock = useCallback(
    (type: ContentBlockType, atIndex: number) => {
      const newBlock: ContentBlock = {
        id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type,
        title: type,
        previewText: '',
        body: '',
      };
      addBlock(newBlock, atIndex);
      setExpandedBlocks((prev) => new Set(prev).add(newBlock.id));
      setAddBlockIndex(null);
    },
    [addBlock],
  );

  const handleBlockClick = useCallback((blockId: string) => {
    const el = blockRefs.current[blockId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setExpandedBlocks((prev) => new Set(prev).add(blockId));
    }
  }, []);

  const handleDragStart = useCallback(
    (e: React.DragEvent, index: number) => {
      if (!editable) return;
      e.dataTransfer.setData('text/plain', String(index));
    },
    [editable],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, toIndex: number) => {
      e.preventDefault();
      const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
      if (!isNaN(fromIndex) && fromIndex !== toIndex) {
        reorderBlocks(fromIndex, toIndex);
      }
    },
    [reorderBlocks],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* Block preview strip */}
        <BlockPreviewStrip blocks={blocks} onBlockClick={handleBlockClick} />

        {/* Undo toast */}
        {showUndo && (
          <div className="flex items-center gap-2 p-2 bg-muted rounded text-sm">
            <span>Block removed.</span>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-xs"
              onClick={() => {
                undoRemove();
                setShowUndo(false);
              }}
            >
              <Undo2 className="h-3 w-3 mr-1" /> Undo
            </Button>
          </div>
        )}

        {/* Block list */}
        <div className="space-y-2">
          {blocks.map((block, index) => {
            const isExpanded = expandedBlocks.has(block.id);
            const isHtml = htmlMode.has(block.id);
            const wordCount = getWordCount(block.body);

            return (
              <div
                key={block.id}
                ref={(el) => { blockRefs.current[block.id] = el; }}
              >
                {/* Add block button between blocks */}
                {editable && (
                  <div className="flex justify-center py-0.5">
                    <Popover
                      open={addBlockIndex === index}
                      onOpenChange={(open) => setAddBlockIndex(open ? index : null)}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 rounded-full opacity-0 hover:opacity-100 transition-opacity"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-2" align="center">
                        <p className="text-xs font-medium mb-2">Add Block</p>
                        <div className="space-y-0.5 max-h-48 overflow-y-auto">
                          {ALL_BLOCK_TYPES.map((bt) => (
                            <button
                              key={bt.type}
                              type="button"
                              className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-accent transition-colors"
                              onClick={() => handleAddBlock(bt.type, index)}
                            >
                              <span className="font-medium">{bt.type}</span>
                              <span className="text-muted-foreground ml-1">— {bt.description}</span>
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                <Card
                  draggable={editable}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragOver={handleDragOver}
                  className="transition-shadow"
                >
                  <CardContent className="p-0">
                    {/* Block header */}
                    <div className="flex items-center gap-2 px-3 py-2 border-b">
                      {editable && (
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab flex-shrink-0" />
                      )}
                      <Badge variant="outline" className="text-[10px] flex-shrink-0">
                        {block.type}
                      </Badge>
                      <button
                        type="button"
                        className="flex-1 text-left text-sm font-medium truncate"
                        onClick={() => toggleExpand(block.id)}
                      >
                        {block.title || block.type}
                      </button>
                      {!isExpanded && (
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">
                          {wordCount} words
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleExpand(block.id)}
                        className="flex-shrink-0"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                      {editable && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 flex-shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveBlock(block.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="p-3 space-y-2">
                        {editable && (
                          <>
                            {/* WYSIWYG Toolbar */}
                            <div className="flex flex-wrap items-center gap-0.5 p-1 border rounded bg-muted/30">
                              <ToolbarButton icon={Heading1} tooltip="Heading 1" />
                              <ToolbarButton icon={Heading2} tooltip="Heading 2" />
                              <ToolbarButton icon={Heading3} tooltip="Heading 3" />
                              <ToolbarButton icon={Type} tooltip="Body text" />
                              <Separator orientation="vertical" className="h-5 mx-1" />
                              <ToolbarButton icon={Bold} tooltip="Bold" />
                              <ToolbarButton icon={Italic} tooltip="Italic" />
                              <ToolbarButton icon={Strikethrough} tooltip="Strikethrough" />
                              <Separator orientation="vertical" className="h-5 mx-1" />
                              <ToolbarButton icon={Link} tooltip="Insert link" />
                              <ToolbarButton icon={List} tooltip="Bullet list" />
                              <ToolbarButton icon={ListOrdered} tooltip="Numbered list" />
                              <Separator orientation="vertical" className="h-5 mx-1" />
                              <ToolbarButton icon={MousePointerClick} tooltip="CTA button" />
                              <ToolbarButton icon={Minus} tooltip="Divider" />
                              <ToolbarButton icon={CreditCard} tooltip="Card data token" />
                              <ToolbarButton icon={FileText} tooltip="Article link" />
                              <ToolbarButton icon={Image} tooltip="Insert image" />
                              <ToolbarButton
                                icon={Share2}
                                tooltip="Embed social post (linked thumbnail — email-safe)"
                                onClick={() => setSocialTargetBlock(block.id)}
                              />
                              <Separator orientation="vertical" className="h-5 mx-1" />
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => onRewriteBlock?.(block.id)}
                                  >
                                    <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>AI Rewrite</TooltipContent>
                              </Tooltip>
                              <Separator orientation="vertical" className="h-5 mx-1" />
                              <Toggle
                                size="sm"
                                pressed={isHtml}
                                onPressedChange={() => toggleHtmlMode(block.id)}
                                className="h-7 px-2 text-xs"
                              >
                                <Code className="h-3 w-3 mr-1" /> HTML
                              </Toggle>
                            </div>
                          </>
                        )}

                        {/* Content area */}
                        {isHtml || !editable ? (
                          <Textarea
                            value={block.body}
                            onChange={(e) =>
                              editable && updateBlock(block.id, { body: e.target.value })
                            }
                            readOnly={!editable}
                            className="min-h-[120px] font-mono text-xs"
                            placeholder="Enter HTML content..."
                          />
                        ) : (
                          <Textarea
                            value={block.body}
                            onChange={(e) =>
                              updateBlock(block.id, { body: e.target.value })
                            }
                            className="min-h-[120px] text-sm"
                            placeholder="Start writing..."
                          />
                        )}

                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>{wordCount} words</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}

          {/* Add block at end */}
          {editable && (
            <div className="flex justify-center pt-1">
              <Popover
                open={addBlockIndex === blocks.length}
                onOpenChange={(open) =>
                  setAddBlockIndex(open ? blocks.length : null)
                }
              >
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs">
                    <Plus className="h-3 w-3 mr-1" /> Add Block
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="center">
                  <p className="text-xs font-medium mb-2">Add Block</p>
                  <div className="space-y-0.5 max-h-48 overflow-y-auto">
                    {ALL_BLOCK_TYPES.map((bt) => (
                      <button
                        key={bt.type}
                        type="button"
                        className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-accent transition-colors"
                        onClick={() => handleAddBlock(bt.type, blocks.length)}
                      >
                        <span className="font-medium">{bt.type}</span>
                        <span className="text-muted-foreground ml-1">— {bt.description}</span>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}
        {/* Embed Social Post picker — appends an email-safe linked thumbnail
            card to the target block (email clients run no iframes/scripts) */}
        <EmbedSocialPostDialog
          open={socialTargetBlock !== null}
          onOpenChange={(open) => !open && setSocialTargetBlock(null)}
          onEmbed={(item) => {
            const target = blocks.find((b) => b.id === socialTargetBlock);
            setSocialTargetBlock(null);
            if (!target) return;
            const html = buildEmailSocialEmbedHtml(item);
            if (!html) return;
            updateBlock(target.id, { body: `${target.body.trimEnd()}\n${html}\n` });
            toast.success('Social post embedded', {
              description: `Added to "${target.title}" as a linked thumbnail (email-safe).`,
            });
          }}
        />
        </div>
      </div>
    </TooltipProvider>
  );
}

function ToolbarButton({
  icon: Icon,
  tooltip,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tooltip: string;
  onClick?: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClick}>
          <Icon className="h-3.5 w-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent className="text-xs">{tooltip}</TooltipContent>
    </Tooltip>
  );
}
