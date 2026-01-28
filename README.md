<div align="center">
  <img src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" alt="Neon Glide Banner" width="100%" />

  # Neon Glide: Overcharged
  
  **A High-Octane On-Chain Endless Runner on Base**
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Network](https://img.shields.io/badge/Network-Base%20Mainnet-blue)](https://base.org)
  [![Engine](https://img.shields.io/badge/Engine-React%2019%20%2B%20Vite-cyan)](https://vitejs.dev/)

</div>

---

## ⚡ Overview

**Neon Glide: Overcharged** is a futuristic, physics-based endless runner where reflexes meet blockchain technology. Piloting a high-speed hovercraft through a procedurally generated neon city, players must dodge obstacles, collect energy cores, and unleash power-ups to survive "The Grid".

Integration with **Base** blockchain allows for unique features like NFT-gated access and on-chain high score verification.

## 🚀 Key Features

- **🎮 Physics-Based Gameplay**: Smooth hovering mechanics with momentum and drag for a satisfying flight feel.
- **🔐 NFT Gating**: Exclusive access system. Players must hold the **Grid Pass NFT** to enter the game.
- **🏆 On-Chain Leaderboards**: Your high scores aren't just local—they are signed and submitted to the smart contract.
- **💎 Mint-to-Play**: Integrated minting flow allows new users to purchase their Grid Pass directly within the app.
- **🎨 Cyberpunk Aesthetics**: Immersive UI with glassmorphism, neon glows, and dynamic visual effects.
- **📱 Fully Responsive**: Optimized for both desktop and mobile play.

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: TailwindCSS, Lucide React (Icons)
- **Web3**: Ethers.js v6
- **Blockchain**: Solidity (Smart Contracts), deployed on Base Mainnet
- **Tooling**: Foundry (Contract Dev), HTML2Canvas (Shareable Cards)

## 📦 Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/adnan911/NeonGlide-overcharged.git
   cd NeonGlide-overcharged
   ```

2. **Install Dependencies**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Set Environment Variables**
   Create a `.env` file in the root directory (refer to `.env.example`):
   ```env
   # Deployment Wallet Private Key (for scripts)
   WALLET_KEY=your_private_key_here
   ```

4. **Run Locally**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

## 🔗 Smart Contract

**Contract Name**: `NeonGlide.sol`  
**Network**: Base Mainnet  
**Address**: `0xBb13004d97A6a2784101c04be01d0130C665261C`

## 🕹️ Controls

- **Desktop**: 
  - `A` / `D` or `Left` / `Right` Arrows to steer.
  - `Space` to jump (if unlocked).
- **Mobile**: 
  - Tap Left/Right sides of the screen to steer.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <sub>Built with ⚡ by the Neon Glide Team</sub>
</div>
