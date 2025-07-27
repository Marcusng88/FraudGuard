import { NFT } from '../types/nft';

// Mock NFT data for development and testing
export const mockNfts: NFT[] = [
  {
    id: '1',
    name: 'Cosmic Explorer #001',
    description: 'A stunning digital artwork depicting a cosmic explorer traversing the galaxy in search of new worlds.',
    image: '/images/nft-placeholder.svg',
    price: '2.5',
    priceUsd: 125.50,
    owner: '0x1234567890abcdef1234567890abcdef12345678901234567890abcdef123456',
    creator: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    category: 'art',
    attributes: [
      { trait_type: 'Background', value: 'Nebula' },
      { trait_type: 'Character', value: 'Explorer' },
      { trait_type: 'Rarity', value: 'Legendary' },
    ],
    createdAt: '2025-01-20T10:00:00Z',
    updatedAt: '2025-01-20T10:00:00Z',
    fraudFlag: {
      id: 'fraud-1',
      nftId: '1',
      riskLevel: 'low',
      riskScore: 15,
      detectionType: [],
      description: 'Low risk - verified creator',
      aiExplanation: 'This NFT appears to be original content from a verified creator with no suspicious patterns detected.',
      flaggedAt: '2025-01-20T10:00:00Z',
    },
    isListed: true,
  },
  {
    id: '2',
    name: 'Digital Dreamscape',
    description: 'An abstract representation of dreams in the digital age, featuring vibrant colors and flowing forms.',
    image: '/images/nft-placeholder.svg',
    price: '1.8',
    priceUsd: 90.00,
    owner: '0x2345678901bcdef12345678901bcdef123456789012345678901bcdef1234567',
    creator: '0xbcdef12345678901bcdef12345678901bcdef12345678901bcdef12345678901',
    category: 'art',
    attributes: [
      { trait_type: 'Style', value: 'Abstract' },
      { trait_type: 'Colors', value: 'Vibrant' },
      { trait_type: 'Mood', value: 'Dreamy' },
    ],
    createdAt: '2025-01-19T15:30:00Z',
    updatedAt: '2025-01-19T15:30:00Z',
    fraudFlag: {
      id: 'fraud-2',
      nftId: '2',
      riskLevel: 'medium',
      riskScore: 45,
      detectionType: ['suspicious_minting'],
      description: 'Medium risk - unusual minting pattern',
      aiExplanation: 'This NFT shows some unusual minting patterns but no clear evidence of fraud.',
      flaggedAt: '2025-01-19T15:30:00Z',
    },
    isListed: true,
  },
  {
    id: '3',
    name: 'Pixel Warrior #256',
    description: 'A retro-style pixel art warrior ready for battle in the metaverse.',
    image: '/images/nft-placeholder.svg',
    price: '0.75',
    priceUsd: 37.50,
    owner: '0x3456789012cdef123456789012cdef1234567890123456789012cdef12345678',
    creator: '0xcdef123456789012cdef123456789012cdef123456789012cdef123456789012',
    category: 'gaming',
    attributes: [
      { trait_type: 'Class', value: 'Warrior' },
      { trait_type: 'Weapon', value: 'Sword' },
      { trait_type: 'Armor', value: 'Chainmail' },
      { trait_type: 'Level', value: 25, display_type: 'number' },
    ],
    createdAt: '2025-01-18T09:15:00Z',
    updatedAt: '2025-01-18T09:15:00Z',
    fraudFlag: {
      id: 'fraud-3',
      nftId: '3',
      riskLevel: 'high',
      riskScore: 85,
      detectionType: ['plagiarism', 'duplicate_content'],
      description: 'High risk - potential plagiarism detected',
      aiExplanation: 'This NFT appears to be very similar to existing content. Potential copyright infringement detected.',
      flaggedAt: '2025-01-18T09:15:00Z',
      similarNfts: ['4', '5'],
    },
    isListed: true,
  },
  {
    id: '4',
    name: 'Ethereal Landscape',
    description: 'A mystical landscape that exists between reality and imagination.',
    image: '/images/nft-placeholder.svg',
    price: '3.2',
    priceUsd: 160.00,
    owner: '0x4567890123def1234567890123def12345678901234567890123def123456789',
    creator: '0xdef1234567890123def1234567890123def1234567890123def1234567890123',
    category: 'photography',
    attributes: [
      { trait_type: 'Type', value: 'Landscape' },
      { trait_type: 'Filter', value: 'Ethereal' },
      { trait_type: 'Time', value: 'Twilight' },
    ],
    createdAt: '2025-01-17T14:20:00Z',
    updatedAt: '2025-01-17T14:20:00Z',
    fraudFlag: {
      id: 'fraud-4',
      nftId: '4',
      riskLevel: 'low',
      riskScore: 8,
      detectionType: [],
      description: 'Very low risk - verified original content',
      aiExplanation: 'This NFT has been verified as original content with strong authenticity indicators.',
      flaggedAt: '2025-01-17T14:20:00Z',
    },
    isListed: true,
  },
  {
    id: '5',
    name: 'Synthwave Sunset',
    description: 'A retro-futuristic sunset in the style of 80s synthwave aesthetics.',
    image: '/images/nft-placeholder.svg',
    price: '1.5',
    priceUsd: 75.00,
    owner: '0x567890124ef123456789012ef123456789012345678901234ef1234567890123',
    creator: '0xef123456789012ef123456789012ef123456789012ef123456789012ef123456',
    category: 'art',
    attributes: [
      { trait_type: 'Era', value: '80s' },
      { trait_type: 'Style', value: 'Synthwave' },
      { trait_type: 'Colors', value: 'Neon' },
    ],
    createdAt: '2025-01-16T11:45:00Z',
    updatedAt: '2025-01-16T11:45:00Z',
    fraudFlag: {
      id: 'fraud-5',
      nftId: '5',
      riskLevel: 'medium',
      riskScore: 55,
      detectionType: ['price_manipulation'],
      description: 'Medium risk - unusual pricing patterns',
      aiExplanation: 'This NFT shows some unusual pricing patterns that may indicate market manipulation.',
      flaggedAt: '2025-01-16T11:45:00Z',
    },
    isListed: true,
  },
  {
    id: '6',
    name: 'Quantum Particles',
    description: 'An abstract visualization of quantum particles in motion.',
    image: '/images/nft-placeholder.svg',
    price: '4.0',
    priceUsd: 200.00,
    owner: '0x67890125f1234567890125f1234567890123456789012f1234567890125f123',
    creator: '0xf1234567890125f1234567890125f1234567890125f1234567890125f123456',
    category: 'art',
    attributes: [
      { trait_type: 'Subject', value: 'Quantum Physics' },
      { trait_type: 'Complexity', value: 'High' },
      { trait_type: 'Animation', value: 'Static' },
    ],
    createdAt: '2025-01-15T16:30:00Z',
    updatedAt: '2025-01-15T16:30:00Z',
    fraudFlag: {
      id: 'fraud-6',
      nftId: '6',
      riskLevel: 'low',
      riskScore: 12,
      detectionType: [],
      description: 'Low risk - established creator',
      aiExplanation: 'This NFT is from an established creator with a good track record and shows no suspicious patterns.',
      flaggedAt: '2025-01-15T16:30:00Z',
    },
    isListed: true,
  },
];

// Helper function to get NFT by ID
export function getNftById(id: string): NFT | undefined {
  return mockNfts.find(nft => nft.id === id);
}

// Helper function to filter NFTs
export function filterNfts(filters: {
  category?: string;
  priceMin?: number;
  priceMax?: number;
  riskLevel?: 'safe' | 'all' | 'risky';
  search?: string;
}): NFT[] {
  return mockNfts.filter(nft => {
    // Category filter
    if (filters.category && filters.category !== 'all' && nft.category !== filters.category) {
      return false;
    }

    // Price filter
    const price = parseFloat(nft.price);
    if (filters.priceMin && price < filters.priceMin) {
      return false;
    }
    if (filters.priceMax && price > filters.priceMax) {
      return false;
    }

    // Risk level filter
    if (filters.riskLevel && filters.riskLevel !== 'all') {
      const riskScore = nft.fraudFlag?.riskScore || 0;
      if (filters.riskLevel === 'safe' && riskScore > 30) {
        return false;
      }
      if (filters.riskLevel === 'risky' && riskScore <= 30) {
        return false;
      }
    }

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const searchableText = `${nft.name} ${nft.description} ${nft.category}`.toLowerCase();
      if (!searchableText.includes(searchTerm)) {
        return false;
      }
    }

    return true;
  });
}
