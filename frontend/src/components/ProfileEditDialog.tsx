import React, { useState, useRef } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Upload, Camera, User, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProfileData {
  username?: string;
  bio?: string;
  avatar_url?: string;
  wallet_address: string;
}

interface ProfileEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  profileData: ProfileData;
  onSave: (updatedData: Partial<ProfileData>) => Promise<void>;
  isLoading?: boolean;
}

export function ProfileEditDialog({ 
  isOpen, 
  onClose, 
  profileData, 
  onSave, 
  isLoading = false 
}: ProfileEditDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    username: profileData.username || '',
    bio: profileData.bio || '',
    avatar_url: profileData.avatar_url || ''
  });
  
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File Type",
        description: "Please select an image file (JPG, PNG, GIF, etc.)",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      // For now, we'll create a local preview URL
      // In a real app, you'd upload to a service like Cloudinary, AWS S3, etc.
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setPreviewImage(result);
        setFormData(prev => ({
          ...prev,
          avatar_url: result // In production, this would be the uploaded image URL
        }));
      };
      reader.readAsDataURL(file);

      toast({
        title: "Image Uploaded",
        description: "Profile picture has been updated",
        variant: "default"
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setPreviewImage(null);
    setFormData(prev => ({
      ...prev,
      avatar_url: ''
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    try {
      // Save profile data to backend (excluding avatar_url)
      await onSave({
        username: formData.username,
        bio: formData.bio
      });
      
      // Save avatar to localStorage
      if (formData.avatar_url) {
        localStorage.setItem(`avatar_${profileData.wallet_address}`, formData.avatar_url);
      } else {
        localStorage.removeItem(`avatar_${profileData.wallet_address}`);
      }
      
      onClose();
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated",
        variant: "default"
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Save Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCancel = () => {
    // Reset form data to original values
    setFormData({
      username: profileData.username || '',
      bio: profileData.bio || '',
      avatar_url: profileData.avatar_url || ''
    });
    setPreviewImage(null);
    onClose();
  };

  const currentAvatarUrl = previewImage || formData.avatar_url;
  const displayInitials = formData.username 
    ? formData.username.slice(0, 2).toUpperCase()
    : profileData.wallet_address.slice(2, 4).toUpperCase();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information and customize how others see you on FraudGuard
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Avatar Section */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Profile Picture</Label>
            <Card className="p-6 bg-muted/20">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={currentAvatarUrl} alt="Profile" />
                    <AvatarFallback className="text-lg bg-primary/20">
                      {displayInitials}
                    </AvatarFallback>
                  </Avatar>
                  
                  {currentAvatarUrl && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={handleRemoveImage}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="hover:bg-primary/10"
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Upload Image
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Recommended: Square image, at least 200x200 pixels, max 5MB
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </Card>
          </div>

          {/* Username Section */}
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-medium">
              Display Name
            </Label>
            <Input
              id="username"
              placeholder="Enter your display name"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              maxLength={50}
              className="bg-background/50"
            />
            <p className="text-xs text-muted-foreground">
              This is how other users will see your name on the marketplace
            </p>
          </div>

          {/* Bio Section */}
          <div className="space-y-2">
            <Label htmlFor="bio" className="text-sm font-medium">
              Bio
            </Label>
            <Textarea
              id="bio"
              placeholder="Tell others about yourself..."
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              maxLength={500}
              rows={4}
              className="bg-background/50 resize-none"
            />
            <div className="flex justify-between">
              <p className="text-xs text-muted-foreground">
                Share your interests, expertise, or what makes you unique
              </p>
              <span className="text-xs text-muted-foreground">
                {formData.bio.length}/500
              </span>
            </div>
          </div>

          {/* Wallet Address (Read-only) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Wallet Address</Label>
            <Input
              value={profileData.wallet_address}
              readOnly
              className="bg-muted/20 text-muted-foreground cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">
              Your wallet address cannot be changed
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isLoading}
            className="min-w-[100px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
