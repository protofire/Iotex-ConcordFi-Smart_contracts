pragma solidity ^0.5.16;
pragma experimental ABIEncoderV2;

import "../../contracts/Gtroller.sol";

contract GtrollerScenario is Gtroller {
    uint256 public blockTimestamp;

    constructor() public Gtroller() {}

    function fastForward(uint256 secs) public returns (uint256) {
        blockTimestamp += secs;
        return blockTimestamp;
    }

    function setBlockTimestamp(uint256 number) public {
        blockTimestamp = number;
    }

    function getBlockTimestamp() public view returns (uint256) {
        return blockTimestamp;
    }

    function membershipLength(GToken gToken) public view returns (uint256) {
        return accountAssets[address(gToken)].length;
    }

    function unlist(GToken gToken) public {
        markets[address(gToken)].isListed = false;
    }
}
