// SPDX-License-Identifier: GPL3
pragma solidity ^0.8.0;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {CrunaManagedService} from "@cruna/protocol/services/CrunaManagedService.sol";

abstract contract BadgeCollectorPluginBase is CrunaManagedService, IERC721Receiver {
  event BadgeCollected(address indexed badgeAddress, uint256 indexed badgeTokenId, address from, uint256 timestamp);

  error InvalidValidity();

  function supportsInterface(bytes4 interfaceId) public pure virtual override returns (bool) {
    return (interfaceId == type(IERC721Receiver).interfaceId || interfaceId == type(IERC165).interfaceId);
  }

  function onERC721Received(address, address from, uint256 receivedTokenId, bytes memory) external virtual returns (bytes4) {
    emit BadgeCollected(_msgSender(), receivedTokenId, from, block.timestamp);
    return IERC721Receiver.onERC721Received.selector;
  }

  function transferBadge(
    address badgeAddress,
    uint256 badgeTokenId,
    uint256 timestamp,
    uint256 validFor,
    bytes calldata signature
  ) external virtual onlyTokenOwner {
    if (validFor > 0) {
      if (validFor > 9999999) revert InvalidValidity();
      _validateAndCheckSignature(
        this.transferBadge.selector,
        owner(),
        badgeAddress,
        tokenAddress(),
        tokenId(),
        badgeTokenId,
        0,
        0,
        timestamp * 1e7 + validFor,
        signature
      );
    }

    // it will revert if the token is a soul-bound token or any locked token
    IERC721(badgeAddress).transferFrom(address(this), owner(), badgeTokenId);
  }

  function _onBeforeInit(bytes memory data) internal virtual override {
    // do nothing
  }

  // @dev This empty reserved space is put in place to allow future versions to add new
  // variables without shifting down storage in the inheritance chain.
  // See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps

  uint256[50] private __gap;
}
