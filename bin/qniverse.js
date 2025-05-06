#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const QuantumCircuit = require(path.join(__dirname, '../lib/quantum-circuit.js'));

// Parse args
const args = process.argv.slice(2);
if (args.length < 1) {
    console.error("Usage: qniverse <input.qasm> -b <backend>");
    process.exit(1);
}

const inputFile = args[0];

// Helper to get flag value
function getArg(flag) {
    const index = args.indexOf(flag);
    return (index !== -1 && args[index + 1]) ? args[index + 1] : null;
}

const backendName = getArg('-b');
if (!backendName) {
    console.error("❌ Missing required -b <backend> argument.");
    process.exit(1);
}

// Map backends to platforms
const backendPlatformMap = {
    qiskit: [
        'qasm_simulator',
        'aer_simulator_statevector',
        'aer_simulator_density_matrix',
        'aer_simulator_statevector_gpu'
    ],
    cirq: [
        'cirq_simulator',
        'qsimcirq_simulator',
        'qsimcirq_simulator_gpu'
    ],
    cudaq: [
        'nvidia'
    ]
};

// Detect platform from backend
let platform = null;
for (const [plat, backends] of Object.entries(backendPlatformMap)) {
    if (backends.includes(backendName)) {
        platform = plat;
        break;
    }
}

if (!platform) {
    console.error(`❌ Unknown backend '${backendName}'.`);
    console.error("Valid backends are:");
    for (const [plat, backends] of Object.entries(backendPlatformMap)) {
        console.error(`- ${plat}: ${backends.join(', ')}`);
    }
    process.exit(1);
}

// Read QASM
let qasmCode;
try {
    qasmCode = fs.readFileSync(inputFile, 'utf8');
} catch (e) {
    console.error("❌ Error reading file:", e.message);
    process.exit(1);
}

// Parse and export code
const circuit = new QuantumCircuit();
try {
    circuit.importQASM(qasmCode);
} catch (e) {
    console.error("❌ Invalid QASM:", e.message);
    process.exit(1);
}

let generatedCode;
switch (platform) {
    case 'qiskit':
        generatedCode = circuit.exportToQiskit({ backendName });
        break;
    case 'cirq':
        generatedCode = circuit.exportToCirq({ backendName });
        break;
    case 'cudaq':
        generatedCode = circuit.exportToCudaQ({ backendName });
        break;
}

// Write and run
const tmpFile = `/tmp/qniverse_${Date.now()}.py`;
fs.writeFileSync(tmpFile, generatedCode);

const pythonPath = path.join(__dirname, '..', '.qniverse-venv', 'bin', 'python');
try {
    const output = execSync(`${pythonPath} ${tmpFile}`, { encoding: 'utf8' });
    console.log(output);
} catch (e) {
    console.error("❌ Failed to run code:", e.message);
}
