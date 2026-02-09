#!/bin/bash
# ==========================================
# hans-ai-dashboard - Git Setup Script
# ==========================================

REPO_NAME="hans-ai-dashboard"
GITHUB_USER="HemantLaravel"
GITHUB_REPO="https://github.com/$GITHUB_USER/$REPO_NAME.git"

echo "🔧 Setting up Git for $REPO_NAME..."
echo ""

# Configure git
git config user.name "Hemant Kumar"
git config user.email "hemant@example.com"

# Add remote
git remote add origin $GITHUB_REPO

# Create main branch
git checkout -b main

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit - Hans AI Dashboard

- Modern AI dashboard for managing your personal AI assistant
- Built with Next.js 14, TypeScript, and Tailwind CSS
- Multi-agent management interface
- Real-time chat interface
- Memory browser with semantic search
- Channel management for messaging platforms
- Activity monitoring and analytics
- Responsive design with dark mode

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
"

echo "✅ Git initialized for $REPO_NAME"
echo ""
echo "🚀 To push to GitHub, run:"
echo "   git push -u origin main"
echo ""
echo "📁 Repository: https://github.com/$GITHUB_USER/$REPO_NAME"