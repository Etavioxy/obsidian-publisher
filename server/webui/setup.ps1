# Quick start script for development (Windows)

Write-Host "🚀 Obsidian Publisher Web UI - Development Setup" -ForegroundColor Cyan
Write-Host "=================================================="
Write-Host ""

# Check if pnpm is installed
$pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
if (-not $pnpm) {
    Write-Host "❌ pnpm is not installed. Please install it:" -ForegroundColor Red
    Write-Host "   npm install -g pnpm"
    exit 1
}

Write-Host "📦 Installing dependencies..."
pnpm install

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Available commands:"
Write-Host "   pnpm dev        - Start development server (http://localhost:3000)"
Write-Host "   pnpm build      - Build for production"
Write-Host "   pnpm preview    - Preview production build"
Write-Host "   pnpm test       - Run tests"
Write-Host ""
Write-Host "🔗 For development with mock API:"
Write-Host "   PowerShell 1: node build/mock-api-server.mjs"
Write-Host "   PowerShell 2: pnpm dev"
Write-Host ""
Write-Host "🔗 For development with Rust backend:"
Write-Host "   PowerShell 1: cd ../.. ; cargo run (in server dir)"
Write-Host "   PowerShell 2: pnpm dev"
Write-Host ""
