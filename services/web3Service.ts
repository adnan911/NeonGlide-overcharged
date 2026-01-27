
import { ethers } from 'https://esm.sh/ethers@6.13.1';

const BASE_MAINNET_CHAIN_ID = '0x2105'; // 8453
const CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000'; // Replace with deployed address after hardhat run

const NEON_GLIDE_ABI = [
  "function recordScore(uint256 _score) public",
  "function syncCores(uint256 _amount) public",
  "function getPlayerData(address _player) public view returns (uint256 highScore, uint256 totalCores)",
  "event ScoreRecorded(address indexed player, uint256 score, uint256 timestamp)"
];

class Web3Service {
  private provider: any = null;
  private signer: any = null;
  private address: string | null = null;

  async connect() {
    if (typeof (window as any).ethereum !== 'undefined') {
      try {
        this.provider = new ethers.BrowserProvider((window as any).ethereum);
        
        // Ensure we are on Base Mainnet
        const network = await this.provider.getNetwork();
        if (network.chainId !== 8453n) {
          try {
            await (window as any).ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: BASE_MAINNET_CHAIN_ID }],
            });
          } catch (switchError: any) {
            // This error code indicates the chain has not been added to MetaMask/Coinbase Wallet
            if (switchError.code === 4902) {
              await (window as any).ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: BASE_MAINNET_CHAIN_ID,
                  chainName: 'Base Mainnet',
                  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
                  rpcUrls: ['https://mainnet.base.org'],
                  blockExplorerUrls: ['https://basescan.org'],
                }],
              });
            }
          }
        }

        const accounts = await this.provider.send("eth_requestAccounts", []);
        this.signer = await this.provider.getSigner();
        this.address = accounts[0];
        console.log("Connected to Base:", this.address);
        return this.address;
      } catch (error) {
        console.error("Connection failed:", error);
        return null;
      }
    }
    return null;
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
    if (!this.signer || CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') return false;
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
    if (!this.signer || CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') return false;
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
}

export const web3Service = new Web3Service();
