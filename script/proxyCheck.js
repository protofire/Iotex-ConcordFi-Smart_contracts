const { ethers, upgrades } = require("hardhat");

/**
 * This is a quick script to check if the upgrade is safe.
 * We put flattened versions in contracts/versions/.
 */
async function main() {
  // GCollateralCapXrc20Delegate
  const GCollateralCapXrc20DelegateV1 = await ethers.getContractFactory(
    "GCollateralCapXrc20DelegateV1"
  );
  const jCollateralCapErc20DelegateV1 = await upgrades.deployProxy(
    GCollateralCapXrc20DelegateV1,
    { initializer: false }
  );
  await jCollateralCapErc20DelegateV1.deployed();

  const GCollateralCapXrc20DelegateV2 = await ethers.getContractFactory(
    "GCollateralCapXrc20DelegateV2"
  );
  await upgrades.prepareUpgrade(
    jCollateralCapErc20DelegateV1.address,
    GCollateralCapXrc20DelegateV2
  );

  // GWrappedNativeDelegate
  const GWrappedNativeDelegateV1 = await ethers.getContractFactory(
    "GWrappedNativeDelegateV1"
  );
  const jWrappedNativeDelegateV1 = await upgrades.deployProxy(
    GWrappedNativeDelegateV1,
    { initializer: false }
  );
  await jWrappedNativeDelegateV1.deployed();

  const GWrappedNativeDelegateV2 = await ethers.getContractFactory(
    "GWrappedNativeDelegateV2"
  );
  await upgrades.prepareUpgrade(
    jWrappedNativeDelegateV1.address,
    GWrappedNativeDelegateV2
  );
}

main();
