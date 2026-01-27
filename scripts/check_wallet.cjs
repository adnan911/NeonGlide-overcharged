const { ethers } = require('ethers');
require('dotenv').config();

const PRIVATE_KEY = process.env.WALLET_KEY;
if (!PRIVATE_KEY) {
    console.error("No WALLET_KEY in .env");
    process.exit(1);
}

const wallet = new ethers.Wallet(PRIVATE_KEY);
console.log(`\nDeployment Wallet Address: ${wallet.address}\n`);
