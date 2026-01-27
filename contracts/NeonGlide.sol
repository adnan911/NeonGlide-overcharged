// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract NeonGlide is ERC721, Ownable {
    using Strings for uint256;

    uint256 public nextTokenId;

    // IPFS CID for the NFT video (Pinata hosted)
    string private constant ANIMATION_CID = "bafybeia3b34mimybruhgxa6tnyrgrqrutbqc4rb4np7uv27xjdb2zwkgzq";

    // Game Data Storage
    mapping(address => uint256) public highScores;
    mapping(address => uint256) public totalCores;

    event ScoreRecorded(address indexed player, uint256 score, uint256 timestamp);
    event CoresSynced(address indexed player, uint256 cores, uint256 timestamp);
    event PassMinted(address indexed player, uint256 tokenId);

    constructor() ERC721("Neon Glide Pass", "NGPASS") Ownable(msg.sender) {}

    function mint() public returns (uint256) {
        uint256 tokenId = ++nextTokenId;
        _safeMint(msg.sender, tokenId);
        emit PassMinted(msg.sender, tokenId);
        return tokenId;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return string(abi.encodePacked(
            "data:application/json;base64,",
            Base64.encode(bytes(_buildMetadata(tokenId)))
        ));
    }

    function _buildMetadata(uint256 tokenId) private pure returns (string memory) {
        return string(abi.encodePacked(
            '{"name":"Neon Glide Pass #', tokenId.toString(),
            '","description":"Grid Pass for Neon Glide Plasma Grid.",',
            '"animation_url":"ipfs://', ANIMATION_CID, '",',
            '"image":"ipfs://', ANIMATION_CID, '",',
            '"attributes":[{"trait_type":"Type","value":"Grid Pass"},{"trait_type":"Version","value":"v2.5"}]}'
        ));
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
