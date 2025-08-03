import React, { useState, useRef } from 'react';
import { CyberNavigation } from '@/components/CyberNavigation';
import { FloatingWarningIcon } from '@/components/FloatingWarningIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Upload, Image, Shield, Zap, AlertTriangle, CheckCircle } from 'lucide-react';

interface FormData {
  title: string;
  description: string;
  price: string;
  category: string;
  image: File | null;
  preview: string | null;
}

export default function CreateNft() {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    price: '',
    category: '',
    image: null,
    preview: null
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<{
    isSafe: boolean;
    confidence: number;
    warnings: string[];
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        image: file,
        preview: URL.createObjectURL(file)
      }));
      
      // Simulate AI analysis
      setTimeout(() => {
        const isSafe = Math.random() > 0.3; // 70% chance of being safe
        setAnalysisResult({
          isSafe,
          confidence: Math.floor(Math.random() * 40) + 60, // 60-100%
          warnings: isSafe ? [] : ['Potential copyright concerns detected', 'Similar images found in database']
        });
      }, 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.image) return;

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    // Here you would typically upload to your backend
    // const formDataToSend = new FormData();
    // formDataToSend.append('image', formData.image);
    // formDataToSend.append('metadata', JSON.stringify({
    //   title: formData.title,
    //   description: formData.description,
    //   price: formData.price,
    //   category: formData.category
    // }));
  };

  const categories = [
    'Digital Art', 'Photography', 'Music', 'Video', 'Collectibles', 'Gaming'
  ];

  return (
    <div className="min-h-screen bg-background relative">
      {/* Floating warning icon */}
      <FloatingWarningIcon />
      
      {/* Navigation */}
      <CyberNavigation />
      
      {/* Hero Section */}
      <section className="relative py-16 overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-primary/5 to-secondary/10" />
        
        {/* Floating orbs */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-accent/30 rounded-full blur-2xl animate-pulse-glow" />

        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--border)) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />

        <div className="relative z-10 container mx-auto px-6 text-center">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Main headline */}
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                Create
                <br />
                <span className="text-primary" style={{ textShadow: '0 0 5px hsl(var(--primary))' }}>
                  Your NFT
                </span>
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Upload your digital artwork with AI-powered fraud protection and verification.
              </p>
            </div>

            {/* Feature highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              {[
                {
                  icon: Shield,
                  title: 'AI Protection',
                  description: 'Automatic fraud detection and verification'
                },
                {
                  icon: Zap,
                  title: 'Instant Analysis',
                  description: 'Real-time content analysis and safety checks'
                },
                {
                  icon: CheckCircle,
                  title: 'Verified Creation',
                  description: 'Get verified status for your digital assets'
                }
              ].map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div 
                    key={feature.title}
                    className="glass-panel p-6 hover-glow group"
                    style={{ animationDelay: `${index * 200}ms` }}
                  >
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg group-hover:shadow-cyber transition-all duration-300">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-semibold text-foreground">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Create NFT Form */}
      <div className="container mx-auto px-6 space-y-8">
        <section className="glass-panel p-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <h2 className="text-2xl font-bold text-foreground">Create New NFT</h2>
              <div className="h-px bg-gradient-to-r from-primary/50 to-transparent flex-1" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Image Upload */}
              <div className="space-y-4">
                <Label className="text-foreground">NFT Image</Label>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Upload Area */}
                  <Card className="p-6 border-dashed border-border/50 hover:border-primary/50 transition-colors">
                    <div className="text-center space-y-4">
                      <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                        <Upload className="w-8 h-8 text-primary" />
                      </div>
                      <div>
                        <p className="text-foreground font-medium">Upload your artwork</p>
                        <p className="text-sm text-muted-foreground">PNG, JPG, GIF up to 10MB</p>
                      </div>
                      <Button
                        type="button"
                        variant="cyber"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                      >
                        <Image className="w-4 h-4" />
                        Choose File
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </div>
                  </Card>

                  {/* Preview */}
                  {formData.preview && (
                    <Card className="p-4">
                      <div className="space-y-4">
                        <img
                          src={formData.preview}
                          alt="Preview"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        
                        {/* Analysis Result */}
                        {analysisResult && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              {analysisResult.isSafe ? (
                                <CheckCircle className="w-5 h-5 text-success" />
                              ) : (
                                <AlertTriangle className="w-5 h-5 text-warning" />
                              )}
                              <span className="text-sm font-medium">
                                {analysisResult.isSafe ? 'Verified Safe' : 'Needs Review'}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {analysisResult.confidence}% confidence
                              </Badge>
                            </div>
                            
                            {analysisResult.warnings.length > 0 && (
                              <div className="space-y-1">
                                {analysisResult.warnings.map((warning, index) => (
                                  <p key={index} className="text-xs text-warning">
                                    ⚠️ {warning}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  )}
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label htmlFor="title" className="text-foreground">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter NFT title"
                    className="bg-card/30 border-border/50"
                  />
                </div>

                <div className="space-y-4">
                  <Label htmlFor="price" className="text-foreground">Price (ETH)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="0.00"
                    className="bg-card/30 border-border/50"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label htmlFor="category" className="text-foreground">Category</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {categories.map((category) => (
                    <Button
                      key={category}
                      type="button"
                      variant={formData.category === category ? 'cyber' : 'glass'}
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, category }))}
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <Label htmlFor="description" className="text-foreground">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your NFT..."
                  rows={4}
                  className="bg-card/30 border-border/50"
                />
              </div>

              {/* Upload Progress */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                variant="cyber"
                size="lg"
                disabled={!formData.image || isUploading}
                className="w-full"
              >
                {isUploading ? 'Creating NFT...' : 'Create NFT'}
              </Button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
} 