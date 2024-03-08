// SPDX-License-Identifier: GPL3
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract LendingRules is Ownable {
  error TreasuryWalletZeroAddress();
  error InvalidAddress();
  error InvalidFees();

  struct Fees {
    uint256 depositFee; // Fee for depositing assets
    uint256 activationFee; // Fee for plugin activation by users
  }

  mapping(address => Fees) public feesMapping; // Mapping to store fees for each project/depositor
  address public treasuryWallet; // Treasury wallet address

  // Events for logging changes
  event FeesSet(address indexed depositor, uint256 depositFee, uint256 activationFee);
  event TreasuryWalletUpdated(address newTreasuryWallet);

  constructor(address _initialOwner, address _treasuryWallet) Ownable(_initialOwner) {
    setTreasuryWallet(_treasuryWallet);
  }

  // Function to set fees for a project/depositor
  function setFees(address _depositor, uint256 _depositFee, uint256 _activationFee) public onlyOwner {
    if (_depositor == address(0)) revert InvalidAddress();
    feesMapping[_depositor] = Fees(_depositFee, _activationFee);
    emit FeesSet(_depositor, _depositFee, _activationFee);
  }

  // Function to update the treasury wallet address
  function setTreasuryWallet(address _newTreasuryWallet) public onlyOwner {
    if (_newTreasuryWallet == address(0)) revert TreasuryWalletZeroAddress();
    treasuryWallet = _newTreasuryWallet;
    emit TreasuryWalletUpdated(_newTreasuryWallet);
  }

  // Function to retrieve fees for a specific project/depositor
  function getFees(address _depositor) public view returns (Fees memory) {
    return feesMapping[_depositor];
  }

  // Retrieve the treasury wallet address
  function getTreasuryWallet() public view returns (address) {
    return treasuryWallet;
  }
}
