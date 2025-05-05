#!/bin/bash

echo "🔧 Setting up qniverse virtual environment..."

cd "$(dirname "$0")"
python3 -m venv .qniverse-venv
source .qniverse-venv/bin/activate

echo "📦 Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "✅ Python environment ready."

echo "🔗 Linking qniverse CLI..."
chmod +x bin/qniverse.js
sudo ln -sf "$(pwd)/bin/qniverse.js" /usr/local/bin/qniverse

echo "🎉 Done! You can now run: qniverse <file.qasm> -p qiskit -b qasm_simulator"
