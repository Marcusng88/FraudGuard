import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { useWallet } from '@/hooks/useWallet';
import { Loader2 } from 'lucide-react';

const profileSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(30, 'Username must be less than 30 characters'),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileEditModal({ open, onOpenChange }: ProfileEditModalProps) {
  const { toast } = useToast();
  const { wallet } = useWallet();
  const { profile, updateProfile, uploadPicture, loading } = useProfile();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: profile?.username || '',
      bio: profile?.bio || '',
      email: profile?.email || '',
    },
  });

  // Update form values when profile changes
  useEffect(() => {
    if (profile) {
      form.reset({
        username: profile.username || '',
        bio: profile.bio || '',
        email: profile.email || '',
      });
    }
  }, [profile, form]);

  const onSubmit = async (data: ProfileFormData) => {
    try {
      let avatarUrl = profile?.avatar_url;

      // Upload image if selected
      if (selectedImage) {
        const uploadResult = await uploadPicture(selectedImage);
        avatarUrl = uploadResult.avatar_url;
      }

      // Update profile
      await updateProfile({
        ...data,
        avatar_url: avatarUrl,
      });

      toast({
        title: 'Profile updated successfully',
        description: 'Your profile has been updated.',
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error updating profile',
        description: error instanceof Error ? error.message : 'Failed to update profile',
        variant: 'destructive',
      });
    }
  };

  const handleImageSelect = (file: File) => {
    setSelectedImage(file);
  };

  const handleImageRemove = () => {
    setSelectedImage(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Profile Picture */}
            <div className="space-y-2">
              <FormLabel>Profile Picture</FormLabel>
              <ImageUpload
                currentImageUrl={profile?.avatar_url}
                onImageSelect={handleImageSelect}
                onImageRemove={handleImageRemove}
                size="lg"
              />
            </div>

            {/* Username */}
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Bio */}
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell us about yourself..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="Enter your email address" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 