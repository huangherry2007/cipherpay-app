# Push cipherpay-app to GitHub

## Done locally

- Git repo initialized in `cipherpay-app`
- Branch set to `main`
- Initial commit created (267 files)

## Push to GitHub

### 1. Create the repo on GitHub

1. Open https://github.com/new
2. **Repository name:** `cipherpay-app` (or e.g. `cipherpay-app-monorepo`)
3. **Description:** e.g. "CipherPay monorepo – SDK, server, UI"
4. Choose **Public** or **Private**
5. Do **not** add a README, .gitignore, or license (they already exist)
6. Click **Create repository**

### 2. Add remote and push

Replace `YOUR_USERNAME` and `YOUR_REPO` with your GitHub user/org and repo name:

```bash
cd /home/sean/cipherpaylab/cipherpay-app

# Add GitHub as remote (use SSH or HTTPS)
# HTTPS:
git remote add origin https://github.com/YOUR_USERNAME/cipherpay-app.git

# Or SSH:
# git remote add origin git@github.com:YOUR_USERNAME/cipherpay-app.git

# Push
git push -u origin main
```

### 3. If you use a different repo name

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

### 4. Verify

- Open `https://github.com/YOUR_USERNAME/cipherpay-app` (or your repo URL)
- You should see the monorepo with `packages/sdk`, `packages/server`, `packages/ui`

## Later: push new changes

```bash
cd /home/sean/cipherpaylab/cipherpay-app
git add -A
git status
git commit -m "your message"
git push
```
