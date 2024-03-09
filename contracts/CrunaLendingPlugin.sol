// SPDX-License-Identifier: GPL3
pragma solidity ^0.8.13;

import {CrunaPluginBase, CrunaLendingPluginBase} from "./CrunaLendingPluginBase.sol";

contract CrunaLendingPlugin is CrunaLendingPluginBase {
  function nameId() public view virtual override(CrunaPluginBase) returns (bytes4) {
    return bytes4(keccak256("CrunaLendingPlugin"));
  }

  // Lending-specific functionalities to be added here

  uint256[50] private __gap; // Reserved space for future upgrades
}
