#!/usr/bin/env bash
# ==============================================================
# ShopSphere Jenkins Setup & Launch Helper Script
# ==============================================================

set -e

echo "=========================================================="
echo "🚀 Starting ShopSphere Jenkins CI/CD Controller..."
echo "=========================================================="

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed or not in PATH."
    echo "Please install Docker Desktop or Docker Engine first."
    exit 1
fi

# Ensure docker socket permissions
if [ -S /var/run/docker.sock ]; then
    echo "🐳 Docker socket detected at /var/run/docker.sock"
fi

# Start Jenkins container via docker compose
echo "📦 Spinning up Jenkins service on port 8080..."
docker compose up -d jenkins

echo ""
echo "⏳ Waiting for Jenkins to initialize (~15-30 seconds)..."
until curl -s -f -o /dev/null "http://localhost:8080/login" || [ $SECONDS -ge 60 ]; do
    printf "."
    sleep 2
done

echo ""
echo "=========================================================="
echo "✅ Jenkins is ready and accessible!"
echo "🌐 URL:      http://localhost:8080"
echo "👤 Username: admin"
echo "🔑 Password: admin"
echo "📂 Pipeline: 'shopsphere-ci-cd' is already pre-configured!"
echo "=========================================================="
echo ""
echo "To view live Jenkins logs, run:"
echo "  docker compose logs -f jenkins"
