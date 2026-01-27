// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Script.sol";
import "../contracts/NeonGlide.sol";

contract DeployNeonGlide is Script {
    function run() external {
        // Retrieve private key from environment variable
        uint256 deployerPrivateKey = vm.envUint("WALLET_KEY");
        
        vm.startBroadcast(deployerPrivateKey);

        NeonGlide nft = new NeonGlide();
        
        console.log("NeonGlide Contract Deployed at:", address(nft));

        vm.stopBroadcast();
    }
}
