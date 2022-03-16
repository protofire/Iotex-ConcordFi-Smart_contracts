pragma solidity ^0.5.16;

import "../../contracts/LiquidityMiningInterface.sol";

contract MockLiquidityMining is LiquidityMiningInterface {
    address public gTroller;

    constructor(address _gTroller) public {
        gTroller = _gTroller;
    }

    function updateSupplyIndex(address gToken, address[] calldata accounts) external {
        // Do nothing.
        gToken;
        accounts;
    }

    function updateBorrowIndex(address gToken, address[] calldata accounts) external {
        // Do nothing.
        gToken;
        accounts;
    }
}
