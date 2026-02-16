# Updating External Dependencies

After migrating to the monorepo, you need to update references in other projects.

## 1. cipherpay-circuits

Update the artifact copy script: `scripts/copy-proof-artifacts-to-relayer-sdk-ui-zkaudit.js`

### Changes needed:

```diff
 // Old paths
- const SDK_DIR = path.resolve(ROOT, "../cipherpay-sdk/src/circuits");
- const UI_DIR = path.resolve(ROOT, "../cipherpay-ui/public/circuits");
+ const SDK_DIR = path.resolve(ROOT, "../cipherpay-app/packages/sdk/src/circuits");
+ const UI_DIR = path.resolve(ROOT, "../cipherpay-app/packages/ui/public/circuits");
```

**File to update:**
`/home/sean/cipherpaylab/cipherpay-circuits/scripts/copy-proof-artifacts-to-relayer-sdk-ui-zkaudit.js`

### Script to apply changes:

```bash
cd /home/sean/cipherpaylab/cipherpay-circuits
sed -i 's|../cipherpay-sdk|../cipherpay-app/packages/sdk|g' scripts/copy-proof-artifacts-to-relayer-sdk-ui-zkaudit.js
sed -i 's|../cipherpay-ui|../cipherpay-app/packages/ui|g' scripts/copy-proof-artifacts-to-relayer-sdk-ui-zkaudit.js
```

## 2. cipherpay-zkaudit

If zkaudit UI imports anything from SDK, update paths in:
- `packages/zkaudit-ui/package.json`
- Any import statements

### Check if updates needed:

```bash
cd /home/sean/cipherpaylab/cipherpay-zkaudit
grep -r "cipherpay-sdk" .
grep -r "@cipherpay/sdk" .
```

If you find references, update to point to the new monorepo location.

## 3. cipherpay-relayer-solana

Check if relayer depends on the SDK:

```bash
cd /home/sean/cipherpaylab/cipherpay-relayer-solana
grep -r "cipherpay-sdk" .
```

If yes, update package.json dependency:

```diff
 "dependencies": {
-  "cipherpay-sdk": "file:../cipherpay-sdk",
+  "@cipherpay/sdk": "file:../cipherpay-app/packages/sdk",
 }
```

## 4. Documentation

Update any README files that reference the old structure:

```bash
# Search for references
cd /home/sean/cipherpaylab
grep -r "cipherpay-sdk" */README.md
grep -r "cipherpay-server" */README.md
grep -r "cipherpay-ui" */README.md
```

## 5. Git Submodules (if used)

If you're using git submodules, update `.gitmodules`:

```diff
-[submodule "cipherpay-sdk"]
-	path = cipherpay-sdk
-	url = https://github.com/yourorg/cipherpay-sdk
+[submodule "cipherpay-app"]
+	path = cipherpay-app
+	url = https://github.com/yourorg/cipherpay-app
```

## Quick Update Script

Run this to update all external references:

```bash
#!/bin/bash

echo "Updating cipherpay-circuits..."
cd /home/sean/cipherpaylab/cipherpay-circuits
sed -i 's|../cipherpay-sdk|../cipherpay-app/packages/sdk|g' scripts/copy-proof-artifacts-to-relayer-sdk-ui-zkaudit.js
sed -i 's|../cipherpay-ui|../cipherpay-app/packages/ui|g' scripts/copy-proof-artifacts-to-relayer-sdk-ui-zkaudit.js
echo "✓ cipherpay-circuits updated"

echo ""
echo "✓ External dependencies updated!"
echo ""
echo "Test the circuit copy script:"
echo "  cd /home/sean/cipherpaylab/cipherpay-circuits"
echo "  node scripts/copy-proof-artifacts-to-relayer-sdk-ui-zkaudit.js"
```

## Verification

After updating, verify everything works:

1. **Build SDK in monorepo:**
   ```bash
   cd /home/sean/cipherpaylab/cipherpay-app
   pnpm build:sdk
   ```

2. **Copy circuit artifacts:**
   ```bash
   cd /home/sean/cipherpaylab/cipherpay-circuits
   node scripts/copy-proof-artifacts-to-relayer-sdk-ui-zkaudit.js
   ```

3. **Build and run:**
   ```bash
   cd /home/sean/cipherpaylab/cipherpay-app
   pnpm build
   pnpm dev:server  # In one terminal
   pnpm dev:ui      # In another terminal
   ```

If everything works, you can archive the old directories:

```bash
cd /home/sean/cipherpaylab
mv cipherpay-sdk cipherpay-sdk.old
mv cipherpay-server cipherpay-server.old
mv cipherpay-ui cipherpay-ui.old
```
