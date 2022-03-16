// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.5.16;

import "../GXrc20.sol";
import "../GToken.sol";
import "./PriceOracle.sol";
import "../Exponential.sol";
import "../EIP20Interface.sol";

interface AggregatorV3Interface {
    function decimals() external view returns (uint8);

    function description() external view returns (string memory);

    function version() external view returns (uint256);

    // getRoundData and latestRoundData should both raise "No data present"
    // if they do not have data to report, instead of returning unset values
    // which could be misinterpreted as actual reported values.
    function getRoundData(uint80 _roundId)
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

contract PriceOracleProxyUSD is PriceOracle, Exponential {
    /// @notice Fallback price feed - not used
    mapping(address => uint256) internal prices;

    /// @notice Admin address
    address public admin;

    /// @notice Guardian address
    address public guardian;

    /// @notice joe address
    address public joeAddress = 0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd;

    /// @notice xJoe address
    address public xJoeAddress = 0x57319d41F71E81F3c65F2a47CA4e001EbAFd4F33;

    /// @notice jXJoe address
    address public jXJoeAddress = 0xC146783a59807154F92084f9243eb139D58Da696;

    /// @notice Chainlink Aggregators
    mapping(address => AggregatorV3Interface) public aggregators;

    /**
     * @param admin_ The address of admin to set aggregators
     */
    constructor(address admin_) public {
        admin = admin_;
    }

    /**
     * @notice Get the underlying price of a listed gToken asset
     * @param gToken The gToken to get the underlying price of
     * @return The underlying asset price mantissa (scaled by 1e18)
     */
    function getUnderlyingPrice(GToken gToken) public view returns (uint256) {
        address gTokenAddress = address(gToken);

        AggregatorV3Interface aggregator = aggregators[gTokenAddress];
        if (address(aggregator) != address(0)) {
            uint256 price = getPriceFromChainlink(aggregator);
            uint256 underlyingDecimals = EIP20Interface(GXrc20(gTokenAddress).underlying()).decimals();

            if (gTokenAddress == jXJoeAddress) {
                price = mul_(price, Exp({mantissa: getXJoeRatio()}));
            }

            if (underlyingDecimals <= 18) {
                return mul_(price, 10**(18 - underlyingDecimals));
            }
            return div_(price, 10**(underlyingDecimals - 18));
        }

        address asset = address(GXrc20(gTokenAddress).underlying());

        uint256 price = prices[asset];
        require(price > 0, "invalid price");
        return price;
    }

    /*** Internal fucntions ***/

    /**
     * @notice Get price from ChainLink
     * @param aggregator The ChainLink aggregator to get the price of
     * @return The price
     */
    function getPriceFromChainlink(AggregatorV3Interface aggregator) internal view returns (uint256) {
        (, int256 price, , , ) = aggregator.latestRoundData();
        require(price > 0, "invalid price");

        // Extend the decimals to 1e18.
        return mul_(uint256(price), 10**(18 - uint256(aggregator.decimals())));
    }

    /**
     * @notice Get joe:xJoe ratio
     * @return The ratio
     */
    function getXJoeRatio() internal view returns (uint256) {
        uint256 joeAmount = EIP20Interface(joeAddress).balanceOf(xJoeAddress);
        uint256 xJoeAmount = EIP20Interface(xJoeAddress).totalSupply();

        // return the joe:xJoe ratio
        return div_(joeAmount, Exp({mantissa: xJoeAmount}));
    }

    /*** Admin or guardian functions ***/

    event AggregatorUpdated(address gTokenAddress, address source);
    event SetGuardian(address guardian);
    event SetAdmin(address admin);

    /**
     * @notice Set guardian for price oracle proxy
     * @param _guardian The new guardian
     */
    function _setGuardian(address _guardian) external {
        require(msg.sender == admin, "only the admin may set new guardian");
        guardian = _guardian;
        emit SetGuardian(guardian);
    }

    /**
     * @notice Set admin for price oracle proxy
     * @param _admin The new admin
     */
    function _setAdmin(address _admin) external {
        require(msg.sender == admin, "only the admin may set new admin");
        admin = _admin;
        emit SetAdmin(admin);
    }

    /**
     * @notice Set ChainLink aggregators for multiple gTokens
     * @param gTokenAddresses The list of gTokens
     * @param sources The list of ChainLink aggregator sources
     */
    function _setAggregators(address[] calldata gTokenAddresses, address[] calldata sources) external {
        require(msg.sender == admin || msg.sender == guardian, "only the admin or guardian may set the aggregators");
        require(gTokenAddresses.length == sources.length, "mismatched data");
        for (uint256 i = 0; i < gTokenAddresses.length; i++) {
            if (sources[i] != address(0)) {
                require(msg.sender == admin, "guardian may only clear the aggregator");
            }
            aggregators[gTokenAddresses[i]] = AggregatorV3Interface(sources[i]);
            emit AggregatorUpdated(gTokenAddresses[i], sources[i]);
        }
    }

    /**
     * @notice Set the price of underlying asset
     * @param gToken The gToken to get underlying asset from
     * @param underlyingPriceMantissa The new price for the underling asset
     */
    function _setUnderlyingPrice(GToken gToken, uint256 underlyingPriceMantissa) external {
        require(msg.sender == admin, "only the admin may set the underlying price");
        address asset = address(GXrc20(address(gToken)).underlying());
        prices[asset] = underlyingPriceMantissa;
    }

    /**
     * @notice Set the price of the underlying asset directly
     * @param asset The address of the underlying asset
     * @param price The new price of the asset
     */
    function setDirectPrice(address asset, uint256 price) external {
        require(msg.sender == admin, "only the admin may set the direct price");
        prices[asset] = price;
    }
}
