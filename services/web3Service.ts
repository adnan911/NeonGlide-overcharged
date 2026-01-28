
import { ethers } from 'ethers';

import { CoinbaseWalletSDK } from '@coinbase/wallet-sdk';

const BASE_MAINNET_CHAIN_ID = '0x2105'; // 8453
const CONTRACT_ADDRESS = '0xBb13004d97A6a2784101c04be01d0130C665261C'; // Deployed to Base Mainnet

const APP_NAME = 'Neon Glide Onchain';
const APP_LOGO_URL = 'https://avatars.githubusercontent.com/u/108554348?v=4';
const BASE_RPC_URL = 'https://mainnet.base.org';

const sdk = new CoinbaseWalletSDK({
  appName: APP_NAME,
  appLogoUrl: APP_LOGO_URL
});

// Provide standard RPC URL
const coinbaseProvider = sdk.makeWeb3Provider();

const NEON_GLIDE_ABI = [
  "function recordScore(uint256 _score) public",
  "function syncCores(uint256 _amount) public",
  "function getPlayerData(address _player) public view returns (uint256 highScore, uint256 totalCores)",
  "function mint() public returns (uint256)",
  "function balanceOf(address owner) public view returns (uint256)",
  "event ScoreRecorded(address indexed player, uint256 score, uint256 timestamp)"
];

class Web3Service {
  private provider: any = null;
  private signer: any = null;
  private address: string | null = null;

  async connect() {
    try {
      // Prioritize Coinbase Wallet
      const ethereum = coinbaseProvider as any;

      this.provider = new ethers.BrowserProvider(ethereum);

      const accounts = await this.provider.send("eth_requestAccounts", []);
      this.signer = await this.provider.getSigner();
      this.address = accounts[0];

      console.log("Connected to Base via Coinbase Wallet:", this.address);
      return this.address;
    } catch (error) {
      console.error("Coinbase Wallet connection failed, falling back to window.ethereum:", error);

      // Fallback
      if (typeof (window as any).ethereum !== 'undefined') {
        try {
          this.provider = new ethers.BrowserProvider((window as any).ethereum);
          // ... (keep existing Base network switch logic if needed, but Coinbase SDK handles it usually)
          const accounts = await this.provider.send("eth_requestAccounts", []);
          this.signer = await this.provider.getSigner();
          this.address = accounts[0];
          return this.address;
        } catch (err) {
          console.error("Fallback connection failed", err);
          return null;
        }
      }
      return null;
    }
  }

  async autoConnect() {
    if (typeof (window as any).ethereum !== 'undefined') {
      try {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          // If already authorized, proceed with full connection logic
          return await this.connect();
        }
      } catch (e) {
        console.debug("Auto-connect not possible");
      }
    }
    return null;
  }

  getAddress() {
    return this.address;
  }

  async submitScoreOnChain(score: number) {
    if (!this.signer) return false;
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, NEON_GLIDE_ABI, this.signer);
      const tx = await contract.recordScore(Math.floor(score));
      await tx.wait();
      return true;
    } catch (error) {
      console.error("Onchain Score Error:", error);
      return false;
    }
  }

  async syncCoresOnChain(amount: number) {
    if (!this.signer) return false;
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, NEON_GLIDE_ABI, this.signer);
      const tx = await contract.syncCores(amount);
      await tx.wait();
      return true;
    } catch (error) {
      console.error("Onchain Core Error:", error);
      return false;
    }
  }

  async mint() {
    if (!this.signer) return null;
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, NEON_GLIDE_ABI, this.signer);
      const tx = await contract.mint();
      await tx.wait();
      return true;
    } catch (error) {
      console.error("Minting Error:", error);
      return false;
    }
  }

  async getPlayerData() {
    if (!this.signer || !this.address) return null;
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, NEON_GLIDE_ABI, this.signer);
      const data = await contract.getPlayerData(this.address);
      return {
        highScore: Number(data.highScore),
        totalCores: Number(data.totalCores)
      };
    } catch (error) {
      console.error("Fetch Data Error:", error);
      return null;
    }
  }
  async checkOwnership(address: string) {
    try {
      if (!this.signer) return false;

      const contract = new ethers.Contract(CONTRACT_ADDRESS, NEON_GLIDE_ABI, this.signer);
      const balance = await contract.balanceOf(address);
      return Number(balance) > 0;
    } catch (error) {
      console.error("Ownership Check Error:", error);
      return false;
    }
  }
}

export const web3Service = new Web3Service();
