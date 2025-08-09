import React, { useState, useEffect } from 'react';
import { CyberNavigation } from '@/components/CyberNavigation';
import { FloatingWarningIcon } from '@/components/FloatingWarningIcon';
import { PasswordManager } from '@/components/PasswordManager';
import { ChangeMasterPasswordDialog } from '@/components/ChangeMasterPasswordDialog';
import { MasterPasswordVerification } from '@/components/MasterPasswordVerification';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { 
  Shield, 
  Lock, 
  Key, 
  Settings,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  Plus,
  Search,
  Edit,
  Copy,
  Zap,
  User,
  Link,
  FileText,
  Globe,
  Database,
  Fingerprint,
  Smartphone,
  Monitor,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function SecuritySettings() {
  const { wallet } = useWallet();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [isMasterPasswordVerified, setIsMasterPasswordVerified] = useState(false);
  const [showMasterPasswordDialog, setShowMasterPasswordDialog] = useState(false);
  const [requireMasterPassword, setRequireMasterPassword] = useState(true);

  // Security status states
  const [securityStatus, setSecurityStatus] = useState({
    walletConnected: false,
    twoFactorEnabled: false,
    biometricEnabled: false,
    deviceTrusted: false,
    lastLogin: new Date(),
    securityScore: 85
  });

  // Device management states
  const [trustedDevices, setTrustedDevices] = useState([
    {
      id: 1,
      name: 'MacBook Pro',
      type: 'laptop',
      lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000),
      location: 'San Francisco, CA',
      ip: '192.168.1.100',
      trusted: true
    },
    {
      id: 2,
      name: 'iPhone 15',
      type: 'mobile',
      lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000),
      location: 'San Francisco, CA',
      ip: '192.168.1.101',
      trusted: true
    }
  ]);

  // Security logs states
  const [securityLogs, setSecurityLogs] = useState([
    {
      id: 1,
      event: 'Login successful',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      device: 'MacBook Pro',
      location: 'San Francisco, CA',
      ip: '192.168.1.100',
      severity: 'info'
    },
    {
      id: 2,
      event: 'Password changed',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      device: 'iPhone 15',
      location: 'San Francisco, CA',
      ip: '192.168.1.101',
      severity: 'warning'
    },
    {
      id: 3,
      event: 'New device login',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      device: 'Unknown Device',
      location: 'New York, NY',
      ip: '203.0.113.1',
      severity: 'alert'
    }
  ]);

  useEffect(() => {
    if (wallet) {
      setSecurityStatus(prev => ({
        ...prev,
        walletConnected: true
      }));
    }
  }, [wallet]);

  // Load master password requirement setting from localStorage
  useEffect(() => {
    const savedRequirement = localStorage.getItem('fraudguard-require-master-password');
    if (savedRequirement !== null) {
      setRequireMasterPassword(JSON.parse(savedRequirement));
    }
  }, []);

  // Check if master password verification is needed when component mounts
  useEffect(() => {
    if (isAuthenticated && !isMasterPasswordVerified && requireMasterPassword) {
      setShowMasterPasswordDialog(true);
    }
  }, [isAuthenticated, isMasterPasswordVerified, requireMasterPassword]);

  const handleMasterPasswordSuccess = () => {
    setIsMasterPasswordVerified(true);
    setShowMasterPasswordDialog(false);
  };

  const handleMasterPasswordClose = () => {
    setShowMasterPasswordDialog(false);
  };

  const handleMasterPasswordToggle = (checked: boolean) => {
    setRequireMasterPassword(checked);
    localStorage.setItem('fraudguard-require-master-password', JSON.stringify(checked));
    
    // If turning off master password requirement, automatically verify
    if (!checked) {
      setIsMasterPasswordVerified(true);
    }
    
    // Show toast notification
    toast({
      title: checked ? "🔐 Master Password Required" : "🔓 Master Password Optional",
      description: checked 
        ? "Master password verification is now required to access security settings."
        : "Master password verification is now optional for security settings.",
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'info':
        return 'text-blue-600 bg-blue-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      case 'alert':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'laptop':
        return <Monitor className="h-4 w-4" />;
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'desktop':
        return <Monitor className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  const revokeDevice = (deviceId: number) => {
    setTrustedDevices(prev => prev.filter(device => device.id !== deviceId));
  };

  const toggleTwoFactor = () => {
    setSecurityStatus(prev => ({
      ...prev,
      twoFactorEnabled: !prev.twoFactorEnabled
    }));
  };

  const toggleBiometric = () => {
    setSecurityStatus(prev => ({
      ...prev,
      biometricEnabled: !prev.biometricEnabled
    }));
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        <CyberNavigation />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Lock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
            <p className="text-gray-500">Please connect your wallet to access security settings</p>
          </div>
        </div>
      </div>
    );
  }

  // Show master password verification dialog if not verified and required
  if (!isMasterPasswordVerified && requireMasterPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        <CyberNavigation />
        <FloatingWarningIcon />
        
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Security Settings</h1>
            <p className="text-gray-300">Manage your account security and privacy settings</p>
          </div>

          <Card className="bg-gray-800/50 border-gray-700 max-w-md mx-auto">
            <div className="p-6 text-center">
              <Lock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-white mb-2">Master Password Required</h3>
              <p className="text-gray-400 mb-4">
                To access security settings, please verify your master password.
              </p>
              <Button 
                onClick={() => setShowMasterPasswordDialog(true)}
                className="w-full"
              >
                <Lock className="h-4 w-4 mr-2" />
                Enter Master Password
              </Button>
            </div>
          </Card>
        </div>

        <MasterPasswordVerification
          isOpen={showMasterPasswordDialog}
          onClose={handleMasterPasswordClose}
          onSuccess={handleMasterPasswordSuccess}
          title="Master Password Required"
          description="Please enter your master password to access security settings."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <CyberNavigation />
      <FloatingWarningIcon />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Security Settings</h1>
          <p className="text-gray-300">Manage your account security and privacy settings</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-gray-800/50">
            <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600">
              <Shield className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="passwords" className="data-[state=active]:bg-purple-600">
              <Key className="h-4 w-4 mr-2" />
              Password Manager
            </TabsTrigger>
            <TabsTrigger value="devices" className="data-[state=active]:bg-purple-600">
              <Monitor className="h-4 w-4 mr-2" />
              Devices
            </TabsTrigger>
            <TabsTrigger value="logs" className="data-[state=active]:bg-purple-600">
              <FileText className="h-4 w-4 mr-2" />
              Security Logs
            </TabsTrigger>
            <TabsTrigger value="advanced" className="data-[state=active]:bg-purple-600">
              <Settings className="h-4 w-4 mr-2" />
              Advanced
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Security Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gray-800/50 border-gray-700">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Shield className="h-8 w-8 text-green-500" />
                    <Badge variant="outline" className="text-green-500 border-green-500">
                      {securityStatus.securityScore}/100
                    </Badge>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Security Score</h3>
                  <p className="text-gray-400 text-sm">Your account security rating</p>
                </div>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Lock className="h-8 w-8 text-blue-500" />
                    <Badge variant={securityStatus.walletConnected ? "default" : "destructive"}>
                      {securityStatus.walletConnected ? "Connected" : "Disconnected"}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Wallet Status</h3>
                  <p className="text-gray-400 text-sm">Blockchain wallet connection</p>
                </div>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Fingerprint className="h-8 w-8 text-purple-500" />
                    <Badge variant={securityStatus.twoFactorEnabled ? "default" : "secondary"}>
                      {securityStatus.twoFactorEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">2FA Status</h3>
                  <p className="text-gray-400 text-sm">Two-factor authentication</p>
                </div>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Database className="h-8 w-8 text-orange-500" />
                    <Badge variant={securityStatus.biometricEnabled ? "default" : "secondary"}>
                      {securityStatus.biometricEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Biometric</h3>
                  <p className="text-gray-400 text-sm">Biometric authentication</p>
                </div>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="bg-gray-800/50 border-gray-700">
              <div className="p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    onClick={toggleTwoFactor}
                    variant={securityStatus.twoFactorEnabled ? "destructive" : "default"}
                    className="w-full"
                  >
                    <Fingerprint className="h-4 w-4 mr-2" />
                    {securityStatus.twoFactorEnabled ? "Disable 2FA" : "Enable 2FA"}
                  </Button>
                  
                  <Button 
                    onClick={toggleBiometric}
                    variant={securityStatus.biometricEnabled ? "destructive" : "default"}
                    className="w-full"
                  >
                    <Smartphone className="h-4 w-4 mr-2" />
                    {securityStatus.biometricEnabled ? "Disable Biometric" : "Enable Biometric"}
                  </Button>
                  
                  <Button variant="outline" className="w-full">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Security
                  </Button>
                </div>
              </div>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-gray-800/50 border-gray-700">
              <div className="p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Recent Security Activity</h3>
                <div className="space-y-3">
                  {securityLogs.slice(0, 3).map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${getSeverityColor(log.severity)}`}>
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{log.event}</p>
                          <p className="text-gray-400 text-sm">{log.device} • {log.location}</p>
                        </div>
                      </div>
                      <span className="text-gray-400 text-sm">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="passwords" className="space-y-6">
            <Card className="bg-gray-800/50 border-gray-700">
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-white mb-2">Password Manager</h3>
                  <p className="text-gray-400">Securely manage your passwords with Walrus & Seal encryption</p>
                </div>
                <PasswordManager />
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="devices" className="space-y-6">
            <Card className="bg-gray-800/50 border-gray-700">
              <div className="p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Trusted Devices</h3>
                <div className="space-y-4">
                  {trustedDevices.map((device) => (
                    <div key={device.id} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-gray-600 rounded-lg">
                          {getDeviceIcon(device.type)}
                        </div>
                        <div>
                          <h4 className="text-white font-medium">{device.name}</h4>
                          <p className="text-gray-400 text-sm">
                            {device.location} • {device.ip} • Last active: {device.lastActive.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-green-500 border-green-500">
                          Trusted
                        </Badge>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => revokeDevice(device.id)}
                        >
                          <WifiOff className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-6">
            <Card className="bg-gray-800/50 border-gray-700">
              <div className="p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Security Logs</h3>
                <div className="space-y-3">
                  {securityLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${getSeverityColor(log.severity)}`}>
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{log.event}</p>
                          <p className="text-gray-400 text-sm">{log.device} • {log.location} • {log.ip}</p>
                        </div>
                      </div>
                      <span className="text-gray-400 text-sm">
                        {log.timestamp.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            <Card className="bg-gray-800/50 border-gray-700">
              <div className="p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Advanced Security Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                    <div>
                      <h4 className="text-white font-medium">Master Password Requirement</h4>
                      <p className="text-gray-400 text-sm">Require master password verification to access security settings</p>
                    </div>
                    <Switch
                      checked={requireMasterPassword}
                      onCheckedChange={handleMasterPasswordToggle}
                      className="data-[state=checked]:bg-purple-600"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                    <div>
                      <h4 className="text-white font-medium">Master Password Management</h4>
                      <p className="text-gray-400 text-sm">Change your master password to secure your password vault</p>
                    </div>
                    <ChangeMasterPasswordDialog />
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                    <div>
                      <h4 className="text-white font-medium">Session Timeout</h4>
                      <p className="text-gray-400 text-sm">Automatically log out after inactivity</p>
                    </div>
                    <Button variant="outline">Configure</Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                    <div>
                      <h4 className="text-white font-medium">IP Whitelist</h4>
                      <p className="text-gray-400 text-sm">Restrict access to specific IP addresses</p>
                    </div>
                    <Button variant="outline">Manage</Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                    <div>
                      <h4 className="text-white font-medium">Security Notifications</h4>
                      <p className="text-gray-400 text-sm">Get alerts for suspicious activity</p>
                    </div>
                    <Button variant="outline">Settings</Button>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
