const { ethers, network } = require("hardhat");
const { expect } = require("chai");

const JOE_AGGREGATOR_ADDRESS = "0x02D35d3a8aC3e1626d3eE09A78Dd87286F5E8e3a";
const PRICE_ORACLE_ARTIFACT_V1 = require("../deployments/avalanche/versions/PriceOracleProxyUSDV1.json");

const JXJOE_ADDRESS = "0xC146783a59807154F92084f9243eb139D58Da696";
const XJOE_ADDRESS = "0x57319d41f71e81f3c65f2a47ca4e001ebafd4f33";
const JOE_ADDRESS = "0x6e84a6216ea6dacc71ee8e6b0a5b7322eebc0fdd";

describe("PriceOracleProxyUSD", function () {
  before(async function () {
    // Accounts
    this.signers = await ethers.getSigners();
    this.alice = this.signers[0];

    // Contract Factory
    this.PriceOracleCFOld = await ethers.getContractFactory(
      PRICE_ORACLE_ARTIFACT_V1.abi,
      PRICE_ORACLE_ARTIFACT_V1.bytecode
    );
    this.PriceOracleCFNew = await ethers.getContractFactory(
      "PriceOracleProxyUSD"
    );
    this.GCollateralCapXrc20DelegateCF = await ethers.getContractFactory(
      "GCollateralCapXrc20Delegate"
    );
    this.GXrc20CF = await ethers.getContractFactory("GXrc20");

    // Tokens
    // We cast here to GXrc20 for its ERC20 interface
    this.joe = await this.GXrc20CF.attach(JOE_ADDRESS);
    this.xJoe = await this.GXrc20CF.attach(XJOE_ADDRESS);
    this.jXJoe = await this.GCollateralCapXrc20DelegateCF.attach(JXJOE_ADDRESS);
    this.oracleOld = await this.PriceOracleCFOld.attach(
      PRICE_ORACLE_ARTIFACT_V1.address
    );
  });

  beforeEach(async function () {
    // We reset the state before each tests
    await network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: "https://api.avax.network/ext/bc/C/rpc",
            blockNumber: 7328000,
          },
          live: false,
          saveDeployments: true,
          tags: ["test", "local"],
        },
      ],
    });

    // Deploying contract
    this.oracleNew = await this.PriceOracleCFNew.deploy(this.alice.address);
    await this.oracleNew.deployed();
  });

  describe("Test Oracle", function () {
    it("Verifies that xJoePrice is equal to JoePrice * ratio", async function () {
      await this.oracleNew._setAggregators(
        [this.jXJoe.address],
        [JOE_AGGREGATOR_ADDRESS]
      );
      // asks XJoe price using the new contract
      const xJoePrice = await this.oracleNew.getUnderlyingPrice(JXJOE_ADDRESS);

      // asks JoePrice using the old contract
      const joePrice = await this.oracleOld.getUnderlyingPrice(JXJOE_ADDRESS);

      // calculates joe:xjoe ratio
      const joeAmount = await this.joe.balanceOf(XJOE_ADDRESS);
      const xJoeAmount = await this.xJoe.totalSupply();
      const ratio = joeAmount.mul("1000000000000000000").div(xJoeAmount);

      // calculates the XJoe price
      const xJoePriceCalculated = joePrice
        .mul(ratio)
        .div("1000000000000000000");

      // Verifies that the 2 prices are identical
      expect(xJoePriceCalculated).to.equal(xJoePrice);
    });
  });

  after(async function () {
    await network.provider.request({
      method: "hardhat_reset",
      params: [],
    });
  });
});
