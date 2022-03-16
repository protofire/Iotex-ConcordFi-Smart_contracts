// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.5.16;

import "./GXrc20.sol";
import "./GToken.sol";
import "./EIP20NonStandardInterface.sol";

contract GTokenAdmin {
    /// @notice Admin address
    address payable public admin;

    /// @notice Reserve manager address
    address payable public reserveManager;

    /// @notice Emits when a new admin is assigned
    event SetAdmin(address indexed oldAdmin, address indexed newAdmin);

    /// @notice Emits when a new reserve manager is assigned
    event SetReserveManager(address indexed oldReserveManager, address indexed newAdmin);

    /**
     * @dev Throws if called by any account other than the admin.
     */
    modifier onlyAdmin() {
        require(msg.sender == admin, "only the admin may call this function");
        _;
    }

    /**
     * @dev Throws if called by any account other than the reserve manager.
     */
    modifier onlyReserveManager() {
        require(msg.sender == reserveManager, "only the reserve manager may call this function");
        _;
    }

    constructor(address payable _admin) public {
        _setAdmin(_admin);
    }

    /**
     * @notice Get gToken admin
     * @param gToken The gToken address
     */
    function getGTokenAdmin(address gToken) public view returns (address) {
        return GToken(gToken).admin();
    }

    /**
     * @notice Set gToken pending admin
     * @param gToken The gToken address
     * @param newPendingAdmin The new pending admin
     */
    function _setPendingAdmin(address gToken, address payable newPendingAdmin) external onlyAdmin returns (uint256) {
        return GTokenInterface(gToken)._setPendingAdmin(newPendingAdmin);
    }

    /**
     * @notice Accept gToken admin
     * @param gToken The gToken address
     */
    function _acceptAdmin(address gToken) external onlyAdmin returns (uint256) {
        return GTokenInterface(gToken)._acceptAdmin();
    }

    /**
     * @notice Set gToken gTroller
     * @param gToken The gToken address
     * @param newGtroller The new gTroller address
     */
    function _setGtroller(address gToken, GtrollerInterface newGtroller) external onlyAdmin returns (uint256) {
        return GTokenInterface(gToken)._setGtroller(newGtroller);
    }

    /**
     * @notice Set gToken reserve factor
     * @param gToken The gToken address
     * @param newReserveFactorMantissa The new reserve factor
     */
    function _setReserveFactor(address gToken, uint256 newReserveFactorMantissa) external onlyAdmin returns (uint256) {
        return GTokenInterface(gToken)._setReserveFactor(newReserveFactorMantissa);
    }

    /**
     * @notice Reduce gToken reserve
     * @param gToken The gToken address
     * @param reduceAmount The amount of reduction
     */
    function _reduceReserves(address gToken, uint256 reduceAmount) external onlyAdmin returns (uint256) {
        return GTokenInterface(gToken)._reduceReserves(reduceAmount);
    }

    /**
     * @notice Set gToken IRM
     * @param gToken The gToken address
     * @param newInterestRateModel The new IRM address
     */
    function _setInterestRateModel(address gToken, InterestRateModel newInterestRateModel)
        external
        onlyAdmin
        returns (uint256)
    {
        return GTokenInterface(gToken)._setInterestRateModel(newInterestRateModel);
    }

    /**
     * @notice Set gToken collateral cap
     * @dev It will revert if the gToken is not JCollateralCap.
     * @param gToken The gToken address
     * @param newCollateralCap The new collateral cap
     */
    function _setCollateralCap(address gToken, uint256 newCollateralCap) external onlyAdmin {
        GCollateralCapXrc20Interface(gToken)._setCollateralCap(newCollateralCap);
    }

    /**
     * @notice Set gToken new implementation
     * @param gToken The gToken address
     * @param implementation The new implementation
     * @param becomeImplementationData The payload data
     */
    function _setImplementation(
        address gToken,
        address implementation,
        bool allowResign,
        bytes calldata becomeImplementationData
    ) external onlyAdmin {
        JDelegatorInterface(gToken)._setImplementation(implementation, allowResign, becomeImplementationData);
    }

    /**
     * @notice Extract reserves by the reserve manager
     * @param gToken The gToken address
     * @param reduceAmount The amount of reduction
     */
    function extractReserves(address gToken, uint256 reduceAmount) external onlyReserveManager {
        require(GTokenInterface(gToken)._reduceReserves(reduceAmount) == 0, "failed to reduce reserves");

        address underlying = GXrc20(gToken).underlying();
        _transferToken(underlying, reserveManager, reduceAmount);
    }

    /**
     * @notice Seize the stock assets
     * @param token The token address
     */
    function seize(address token) external onlyAdmin {
        uint256 amount = EIP20NonStandardInterface(token).balanceOf(address(this));
        if (amount > 0) {
            _transferToken(token, admin, amount);
        }
    }

    /**
     * @notice Set the admin
     * @param newAdmin The new admin
     */
    function setAdmin(address payable newAdmin) external onlyAdmin {
        _setAdmin(newAdmin);
    }

    /**
     * @notice Set the reserve manager
     * @param newReserveManager The new reserve manager
     */
    function setReserveManager(address payable newReserveManager) external onlyAdmin {
        address oldReserveManager = reserveManager;
        reserveManager = newReserveManager;

        emit SetReserveManager(oldReserveManager, newReserveManager);
    }

    /* Internal functions */

    function _setAdmin(address payable newAdmin) private {
        require(newAdmin != address(0), "new admin cannot be zero address");
        address oldAdmin = admin;
        admin = newAdmin;
        emit SetAdmin(oldAdmin, newAdmin);
    }

    function _transferToken(
        address token,
        address payable to,
        uint256 amount
    ) private {
        require(to != address(0), "receiver cannot be zero address");

        EIP20NonStandardInterface(token).transfer(to, amount);

        bool success;
        assembly {
            switch returndatasize()
            case 0 {
                // This is a non-standard ERC-20
                success := not(0) // set success to true
            }
            case 32 {
                // This is a joelaint ERC-20
                returndatacopy(0, 0, 32)
                success := mload(0) // Set `success = returndata` of external call
            }
            default {
                if lt(returndatasize(), 32) {
                    revert(0, 0) // This is a non-compliant ERC-20, revert.
                }
                returndatacopy(0, 0, 32) // Vyper joeiler before 0.2.8 will not truncate RETURNDATASIZE.
                success := mload(0) // See here: https://github.com/vyperlang/vyper/security/advisories/GHSA-375m-5fvv-xq23
            }
        }
        require(success, "TOKEN_TRANSFER_OUT_FAILED");
    }

    function compareStrings(string memory a, string memory b) private pure returns (bool) {
        return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))));
    }

    function() external payable {}
}
