
import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';

// Note: In a real environment, you would use process.env.WALLET_KEY
// For this app, we assume the environment is pre-configured.

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.23',
  },
  networks: {
    'base-mainnet': {
      url: 'https://mainnet.base.org',
      accounts: process.env.WALLET_KEY ? [process.env.WALLET_KEY] : [],
      gasPrice: 1000000000,
    }
  },
  defaultNetwork: 'base-mainnet',
};

export default config;
