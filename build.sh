#!/bin/bash

# Inject GraphHopper API Key into map.js during Render deployment
if [ -z "$GRAPHHOPPER_API_KEY" ]; then
  echo "Error: GRAPHHOPPER_API_KEY environment variable not set"
  exit 1
fi

echo "Injecting GraphHopper API key into map.js..."
sed -i "s/\[YOUR_API_KEY\]/$GRAPHHOPPER_API_KEY/g" map.js

# Verify the substitution worked
if grep -q "\[YOUR_API_KEY\]" map.js; then
  echo "Error: API key placeholder still found in map.js after substitution"
  exit 1
fi

echo "✓ GraphHopper API key injected successfully"
echo "✓ Build complete"
