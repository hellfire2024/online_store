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
When `git push` prompts you:
- **Username**: Enter your EMAIL: `hellfire67878@gmail.com` (NOT your GitHub username)
- **Password**: Paste your Personal Access Token (starts with `github_pat_`)

Make sure you're running this from your project directory:
```powershell
cd C:\Temp\online_store
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

1. **Make changes** in VS Code
2. **Open Source Control** (Ctrl+Shift+G)
3. **Stage changes** (click + next to changed files or click "Stage All Changes")
4. **Add a commit message** describing your changes
5. **Commit** (click checkmark button)
6. **Push to GitHub** (click ... menu → Push)

Or use the terminal:
```powershell
git add .
git commit -m "Your change description"
git push
```

---

## Essential VS Code Extensions (Recommended)

Install these extensions for a better development experience:

1. **ES7+ React/Redux/React-Native snippets** - dsznajder.es7-react-js-snippets
2. **TypeScript Vue Plugin (Volar)** - Vue.vscode-typescript-vue-plugin
3. **Tailwind CSS IntelliSense** - bradlc.vscode-tailwindcss
4. **Prettier - Code formatter** - esbenp.prettier-vscode
5. **GitLens — Git supercharged** - eamodio.gitlens

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
