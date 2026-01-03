# QUAD Doc Generator - VS Code Marketplace Publishing Guide

## Overview

This guide covers how to test, package, and publish the QUAD Doc Generator extension to the VS Code Marketplace.

---

## Prerequisites

### 1. Azure DevOps Account (Required for Publishing)

The VS Code Marketplace uses Azure DevOps for publisher accounts.

1. Go to https://dev.azure.com
2. Sign in with Microsoft account or create one
3. Create an organization (e.g., "a2vibecreators")

### 2. Personal Access Token (PAT)

Required to authenticate publishing:

1. Go to Azure DevOps → User Settings → Personal Access Tokens
2. Click "New Token"
3. Settings:
   - Name: `vscode-marketplace`
   - Organization: `a2vibecreators` (or your org)
   - Expiration: 1 year (maximum)
   - Scopes: Click "Show all scopes" → Check **Marketplace > Manage**
4. Copy the token immediately (shown only once)

### 3. Publisher Account

1. Go to https://marketplace.visualstudio.com/manage
2. Click "Create publisher"
3. Fill in:
   - **Publisher ID**: `a2vibecreators` (must match package.json)
   - **Display Name**: `A2Vibe Creators`
   - **Description**: Software development tools and frameworks
4. Verify your identity

### 4. Install VSCE (VS Code Extension CLI)

```bash
npm install -g @vscode/vsce
```

---

## Local Testing

### Step 1: Install Dependencies

```bash
cd quad-vscode-plugin
npm install
```

### Step 2: Compile TypeScript

```bash
npm run compile
```

### Step 3: Test in VS Code

**Option A: Launch Extension Host (Recommended)**

1. Open `quad-vscode-plugin` folder in VS Code
2. Press `F5` to launch Extension Development Host
3. In the new VS Code window, test the extension:
   - Open any code file
   - Select a function
   - Press `Cmd+Shift+D` (Mac) or `Ctrl+Shift+D` (Windows)
   - Verify documentation is generated

**Option B: Install Locally**

```bash
# Package the extension
npm run package

# Install the .vsix file
code --install-extension quad-doc-generator-1.0.0.vsix
```

### Step 4: Test All Features

| Feature | How to Test | Expected Result |
|---------|-------------|-----------------|
| Document Function | `Cmd+Shift+D` on a function | JSDoc/TSDoc comment added |
| Document Selection | Select code, `Cmd+Alt+D` | Documentation for selection |
| Explain Code | Select code, `Cmd+Shift+E` | Explanation panel opens |
| Set API Key | Command palette → "QUAD: Set Gemini API Key" | Key saved |
| Set Language | Command palette → "QUAD: Set Response Language" | Language picker shown |
| Multilingual | Set language to Telugu, explain code | Telugu explanation |

---

## Pre-Publishing Checklist

Before publishing, verify these items:

- [ ] **package.json** has correct:
  - `name`: `quad-doc-generator`
  - `displayName`: `QUAD Doc Generator`
  - `publisher`: `a2vibecreators`
  - `version`: `1.0.0`
  - `repository.url`: Points to GitHub
  - `icon`: 128x128 PNG exists at `assets/icon.png`

- [ ] **README.md** exists with:
  - Features list
  - Installation instructions
  - Usage examples with screenshots
  - Configuration options
  - API key setup guide

- [ ] **CHANGELOG.md** exists with version history

- [ ] **LICENSE** file exists (MIT)

- [ ] **Icon** exists at `assets/icon.png` (128x128, PNG)

- [ ] All tests pass

- [ ] No console.log statements in production code

- [ ] Secrets/API keys are NOT hardcoded

---

## Packaging

### Build the VSIX Package

```bash
# Clean and compile
npm run compile

# Package (creates .vsix file)
npm run package
# OR
vsce package
```

This creates `quad-doc-generator-1.0.0.vsix`

### Verify Package Contents

```bash
# List contents
vsce ls

# Expected files:
# extension.vsixmanifest
# package.json
# dist/extension.js
# README.md
# CHANGELOG.md
# LICENSE
# assets/icon.png
```

---

## Publishing

### Method 1: Command Line (Recommended)

```bash
# Login to publisher (first time only)
vsce login a2vibecreators
# Enter your Personal Access Token when prompted

# Publish
vsce publish

# Publish specific version
vsce publish 1.0.0

# Publish with version bump
vsce publish minor  # 1.0.0 → 1.1.0
vsce publish patch  # 1.0.0 → 1.0.1
```

### Method 2: Web Upload

1. Go to https://marketplace.visualstudio.com/manage/publishers/a2vibecreators
2. Click "New extension" → "Visual Studio Code"
3. Upload the `.vsix` file
4. Fill in additional details

### Method 3: CI/CD Pipeline (GitHub Actions)

Create `.github/workflows/publish.yml`:

```yaml
name: Publish Extension

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: npm run compile
      - name: Publish to Marketplace
        run: npx vsce publish -p ${{ secrets.VSCE_PAT }}
        env:
          VSCE_PAT: ${{ secrets.VSCE_PAT }}
```

Add `VSCE_PAT` secret in GitHub repository settings.

---

## Post-Publishing

### Verify Listing

1. Go to https://marketplace.visualstudio.com/items?itemName=a2vibecreators.quad-doc-generator
2. Verify:
   - Icon displays correctly
   - Description is accurate
   - Installation works
   - All features listed

### Monitor

- Check ratings and reviews
- Monitor download counts
- Respond to issues on GitHub

### Update

When releasing updates:

```bash
# Update version in package.json
# Update CHANGELOG.md

# Publish new version
vsce publish
```

---

## Troubleshooting

### "publisher does not exist"

- Verify publisher ID matches exactly (case-sensitive)
- Create publisher at https://marketplace.visualstudio.com/manage

### "Invalid personal access token"

- PAT must have Marketplace > Manage scope
- PAT must not be expired
- Regenerate if needed

### "Extension validation failed"

Check:
- Icon is 128x128 PNG
- README.md exists
- No invalid characters in name
- Repository URL is valid

### "File not found: dist/extension.js"

Run compile before packaging:
```bash
npm run compile && vsce package
```

---

## Marketplace Listing Optimization

### SEO Keywords

Include in description and README:
- AI documentation
- code documentation
- JSDoc generator
- Python docstrings
- TypeScript documentation
- multilingual
- Gemini AI
- free

### Categories

- Programming Languages
- Formatters
- Other

### Gallery Banner

In `package.json`:
```json
"galleryBanner": {
  "color": "#1e1e1e",
  "theme": "dark"
}
```

### Preview Images

Add to README.md:
- Screenshot of documentation generation
- Screenshot of multilingual support
- GIF of keyboard shortcut usage

---

## Pricing Strategy

**QUAD Doc Generator is FREE**

- No payment required
- No premium features
- No subscription

**Revenue Model:**
- Entry point to QUAD Framework ecosystem
- Upsell to full QUAD platform
- Brand awareness for A2Vibe Creators

---

## Support Links

| Resource | URL |
|----------|-----|
| VS Code Marketplace Docs | https://code.visualstudio.com/api/working-with-extensions/publishing-extension |
| VSCE CLI Reference | https://github.com/microsoft/vscode-vsce |
| Extension Manifest | https://code.visualstudio.com/api/references/extension-manifest |
| Azure DevOps | https://dev.azure.com |

---

## Quick Reference

```bash
# Install VSCE
npm install -g @vscode/vsce

# Login
vsce login a2vibecreators

# Compile
npm run compile

# Package
vsce package

# Publish
vsce publish

# Publish with version bump
vsce publish patch  # 1.0.0 → 1.0.1
vsce publish minor  # 1.0.0 → 1.1.0
vsce publish major  # 1.0.0 → 2.0.0
```

---

*Last Updated: January 3, 2026*
*A2Vibe Creators LLC*
