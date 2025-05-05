#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const QuantumCircuit = require(path.join(__dirname, '../lib/quantum-circuit.js'));

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 1) {
    console.error("Usage: qniverse <input.qasm> [-p platform] [-b backend]");
    process.exit(1);
}

const inputFile = args[0];
let platform = 'qiskit';
let backendName = '';

// Helper: Get flag value
function getArg(flagShort, flagLong) {
    const index = args.indexOf(flagShort) !== -1 ? args.indexOf(flagShort) : args.indexOf(flagLong);
    return (index !== -1 && args[index + 1]) ? args[index + 1] : null;
}

const platformArg = getArg('-p', '--platform');
if (platformArg) platform = platformArg.toLowerCase();

const backendArg = getArg('-b', '--backend');
if (backendArg) backendName = backendArg;

const validBackends = {
    qiskit: ['qasm_simulator', 'aer_simulator_statevector', 'aer_simulator_density_matrix', 'aer_simulator_statevector_gpu'],
    cirq: ['cirq_simulator', 'qsimcirq_simulator', 'qsimcirq_simulator_gpu'],
    cudaq: ['nvidia']
};

// Validate backend
if (backendName && !(validBackends[platform] || []).includes(backendName)) {
    console.error(`❌ Invalid backend '${backendName}' for platform '${platform}'.`);
    console.error(`Valid options: ${validBackends[platform].join(', ')}`);
    process.exit(1);
}

// Read QASM file
let qasmCode;
try {
    qasmCode = fs.readFileSync(inputFile, 'utf8');
} catch (e) {
    console.error("❌ Error reading QASM file:", e.message);
    process.exit(1);
}

// Process QASM
let circuit = new QuantumCircuit();
try {
    circuit.importQASM(qasmCode);
} catch (e) {
    console.error("❌ Failed to parse QASM:", e.message);
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
    default:
        console.error(`❌ Unsupported platform '${platform}'`);
        process.exit(1);
}

// Write temp Python file
const tmpFile = `/tmp/qniverse_${Date.now()}.py`;
fs.writeFileSync(tmpFile, generatedCode);

// Run it using internal Python
const venvPython = path.join(__dirname, '..', '.qniverse-venv', 'bin', 'python');
try {
    const result = execSync(`${venvPython} ${tmpFile}`, { encoding: 'utf8' });
    console.log(result);
} catch (err) {
    console.error("❌ Error running the converted code:", err.message);
}
