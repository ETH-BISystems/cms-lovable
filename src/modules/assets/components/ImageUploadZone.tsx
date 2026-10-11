/**
 * ImageUploadZone Component
 *
 * Multi-source image upload component supporting:
 * - Drag and drop
 * - File picker
 * - URL input
 * - Multiple images
 */

import React, { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X, Upload, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';

export interface UploadedImage {
  id: string;
  dataUrl?: string;      // For local files
  url?: string;          // For URLs
  file?: File;           // Original file object
  name: string;
}

export interface ImageUploadZoneProps {
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

export function ImageUploadZone({
  images,
  onChange,
  maxImages = 4,
  disabled = false,
}: ImageUploadZoneProps) {
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (disabled || images.length >= maxImages) return;

      const files = Array.from(e.dataTransfer.files);
      const imageFiles = files.filter((file) => file.type.startsWith('image/'));

      const remaining = maxImages - images.length;
      const filesToAdd = imageFiles.slice(0, remaining);

      const newImages = await Promise.all(
        filesToAdd.map(async (file) => {
          const dataUrl = await readFileAsDataURL(file);
          return {
            id: `${Date.now()}-${Math.random()}`,
            dataUrl,
            file,
            name: file.name,
          };
        })
      );

      onChange([...images, ...newImages]);
    },
    [disabled, images, maxImages, onChange]
  );

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled || images.length >= maxImages) return;

      const files = Array.from(e.target.files || []);
      const remaining = maxImages - images.length;
      const filesToAdd = files.slice(0, remaining);

      const newImages = await Promise.all(
        filesToAdd.map(async (file) => {
          const dataUrl = await readFileAsDataURL(file);
          return {
            id: `${Date.now()}-${Math.random()}`,
            dataUrl,
            file,
            name: file.name,
          };
        })
      );

      onChange([...images, ...newImages]);
      e.target.value = ''; // Reset input
    },
    [disabled, images, maxImages, onChange]
  );

  const handleUrlAdd = useCallback(() => {
    if (!urlInput.trim()) return;

    setUrlError(null);

    // Basic URL validation
    try {
      new URL(urlInput);
    } catch {
      setUrlError('Invalid URL format');
      return;
    }

    if (images.length >= maxImages) {
      setUrlError(`Maximum ${maxImages} images allowed`);
      return;
    }

    const newImage: UploadedImage = {
      id: `${Date.now()}-${Math.random()}`,
      url: urlInput,
      name: new URL(urlInput).pathname.split('/').pop() || 'image',
    };

    onChange([...images, newImage]);
    setUrlInput('');
  }, [urlInput, images, maxImages, onChange]);

  const handleRemove = useCallback(
    (id: string) => {
      onChange(images.filter((img) => img.id !== id));
    },
    [images, onChange]
  );

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="upload" disabled={disabled}>
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <div
            className={`
              relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
              ${disabled || images.length >= maxImages ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="file-upload"
              multiple
              accept="image/*,.avif"
              onChange={handleFileInput}
              disabled={disabled || images.length >= maxImages}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="space-y-2">
              <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
              <div className="text-sm">
                <span className="font-semibold text-primary">Click to upload</span>
                {' or drag and drop'}
              </div>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, GIF, WebP, SVG up to 50MB
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="url" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url-input">Image URL</Label>
            <div className="flex gap-2">
              <Input
                id="url-input"
                type="url"
                placeholder="https://example.com/image.jpg"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUrlAdd()}
                disabled={disabled || images.length >= maxImages}
              />
              <Button
                onClick={handleUrlAdd}
                disabled={!urlInput.trim() || disabled || images.length >= maxImages}
              >
                Add
              </Button>
            </div>
            {urlError && (
              <Alert variant="destructive">
                <AlertDescription>{urlError}</AlertDescription>
              </Alert>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-semibold">
            Selected Images ({images.length}/{maxImages})
          </Label>
          <div className="grid grid-cols-2 gap-3">
            {images.map((image) => (
              <div
                key={image.id}
                className="relative group border rounded-lg overflow-hidden bg-muted"
              >
                <div className="aspect-video relative">
                  {image.dataUrl ? (
                    <img
                      src={image.dataUrl}
                      alt={image.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="p-2 bg-background">
                  <p className="text-xs truncate" title={image.name}>
                    {image.name}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemove(image.id)}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
