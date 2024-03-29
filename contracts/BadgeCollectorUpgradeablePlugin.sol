// SPDX-License-Identifier: GPL3
pragma solidity ^0.8.20;

// Author: Francesco Sullo <francesco@sullo.co>

import {StorageSlot} from "@openzeppelin/contracts/utils/StorageSlot.sol";
import {ICrunaPlugin} from "@cruna/protocol/plugins/ICrunaPlugin.sol";

import {Guardian} from "./Guardian.sol";
import {BadgeCollectorPluginBase} from "./BadgeCollectorPluginBase.sol";

contract BadgeCollectorUpgradeablePlugin is BadgeCollectorPluginBase {
  Guardian public guardian;
  address private constant _GUARDIAN_SETTER = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;

  error NotTheGuardianSetter();
  error GuardianAlreadySet();
  error NotTrustedImplementation();
  error InvalidPluginVersion(uint256 oldVersion, uint256 newVersion);
  error PluginRequiresNewerManager(uint256 requiredVersion);

  function _nameId() internal view virtual override returns (bytes4) {
    return bytes4(keccak256("BadgeCollectorUpgradeablePlugin"));
  }

  function setGuardian(address guardian_) external {
    if (_msgSender() != _GUARDIAN_SETTER) revert NotTheGuardianSetter();
    if (guardian_ == address(0)) revert ZeroAddress();
    if (address(guardian) != address(0)) revert GuardianAlreadySet();
    guardian = Guardian(guardian_);
  }

  // It is the plugin's responsibility to be sure that the new implementation is trusted
  function upgrade(address implementation_) external virtual {
    if (owner() != _msgSender()) revert NotTheTokenOwner();
    if (implementation_ == address(0)) revert ZeroAddress();
    bool trusted = guardian.trusted(implementation_);
    if (!trusted) revert NotTrustedImplementation();
    ICrunaPlugin impl = ICrunaPlugin(implementation_);
    uint256 version_ = impl.version();
    if (version_ <= _version()) revert InvalidPluginVersion(_version(), version_);
    uint256 requiredVersion = impl.requiresManagerVersion();
    if (_conf.manager.version() < requiredVersion) revert PluginRequiresNewerManager(requiredVersion);
    StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value = implementation_;
  }

  // @dev This empty reserved space is put in place to allow future versions to add new
  // variables without shifting down storage in the inheritance chain.
  // See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps

  uint256[50] private __gap;
}
