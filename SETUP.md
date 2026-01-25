# VS Code Setup Guide for Custom Threads Online Store

## Step-by-Step Setup Instructions

### Step 1: Install Git (If Not Already Installed)
Git is required for version control and GitHub backup.

**Windows:**
- Download from https://git-scm.com/download/win
- Run the installer and accept default options
- Restart VS Code after installation

**Verify installation:**
```powershell
git --version
```

### Step 2: Configure Git (First Time Only)
```powershell
git config --global user.name "Your Name"
git config --global user.email "hellfire67878@gmail.com"
```

### Step 3: Initialize Git Repository
In the project folder, run:
```powershell
git init
git add .
git commit -m "Initial commit: Project setup with Vite, TypeScript, and React"
git branch -M main
```

### Step 4: Create GitHub Repository
1. Go to https://github.com/new
2. Create a new repository (name it `online_store` or similar)
3. **Do NOT** initialize with README, .gitignore, or license
4. Click "Create repository"

### Step 5: Connect Local Git to GitHub
Run the following commands to connect your local repository to GitHub:

```powershell
git remote add origin https://github.com/hellfire2024/online_store.git
git push -u origin main
```

**Note on Authentication:** GitHub requires a Personal Access Token (PAT) for HTTPS authentication:

1. Go to https://github.com/settings/tokens/new
2. For **Fine-grained personal access tokens** (recommended for private repos):
   - **Token name**: `online_store_dev`
   - **Expiration**: 90 days or longer
   - **Repository access**: Select "Only select repositories" → Choose your `online_store` repository
   - **Permissions**:
     - Repository → Contents: Read and write
3. Click **"Generate token"** and copy it immediately
4. When `git push` prompts for password, paste your token instead (do NOT store it in files or documents)

To save credentials so you don't have to paste the token every time:
```powershell
git config --global credential.helper wincred
```
Your token will be securely stored in Windows Credential Manager.

**CRITICAL - Authentication Details:**
When `git push` prompts you, use your **fine-grained token**:
- **Username**: `hellfire2024` (your GitHub username)
- **Password**: Paste your fine-grained Personal Access Token (starts with `github_pat_`)

Make sure you're running this from your project directory:
```powershell
cd C:\Temp\online_store
git push -u origin main
```

**Alternative - Use SSH (More Secure):**
If authentication keeps failing, use SSH instead:
1. Generate SSH key: https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-gpg-key
2. Add key to GitHub: https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account
3. Change remote URL:
```powershell
git remote set-url origin git@github.com:hellfire2024/online_store.git
git push -u origin main
```

---

## Starting Development

### Launch Development Server
```powershell
npm run dev
```

This will:
- Start a live development server at `http://localhost:5173`
- Automatically open in your browser
- Hot reload on file changes

### Making Changes & Backing Up to GitHub

**VS Code GUI Method (Easiest - No Terminal):**

1. **Make changes** in VS Code
2. **Open Source Control** (Ctrl+Shift+G or left sidebar)
3. **See all changed files** listed
4. **Click `+` next to each file** to stage (or click "Stage All Changes")
5. **Type your commit message** in the message box at top
6. **Click the checkmark ✓** to commit
7. **Click `...` menu → Push** to push to GitHub

**Or use the terminal:**
```powershell
git add .
git commit -m "Your change description"
git push
```

**With GitHub Pull Requests Extension (Recommended):**
1. Do steps 1-6 above on a feature branch
2. Click "Create Pull Request" in VS Code (GitHub extension)
3. Add description
4. Click "Create"
5. When ready, click "Merge" in the PR view
6. Your code is merged to main and pushed automatically

---

## Essential VS Code Extensions (Recommended)

Install these extensions for a better development experience:

1. **ES7+ React/Redux/React-Native snippets** - dsznajder.es7-react-js-snippets
2. **Tailwind CSS IntelliSense** - bradlc.vscode-tailwindcss
3. **Prettier - Code formatter** - esbenp.prettier-vscode
4. **GitLens — Git supercharged** - eamodio.gitlens
5. **GitHub Pull Requests** - GitHub.vscode-pull-request-github (for Pull Requests from VS Code)
6. **Git Graph** - mhutchie.git-graph (visual commit history)

**Recommended for automated workflow:**
- Install "GitHub Pull Requests" extension to create and merge PRs without leaving VS Code
- GitLens shows commit history inline in your code

---

## Development Workflow

### File Structure
```
src/
├── components/           # Reusable React components
├── pages/               # Page-level components
├── context/             # React Context state management
├── hooks/               # Custom React hooks
├── services/            # API and utility functions
├── App.tsx              # Root component
├── index.tsx            # Entry point
└── types.ts             # TypeScript definitions
```

### Available npm Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run type-check` - Run TypeScript type checking

### Code Changes & Version Control

**Every session:**
```
1. npm run dev          # Start dev server
2. Make changes in VS Code
3. Test changes in browser
4. git add .            # Stage changes
5. git commit -m "..."  # Create commit
6. git push             # Back up to GitHub
```

**Recommended: Hourly Commit & Push Workflow**

For frequent saves without Pull Requests (quick solo development):
```powershell
# Every hour or when you've made progress:
git add .
git commit -m "WIP: Working on [feature name]"
git push
```

**Professional: Feature Branch + Pull Request Workflow**

For better code organization (recommended best practice):
```powershell
# Start a new feature
git checkout -b feature/feature-name
git push -u origin feature/feature-name

# Work with hourly commits
git add .
git commit -m "WIP: [what you did]"
git push

# When feature is complete
git commit -m "Feature: [description]"
git push

# Create Pull Request on GitHub.com
# Review your changes, then merge to main
git checkout main
git pull
git merge feature/feature-name
git push
```

**Commit Message Best Practices:**
- `WIP: ` - Work in progress (hourly commits)
- `Feature: ` - New feature complete
- `Fix: ` - Bug fix
- `Refactor: ` - Code cleanup
- `Docs: ` - Documentation updates

---

## Troubleshooting

### Port 5173 already in use?
Edit `vite.config.ts` and change the port number:
```typescript
server: {
  port: 5174,  // Change this number
}
```

### Node modules issues?
```powershell
Remove-Item node_modules -Recurse
Remove-Item package-lock.json
npm install
```

### Git not found?
Restart VS Code after installing Git

### Push rejected?
Make sure you've set the correct remote:
```powershell
git remote -v  # Check your remote URL
```

### Need to sync with latest GitHub changes?
```powershell
git pull
```

---

## GitHub Backup Verification

Check that your changes are backed up:
1. Go to your GitHub repository URL
2. You should see your latest commits listed
3. Click on commits to see the file changes

---

## Next Steps

1. Install Git if needed
2. Complete Steps 1-5 above
3. Run `npm run dev` to start developing
4. Start making changes and committing regularly
5. Refer to [README.md](README.md) for project details
