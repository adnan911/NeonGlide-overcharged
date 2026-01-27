import { ethers } from 'hardhat';
import process from 'process';

async function main() {
  console.log('Deploying NeonGlide contract to Base...');
  
  const neonGlide = await ethers.deployContract('NeonGlide');
  await neonGlide.waitForDeployment();

  console.log('NeonGlide Contract Deployed at: ' + neonGlide.target);
}

// Fix: Use process.exitCode = 1 instead of process.exit(1) and explicitly import process from 'process' 
// to ensure the correct Node.js type definitions are used, resolving the error where 'exit' was not found on 'Process'.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
