const { expect } = require("chai");
const { ethers } = require("hardhat");
const { toChecksumAddress } = require("ethereumjs-util");
const EthDeployUtils = require("eth-deploy-utils");
const deployUtils = new EthDeployUtils();

const {
  deployCanonical,
  deployManager,
  normalize,
  addr0,
  getChainId,
  getTimestamp,
  bytes4,
  keccak256,
  cl,
  pluginKey,
  selectorId,
  signRequest,
} = require("./helpers/CrunaTestUtils");

describe("Integration test", function () {
  let crunaManagerProxy;
  let nft;
  let factory;
  let usdc;
  let deployer, bob, alice;
  let magicBadge, collBadge, superTransferableBadge;
  let simplePlugin, upgradeablePluginImpl, upgradeablePluginProxy;
  let erc6551Registry, crunaRegistry, crunaGuardian;
  let pluginKey32;

  before(async function () {
    [deployer, bob, alice] = await ethers.getSigners();
    [erc6551Registry, crunaRegistry, crunaGuardian] = await deployCanonical(deployer);
  });

  async function initAndDeploy() {
    crunaManagerProxy = await deployManager(deployer);
    nft = await deployUtils.deploy("SomeProtectedNFT", deployer.address);
    await nft.init(crunaManagerProxy.address, true, 1, 0);
    factory = await deployUtils.deployProxy("ProtectedNFTFactory", nft.address);
    await nft.setFactory(factory.address);

    // stablecoin mock
    usdc = await deployUtils.deploy("USDCoin", deployer.address);

    // badge mocks
    magicBadge = await deployUtils.deploy("MagicBadge", deployer.address);
    collBadge = await deployUtils.deploy("CoolBadge", deployer.address);
    superTransferableBadge = await deployUtils.deploy("SuperTransferableBadge", deployer.address);

    // deploy simple plugin
    simplePlugin = await deployUtils.deploy("BadgeCollectorSimplePlugin");

    // deploy upgradeable plugin
    upgradeablePluginImpl = await deployUtils.deploy("BadgeCollectorUpgradeablePlugin");
    upgradeablePluginProxy = await deployUtils.deploy("BadgeCollectorUpgradeablePluginProxy", upgradeablePluginImpl.address);
    upgradeablePluginProxy = await deployUtils.attach("BadgeCollectorUpgradeablePlugin", upgradeablePluginProxy.address);

    await usdc.mint(deployer.address, normalize("10000"));
    await usdc.mint(bob.address, normalize("1000"));
    await usdc.mint(alice.address, normalize("1000"));

    await expect(factory.setPrice(990)).to.emit(factory, "PriceSet").withArgs(990);
    await expect(factory.setStableCoin(usdc.address, true)).to.emit(factory, "StableCoinSet").withArgs(usdc.address, true);
  }

  //here we test the contract
  beforeEach(async function () {
    await initAndDeploy();
  });

  async function buyNFT(token, amount, buyer) {
    let price = await factory.finalPrice(token.address);
    await token.connect(buyer).approve(factory.address, price.mul(amount));
    let nextTokenId = (await nft.nftConf()).nextTokenId;
    let ret = [];
    const e = expect(factory.connect(buyer).buy(token.address, amount))
      .to.emit(token, "Transfer")
      .withArgs(buyer.address, factory.address, price.mul(amount));
    for (let i = 0; i < amount; i++) {
      ret.push(nextTokenId.add(i));
      e.to.emit(nft, "Transfer").withArgs(addr0, buyer.address, nextTokenId.add(i));
    }
    await e;
    return ret;
  }

  it("should allow bob to collect some badges and transfer some transferable ones plugging an upgradeable plugin", async function () {
    let tokenId = (await buyNFT(usdc, 1, bob))[0];
    const managerAddress = await nft.managerOf(tokenId);
    const manager = await ethers.getContractAt("CrunaManager", managerAddress);

    pluginKey32 = pluginKey("BadgeCollectorUpgradeablePlugin", upgradeablePluginProxy.address, "0x00000000");

    await expect(manager.connect(bob).plug(pluginKey32, false, false, "0x00000000", 0, 0, 0)).to.emit(
      manager,
      "PluginStatusChange",
    );

    // get the plugin address

    const nameId = bytes4(keccak256("BadgeCollectorUpgradeablePlugin"));
    const pluginAddress = await manager.pluginAddress(pluginKey32);
    const plugin = await ethers.getContractAt("BadgeCollectorUpgradeablePlugin", pluginAddress);

    let id = 1;

    await expect(collBadge.safeMint(plugin.address, id)).to.emit(collBadge, "Transfer").withArgs(addr0, plugin.address, id);

    await expect(magicBadge.safeMint(plugin.address, id)).to.emit(magicBadge, "Transfer").withArgs(addr0, plugin.address, id);

    await expect(superTransferableBadge.safeMint(plugin.address, id))
      .to.emit(superTransferableBadge, "Transfer")
      .withArgs(addr0, plugin.address, id);

    await expect(plugin.connect(bob).transferBadge(collBadge.address, id, 0, 0, 0)).to.be.revertedWith("NotTransferable");

    await expect(plugin.connect(bob).transferBadge(magicBadge.address, id, 0, 0, 0)).to.be.revertedWith("NotTransferable");

    await expect(plugin.connect(bob).transferBadge(superTransferableBadge.address, id, 0, 0, 0))
      .emit(superTransferableBadge, "Transfer")
      .withArgs(plugin.address, bob.address, id);

    id = 2;

    await expect(collBadge.safeMint(plugin.address, id)).to.emit(collBadge, "Transfer").withArgs(addr0, plugin.address, id);

    await expect(magicBadge.safeMint(plugin.address, id)).to.emit(magicBadge, "Transfer").withArgs(addr0, plugin.address, id);

    await expect(superTransferableBadge.safeMint(plugin.address, id))
      .to.emit(superTransferableBadge, "Transfer")
      .withArgs(addr0, plugin.address, id);

    let selector = await selectorId("ICrunaManager", "setProtector");
    let chainId = await getChainId();
    let ts = (await getTimestamp()) - 100;

    let signature = (
      await signRequest(
        selector,
        bob.address,
        alice.address,
        nft.address,
        tokenId,
        1,
        0,
        0,
        ts,
        3600,
        chainId,
        alice.address,
        manager,
      )
    )[0];

    // set Alice as first Bob's protector
    await manager.connect(bob).setProtector(alice.address, true, ts, 3600, signature);

    chainId = await getChainId();
    ts = await getTimestamp();
    selector = await selectorId("BadgeCollectorUpgradeablePlugin", "transferBadge");

    signature = (
      await signRequest(
        selector,
        bob.address,
        superTransferableBadge.address,
        nft.address,
        tokenId,
        id,
        0,
        0,
        ts,
        3600,
        chainId,
        alice.address,
        plugin,
      )
    )[0];

    // set Alice as first Bob's protector
    await expect(plugin.connect(bob).transferBadge(superTransferableBadge.address, id, ts, 3600, signature))
      .to.emit(superTransferableBadge, "Transfer")
      .withArgs(plugin.address, bob.address, id);
  });
});
