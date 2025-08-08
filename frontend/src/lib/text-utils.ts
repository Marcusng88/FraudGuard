/**
 * Utility functions for text manipulation and formatting
 */

/**
 * Truncates text to a specified length and adds ellipsis
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation
 * @param suffix - Suffix to add when truncated (default: "...")
 * @returns Truncated text with suffix
 */
export function truncateText(text: string, maxLength: number, suffix: string = "..."): string {
  if (!text || text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength).trim() + suffix;
}

/**
 * Creates a preview of analysis text for NFT cards
 * Truncates long analysis descriptions while preserving readability
 * @param text - The full analysis text
 * @param maxLength - Maximum length for preview (default: 120)
 * @returns Truncated analysis preview
 */
export function createAnalysisPreview(text: string, maxLength: number = 120): string {
  if (!text) return '';
  
  // If text is already short enough, return as is
  if (text.length <= maxLength) {
    return text;
  }
  
  // Try to truncate at sentence boundaries for better readability
  const truncated = text.substring(0, maxLength);
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?')
  );
  
  // If we found a sentence boundary and it's not too early, use it
  if (lastSentenceEnd > maxLength * 0.6) {
    return text.substring(0, lastSentenceEnd + 1).trim();
  }
  
  // Otherwise, truncate at word boundary
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > maxLength * 0.8) {
    return text.substring(0, lastSpace).trim() + '...';
  }
  
  // Fallback to character truncation
  return truncated.trim() + '...';
}

/**
 * Formats wallet addresses with ellipsis in the middle
 * @param address - The wallet address
 * @param prefixLength - Length of prefix to show (default: 8)
 * @param suffixLength - Length of suffix to show (default: 4)
 * @returns Formatted address with ellipsis
 */
export function formatWalletAddress(address: string, prefixLength: number = 8, suffixLength: number = 4): string {
  if (!address || address.length <= prefixLength + suffixLength) {
    return address;
  }
  
  return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`;
}

/**
 * Capitalizes the first letter of each word in a string
 * @param text - The text to capitalize
 * @returns Capitalized text
 */
export function capitalizeWords(text: string): string {
  if (!text) return '';
  
  return text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Removes special characters and formats text for display
 * @param text - The text to clean
 * @returns Cleaned text
 */
export function cleanDisplayText(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/[^\w\s.!?,-]/g, '') // Remove special chars except basic punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}
