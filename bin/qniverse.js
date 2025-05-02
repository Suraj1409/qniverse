#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');
const QuantumCircuit = require('./quantum-circuit.js');

// Parse CLI args
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h') || args.length < 1) {
    console.log(`
Usage: qniverse <file.qasm> [options]

Options:
  -p, --platform <qiskit|cirq|cudaq>     Target platform (default: qiskit)
  -b, --backend <backend_name>           Backend name (optional)
  -h, --help                             Show this help message
`);
    process.exit(0);
}

let filename = args[0];
if (!filename.endsWith('.qasm') && fs.existsSync(`${filename}.qasm`)) {
    filename += '.qasm';
}

if (!fs.existsSync(filename)) {
    console.error('❌ QASM file not found:', filename);
    process.exit(1);
}

// Helper to get CLI flag values
function getArgValue(shortFlag, longFlag) {
    const index = args.indexOf(shortFlag) !== -1 ? args.indexOf(shortFlag) : args.indexOf(longFlag);
    if (index !== -1 && args[index + 1]) {
        return args[index + 1];
    }
    return null;
}

// Defaults
let platform = 'qiskit';
let backendName = '';

// Platform and backend from args
const platformArg = getArgValue('-p', '--platform');
if (platformArg) platform = platformArg.toLowerCase();

const backendArg = getArgValue('-b', '--backend');
if (backendArg) backendName = backendArg;

// Valid backends
const validBackends = {
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
    cudaq: ['nvidia']
};

// Read and parse QASM
const qasmCode = fs.readFileSync(filename, 'utf8');
const circuit = new QuantumCircuit();

try {
    circuit.importQASM(qasmCode);
} catch (error) {
    console.error("❌ Error parsing QASM:", error.message);
    process.exit(1);
}

// Validate backend
if (backendName && validBackends[platform]) {
    if (!validBackends[platform].includes(backendName)) {
        console.error(`❌ Invalid backend '${backendName}' for platform '${platform}'.`);
        console.error(`Valid backends: ${validBackends[platform].join(', ')}`);
        process.exit(1);
    }
}

// Export code
let code = '';
try {
    switch (platform) {
        case 'qiskit':
            code = circuit.exportToQiskit({ backendName });
            break;
        case 'cirq':
            code = circuit.exportToCirq({ backendName });
            break;
        case 'cudaq':
            code = circuit.exportToCudaQ({ backendName });
            break;
        default:
            console.error(`❌ Unknown platform '${platform}'. Use qiskit, cirq, or cudaq.`);
            process.exit(1);
    }
} catch (error) {
    console.error('❌ Error exporting code:', error.message);
    process.exit(1);
}

// Write code to a temp file
const tmpFile = path.join(os.tmpdir(), `qniverse_${Date.now()}.py`);
fs.writeFileSync(tmpFile, code, 'utf8');

// Run the Python code from the .qniverse-venv
try {
    const venvPython = path.resolve(__dirname, '.qniverse-venv/bin/python');
    const output = execSync(`${venvPython} ${tmpFile}`, { encoding: 'utf8' });
    console.log(output);
} catch (err) {
    console.error('❌ Error running the converted code:', err.message);
    process.exit(1);
}

