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
     * @notice underlying token to jToken mapping
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
        address jToken = underlyingToGToken[token];
        uint256 amount = 0;
        if (jToken != address(0)) {
            amount = GCollateralCapXrc20(jToken).maxFlashLoan();
        }
        return amount;
    }

    function flashFee(address token, uint256 amount) external view returns (uint256) {
        address jToken = underlyingToGToken[token];
        require(jToken != address(0), "cannot find jToken of this underlying in the mapping");
        return GCollateralCapXrc20(jToken).flashFee(amount);
    }

    function flashLoan(
        ERC3156FlashBorrowerInterface receiver,
        address token,
        uint256 amount,
        bytes calldata data
    ) external returns (bool) {
        address jToken = underlyingToGToken[token];
        require(jToken != address(0), "cannot find jToken of this underlying in the mapping");
        return GCollateralCapXrc20(jToken).flashLoan(receiver, msg.sender, amount, data);
    }

    function updateUnderlyingMapping(GToken[] calldata jTokens) external onlyOwner returns (bool) {
        uint256 jTokenLength = jTokens.length;
        for (uint256 i = 0; i < jTokenLength; i++) {
            GToken jToken = jTokens[i];
            address underlying = GXrc20(address(jToken)).underlying();
            underlyingToGToken[underlying] = address(jToken);
        }
        return true;
    }

    function removeUnderlyingMapping(GToken[] calldata jTokens) external onlyOwner returns (bool) {
        uint256 jTokenLength = jTokens.length;
        for (uint256 i = 0; i < jTokenLength; i++) {
            GToken jToken = jTokens[i];
            address underlying = GXrc20(address(jToken)).underlying();
            underlyingToGToken[underlying] = address(0);
        }
        return true;
    }

    /*** Internal Functions ***/

    function compareStrings(string memory a, string memory b) private pure returns (bool) {
        return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))));
    }

    function initialiseUnderlyingMapping() internal {
        GToken[] memory jTokens = Gtroller(gTroller).getAllMarkets();
        uint256 jTokenLength = jTokens.length;
        for (uint256 i = 0; i < jTokenLength; i++) {
            GToken jToken = jTokens[i];
            if (compareStrings(jToken.symbol(), "crETH")) {
                continue;
            }
            address underlying = GXrc20(address(jToken)).underlying();
            underlyingToGToken[underlying] = address(jToken);
        }
    }
}
