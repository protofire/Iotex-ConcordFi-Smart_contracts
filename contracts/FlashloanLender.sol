// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.5.16;
import "./GCollateralCapXrc20.sol";
import "./GXrc20.sol";
import "./Gtroller.sol";

interface CERC20Interface {
    function underlying() external view returns (address);
}

contract FlashloanLender is ERC3156FlashLenderInterface {
    /**
     * @notice underlying token to gToken mapping
     */
    mapping(address => address) public underlyingToGToken;

    /**
     * @notice C.R.E.A.M. gTroller address
     */
    address payable public gTroller;

    address public owner;

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor(address payable _gTroller, address _owner) public {
        gTroller = _gTroller;
        owner = _owner;
        initialiseUnderlyingMapping();
    }

    function maxFlashLoan(address token) external view returns (uint256) {
        address gToken = underlyingToGToken[token];
        uint256 amount = 0;
        if (gToken != address(0)) {
            amount = GCollateralCapXrc20(gToken).maxFlashLoan();
        }
        return amount;
    }

    function flashFee(address token, uint256 amount) external view returns (uint256) {
        address gToken = underlyingToGToken[token];
        require(gToken != address(0), "cannot find gToken of this underlying in the mapping");
        return GCollateralCapXrc20(gToken).flashFee(amount);
    }

    function flashLoan(
        ERC3156FlashBorrowerInterface receiver,
        address token,
        uint256 amount,
        bytes calldata data
    ) external returns (bool) {
        address gToken = underlyingToGToken[token];
        require(gToken != address(0), "cannot find gToken of this underlying in the mapping");
        return GCollateralCapXrc20(gToken).flashLoan(receiver, msg.sender, amount, data);
    }

    function updateUnderlyingMapping(GToken[] calldata gTokens) external onlyOwner returns (bool) {
        uint256 gTokenLength = gTokens.length;
        for (uint256 i = 0; i < gTokenLength; i++) {
            GToken gToken = gTokens[i];
            address underlying = GXrc20(address(gToken)).underlying();
            underlyingToGToken[underlying] = address(gToken);
        }
        return true;
    }

    function removeUnderlyingMapping(GToken[] calldata gTokens) external onlyOwner returns (bool) {
        uint256 gTokenLength = gTokens.length;
        for (uint256 i = 0; i < gTokenLength; i++) {
            GToken gToken = gTokens[i];
            address underlying = GXrc20(address(gToken)).underlying();
            underlyingToGToken[underlying] = address(0);
        }
        return true;
    }

    /*** Internal Functions ***/

    function compareStrings(string memory a, string memory b) private pure returns (bool) {
        return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))));
    }

    function initialiseUnderlyingMapping() internal {
        GToken[] memory gTokens = Gtroller(gTroller).getAllMarkets();
        uint256 gTokenLength = gTokens.length;
        for (uint256 i = 0; i < gTokenLength; i++) {
            GToken gToken = gTokens[i];
            if (compareStrings(gToken.symbol(), "crETH")) {
                continue;
            }
            address underlying = GXrc20(address(gToken)).underlying();
            underlyingToGToken[underlying] = address(gToken);
        }
    }
}
