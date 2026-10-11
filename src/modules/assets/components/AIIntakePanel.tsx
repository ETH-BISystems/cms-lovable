/**
 * AIIntakePanel Component
 *
 * Panel for reviewing and editing AI-generated suggestions.
 * Shows:
 * - AI suggestions (description, alt text, title, filename, tags, taxonomy)
 * - Editable fields to modify suggestions
 * - Approve/Reject buttons
 *
 * When mounted, if the asset has no aiSuggestions, startAIIntake is called
 * automatically. Once the Firestore document updates with suggestions, they
 * are loaded into the editable form. On approval, completeAIIntake is called
 * with the correct field mapping (seoFilename → filename).
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Sparkles, Check, X, RefreshCw } from 'lucide-react';
import { TagsInput } from './TagsInput';
import { TaxonomyPicker } from './TaxonomyPicker';
import { SEOScoreIndicator } from './SEOScoreIndicator';
import { useAIIntake } from '../hooks/useAIIntake';
import { calculateSEOScore } from '../services/aiService';
import type { AssetDocument, AISuggestions, AssetTaxonomy } from '../types';

export interface AIIntakePanelProps {
  asset: AssetDocument;
  onComplete: () => void;
  onCancel: () => void;
}

export function AIIntakePanel({ asset, onComplete, onCancel }: AIIntakePanelProps) {
  const { intakeState, startIntake, completeIntake } = useAIIntake();

  // Editable AI suggestions
  const [suggestions, setSuggestions] = useState<AISuggestions | null>(null);
  const [seoScore, setSeoScore] = useState(0);

  // Track whether we've already kicked off startIntake for this asset
  const startedIntakeRef = useRef<string | null>(null);

  // Load AI suggestions from asset or start intake
  useEffect(() => {
    if (asset.aiSuggestions) {
      setSuggestions(asset.aiSuggestions);
      setSeoScore(
        calculateSEOScore(
          asset.aiSuggestions.seoFilename,
          asset.aiSuggestions.altText,
          asset.aiSuggestions.titleAttribute
        )
      );
      // Reset the ref so a future mount for the same asset won't skip
      startedIntakeRef.current = null;
    } else if (startedIntakeRef.current !== asset.id) {
      // No suggestions yet — kick off startAIIntake (once per asset)
      startedIntakeRef.current = asset.id;
      startIntake({ assetId: asset.id });
    }
  }, [asset, asset.aiSuggestions, startIntake]);

  // Update SEO score when suggestions change
  useEffect(() => {
    if (suggestions) {
      setSeoScore(
        calculateSEOScore(
          suggestions.seoFilename,
          suggestions.altText,
          suggestions.titleAttribute
        )
      );
    }
  }, [suggestions]);

  const handleRetry = () => {
    // Allow re-triggering startIntake after a failure
    startedIntakeRef.current = null;
    startIntake({ assetId: asset.id });
  };

  const handleApprove = async () => {
    if (!suggestions) return;

    // Map seoFilename → filename for the backend CompleteAIIntakeInput contract
    await completeIntake({
      assetId: asset.id,
      approvedData: {
        description: suggestions.description,
        altText: suggestions.altText,
        titleAttribute: suggestions.titleAttribute,
        filename: suggestions.seoFilename,
        tags: suggestions.tags,
        taxonomy: suggestions.taxonomy,
      },
    });

    onComplete();
  };

  // Loading AI suggestions
  if (intakeState.loading) {
    return (
      <Card>
        <CardContent className="flex h-64 items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Analyzing image with AI...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state — with retry button
  if (intakeState.error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertDescription>{intakeState.error.message}</AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onCancel}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button variant="outline" onClick={handleRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // No suggestions loaded yet
  if (!suggestions) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Suggestions
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* SEO Score Preview */}
        <div className="rounded-lg bg-muted p-4">
          <Label>SEO Score Preview</Label>
          <div className="mt-2">
            <SEOScoreIndicator score={seoScore} />
          </div>
        </div>

        {/* Filename */}
        <div className="space-y-2">
          <Label>Filename</Label>
          <Input
            value={suggestions.seoFilename}
            onChange={(e) =>
              setSuggestions({ ...suggestions, seoFilename: e.target.value })
            }
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            value={suggestions.description}
            onChange={(e) =>
              setSuggestions({ ...suggestions, description: e.target.value })
            }
            rows={3}
          />
        </div>

        {/* Alt Text */}
        <div className="space-y-2">
          <Label>Alt Text</Label>
          <Textarea
            value={suggestions.altText}
            onChange={(e) =>
              setSuggestions({ ...suggestions, altText: e.target.value })
            }
            rows={2}
          />
        </div>

        {/* Title Attribute */}
        <div className="space-y-2">
          <Label>Title Attribute</Label>
          <Input
            value={suggestions.titleAttribute}
            onChange={(e) =>
              setSuggestions({ ...suggestions, titleAttribute: e.target.value })
            }
          />
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label>Tags</Label>
          <TagsInput
            tags={suggestions.tags}
            onChange={(tags) => setSuggestions({ ...suggestions, tags })}
          />
        </div>

        {/* Taxonomy */}
        <div className="space-y-2">
          <Label>Taxonomy</Label>
          <TaxonomyPicker
            taxonomy={suggestions.taxonomy as import('../types').AssetTaxonomy}
            onChange={(taxonomy) => setSuggestions({ ...suggestions, taxonomy })}
          />
        </div>
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel} disabled={intakeState.loading}>
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button onClick={handleApprove} disabled={intakeState.loading}>
          <Check className="mr-2 h-4 w-4" />
          Approve & Activate
        </Button>
      </CardFooter>
    </Card>
  );
}
