#!/bin/bash

echo "[*] Setting up qniverse..."

cd "$(dirname "$0")"

if [ ! -d ".qniverse-venv" ]; then
    echo "[*] Creating Python virtual environment..."
    python3 -m venv .qniverse-venv
fi

source .qniverse-venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate

chmod +x bin/qniverse.js

# Create symlink
sudo ln -sf "$(pwd)/bin/qniverse.js" /usr/local/bin/qniverse

echo "Installation Complete, Try: qniverse file.qasm -p qiskit -b qasm_simulator"
