// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NeonGlide is ERC721, Ownable {
    uint256 public nextTokenId;

    // Game Data Storage
    mapping(address => uint256) public highScores;
    mapping(address => uint256) public totalCores;

    event ScoreRecorded(address indexed player, uint256 score, uint256 timestamp);
    event CoresSynced(address indexed player, uint256 cores, uint256 timestamp);

    constructor() ERC721("Neon Glide Pass", "NGPASS") Ownable(msg.sender) {}

    function mint() public returns (uint256) {
        uint256 tokenId = ++nextTokenId;
        _safeMint(msg.sender, tokenId);
        return tokenId;
    }

    function recordScore(uint256 _score) public {
        if (_score > highScores[msg.sender]) {
            highScores[msg.sender] = _score;
        }
        emit ScoreRecorded(msg.sender, _score, block.timestamp);
    }

    function syncCores(uint256 _amount) public {
        totalCores[msg.sender] = _amount;
        emit CoresSynced(msg.sender, _amount, block.timestamp);
    }

    function getPlayerData(address _player) public view returns (uint256 highScore, uint256 cores, uint256 nftBalance) {
        return (highScores[_player], totalCores[_player], balanceOf(_player));
    }
}
