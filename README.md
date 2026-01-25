# Custom Threads Online Store

A React TypeScript ecommerce application with admin dashboard capabilities.

## Prerequisites

- Node.js (v18+) and npm
- Git

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
The app will automatically open in your browser at `http://localhost:5173`

### 3. Build for Production
```bash
npm run build
```

### 4. Preview Production Build
```bash
npm run preview
```

## GitHub Setup & Backup

### Initial Setup (First Time)

If you haven't already set up a GitHub repository:

1. **Create a GitHub repository** at https://github.com/new
   - Repository name: `online_store` (or your preferred name)
   - Make it private or public as needed
   - Do NOT initialize with README (we already have files)
   - Do NOT add .gitignore (we have one)

2. **Initialize Git & Connect to GitHub** (run in the project directory):
```bash
git init
git add .
git commit -m "Initial commit: Project setup with Vite, TypeScript, and React"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/online_store.git
git push -u origin main
```
Replace `YOUR_USERNAME` and `online_store` with your actual GitHub username and repository name.

### Regular Backup Workflow

After making changes, save them to GitHub:

```bash
# Check status of changes
git status

# Stage all changes
git add .

# Commit with a descriptive message
git commit -m "Description of your changes"

# Push to GitHub
git push
```

### VS Code Integration

VS Code has built-in Git integration:
- **Source Control tab** (Ctrl+Shift+G): View and manage changes
- **Stage files**: Click the + button next to changed files
- **Commit**: Type your message and click the checkmark
- **Push/Pull**: Use the ... menu at the top of the Source Control panel

## Project Structure

```
├── components/           # React components
│   ├── admin/           # Admin-specific components
│   └── ...              # General components
├── pages/               # Page components
│   └── admin/           # Admin pages
├── context/             # React Context for state management
├── hooks/               # Custom React hooks
├── services/            # API and utility services
├── App.tsx              # Root component
├── index.tsx            # Entry point
├── index.html           # HTML template
└── types.ts             # TypeScript type definitions
```

## Development Tips

- **Auto-save**: VS Code can auto-commit changes. Configure in Settings > Git: Auto Fetch & Auto Commit
- **Type checking**: Run `npm run type-check` to validate TypeScript
- **Hot Module Replacement (HMR)**: Vite automatically reloads on file changes during development

## Environment Variables

Create a `.env` file in the project root for any API keys or configuration:
```
VITE_API_KEY=your_key_here
```

Access in code with: `import.meta.env.VITE_API_KEY`

## Troubleshooting

- **Port already in use**: Change the port in `vite.config.ts`
- **node_modules issues**: Delete `node_modules` folder and `package-lock.json`, then run `npm install`
- **Git authentication**: Use a GitHub Personal Access Token if SSH is not configured

## Support

For issues with:
- **Vite**: https://vitejs.dev
- **React**: https://react.dev
- **TypeScript**: https://www.typescriptlang.org
