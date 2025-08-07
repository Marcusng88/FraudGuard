import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  User, 
  Wallet, 
  Edit, 
  Shield,
  MapPin,
  Calendar
} from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useWallet } from '@/hooks/useWallet';
import { formatProfileCompletion, getProfileCompletionColor } from '@/lib/profile';

interface ProfileHeaderProps {
  onEditClick: () => void;
}

export function ProfileHeader({ onEditClick }: ProfileHeaderProps) {
  const { profile, loading } = useProfile();
  const { wallet } = useWallet();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card className="glass-panel p-6">
        <div className="animate-pulse">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-muted rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-6 bg-muted rounded w-1/3"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-4 bg-muted rounded w-1/4"></div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (!profile || !wallet?.address) {
    return null;
  }

  return (
    <Card className="glass-panel p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-6">
          {/* Avatar */}
          <div className="relative">
            <Avatar className="w-20 h-20">
              <AvatarImage src={profile.avatar_url} alt={profile.username || 'Profile'} />
              <AvatarFallback className="text-2xl bg-primary/10">
                {profile.username ? profile.username.slice(0, 2).toUpperCase() : wallet.address.slice(2, 4).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {profile.reputation_score > 0 && (
              <Badge className="absolute -bottom-2 -right-2 bg-green-500">
                <Shield className="w-3 h-3 mr-1" />
                {profile.reputation_score}
              </Badge>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-3xl font-bold text-foreground">
                {profile.username || 'Anonymous User'}
              </h1>
              <Button variant="outline" size="sm" onClick={onEditClick}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-muted-foreground mb-4 max-w-2xl">
                {profile.bio}
              </p>
            )}

            {/* Profile Details */}
            <div className="flex items-center gap-6 mb-4">
              <Badge variant="outline" className="flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                {formatAddress(wallet.address)}
              </Badge>

              {profile.location && (
                <Badge variant="outline" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {profile.location}
                </Badge>
              )}

              <Badge variant="outline" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Joined {formatDate(profile.created_at)}
              </Badge>

              {!profile.is_public && (
                <Badge variant="secondary">
                  Private Profile
                </Badge>
              )}
            </div>

            {/* Profile Completion */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  Profile Completion
                </span>
                <span className={`text-sm font-medium ${getProfileCompletionColor(profile.profile_completion)}`}>
                  {formatProfileCompletion(profile.profile_completion)}
                </span>
              </div>
              <Progress value={profile.profile_completion} className="h-2" />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
} 