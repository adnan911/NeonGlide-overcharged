const fs = require('fs');
const path = require('path');
const solc = require('solc');
const { ethers } = require('ethers');
require('dotenv').config();

// Configuration
const PRIVATE_KEY = process.env.WALLET_KEY;
const RPC_URL = "https://mainnet.base.org"; // Base Mainnet

if (!PRIVATE_KEY) {
    console.error("Please set WALLET_KEY in .env");
    process.exit(1);
}

// Contract Source
const contractPath = path.resolve(__dirname, '../contracts/NeonGlide.sol');
const source = fs.readFileSync(contractPath, 'utf8');

// Helper to find imports
function findImports(importPath) {
    if (importPath.startsWith('@openzeppelin')) {
        const nodeModulesPath = path.resolve(__dirname, '../node_modules', importPath);
        if (fs.existsSync(nodeModulesPath)) {
            return { contents: fs.readFileSync(nodeModulesPath, 'utf8') };
        } else {
            return { error: 'File not found' };
        }
    }
    return { error: 'File not found' };
}

// Compiler Input
const input = {
    language: 'Solidity',
    sources: {
        'NeonGlide.sol': {
            content: source,
        },
    },
    settings: {
        outputSelection: {
            '*': {
                '*': ['*'],
            },
        },
        optimizer: {
            enabled: true,
            runs: 200,
        },
    },
};

console.log("Compiling NeonGlide.sol...");
const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

// Check for errors
if (output.errors) {
    let hasError = false;
    output.errors.forEach((err) => {
        if (err.severity === 'error') {
            console.error(err.formattedMessage);
            hasError = true;
        } else {
            console.warn(err.formattedMessage);
        }
    });
    if (hasError) process.exit(1);
}

const contractFile = output.contracts['NeonGlide.sol']['NeonGlide'];
const bytecode = contractFile.evm.bytecode.object;
const abi = contractFile.abi;

async function deploy() {
    console.log("Connecting to Base Mainnet...");
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log(`Deploying from account: ${wallet.address}`);

    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
        console.error("Insufficient funds. Please fund your wallet via Base Bridge or Coinbase.");
        process.exit(1);
    }

    const factory = new ethers.ContractFactory(abi, bytecode, wallet);

    console.log("Sending deployment transaction...");
    try {
        const contract = await factory.deploy();
        console.log(`Transaction sent: ${contract.deploymentTransaction().hash}`);

        console.log("Waiting for confirmation...");
        await contract.waitForDeployment();

        const address = await contract.getAddress();
        console.log(`\nSUCCESS! NeonGlide deployed to: ${address}`);
        console.log(`\nNEXT STEPS:`);
        console.log(`1. Copy this address: ${address}`);
        console.log(`2. Update services/web3Service.ts with this address.`);
    } catch (error) {
        console.error("Deployment failed:", error);
    }
}

deploy();
