const { ethers } = require('ethers');
require('dotenv').config();

const PRIVATE_KEY = process.env.WALLET_KEY;
if (!PRIVATE_KEY) {
    console.error("No WALLET_KEY in .env");
    process.exit(1);
}

const wallet = new ethers.Wallet(PRIVATE_KEY);
const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
const walletWithProvider = wallet.connect(provider);

console.log(`\nDeployment Wallet Address: ${wallet.address}\n`);

async function checkBalance() {
    try {
        const balance = await provider.getBalance(wallet.address);
        console.log(`Balance: ${ethers.formatEther(balance)} ETH`);
    } catch (error) {
        console.error("Error fetching balance:", error.message);
    }
}

checkBalance();
