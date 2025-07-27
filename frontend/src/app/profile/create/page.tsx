'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { LoadingSpinner } from '../../../components/ui/spinner';

interface NFTFormData {
  name: string;
  description: string;
  image: File | null;
  imagePreview: string;
  category: string;
  attributes: Array<{
    trait_type: string;
    value: string;
    display_type?: string;
  }>;
  royalty: number;
  price: string;
}

interface CreateStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
}

export default function CreateNFTPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<NFTFormData>({
    name: '',
    description: '',
    image: null,
    imagePreview: '',
    category: 'art',
    attributes: [],
    royalty: 5,
    price: '',
  });

  const steps: CreateStep[] = [
    { id: 1, title: 'Upload Image', description: 'Choose your NFT artwork', completed: false },
    { id: 2, title: 'Add Details', description: 'Name, description, and category', completed: false },
    { id: 3, title: 'Set Attributes', description: 'Add traits and properties', completed: false },
    { id: 4, title: 'Pricing & Royalty', description: 'Set price and royalty percentage', completed: false },
    { id: 5, title: 'Review & Mint', description: 'Review and create your NFT', completed: false },
  ];

  const categories = [
    'art', 'photography', 'music', 'video', 'gaming', 'sports', 'collectibles', 'utility'
  ];

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData(prev => ({
          ...prev,
          image: file,
          imagePreview: e.target?.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const addAttribute = () => {
    setFormData(prev => ({
      ...prev,
      attributes: [...prev.attributes, { trait_type: '', value: '' }],
    }));
  };

  const updateAttribute = (index: number, field: 'trait_type' | 'value', value: string) => {
    setFormData(prev => ({
      ...prev,
      attributes: prev.attributes.map((attr, i) => 
        i === index ? { ...attr, [field]: value } : attr
      ),
    }));
  };

  const removeAttribute = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attributes: prev.attributes.filter((_, i) => i !== index),
    }));
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // TODO: Implement actual NFT minting logic
      console.log('Minting NFT with data:', formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      alert('NFT created successfully! (This is a demo - actual minting will be implemented with smart contracts)');
      router.push('/profile');
    } catch (error) {
      console.error('Error creating NFT:', error);
      alert('Failed to create NFT. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!formData.image;
      case 2:
        return formData.name.trim() !== '' && formData.description.trim() !== '';
      case 3:
        return true; // Attributes are optional
      case 4:
        return formData.price !== '' && !isNaN(parseFloat(formData.price));
      case 5:
        return true;
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">Upload Your Artwork</h3>
              <p className="text-[var(--text-secondary)]">
                Choose an image file (JPG, PNG, GIF, SVG). Max size: 10MB
              </p>
            </div>

            <div className="border-2 border-dashed border-[var(--border)] rounded-lg p-8 text-center">
              {formData.imagePreview ? (
                <div className="space-y-4">
                  <div className="relative w-64 h-64 mx-auto">
                    <Image
                      src={formData.imagePreview}
                      alt="NFT Preview"
                      fill
                      className="object-cover rounded-lg"
                    />
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => setFormData(prev => ({ ...prev, image: null, imagePreview: '' }))}
                  >
                    Change Image
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-6xl">🖼️</div>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload">
                      <Button as="span" className="cursor-pointer">
                        Choose File
                      </Button>
                    </label>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Or drag and drop your file here
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">Add NFT Details</h3>
              <p className="text-[var(--text-secondary)]">
                Provide a name, description, and category for your NFT
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter NFT name"
                  maxLength={50}
                />
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {formData.name.length}/50 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your NFT..."
                  className="w-full p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] resize-none"
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {formData.description.length}/500 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)]"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">Add Attributes</h3>
              <p className="text-[var(--text-secondary)]">
                Add traits and properties to make your NFT unique (optional)
              </p>
            </div>

            <div className="space-y-4">
              {formData.attributes.map((attr, index) => (
                <div key={index} className="flex gap-3 items-center">
                  <Input
                    value={attr.trait_type}
                    onChange={(e) => updateAttribute(index, 'trait_type', e.target.value)}
                    placeholder="Trait type (e.g., Color)"
                    className="flex-1"
                  />
                  <Input
                    value={attr.value}
                    onChange={(e) => updateAttribute(index, 'value', e.target.value)}
                    placeholder="Value (e.g., Blue)"
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAttribute(index)}
                    className="text-[var(--danger-red)]"
                  >
                    ✕
                  </Button>
                </div>
              ))}

              <Button
                variant="secondary"
                onClick={addAttribute}
                className="w-full"
              >
                + Add Attribute
              </Button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">Set Pricing & Royalty</h3>
              <p className="text-[var(--text-secondary)]">
                Set the initial price and royalty percentage for future sales
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Price (SUI) *</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Royalty Percentage ({formData.royalty}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="0.5"
                  value={formData.royalty}
                  onChange={(e) => setFormData(prev => ({ ...prev, royalty: parseFloat(e.target.value) }))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-[var(--text-secondary)] mt-1">
                  <span>0%</span>
                  <span>20%</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-2">
                  You'll receive {formData.royalty}% of the sale price on future resales
                </p>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">Review & Mint</h3>
              <p className="text-[var(--text-secondary)]">
                Review your NFT details before minting
              </p>
            </div>

            <Card variant="glass">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Image Preview */}
                  <div>
                    {formData.imagePreview && (
                      <div className="relative aspect-square rounded-lg overflow-hidden">
                        <Image
                          src={formData.imagePreview}
                          alt="NFT Preview"
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-lg">{formData.name}</h4>
                      <p className="text-[var(--text-secondary)] text-sm">{formData.description}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="info">{formData.category}</Badge>
                    </div>

                    <div>
                      <p className="text-sm text-[var(--text-secondary)]">Price</p>
                      <p className="text-xl font-bold">{formData.price} SUI</p>
                    </div>

                    <div>
                      <p className="text-sm text-[var(--text-secondary)]">Royalty</p>
                      <p className="font-medium">{formData.royalty}%</p>
                    </div>

                    {formData.attributes.length > 0 && (
                      <div>
                        <p className="text-sm text-[var(--text-secondary)] mb-2">Attributes</p>
                        <div className="grid grid-cols-2 gap-2">
                          {formData.attributes.map((attr, index) => (
                            <div key={index} className="bg-[var(--bg-dark)] p-2 rounded text-xs">
                              <p className="text-[var(--text-secondary)]">{attr.trait_type}</p>
                              <p className="font-medium">{attr.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-dark)]">
      <div className="container section-padding max-w-5xl">
        {/* Header */}
        <div className="content-spacing text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-[var(--text-primary)] mb-6 tracking-tight">
            Create{" "}
            <span className="text-gradient bg-clip-text text-transparent bg-gradient-to-r from-[var(--primary-blue)] to-[var(--primary-purple)]">
              NFT
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-[var(--text-secondary)] max-w-3xl mx-auto font-light">
            Create and mint your unique digital asset with AI-powered fraud protection and secure blockchain technology
          </p>
        </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${currentStep >= step.id 
                  ? 'bg-[var(--primary-blue)] text-white' 
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)]'
                }
              `}>
                {step.id}
              </div>
              {index < steps.length - 1 && (
                <div className={`
                  w-16 h-0.5 mx-2
                  ${currentStep > step.id ? 'bg-[var(--primary-blue)]' : 'bg-[var(--border)]'}
                `} />
              )}
            </div>
          ))}
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold">{steps[currentStep - 1].title}</h2>
          <p className="text-[var(--text-secondary)]">{steps[currentStep - 1].description}</p>
        </div>
      </div>

      {/* Step Content */}
      <Card variant="glass" className="mb-8">
        <CardContent className="p-8">
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="secondary"
          onClick={handlePrevious}
          disabled={currentStep === 1}
        >
          Previous
        </Button>

        <div className="flex gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/marketplace')}
          >
            Cancel
          </Button>

          {currentStep === steps.length ? (
            <Button
              onClick={handleSubmit}
              disabled={!isStepValid(currentStep) || isSubmitting}
              className="min-w-32"
            >
              {isSubmitting ? <LoadingSpinner size="sm" /> : 'Mint NFT'}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!isStepValid(currentStep)}
            >
              Next
            </Button>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
