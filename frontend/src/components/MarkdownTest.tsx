import React from 'react';
import ReactMarkdown from 'react-markdown';

const MarkdownTest: React.FC = () => {
  // Sample markdown content that mimics what the chat bot would generate
  const sampleMarkdown = `## 🛡️ FraudGuard's AI-Powered Fraud Detection

**FraudGuard** uses advanced *artificial intelligence* to protect users from fraudulent NFTs. Here's how it works:

### 🔍 Key Features:

- **Real-time Plagiarism Detection** 🎨 - Scans uploaded images against existing NFT databases
- **Smart Contract Analysis** ⚡ - Automatically reviews contract code for suspicious patterns  
- **Community Reporting** 👥 - Users can flag suspicious listings
- **AI Risk Scoring** 🎯 - Each NFT gets a fraud risk score from 0-100

### 🚀 How It Works:

1. **Upload Detection** 📤 - When an NFT is listed, our AI immediately scans it
2. **Image Analysis** 🖼️ - Computer vision checks for duplicates or modifications
3. **Metadata Verification** 📋 - Validates authenticity of NFT metadata
4. **Risk Assessment** ⚠️ - Generates a comprehensive fraud risk report

### ✅ Benefits:

- 💡 **Instant Results** - Get fraud analysis in seconds
- 🔗 **Blockchain Integration** - Works seamlessly with Sui network
- 📱 **User-Friendly** - Clear warnings and explanations for all users

> 💎 **Pro Tip**: Always check the fraud score before purchasing any NFT!

\`\`\`javascript
// Example API call
const riskScore = await fraudGuard.analyzeNFT(nftId);
\`\`\`

---

## 📈 NFT Market Trends

The current NFT market shows **exciting developments**:

- 🔥 **Gaming NFTs** are trending upward
- 💰 **Art collections** maintain steady value
- 🌟 **Utility tokens** gaining popularity
- ⚠️ **Scam detection** is more important than ever`;

  return (
    <div className="max-w-4xl mx-auto p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Markdown Rendering Test</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Raw Markdown */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Raw Markdown</h2>
          <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto max-h-96 whitespace-pre-wrap">
            {sampleMarkdown}
          </pre>
        </div>
        
        {/* Rendered Markdown */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Rendered Output</h2>
          <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-900 prose-strong:text-gray-900 prose-em:text-gray-900 prose-ul:text-gray-900 prose-ol:text-gray-900 prose-li:text-gray-900 prose-code:text-gray-800 prose-code:bg-gray-100 max-h-96 overflow-auto">
            <ReactMarkdown>{sampleMarkdown}</ReactMarkdown>
          </div>
        </div>
      </div>
      
      {/* Chat Message Simulation */}
      <div className="mt-8 bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Chat Message Simulation</h2>
        <div className="flex gap-2 justify-start">
          <div className="bg-gray-100 text-gray-900 max-w-[80%] rounded-lg p-3 text-sm">
            <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-900 prose-strong:text-gray-900 prose-em:text-gray-900 prose-ul:text-gray-900 prose-ol:text-gray-900 prose-li:text-gray-900">
              <ReactMarkdown>{sampleMarkdown}</ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarkdownTest;
