# Audit Receipt Implementation Summary

## Overview
Implemented the `ciphertext_audit` field to store sender-encrypted audit receipts, enabling users to later decrypt and generate audit proof packages for personal compliance.

## Changes Made

### 1. Database Schema Update
**File**: `prisma/schema.prisma`
- Added `ciphertext_audit Bytes?` field to `messages` model
- Field is optional (nullable) for backward compatibility

**Migration**: `src/db/migrations/004_add_ciphertext_audit.sql`
- SQL migration to add the column to existing databases

### 2. Encryption Functions
**File**: `cipherpay-ui/src/lib/e2ee.ts`
- Added `encryptForSender(senderPubB64, auditReceipt)` function
  - Encrypts audit receipt using sender's own encryption public key
  - Uses same Curve25519 encryption as recipient notes
- Added `decryptAuditReceipt(ciphertextB64)` function
  - Decrypts audit receipt using sender's own encryption secret key
  - Returns decrypted audit receipt object

### 3. Server Route Updates
**File**: `cipherpay-server/src/routes/messages.post.ts`
- Added `ciphertextAuditB64` to request body schema (optional)
- Stores `ciphertext_audit` in database when provided

**File**: `cipherpay-server/src/routes/messages.audit.ts` (NEW)
- New route: `GET /api/v1/messages/audit`
- Returns audit receipts for authenticated sender
- Query params: `limit`, `cursor` (for pagination)
- Only returns messages where `sender_key` matches authenticated user and `ciphertext_audit` is not null

**File**: `cipherpay-server/src/server.ts`
- Registered `messagesAudit` route

### 4. Client-Side Implementation
**File**: `cipherpay-ui/src/services/CipherPayService.js`
- Updated `onOut1NoteReady` callback in transfer flow
- Generates audit receipt containing:
  - `amount`
  - `tokenId`
  - `memo`
  - `randomness` (r, optional s)
  - `cipherPayPubKey` (recipient's ownerCipherPayPubKey)
  - `commitment` (optional, computed if SDK available)
- Encrypts audit receipt using sender's encryption public key
- Includes `ciphertextAuditB64` in message POST request

**Note**: Audit receipts are only generated for **out1 notes** (recipient notes), not for out2 change notes.

## Audit Receipt Structure

```typescript
{
  amount: "0x..." (hex string),
  tokenId: "0x..." (hex string),
  memo: "0x..." (hex string, or "0x0" if empty),
  randomness: {
    r: "0x..." (64-char hex),
    s?: "0x..." (64-char hex, optional)
  },
  cipherPayPubKey: "0x..." (64-char hex, recipient's ownerCipherPayPubKey),
  commitment?: "0x..." (64-char hex, optional but convenient)
}
```

## Usage Flow

### 1. During Transfer (Automatic)
When a user performs a shielded transfer:
1. Out1 note (recipient) is created
2. Audit receipt is automatically generated with note preimage
3. Audit receipt is encrypted to sender's encryption public key
4. Both `ciphertext` (recipient note) and `ciphertext_audit` (sender audit receipt) are stored

### 2. Retrieving Audit Receipts
User queries their audit receipts:
```bash
GET /api/v1/messages/audit?limit=50
Authorization: Bearer <JWT>
```

Response:
```json
[
  {
    "id": "123",
    "recipientKey": "0x...",
    "kind": "note-transfer",
    "amount": "1000000000",
    "txSignature": "base58...",
    "createdAt": "2024-...",
    "ciphertextAuditB64": "base64-encoded-encrypted-audit-receipt"
  }
]
```

### 3. Decrypting Audit Receipt
User decrypts their audit receipt:
```javascript
import { decryptAuditReceipt } from '../lib/e2ee';

const auditReceipt = decryptAuditReceipt(ciphertextAuditB64);
// Returns: { amount, tokenId, memo, randomness, cipherPayPubKey, commitment? }
```

### 4. Generating Audit Proof Package
User uses decrypted audit receipt to:
1. Compute commitment (if not already in receipt)
2. Fetch Merkle path from relayer: `/merkle/witness?commitment=...`
3. Generate snarkjs proof for `audit_payment_included_v1.circom`
4. Create `PaymentAuditPackageV1` with proof and anchors
5. Export/share with auditor

## Security Properties

✅ **Sender-only decryption**: Only the sender can decrypt their audit receipts (uses their encryption key)
✅ **No recipient access**: Recipient cannot decrypt audit receipts (different encryption key)
✅ **Backward compatible**: Existing messages without audit receipts continue to work
✅ **Optional commitment**: Commitment is computed if SDK is available, but not required

## Next Steps (for zkaudit-ui User Interface)

1. **Add audit receipt retrieval** in zkaudit-ui User page
2. **Add decryption UI** to show decrypted audit receipts
3. **Add proof generation UI** using decrypted receipt data
4. **Add package export** functionality

## Testing

To test the implementation:

1. **Run migration**:
   ```bash
   cd cipherpay-server
   mysql -u cipherpay -p cipherpay_server < src/db/migrations/004_add_ciphertext_audit.sql
   ```

2. **Perform a transfer** - audit receipt should be automatically generated and stored

3. **Query audit receipts**:
   ```bash
   curl -H "Authorization: Bearer <JWT>" \
        http://localhost:8788/api/v1/messages/audit
   ```

4. **Decrypt audit receipt** in UI using `decryptAuditReceipt()` function
