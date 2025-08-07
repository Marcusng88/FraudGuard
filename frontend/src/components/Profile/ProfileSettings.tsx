import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  Shield, 
  AlertTriangle, 
  Bell,
  Eye,
  EyeOff,
  User,
  Lock,
  Globe
} from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';

export function ProfileSettings() {
  const { profile, updateProfile } = useProfile();
  const [isPublic, setIsPublic] = React.useState(profile?.is_public ?? true);

  const handlePrivacyChange = async (checked: boolean) => {
    if (!profile) return;

    try {
      await updateProfile({ is_public: checked });
      setIsPublic(checked);
    } catch (error) {
      console.error('Failed to update privacy settings:', error);
    }
  };

  const settingsSections = [
    {
      title: 'Profile Settings',
      icon: User,
      items: [
        {
          title: 'Edit Profile',
          description: 'Update your profile information and avatar',
          action: 'Edit',
          icon: User,
          onClick: () => {/* Will be handled by parent */}
        }
      ]
    },
    {
      title: 'Privacy & Security',
      icon: Shield,
      items: [
        {
          title: 'Public Profile',
          description: isPublic 
            ? 'Your profile is visible to other users' 
            : 'Your profile is private and only visible to you',
          action: 'switch',
          icon: isPublic ? Globe : Lock,
          value: isPublic,
          onChange: handlePrivacyChange
        },
        {
          title: 'Security Settings',
          description: 'Manage your account security preferences',
          action: 'Configure',
          icon: Shield,
          onClick: () => {/* TODO: Implement security settings */}
        }
      ]
    },
    {
      title: 'Notifications',
      icon: Bell,
      items: [
        {
          title: 'Email Notifications',
          description: 'Receive email updates about your account',
          action: 'switch',
          icon: Bell,
          value: true,
          onChange: () => {/* TODO: Implement email notifications */}
        },
        {
          title: 'Push Notifications',
          description: 'Receive push notifications in your browser',
          action: 'switch',
          icon: Bell,
          value: false,
          onChange: () => {/* TODO: Implement push notifications */}
        }
      ]
    },
    {
      title: 'Account',
      icon: Settings,
      items: [
        {
          title: 'Account Information',
          description: 'View and manage your account details',
          action: 'View',
          icon: User,
          onClick: () => {/* TODO: Implement account info */}
        },
        {
          title: 'Data Export',
          description: 'Export your account data',
          action: 'Export',
          icon: Settings,
          onClick: () => {/* TODO: Implement data export */}
        }
      ]
    }
  ];

  return (
    <Card className="glass-panel p-6">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-5 h-5 text-primary" />
        <h3 className="text-xl font-semibold text-foreground">Account Settings</h3>
      </div>

      <div className="space-y-6">
        {settingsSections.map((section, sectionIndex) => {
          const SectionIcon = section.icon;
          return (
            <div key={section.title}>
              <div className="flex items-center gap-3 mb-4">
                <SectionIcon className="w-5 h-5 text-muted-foreground" />
                <h4 className="font-semibold text-foreground">{section.title}</h4>
              </div>
              
              <div className="space-y-3">
                {section.items.map((item, itemIndex) => {
                  const ItemIcon = item.icon;
                  return (
                    <div key={item.title} className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-muted/20 rounded-full flex items-center justify-center">
                          <ItemIcon className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{item.title}</p>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {item.action === 'switch' ? (
                          <Switch
                            checked={item.value}
                            onCheckedChange={item.onChange}
                          />
                        ) : (
                          <Button variant="outline" size="sm" onClick={item.onClick}>
                            {item.action}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {sectionIndex < settingsSections.length - 1 && (
                <Separator className="my-6" />
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
} 