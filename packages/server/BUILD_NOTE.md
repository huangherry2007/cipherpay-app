# Server Build Note

## Current Status

The server source code has TypeScript strict type errors from uncommitted changes. These errors prevent the TypeScript compiler from completing the build.

## Errors

- `src/routes/account.overview.post.ts` - Optional vs required property mismatch
- `src/routes/auth.verify.ts` - Type compatibility issues
- `src/routes/users.lookup.post.ts` - Logger overload issues
- `src/routes/users.username.available.get.ts` - Logger overload issues

## Workarounds

### For Development (Recommended)
Use the dev mode which uses `tsx` (runtime TypeScript) and works perfectly:

```bash
pnpm dev:server
# or
cd packages/server && pnpm dev
```

This will run the server with hot reload and doesn't require a build step.

### For Production
The `dist/` folder contains a working build copied from the original repo. You can use:

```bash
pnpm start
# or
cd packages/server && pnpm start
```

## To Fix Permanently

1. **Option 1:** Fix the type errors in the source files
   - Update the route files to have proper type annotations
   - Make optional properties required or handle them properly

2. **Option 2:** Commit/restore from the original repo
   ```bash
   cd /home/sean/cipherpaylab/cipherpay-server
   git restore src/routes/account.overview.post.ts
   git restore src/routes/auth.verify.ts
   git restore src/routes/users.lookup.post.ts
   git restore src/routes/users.username.available.get.ts
   # Then re-copy to monorepo
   ```

3. **Option 3:** Use committed versions
   Check out the committed version of these files from the original repository and copy them to the monorepo.

## Why Development Works

The `tsx` tool (used by `pnpm dev`) runs TypeScript directly without full type checking, so it works despite the type errors. This is perfect for development!

## Recommendation

**Use development mode for now:**
```bash
cd /home/sean/cipherpaylab/cipherpay-app
pnpm dev:server  # Works perfectly!
pnpm dev:ui      # Also works!
```

The server will run fine, and you can fix the type errors at your convenience.
