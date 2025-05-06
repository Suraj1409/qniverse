#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const QuantumCircuit = require(path.join(__dirname, '../lib/quantum-circuit.js'));

const backendPlatformMap = {
    qiskit: [
        'qasm_simulator',
        'aer_simulator_statevector',
        'aer_simulator_density_matrix',
    ],
    cirq: [
        'cirq_simulator',
    ]
};

function showHelp() {
    console.log(`
Usage:
  qniverse <input.qasm> -b <backend>

Options:
  -b, --backend      Specify simulator backend (see --available)
  --available        List all available simulators
  --help             Show this help message

Examples:
  qniverse code.qasm -b qasm_simulator
  qniverse code.qasm -b cirq_simulator
`);
}

function showAvailableSimulators() {
    console.log("Available simulators:\n");
    for (const [platform, simulators] of Object.entries(backendPlatformMap)) {
        console.log(`${platform}:`);
        simulators.forEach(sim => console.log(`  - ${sim}`));
        console.log();
    }
}

const args = process.argv.slice(2);

if (args.includes('--help')) {
    showHelp();
    process.exit(0);
}

if (args.includes('--available')) {
    showAvailableSimulators();
    process.exit(0);
}

if (args.length < 3) {
    console.error("Invalid usage. Use '--help' for instructions.");
    process.exit(1);
}

// Get input file and backend
const inputFile = args[0];
function getArg(flag) {
    const index = args.indexOf(flag);
    return (index !== -1 && args[index + 1]) ? args[index + 1] : null;
}
const backendName = getArg('-b') || getArg('--backend');

if (!backendName) {
    console.error("Missing required -b <backend> argument. Use --available to list simulators.");
    process.exit(1);
}

// Detect platform
let platform = null;
for (const [plat, backends] of Object.entries(backendPlatformMap)) {
    if (backends.includes(backendName)) {
        platform = plat;
        break;
    }
}
if (!platform) {
    console.error(`Unknown backend '${backendName}'. Use --available to list valid simulators.`);
    process.exit(1);
}

// Read QASM
let qasmCode;
try {
    qasmCode = fs.readFileSync(inputFile, 'utf8');
} catch (e) {
    console.error("Error reading file:", e.message);
    process.exit(1);
}

// Generate code
const circuit = new QuantumCircuit();
try {
    circuit.importQASM(qasmCode);
} catch (e) {
    console.error("Invalid QASM:", e.message);
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

const tmpFile = `/tmp/qniverse_${Date.now()}.py`;
fs.writeFileSync(tmpFile, generatedCode);

// Run code
const pythonPath = path.join(__dirname, '..', '.qniverse-venv', 'bin', 'python');
try {
    const output = execSync(`${pythonPath} ${tmpFile}`, { encoding: 'utf8' });
    console.log(output);
} catch (e) {
    console.error("Error running the converted code:", e.message);
}
