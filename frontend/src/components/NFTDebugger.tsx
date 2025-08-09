import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@/hooks/useWallet';
import { useSuiClient } from '@mysten/dapp-kit';
import { Bug, Search, AlertCircle } from 'lucide-react';

/**
 * Debug component to help diagnose NFT listing issues
 */
export function NFTDebugger() {
  const [nftId, setNftId] = useState('');
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { wallet } = useWallet();
  const suiClient = useSuiClient();
  const { toast } = useToast();

  const debugNFT = async () => {
    if (!nftId.trim()) {
      toast({
        title: "Error",
        description: "Please enter an NFT object ID",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setDebugInfo(null);

    try {
      console.log('Debugging NFT:', nftId);
      
      // Try to get the object
      const objectResponse = await suiClient.getObject({
        id: nftId,
        options: {
          showContent: true,
          showOwner: true,
          showType: true,
        }
      });

      console.log('Object response:', objectResponse);

      const info = {
        exists: !!objectResponse.data,
        objectId: nftId,
        type: objectResponse.data?.type || 'Unknown',
        owner: objectResponse.data?.owner || 'Unknown',
        content: objectResponse.data?.content || null,
        error: objectResponse.error || null,
        isOwnedByCurrentWallet: false,
        isFraudGuardNFT: false,
        packageId: null,
      };

      // Check if it's owned by current wallet
      if (wallet?.address && objectResponse.data?.owner) {
        if (typeof objectResponse.data.owner === 'object' && 'AddressOwner' in objectResponse.data.owner) {
          info.isOwnedByCurrentWallet = objectResponse.data.owner.AddressOwner === wallet.address;
        }
      }

      // Check if it's a FraudGuardNFT
      if (objectResponse.data?.type) {
        const typeString = objectResponse.data.type;
        info.isFraudGuardNFT = typeString.includes('fraudguard_nft::FraudGuardNFT');
        
        // Extract package ID from type
        const packageMatch = typeString.match(/^0x[a-f0-9]+/);
        if (packageMatch) {
          info.packageId = packageMatch[0];
        }
      }

      setDebugInfo(info);

      // Show diagnosis
      if (!info.exists) {
        toast({
          title: "NFT Not Found",
          description: "The NFT object ID doesn't exist on the blockchain",
          variant: "destructive"
        });
      } else if (!info.isOwnedByCurrentWallet) {
        toast({
          title: "Ownership Issue",
          description: "The NFT is not owned by your current wallet",
          variant: "destructive"
        });
      } else if (!info.isFraudGuardNFT) {
        toast({
          title: "Type Mismatch",
          description: "The NFT is not a FraudGuardNFT type",
          variant: "destructive"
        });
      } else {
        toast({
          title: "NFT Looks Good!",
          description: "The NFT should be listable",
        });
      }

    } catch (error) {
      console.error('Error debugging NFT:', error);
      setDebugInfo({
        error: error instanceof Error ? error.message : 'Unknown error',
        exists: false,
      });
      
      toast({
        title: "Debug Error",
        description: error instanceof Error ? error.message : "Failed to debug NFT",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="w-5 h-5" />
          NFT Debugger
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Debug NFT listing issues by checking object existence, ownership, and type
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter NFT Object ID (0x...)"
            value={nftId}
            onChange={(e) => setNftId(e.target.value)}
            disabled={isLoading}
          />
          <Button
            onClick={debugNFT}
            disabled={isLoading || !nftId.trim()}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <AlertCircle className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Debug
          </Button>
        </div>

        {debugInfo && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="font-semibold">Basic Info</h3>
                <div className="text-sm space-y-1">
                  <p>Exists: <span className={debugInfo.exists ? 'text-green-600' : 'text-red-600'}>
                    {debugInfo.exists ? 'Yes' : 'No'}
                  </span></p>
                  <p>Type: <span className="font-mono text-xs">{debugInfo.type}</span></p>
                  <p>Package ID: <span className="font-mono text-xs">{debugInfo.packageId || 'Unknown'}</span></p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Ownership & Type</h3>
                <div className="text-sm space-y-1">
                  <p>Owned by you: <span className={debugInfo.isOwnedByCurrentWallet ? 'text-green-600' : 'text-red-600'}>
                    {debugInfo.isOwnedByCurrentWallet ? 'Yes' : 'No'}
                  </span></p>
                  <p>Is FraudGuardNFT: <span className={debugInfo.isFraudGuardNFT ? 'text-green-600' : 'text-red-600'}>
                    {debugInfo.isFraudGuardNFT ? 'Yes' : 'No'}
                  </span></p>
                  <p>Your wallet: <span className="font-mono text-xs">{wallet?.address || 'Not connected'}</span></p>
                </div>
              </div>
            </div>

            {debugInfo.owner && (
              <div className="space-y-2">
                <h3 className="font-semibold">Owner Info</h3>
                <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                  {JSON.stringify(debugInfo.owner, null, 2)}
                </pre>
              </div>
            )}

            {debugInfo.content && (
              <div className="space-y-2">
                <h3 className="font-semibold">Content</h3>
                <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                  {JSON.stringify(debugInfo.content, null, 2)}
                </pre>
              </div>
            )}

            {debugInfo.error && (
              <div className="space-y-2">
                <h3 className="font-semibold text-red-600">Error</h3>
                <p className="text-sm text-red-600">{debugInfo.error}</p>
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Expected Package ID:</strong> {import.meta.env.VITE_MARKETPLACE_PACKAGE_ID || '0x7ae460902e9017c7c9a5c898443105435b7393fc5776ace61b2f0c6a1f578381'}</p>
          <p><strong>Expected Type:</strong> Should contain "fraudguard_nft::FraudGuardNFT"</p>
          <p><strong>Ownership:</strong> Must be owned by your connected wallet</p>
        </div>
      </CardContent>
    </Card>
  );
}
