import React, { useState, useRef, useCallback } from 'react';
import { Button } from './button';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { Upload, X, User } from 'lucide-react';
import { validateImage, formatFileSize, createImagePreview, cleanupImagePreview } from '@/lib/imageUtils';

interface ImageUploadProps {
  currentImageUrl?: string;
  onImageSelect: (file: File) => void;
  onImageRemove?: () => void;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ImageUpload({
  currentImageUrl,
  onImageSelect,
  onImageRemove,
  disabled = false,
  className = '',
  size = 'md'
}: ImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  const handleFileSelect = useCallback((file: File) => {
    setError(null);

    // Validate file
    const validation = validateImage(file);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    // Create preview
    const preview = createImagePreview(file);
    setPreviewUrl(preview);

    // Call parent handler
    onImageSelect(file);
  }, [onImageSelect]);

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleRemove = () => {
    if (previewUrl) {
      cleanupImagePreview(previewUrl);
      setPreviewUrl(null);
    }
    setError(null);
    if (onImageRemove) {
      onImageRemove();
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const displayImage = previewUrl || currentImageUrl;

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* Image Preview */}
      <div className="relative">
        <Avatar className={`${sizeClasses[size]} cursor-pointer transition-all duration-200 hover:opacity-80`}>
          <AvatarImage 
            src={displayImage || ''} 
            alt="Profile picture"
            className="object-cover"
          />
          <AvatarFallback className="bg-muted">
            <User className="w-1/2 h-1/2 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>

        {/* Remove button */}
        {displayImage && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0"
            onClick={handleRemove}
            disabled={disabled}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-4 text-center transition-all duration-200
          ${isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary hover:bg-primary/5'}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />
        
        <div className="flex flex-col items-center gap-2">
          <Upload className="w-6 h-6 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">
              {displayImage ? 'Change photo' : 'Upload photo'}
            </p>
            <p className="text-xs text-muted-foreground">
              PNG, JPG up to 2MB
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}

      {/* File Info */}
      {previewUrl && (
        <div className="text-xs text-muted-foreground text-center">
          <p>Preview ready</p>
        </div>
      )}
    </div>
  );
} 