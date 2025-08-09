[
0: {
MoveCall: {
package: "0x7ae460902e9017c7c9a5c898443105435b7393fc5776ace61b2f0c6a1f578381"
module: "marketplace"
function: "list_nft_simple"
arguments: [
0: {
Input: 0
}
1: {
Input: 1
}
]
}
}
]


[
0: {
type: "object"
objectType: "immOrOwnedObject"
objectId: "0xaa051496ae881370bd5349048b26de8c6f651eea92201bc7f581efec2e8bf75f"
version: "349180365"
digest: "EVHzWh5Z2o9FEhw857ocxxPifsx8VmXjKfzwVZTyUsaz"
}
1: {
type: "pure"
valueType: "u64"
value: "50000000"
}
]. this is the listing data i got from sui vision for the current listing

----------------------------------------------------
this is the console log for the current problem
Transaction details: {target: '0x7ae460902e9017c7c9a5c898443105435b7393fc5776ace61b2f0c6a1f578381::marketplace::list_nft_simple', nftId: '0xaa051496ae881370bd5349048b26de8c6f651eea92201bc7f581efec2e8bf75f', priceInMist: '50000000'}nftId: "0xaa051496ae881370bd5349048b26de8c6f651eea92201bc7f581efec2e8bf75f"priceInMist: "50000000"target: "0x7ae460902e9017c7c9a5c898443105435b7393fc5776ace61b2f0c6a1f578381::marketplace::list_nft_simple"[[Prototype]]: Object
blockchain-utils.ts:200 List NFT transaction result: {digest: '3uGZyKKsgLT1bjyKPn4yZ2W9gRjR31KuLSsqrNPriaCJ', effects: 'AQA1AwAAAAAAAEBCDwAAAAAAAAeAAAAAAABAW2EAAAAAAMD7AA…X7vVEaWCD6+6HCA5CFp3R9mJRO6fRfaFaEdOBxVzXlAAAAA==', objectChanges: undefined, events: undefined}digest: "3uGZyKKsgLT1bjyKPn4yZ2W9gRjR31KuLSsqrNPriaCJ"effects: "AQA1AwAAAAAAAEBCDwAAAAAAAAeAAAAAAABAW2EAAAAAAMD7AAAAAAAAICsbLeLvTzXr7GSJVESHWCtTwuS2PTpyYgAPdwctW8YrAQAAAAABIMWnw8pYX0fnYoONGxpsyzULrQB5sIaFcZr3fMcYYpWAAiDMro2xd2MlP/nSL21qg0r3y4hXVUYE5TjiBz1vAC6DqSDrGBpMIOp6lsth+GNhJv2YeEBVmwENr8kM8b/L5E9gP84R0BQAAAAAAzUaAemmTdvAVN5OlehmAzX9dasJT1FtODCfT131p1jYAc0R0BQAAAAAII8/BfS31OVX7CCF07eiczqFDTbqn8NeQwimRIK8JdWrANfu9URpYIPr7ocIDkIWndH2YlE7p9F9oVoR04HFXNeUASCZZUkJAj95esYZmYzBFUbNITP3Iaf+hEXbMhqWGRfekgDX7vVEaWCD6+6HCA5CFp3R9mJRO6fRfaFaEdOBxVzXlAA95HL5nY/iKxC+fC6Mo5HsJOP8xW9vWW73CDd+aYd8YQABIEfzpy6lOTwINIDZH2KPqdKHVbaGvMBrj7zG9MVewkHAAs4R0BQAAAAAAaoFFJauiBNwvVNJBIsm3oxvZR7qkiAbx/WB7+wui/dfAc0R0BQAAAAAIMhnZ7dv6KxgUK59H2HsrTKivXfSDlCmlO9Qakhip16zANfu9URpYIPr7ocIDkIWndH2YlE7p9F9oVoR04HFXNeUASDbVO5bSFdMHeX1he93yCZrm013GmBbHpk9QSAtrkuz6gDX7vVEaWCD6+6HCA5CFp3R9mJRO6fRfaFaEdOBxVzXlAAAAA=="events: undefinedobjectChanges: undefined[[Prototype]]: Object
blockchain-utils.ts:206 Transaction digest: 3uGZyKKsgLT1bjyKPn4yZ2W9gRjR31KuLSsqrNPriaCJ
blockchain-utils.ts:207 Transaction effects (raw): AQA1AwAAAAAAAEBCDwAAAAAAAAeAAAAAAABAW2EAAAAAAMD7AAAAAAAAICsbLeLvTzXr7GSJVESHWCtTwuS2PTpyYgAPdwctW8YrAQAAAAABIMWnw8pYX0fnYoONGxpsyzULrQB5sIaFcZr3fMcYYpWAAiDMro2xd2MlP/nSL21qg0r3y4hXVUYE5TjiBz1vAC6DqSDrGBpMIOp6lsth+GNhJv2YeEBVmwENr8kM8b/L5E9gP84R0BQAAAAAAzUaAemmTdvAVN5OlehmAzX9dasJT1FtODCfT131p1jYAc0R0BQAAAAAII8/BfS31OVX7CCF07eiczqFDTbqn8NeQwimRIK8JdWrANfu9URpYIPr7ocIDkIWndH2YlE7p9F9oVoR04HFXNeUASCZZUkJAj95esYZmYzBFUbNITP3Iaf+hEXbMhqWGRfekgDX7vVEaWCD6+6HCA5CFp3R9mJRO6fRfaFaEdOBxVzXlAA95HL5nY/iKxC+fC6Mo5HsJOP8xW9vWW73CDd+aYd8YQABIEfzpy6lOTwINIDZH2KPqdKHVbaGvMBrj7zG9MVewkHAAs4R0BQAAAAAAaoFFJauiBNwvVNJBIsm3oxvZR7qkiAbx/WB7+wui/dfAc0R0BQAAAAAIMhnZ7dv6KxgUK59H2HsrTKivXfSDlCmlO9Qakhip16zANfu9URpYIPr7ocIDkIWndH2YlE7p9F9oVoR04HFXNeUASDbVO5bSFdMHeX1he93yCZrm013GmBbHpk9QSAtrkuz6gDX7vVEaWCD6+6HCA5CFp3R9mJRO6fRfaFaEdOBxVzXlAAAAA==
blockchain-utils.ts:503 Attempting to extract listing ID from transaction result: {digest: '3uGZyKKsgLT1bjyKPn4yZ2W9gRjR31KuLSsqrNPriaCJ', effects: 'AQA1AwAAAAAAAEBCDwAAAAAAAAeAAAAAAABAW2EAAAAAAMD7AA…X7vVEaWCD6+6HCA5CFp3R9mJRO6fRfaFaEdOBxVzXlAAAAA==', objectChanges: undefined, events: undefined}digest: "3uGZyKKsgLT1bjyKPn4yZ2W9gRjR31KuLSsqrNPriaCJ"effects: "AQA1AwAAAAAAAEBCDwAAAAAAAAeAAAAAAABAW2EAAAAAAMD7AAAAAAAAICsbLeLvTzXr7GSJVESHWCtTwuS2PTpyYgAPdwctW8YrAQAAAAABIMWnw8pYX0fnYoONGxpsyzULrQB5sIaFcZr3fMcYYpWAAiDMro2xd2MlP/nSL21qg0r3y4hXVUYE5TjiBz1vAC6DqSDrGBpMIOp6lsth+GNhJv2YeEBVmwENr8kM8b/L5E9gP84R0BQAAAAAAzUaAemmTdvAVN5OlehmAzX9dasJT1FtODCfT131p1jYAc0R0BQAAAAAII8/BfS31OVX7CCF07eiczqFDTbqn8NeQwimRIK8JdWrANfu9URpYIPr7ocIDkIWndH2YlE7p9F9oVoR04HFXNeUASCZZUkJAj95esYZmYzBFUbNITP3Iaf+hEXbMhqWGRfekgDX7vVEaWCD6+6HCA5CFp3R9mJRO6fRfaFaEdOBxVzXlAA95HL5nY/iKxC+fC6Mo5HsJOP8xW9vWW73CDd+aYd8YQABIEfzpy6lOTwINIDZH2KPqdKHVbaGvMBrj7zG9MVewkHAAs4R0BQAAAAAAaoFFJauiBNwvVNJBIsm3oxvZR7qkiAbx/WB7+wui/dfAc0R0BQAAAAAIMhnZ7dv6KxgUK59H2HsrTKivXfSDlCmlO9Qakhip16zANfu9URpYIPr7ocIDkIWndH2YlE7p9F9oVoR04HFXNeUASDbVO5bSFdMHeX1he93yCZrm013GmBbHpk9QSAtrkuz6gDX7vVEaWCD6+6HCA5CFp3R9mJRO6fRfaFaEdOBxVzXlAAAAA=="events: undefinedobjectChanges: undefined[[Prototype]]: Object
blockchain-utils.ts:591 No listing object found in transaction result
blockchain-utils.ts:211 Extracted blockchain listing ID: null
MyNFTs.tsx:108 Blockchain transaction successful: 3uGZyKKsgLT1bjyKPn4yZ2W9gRjR31KuLSsqrNPriaCJ
MyNFTs.tsx:109 Blockchain listing ID: null
MyNFTs.tsx:112 Confirming listing with blockchain data...
MyNFTs.tsx:120 Listing confirmed successfully
content-all.js:1 Uncaught (in promise) Error: Could not establish connection. Receiving end does not exist.
    at y (content-all.js:1:55748)
y @ content-all.js:1Understand this error
8profile:1 Uncaught (in promise) Error: A listener indicated an asynchronous response by returning true, but the message channel closed before a response was receivedUnderstand this error
@radix-ui_react-dialog.js?v=c006b24e:340 Warning: Missing `Description` or `aria-describedby={undefined}` for {DialogContent}.
(anonymous) @ @radix-ui_react-dialog.js?v=c006b24e:340
commitHookEffectListMount @ chunk-W6L2VRDA.js?v=c006b24e:16915
commitPassiveMountOnFiber @ chunk-W6L2VRDA.js?v=c006b24e:18156
commitPassiveMountEffects_complete @ chunk-W6L2VRDA.js?v=c006b24e:18129
commitPassiveMountEffects_begin @ chunk-W6L2VRDA.js?v=c006b24e:18119
commitPassiveMountEffects @ chunk-W6L2VRDA.js?v=c006b24e:18109
flushPassiveEffectsImpl @ chunk-W6L2VRDA.js?v=c006b24e:19490
flushPassiveEffects @ chunk-W6L2VRDA.js?v=c006b24e:19447
commitRootImpl @ chunk-W6L2VRDA.js?v=c006b24e:19416
commitRoot @ chunk-W6L2VRDA.js?v=c006b24e:19277
performSyncWorkOnRoot @ chunk-W6L2VRDA.js?v=c006b24e:18895
flushSyncCallbacks @ chunk-W6L2VRDA.js?v=c006b24e:9119
(anonymous) @ chunk-W6L2VRDA.js?v=c006b24e:18627Understand this warning
MyNFTs.tsx:138 Finding active listing for NFT: 4bf2485b-571f-43d8-8ab4-a33eec0a9c89
MyNFTs.tsx:144 Found active listing: {id: '196a5c86-4cf5-4582-92e4-46e5a6f31f70', nft_id: '4bf2485b-571f-43d8-8ab4-a33eec0a9c89', seller_wallet_address: '0xd7eef544696083ebee87080e42169dd1f662513ba7d17da15a11d381c55cd794', price: 0.05, status: 'active', …}
MyNFTs.tsx:173 No blockchain listing ID found, performing database-only unlisting
MyNFTs.tsx:185 NFT unlisted successfully