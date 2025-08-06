// Slush configuration for zkLogin integration with OAuth providers
export const slushConfig = {
  // OAuth provider configurations
  oauth: {
    google: {
      clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'your-google-client-id',
      redirectUri: import.meta.env.VITE_GOOGLE_REDIRECT_URI || 'http://localhost:8080/auth/callback'
    },
    github: {
      clientId: import.meta.env.VITE_GITHUB_CLIENT_ID || 'your-github-client-id',
      redirectUri: import.meta.env.VITE_GITHUB_REDIRECT_URI || 'http://localhost:8080/auth/callback'
    },
    facebook: {
      clientId: import.meta.env.VITE_FACEBOOK_CLIENT_ID || 'your-facebook-client-id',
      redirectUri: import.meta.env.VITE_FACEBOOK_REDIRECT_URI || 'http://localhost:8080/auth/callback'
    }
  },
  // Sui network configuration
  sui: {
    network: 'testnet'
  }
}; 