#!/bin/bash
# Model Download Script for RoboKids Space Academy
# Downloads CC-licensed 3D models for the space simulator
#
# Sources:
# - Mixamo (https://www.mixamo.com) - Animated characters (CC-licensed)
# - Sketchfab (https://sketchfab.com) - 3D models (CC-licensed)
# - Poly Pizza (https://poly.pizza) - Low-poly models
#
# Usage: npm run download-models

set -e

MODELS_DIR="public/models"
mkdir -p "$MODELS_DIR"

echo "📦 Downloading 3D models for RoboKids Space Academy..."
echo ""

# Function to download file with progress
download_file() {
    local url=$1
    local output=$2
    echo "  ⬇️  Downloading: $url"
    curl -sL -o "$output" "$url"
    echo "  ✅ Saved to: $output"
}

# Astronaut character - CC-licensed from Mixamo/Sketchfab
# Note: Replace with actual CC-licensed model URLs from your source
ASTRONAUT_URL="${ASTRONAUT_MODEL_URL:-}"
if [ -z "$ASTRONAUT_URL" ]; then
    echo "⚠️  ASTRONAUT_MODEL_URL not set. Using procedural astronaut."
    echo "   To download a real astronaut model:"
    echo "   1. Get a CC-licensed astronaut.glb from Mixamo or Sketchfab"
    echo "   2. Set ASTRONAUT_MODEL_URL environment variable"
    echo "   3. Re-run this script"
else
    download_file "$ASTRONAUT_URL" "$MODELS_DIR/astronaut.glb"
fi

# Rover/Robot - CC-licensed from Sketchfab/Poly Pizza
ROVER_URL="${ROVER_MODEL_URL:-}"
if [ -z "$ROVER_URL" ]; then
    echo "⚠️  ROVER_MODEL_URL not set. Using procedural rover."
    echo "   To download a real rover model:"
    echo "   1. Get a CC-licensed rover.glb from Sketchfab or Poly Pizza"
    echo "   2. Set ROVER_MODEL_URL environment variable"
    echo "   3. Re-run this script"
else
    download_file "$ROVER_URL" "$MODELS_DIR/rover.glb"
fi

# Space Station
STATION_URL="${STATION_MODEL_URL:-}"
if [ -z "$STATION_URL" ]; then
    echo "⚠️  STATION_MODEL_URL not set. Using procedural space station."
else
    download_file "$STATION_URL" "$MODELS_DIR/spacestation.glb"
fi

# Asteroids
ASTEROID1_URL="${ASTEROID1_MODEL_URL:-}"
if [ -n "$ASTEROID1_URL" ]; then
    download_file "$ASTEROID1_URL" "$MODELS_DIR/asteroid1.glb"
fi

echo ""
echo "✅ Model download complete!"
echo ""
echo "Model files location: $MODELS_DIR/"
ls -la "$MODELS_DIR/" 2>/dev/null || echo "  (no files yet - set environment variables to download)"
echo ""
echo "Recommended sources for CC-licensed models:"
echo "  - Mixamo: https://www.mixamo.com (free account required)"
echo "  - Sketchfab: https://sketchfab.com (filter by CC license)"
echo "  - Poly Pizza: https://poly.pizza (all CC-licensed)"
echo "  - Clara.io: https://clara.io (CC-licensed models)"
echo ""
echo "Note: Ensure downloaded models are <5MB each for web performance."