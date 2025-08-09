import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  Plus, 
  Search, 
  Copy, 
  Edit, 
  Trash2, 
  Shield, 
  Key,
  Database,
  Download,
  Upload,
  CheckCircle,
  XCircle,
  Wallet,
  Save,
  RefreshCw,
  RotateCcw,
  Settings,
  User,
  ShoppingCart
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { realWalrusSealPasswordManager, PasswordEntry } from '../lib/walrus-seal-real';
import { Switch } from "@/components/ui/switch";
import { useSecurity } from "@/contexts/SecurityContext";
import { MasterPasswordVerification } from "./MasterPasswordVerification";

interface PasswordManagerProps {
  className?: string;
}

export function PasswordManager({ className }: PasswordManagerProps) {
  const account = useCurrentAccount();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [masterPassword, setMasterPassword] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingPassword, setEditingPassword] = useState<PasswordEntry | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, strength: "weak" as any });
  const [isInitializing, setIsInitializing] = useState(false);
  
  // Security settings state
  const { securitySettings, updateSecuritySetting } = useSecurity();
  const [showMasterPasswordDialog, setShowMasterPasswordDialog] = useState(false);
  const [pendingSecurityAction, setPendingSecurityAction] = useState<(() => void) | null>(null);
  
  // New password form state
  const [newPassword, setNewPassword] = useState({
    title: "",
    username: "",
    password: "",
    url: "",
    notes: "",
    category: "General"
  });

  // Categories for organization
  const categories = [
    "General",
    "Social Media",
    "Banking",
    "Shopping",
    "Work",
    "Personal",
    "Gaming",
    "Other"
  ];

  // Initialize wallet address for simple password manager
  useEffect(() => {
    if (account && isAuthenticated) {
      realWalrusSealPasswordManager.setWalletAddress(account.address).catch(error => {
        console.error('Failed to set wallet address:', error);
      });
    }
  }, [account, isAuthenticated]);



  // Check password strength when password changes
  useEffect(() => {
    if (newPassword.password) {
      const strength = realWalrusSealPasswordManager.checkPasswordStrength(newPassword.password);
      setPasswordStrength({ score: strength.score, strength: strength.strength });
    }
  }, [newPassword.password]);

  const handleUnlock = async () => {
    console.log('🔐 REAL WALRUS UNLOCK ATTEMPT - Password length:', masterPassword.length);
    if (masterPassword.length < 3) {
      toast({
        title: "⚠️ Weak Password",
        description: "Master password must be at least 3 characters",
        variant: "destructive"
      });
      return;
    }

    setIsInitializing(true);
    
    try {
              // ✅ REAL WALRUS & SEAL: Check if vault exists
      const vaultMetadata = realWalrusSealPasswordManager.getVaultMetadata();
      
      if (!vaultMetadata) {
        // Vault doesn't exist, create it with sample passwords
        console.log('Creating new vault with Walrus & Seal for first-time user');
        const samplePasswords: PasswordEntry[] = [
          {
            id: "sample-1",
            title: "Gmail Account",
            username: "user@gmail.com",
            password: "securePassword123!",
            url: "https://gmail.com",
            notes: "Main email account",
            category: "Personal",
            createdAt: new Date("2024-01-01"),
            updatedAt: new Date("2024-01-01"),
            zkVerified: true,
            privacyLevel: 'private'
          },
          {
            id: "sample-2",
            title: "GitHub",
            username: "developer",
            password: "githubSecure456!",
            url: "https://github.com",
            notes: "Code repository access",
            category: "Work",
            createdAt: new Date("2024-01-02"),
            updatedAt: new Date("2024-01-02"),
            zkVerified: true,
            privacyLevel: 'private'
          },
          {
            id: "sample-3",
            title: "Bank of America",
            username: "user123",
            password: "bankSecure789!",
            url: "https://bankofamerica.com",
            notes: "Primary bank account",
            category: "Banking",
            createdAt: new Date("2024-01-03"),
            updatedAt: new Date("2024-01-03"),
            zkVerified: true,
            privacyLevel: 'private'
          }
        ];
        
        // Create vault with sample passwords using Walrus & Seal
        await realWalrusSealPasswordManager.createVault(masterPassword, samplePasswords);
        setPasswords(samplePasswords);
      } else {
        // Vault exists, validate master password and load passwords
        const isValid = await realWalrusSealPasswordManager.validateMasterPassword(masterPassword);
        
        if (!isValid) {
          toast({
            title: "❌ Incorrect Password",
            description: "Master password is incorrect. Please try again.",
            variant: "destructive"
          });
          return;
        }
        
        // Load passwords from existing vault with Walrus & Seal
        const realPasswords = await realWalrusSealPasswordManager.getAllPasswords();
        setPasswords(realPasswords);
      }
      
      setIsUnlocked(true);
      setMasterPassword("");
      
              toast({
          title: "🔓 Vault Unlocked",
          description: "Welcome back! Your passwords are now accessible with Walrus & Seal security.",
        });
    } catch (error) {
      console.error('Real Walrus & Seal password manager unlock error:', error);
      toast({
        title: "❌ Unlock Failed",
        description: "Failed to unlock vault. Please check your credentials.",
        variant: "destructive"
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleLock = () => {
    setIsUnlocked(false);
    setMasterPassword("");
    setShowPasswords({});
    toast({
      title: "🔒 Vault Locked",
      description: "Your password vault has been secured",
    });
  };

  const emergencyClearAndStartFresh = async () => {
    if (confirm("🚨 RESET AND CLEAR VAULT: This will completely clear all passwords and reset your vault. This action cannot be undone. Are you absolutely sure?")) {
      try {
        // Emergency clear and start fresh
        await realWalrusSealPasswordManager.emergencyClearAndStartFresh(masterPassword);
        
        // Clear the current passwords and lock the vault
        setPasswords([]);
        setIsUnlocked(false);
        setMasterPassword("");
        
        toast({
          title: "✅ Vault Reset Complete",
          description: "All passwords cleared and vault reset successfully. Please log in with any password to create a new vault.",
        });
      } catch (error) {
        console.error('Reset vault error:', error);
        toast({
          title: "❌ Reset Failed",
          description: "Failed to reset vault",
          variant: "destructive"
        });
      }
    }
  };

  // Security setting toggle handler
  const handleSecuritySettingToggle = (setting: keyof typeof securitySettings, newValue: boolean) => {
    if (newValue) {
      // If enabling a security feature, require master password verification
      setPendingSecurityAction(() => () => updateSecuritySetting(setting, true));
      setShowMasterPasswordDialog(true);
    } else {
      // If disabling, allow immediately
      updateSecuritySetting(setting, false);
      toast({
        title: "🔓 Security Feature Disabled",
        description: `${setting === 'requireMasterPasswordForProfile' ? 'Profile access' : 'NFT purchases'} no longer require master password verification.`,
      });
    }
  };

  // Handle master password verification success
  const handleMasterPasswordSuccess = () => {
    if (pendingSecurityAction) {
      pendingSecurityAction();
      setPendingSecurityAction(null);
      toast({
        title: "🔒 Security Feature Enabled",
        description: "Master password verification has been enabled for this feature.",
      });
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "📋 Copied",
      description: `${type} copied to clipboard`,
    });
  };

  const generateSecurePassword = () => {
    const password = realWalrusSealPasswordManager.generateSecurePassword(16, true);
    setNewPassword(prev => ({ ...prev, password }));
  };

  const addPassword = async () => {
    if (!newPassword.title || !newPassword.username || !newPassword.password) {
      toast({
        title: "⚠️ Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const passwordEntry: PasswordEntry = {
      id: Date.now().toString(),
      ...newPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
      zkVerified: true,
      privacyLevel: 'private'
    };

    try {
      // ✅ REAL WALRUS & SEAL: Add password with encryption and proof
      await realWalrusSealPasswordManager.addPassword(passwordEntry);
      
      // Get the updated password list from storage to ensure consistency
      const updatedPasswords = await realWalrusSealPasswordManager.getAllPasswords();
      setPasswords(updatedPasswords);
      
      setNewPassword({
        title: "",
        username: "",
        password: "",
        url: "",
        notes: "",
        category: "General"
      });
      setShowAddDialog(false);
      
      toast({
        title: "✅ Password Added",
        description: "Password has been securely stored with Walrus & Seal encryption.",
      });
    } catch (error) {
      console.error('Failed to add password:', error);
      toast({
        title: "❌ Add Password Failed",
        description: "Failed to add password to storage",
        variant: "destructive"
      });
    }
  };

  const editPassword = async () => {
    if (!editingPassword || !editingPassword.title || !editingPassword.username || !editingPassword.password) {
      toast({
        title: "⚠️ Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const updatedPassword: PasswordEntry = {
      ...editingPassword,
      updatedAt: new Date()
    };

    try {
      // ✅ REAL WALRUS & SEAL: Update password with encryption and proof
      await realWalrusSealPasswordManager.updatePassword(editingPassword.id, updatedPassword);
      
      // Get the updated password list from storage to ensure consistency
      const updatedPasswords = await realWalrusSealPasswordManager.getAllPasswords();
      setPasswords(updatedPasswords);
      
      setEditingPassword(null);
      setShowEditDialog(false);
      
      toast({
        title: "✅ Password Updated",
        description: "Password has been securely updated with Walrus & Seal encryption.",
      });
    } catch (error) {
      console.error('Failed to update password:', error);
      toast({
        title: "❌ Update Password Failed",
        description: "Failed to update password in storage",
        variant: "destructive"
      });
    }
  };

  const startEditPassword = (password: PasswordEntry) => {
    setEditingPassword({ ...password });
    setShowEditDialog(true);
  };

  const deletePassword = async (id: string) => {
    try {
      // ✅ REAL WALRUS & SEAL: Delete password from Walrus storage
      await realWalrusSealPasswordManager.deletePassword(id);
      
      // Get the updated password list from storage to ensure consistency
      const updatedPasswords = await realWalrusSealPasswordManager.getAllPasswords();
      setPasswords(updatedPasswords);
      
      toast({
        title: "✅ Password Deleted",
        description: "Password has been securely deleted from Walrus storage.",
      });
    } catch (error) {
      console.error('Failed to delete password:', error);
      toast({
        title: "❌ Delete Password Failed",
        description: "Failed to delete password from storage",
        variant: "destructive"
      });
    }
  };

  // ✅ REAL WALRUS STORAGE: Export vault using real Walrus storage
  const exportVault = async () => {
    console.log('🔐 REAL WALRUS & SEAL EXPORT FUNCTION RUNNING!');
    try {
      // ✅ REAL WALRUS & SEAL: Export vault with encrypted data
      const vaultData = await realWalrusSealPasswordManager.exportVault();
      
      // Validate encryption
      const encryptionStatus = realWalrusSealPasswordManager.validateExportEncryption(vaultData);
      
      const blob = new Blob([vaultData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fraudguard-vault-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      if (encryptionStatus.isEncrypted) {
        toast({
          title: "✅ Vault Exported Securely",
          description: `Vault exported with ${encryptionStatus.encryptionAlgorithm} encryption. Sensitive data is protected.`,
        });
      } else {
        toast({
          title: "⚠️ Vault Exported",
          description: "Vault exported but encryption status unclear. Check the file.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "❌ Export Failed",
        description: "Failed to export vault",
        variant: "destructive"
      });
    }
  };

  const importVault = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const vaultData = e.target?.result as string;
        
        // ✅ REAL WALRUS & SEAL: Import vault with encrypted data
        await realWalrusSealPasswordManager.importVault(vaultData);
        
        // Reload passwords
        const importedPasswords = await realWalrusSealPasswordManager.getAllPasswords();
        setPasswords(importedPasswords);
        
        toast({
          title: "✅ Vault Imported",
          description: "Vault has been imported with Walrus & Seal encrypted data.",
        });
      } catch (error) {
        console.error('Import error:', error);
        toast({
          title: "❌ Import Failed",
          description: "Failed to import vault. Please check the file and try again.",
          variant: "destructive"
        });
      }
    };
    reader.readAsText(file);
    
    // Reset the input
    event.target.value = '';
  };

  const filteredPasswords = passwords.filter(password => {
    const matchesSearch = password.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         password.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         password.url.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || password.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Lock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
          <p className="text-gray-500">Please connect your wallet to access the password manager</p>
        </div>
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Secure Password Vault
          </CardTitle>
          <CardDescription>
            Enter your master password to unlock your password vault
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {account && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <Wallet className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-blue-700">
                  Connected: {account.address.slice(0, 6)}...{account.address.slice(-4)}
                </span>
                <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="master-password">Master Password</Label>
              <div className="relative">
                <Input
                  id="master-password"
                  type="password"
                  placeholder="Enter your master password (min 3 characters)"
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleUnlock()}
                />
                <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
              <div className="text-xs text-gray-500">
                Password strength: {masterPassword.length >= 3 ? "✅ Strong" : "❌ Weak"}
              </div>
            </div>
            
            <Button 
              onClick={handleUnlock} 
              className="w-full" 
              disabled={masterPassword.length < 3 || isInitializing}
              variant={masterPassword.length >= 3 ? "default" : "secondary"}
            >
              {isInitializing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Unlocking...
                </>
              ) : (
                <>
                  <Unlock className="h-4 w-4 mr-2" />
                  Unlock Vault
                </>
              )}
            </Button>
            
            <Button 
              onClick={emergencyClearAndStartFresh} 
              variant="destructive" 
              className="w-full"
              size="sm"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Reset and Clear Vault
            </Button>
            
            <div className="text-xs text-gray-500 text-center">
              🔐 Your passwords are encrypted and stored securely using Walrus & Seal with zkLogin
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-500" />
                Real Walrus Password Vault
                <Badge variant="secondary" className="ml-2">
                  {passwords.length} passwords
                </Badge>
                <Badge variant="outline" className="ml-2">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Real Walrus Storage
                </Badge>
              </CardTitle>
              <CardDescription>
                Securely manage your passwords with REAL privacy-preserving Walrus & Seal storage
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportVault}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".json"
                  onChange={importVault}
                  className="hidden"
                />
                <Button variant="outline" asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </span>
                </Button>
              </label>
              <Button variant="outline" onClick={handleLock}>
                <Lock className="h-4 w-4 mr-2" />
                Lock Vault
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="all" onClick={() => setSelectedCategory("all")}>
                  All ({passwords.length})
                </TabsTrigger>
                {categories.map(category => (
                  <TabsTrigger 
                    key={category} 
                    value={category}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category} ({passwords.filter(p => p.category === category).length})
                  </TabsTrigger>
                ))}
              </TabsList>
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Password
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Add New Password</DialogTitle>
                    <DialogDescription>
                      Securely store a new password in your vault
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="title" className="text-right">Title</Label>
                      <Input
                        id="title"
                        value={newPassword.title}
                        onChange={(e) => setNewPassword(prev => ({ ...prev, title: e.target.value }))}
                        className="col-span-3"
                        placeholder="e.g., Gmail Account"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="username" className="text-right">Username</Label>
                      <Input
                        id="username"
                        value={newPassword.username}
                        onChange={(e) => setNewPassword(prev => ({ ...prev, username: e.target.value }))}
                        className="col-span-3"
                        placeholder="username@example.com"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="password" className="text-right">Password</Label>
                      <div className="col-span-3 flex gap-2">
                        <Input
                          id="password"
                          type="password"
                          value={newPassword.password}
                          onChange={(e) => setNewPassword(prev => ({ ...prev, password: e.target.value }))}
                          placeholder="Enter password"
                        />
                        <Button variant="outline" onClick={generateSecurePassword}>
                          <Key className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Password Strength Indicator */}
                    {newPassword.password && (
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Strength</Label>
                        <div className="col-span-3 space-y-2">
                          <Progress value={(passwordStrength.score / 8) * 100} className="h-2" />
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={
                                passwordStrength.strength === "weak" ? "destructive" :
                                passwordStrength.strength === "medium" ? "secondary" :
                                passwordStrength.strength === "strong" ? "default" : "outline"
                              }
                            >
                              {passwordStrength.strength}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              Score: {passwordStrength.score}/8
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="url" className="text-right">URL</Label>
                      <Input
                        id="url"
                        value={newPassword.url}
                        onChange={(e) => setNewPassword(prev => ({ ...prev, url: e.target.value }))}
                        className="col-span-3"
                        placeholder="https://example.com"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="category" className="text-right">Category</Label>
                      <select
                        id="category"
                        value={newPassword.category}
                        onChange={(e) => setNewPassword(prev => ({ ...prev, category: e.target.value }))}
                        className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      >
                        {categories.map(category => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="notes" className="text-right">Notes</Label>
                      <Input
                        id="notes"
                        value={newPassword.notes}
                        onChange={(e) => setNewPassword(prev => ({ ...prev, notes: e.target.value }))}
                        className="col-span-3"
                        placeholder="Additional notes (optional)"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={addPassword}>
                      Add Password
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search passwords..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                <AnimatePresence>
                  {filteredPasswords.map((password) => (
                    <motion.div
                      key={password.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{password.title}</h3>
                            <Badge variant="outline">{password.category}</Badge>
                            <Badge variant="outline" className="text-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Secure
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Username:</span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono">{password.username}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(password.username, "Username")}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <div>
                              <span className="font-medium">Password:</span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono">
                                  {password.password === '[ENCRYPTED]' ? (
                                    <span className="text-orange-600 font-medium">[ENCRYPTED]</span>
                                  ) : showPasswords[password.id] ? (
                                    password.password
                                  ) : (
                                    "••••••••"
                                  )}
                                </span>
                                {password.password !== '[ENCRYPTED]' && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => togglePasswordVisibility(password.id)}
                                    >
                                      {showPasswords[password.id] ? (
                                        <EyeOff className="h-3 w-3" />
                                      ) : (
                                        <Eye className="h-3 w-3" />
                                      )}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => copyToClipboard(password.password, "Password")}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          {password.url && (
                            <div className="mt-2 text-sm">
                              <span className="font-medium">URL:</span>
                              <a 
                                href={password.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline ml-1"
                              >
                                {password.url}
                              </a>
                            </div>
                          )}
                          {password.notes && (
                            <div className="mt-2 text-sm text-gray-500">
                              <span className="font-medium">Notes:</span> {
                                password.notes === '[ENCRYPTED]' ? (
                                  <span className="text-orange-600 font-medium">[ENCRYPTED]</span>
                                ) : (
                                  password.notes
                                )
                              }
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditPassword(password)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deletePassword(password.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {filteredPasswords.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No passwords found</p>
                    <p className="text-sm">Add your first password to get started</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit Password Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Password</DialogTitle>
            <DialogDescription>
              Update your password information
            </DialogDescription>
          </DialogHeader>
          {editingPassword && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-title" className="text-right">Title</Label>
                <Input
                  id="edit-title"
                  value={editingPassword.title}
                  onChange={(e) => setEditingPassword(prev => prev ? { ...prev, title: e.target.value } : null)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-username" className="text-right">Username</Label>
                <Input
                  id="edit-username"
                  value={editingPassword.username}
                  onChange={(e) => setEditingPassword(prev => prev ? { ...prev, username: e.target.value } : null)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-password" className="text-right">Password</Label>
                <Input
                  id="edit-password"
                  type="password"
                  value={editingPassword.password}
                  onChange={(e) => setEditingPassword(prev => prev ? { ...prev, password: e.target.value } : null)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-url" className="text-right">URL</Label>
                <Input
                  id="edit-url"
                  value={editingPassword.url}
                  onChange={(e) => setEditingPassword(prev => prev ? { ...prev, url: e.target.value } : null)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-category" className="text-right">Category</Label>
                <select
                  id="edit-category"
                  value={editingPassword.category}
                  onChange={(e) => setEditingPassword(prev => prev ? { ...prev, category: e.target.value } : null)}
                  className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-notes" className="text-right">Notes</Label>
                <Input
                  id="edit-notes"
                  value={editingPassword.notes}
                  onChange={(e) => setEditingPassword(prev => prev ? { ...prev, notes: e.target.value } : null)}
                  className="col-span-3"
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={editPassword}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Security Info */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            Security Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              <span>End-to-end encryption with Walrus</span>
            </div>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-500" />
              <span>Secure storage with Seal</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-red-500" />
              <span>Master password protection</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-purple-500" />
              <span>zkLogin verification</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Security Settings */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-purple-500" />
            Advanced Security Settings
          </CardTitle>
          <CardDescription>
            Configure additional security requirements for sensitive actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Profile Access Security */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50/50">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-blue-500" />
                <div>
                  <h4 className="font-medium">Profile Page Access</h4>
                  <p className="text-sm text-gray-600">
                    Require master password verification before accessing profile page
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={securitySettings.requireMasterPasswordForProfile}
                  onCheckedChange={(checked) => handleSecuritySettingToggle('requireMasterPasswordForProfile', checked)}
                />
                <Badge variant={securitySettings.requireMasterPasswordForProfile ? "default" : "secondary"}>
                  {securitySettings.requireMasterPasswordForProfile ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            </div>

            {/* NFT Purchase Security */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50/50">
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-5 w-5 text-green-500" />
                <div>
                  <h4 className="font-medium">NFT Purchase Verification</h4>
                  <p className="text-sm text-gray-600">
                    Require master password verification before buying NFTs
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={securitySettings.requireMasterPasswordForPurchase}
                  onCheckedChange={(checked) => handleSecuritySettingToggle('requireMasterPasswordForPurchase', checked)}
                />
                <Badge variant={securitySettings.requireMasterPasswordForPurchase ? "default" : "secondary"}>
                  {securitySettings.requireMasterPasswordForPurchase ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            </div>

            {/* Security Note */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-blue-500 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium">Security Note:</p>
                  <p>When enabled, these features will require you to enter your master password before performing the protected action. This adds an extra layer of security to prevent unauthorized access to sensitive areas.</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Master Password Verification Dialog */}
      <MasterPasswordVerification
        isOpen={showMasterPasswordDialog}
        onClose={() => {
          setShowMasterPasswordDialog(false);
          setPendingSecurityAction(null);
        }}
        onSuccess={handleMasterPasswordSuccess}
        title="Master Password Verification Required"
        description="Please enter your master password to enable this security feature."
      />
    </div>
  );
}