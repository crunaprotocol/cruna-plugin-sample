const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LendingRules Contract Tests", function () {
  let LendingRules;
  let lendingRules;
  let deployer, treasuryWallet, mayG, azraGames, anotherDepositor;

  before(async function () {
    [deployer, treasuryWallet, mayG, azraGames, anotherDepositor] = await ethers.getSigners();
    LendingRules = await ethers.getContractFactory("LendingRules");
  });

  beforeEach(async function () {
    lendingRules = await LendingRules.deploy(deployer.address, treasuryWallet.address);
  });

  describe("Deployment and Initial State", function () {
    it("Should set the right treasury wallet on deployment", async function () {
      expect(await lendingRules.getTreasuryWallet()).to.equal(treasuryWallet.address);
    });
  });

  describe("Owner-Only Functions", function () {
    it("Should revert setFees when called by non-owner", async function () {
      // Attempt to set fees by a non-owner account (mayG in this case)
      await expect(lendingRules.connect(mayG).setFees(azraGames.address, 100, 50)).revertedWith("OwnableUnauthorizedAccount");
    });

    it("Should revert setTreasuryWallet when called by non-owner", async function () {
      // Attempt to update the treasury wallet by a non-owner account (mayG in this case)
      await expect(lendingRules.connect(mayG).setTreasuryWallet(azraGames.address)).revertedWith("OwnableUnauthorizedAccount");
    });
  });

  describe("Setting and Getting Fees", function () {
    it("Should allow setting and retrieving special fees for a depositor", async function () {
      await lendingRules.setFees(mayG.address, 200, 100);
      const fees = await lendingRules.getFees(mayG.address);
      expect(fees.depositFee).to.equal(200);
      expect(fees.activationFee).to.equal(100);
    });

    // This test is correctly testing the behavior you've coded in your smart contract
    it("Should revert when setting fees for zero address depositor", async function () {
      await expect(lendingRules.setFees(ethers.constants.AddressZero, 100, 50)).to.be.revertedWith("InvalidAddress");
    });

    it("Should allow setting and retrieving special fees for a depositor", async function () {
      await lendingRules.setFees(mayG.address, 200, 100);
      const fees = await lendingRules.getFees(mayG.address);
      expect(fees.depositFee).to.equal(200);
      expect(fees.activationFee).to.equal(100);
    });

    it("Should revert when setting fees for zero address depositor", async function () {
      await expect(lendingRules.setFees(ethers.constants.AddressZero, 100, 50)).to.be.revertedWith("InvalidAddress");
    });
  });

  describe("Updating Treasury Wallet", function () {
    it("Should update the treasury wallet address", async function () {
      await lendingRules.setTreasuryWallet(azraGames.address);
      expect(await lendingRules.getTreasuryWallet()).to.equal(azraGames.address);
    });

    it("Should revert when setting the treasury wallet to the zero address", async function () {
      await expect(lendingRules.setTreasuryWallet(ethers.constants.AddressZero)).to.be.revertedWith(
        "TreasuryWalletZeroAddress",
      );
    });
  });
});
