import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { useProfile } from '@/hooks/useProfile';
import { formatProfileCompletion, getProfileCompletionColor, calculateProfileCompletion } from '@/lib/profile';
import { Loader2, Save, X, CheckCircle } from 'lucide-react';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileEditModal({ isOpen, onClose }: ProfileEditModalProps) {
  const { profile, loading, error, updateProfile, uploadPicture } = useProfile();
  const [formData, setFormData] = useState({
    username: '',
    bio: '',
    location: '',
    is_public: true,
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Initialize form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        username: profile.username || '',
        bio: profile.bio || '',
        location: profile.location || '',
        is_public: profile.is_public,
      });
    }
  }, [profile]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleImageSelect = (file: File) => {
    setSelectedImage(file);
  };

  const handleImageRemove = () => {
    setSelectedImage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Upload image first if selected
      let avatarUrl = profile?.avatar_url;
      if (selectedImage) {
        const uploadResult = await uploadPicture(selectedImage);
        avatarUrl = uploadResult.avatar_url;
      }

      // Update profile
      await updateProfile({
        ...formData,
        avatar_url: avatarUrl,
      });

      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        username: profile?.username || '',
        bio: profile?.bio || '',
        location: profile?.location || '',
        is_public: profile?.is_public || true,
      });
      setSelectedImage(null);
      setSubmitError(null);
      onClose();
    }
  };

  const isFormValid = formData.username.trim().length > 0;

  // Calculate current profile completion
  const currentCompletion = calculateProfileCompletion({
    ...profile,
    username: formData.username,
    bio: formData.bio,
    location: formData.location,
    avatar_url: selectedImage ? 'temp' : profile?.avatar_url,
  } as any);

  const completionFields = [
    { field: 'username', label: 'Username', value: formData.username, required: true },
    { field: 'bio', label: 'Bio', value: formData.bio, required: false },
    { field: 'location', label: 'Location', value: formData.location, required: false },
    { field: 'avatar', label: 'Profile Picture', value: selectedImage || profile?.avatar_url, required: false },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Edit Profile</span>
            <span className={`text-sm font-normal ${getProfileCompletionColor(currentCompletion)}`}>
              {formatProfileCompletion(currentCompletion)}
            </span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Completion Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Profile Completion</Label>
              <span className={`text-sm font-medium ${getProfileCompletionColor(currentCompletion)}`}>
                {Math.round(currentCompletion)}%
              </span>
            </div>
            <Progress value={currentCompletion} className="h-2" />
            <div className="grid grid-cols-2 gap-2 text-xs">
              {completionFields.map((field) => (
                <div key={field.field} className="flex items-center gap-2">
                  {field.value ? (
                    <CheckCircle className="w-3 h-3 text-green-500" />
                  ) : (
                    <div className="w-3 h-3 rounded-full border border-muted-foreground" />
                  )}
                  <span className={field.value ? 'text-foreground' : 'text-muted-foreground'}>
                    {field.label} {field.required && '*'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Profile Picture */}
          <div className="space-y-2">
            <Label>Profile Picture</Label>
            <ImageUpload
              currentImageUrl={profile?.avatar_url}
              onImageSelect={handleImageSelect}
              onImageRemove={handleImageRemove}
              disabled={isSubmitting}
              size="lg"
            />
            <p className="text-xs text-muted-foreground">
              Upload a profile picture (PNG, JPEG, max 2MB)
            </p>
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              placeholder="Enter your username"
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              placeholder="Tell us about yourself..."
              rows={3}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Share a bit about yourself with the community
            </p>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="Where are you located?"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Your general location (city, country, etc.)
            </p>
          </div>

          {/* Privacy Settings */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="is_public">Public Profile</Label>
              <Switch
                id="is_public"
                checked={formData.is_public}
                onCheckedChange={(checked) => handleInputChange('is_public', checked)}
                disabled={isSubmitting}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {formData.is_public 
                ? 'Your profile will be visible to other users'
                : 'Your profile will be private and only visible to you'
              }
            </p>
          </div>

          {/* Error Message */}
          {(error || submitError) && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">
                {submitError || error}
              </p>
            </div>
          )}

          {/* Form Actions */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 