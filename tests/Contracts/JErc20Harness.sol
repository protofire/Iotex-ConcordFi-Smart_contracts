pragma solidity ^0.5.16;
pragma experimental ABIEncoderV2;

import "../../contracts/GXrc20Immutable.sol";
import "../../contracts/GXrc20Delegator.sol";
import "../../contracts/GXrc20Delegate.sol";
import "../../contracts/JJLPDelegate.sol";
import "../../contracts/JGTokenDelegate.sol";
import "../../contracts/GCollateralCapXrc20Delegate.sol";
import "../../contracts/GCollateralCapXrc20Delegator.sol";
import "../../contracts/GWrappedNativeDelegate.sol";
import "../../contracts/GWrappedNativeDelegator.sol";
import "./GtrollerScenario.sol";

contract GXrc20Harness is GXrc20Immutable {
    uint256 blockTimestamp = 100000;
    uint256 harnessExchangeRate;
    bool harnessExchangeRateStored;

    mapping(address => bool) public failTransferToAddresses;

    constructor(
        address underlying_,
        GtrollerInterface gTroller_,
        InterestRateModel interestRateModel_,
        uint256 initialExchangeRateMantissa_,
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        address payable admin_
    )
        public
        GXrc20Immutable(
            underlying_,
            gTroller_,
            interestRateModel_,
            initialExchangeRateMantissa_,
            name_,
            symbol_,
            decimals_,
            admin_
        )
    {}

    function doTransferOut(
        address payable to,
        uint256 amount,
        bool isNative
    ) internal {
        require(failTransferToAddresses[to] == false, "TOKEN_TRANSFER_OUT_FAILED");
        return super.doTransferOut(to, amount, isNative);
    }

    function exchangeRateStoredInternal() internal view returns (uint256) {
        if (harnessExchangeRateStored) {
            return harnessExchangeRate;
        }
        return super.exchangeRateStoredInternal();
    }

    function getBlockTimestamp() internal view returns (uint256) {
        return blockTimestamp;
    }

    function getBorrowRateMaxMantissa() public pure returns (uint256) {
        return borrowRateMaxMantissa;
    }

    function harnessSetAccrualBlockTimestamp(uint256 _accrualBlockTimestamp) public {
        accrualBlockTimestamp = _accrualBlockTimestamp;
    }

    function harnessSetBlockTimestamp(uint256 newBlockTimestamp) public {
        blockTimestamp = newBlockTimestamp;
    }

    function harnessFastForward(uint256 blocks) public {
        blockTimestamp += blocks;
    }

    function harnessSetBalance(address account, uint256 amount) external {
        accountTokens[account] = amount;
    }

    function harnessSetTotalSupply(uint256 totalSupply_) public {
        totalSupply = totalSupply_;
    }

    function harnessSetTotalBorrows(uint256 totalBorrows_) public {
        totalBorrows = totalBorrows_;
    }

    function harnessSetTotalReserves(uint256 totalReserves_) public {
        totalReserves = totalReserves_;
    }

    function harnessExchangeRateDetails(
        uint256 totalSupply_,
        uint256 totalBorrows_,
        uint256 totalReserves_
    ) public {
        totalSupply = totalSupply_;
        totalBorrows = totalBorrows_;
        totalReserves = totalReserves_;
    }

    function harnessSetExchangeRate(uint256 exchangeRate) public {
        harnessExchangeRate = exchangeRate;
        harnessExchangeRateStored = true;
    }

    function harnessSetFailTransferToAddress(address _to, bool _fail) public {
        failTransferToAddresses[_to] = _fail;
    }

    function harnessMintFresh(address account, uint256 mintAmount) public returns (uint256) {
        (uint256 err, ) = super.mintFresh(account, mintAmount, false);
        return err;
    }

    function harnessRedeemFresh(
        address payable account,
        uint256 jTokenAmount,
        uint256 underlyingAmount
    ) public returns (uint256) {
        return super.redeemFresh(account, jTokenAmount, underlyingAmount, false);
    }

    function harnessAccountBorrows(address account) public view returns (uint256 principal, uint256 interestIndex) {
        BorrowSnapshot memory snapshot = accountBorrows[account];
        return (snapshot.principal, snapshot.interestIndex);
    }

    function harnessSetAccountBorrows(
        address account,
        uint256 principal,
        uint256 interestIndex
    ) public {
        accountBorrows[account] = BorrowSnapshot({principal: principal, interestIndex: interestIndex});
    }

    function harnessSetBorrowIndex(uint256 borrowIndex_) public {
        borrowIndex = borrowIndex_;
    }

    function harnessBorrowFresh(address payable account, uint256 borrowAmount) public returns (uint256) {
        return borrowFresh(account, borrowAmount, false);
    }

    function harnessRepayBorrowFresh(
        address payer,
        address account,
        uint256 repayAmount
    ) public returns (uint256) {
        (uint256 err, ) = repayBorrowFresh(payer, account, repayAmount, false);
        return err;
    }

    function harnessLiquidateBorrowFresh(
        address liquidator,
        address borrower,
        uint256 repayAmount,
        GToken jTokenCollateral
    ) public returns (uint256) {
        (uint256 err, ) = liquidateBorrowFresh(liquidator, borrower, repayAmount, jTokenCollateral, false);
        return err;
    }

    function harnessReduceReservesFresh(uint256 amount) public returns (uint256) {
        return _reduceReservesFresh(amount);
    }

    function harnessSetReserveFactorFresh(uint256 newReserveFactorMantissa) public returns (uint256) {
        return _setReserveFactorFresh(newReserveFactorMantissa);
    }

    function harnessSetInterestRateModelFresh(InterestRateModel newInterestRateModel) public returns (uint256) {
        return _setInterestRateModelFresh(newInterestRateModel);
    }

    function harnessSetInterestRateModel(address newInterestRateModelAddress) public {
        interestRateModel = InterestRateModel(newInterestRateModelAddress);
    }

    function harnessCallBorrowAllowed(uint256 amount) public returns (uint256) {
        return gTroller.borrowAllowed(address(this), msg.sender, amount);
    }
}

contract GXrc20Scenario is GXrc20Immutable {
    constructor(
        address underlying_,
        GtrollerInterface gTroller_,
        InterestRateModel interestRateModel_,
        uint256 initialExchangeRateMantissa_,
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        address payable admin_
    )
        public
        GXrc20Immutable(
            underlying_,
            gTroller_,
            interestRateModel_,
            initialExchangeRateMantissa_,
            name_,
            symbol_,
            decimals_,
            admin_
        )
    {}

    function setTotalBorrows(uint256 totalBorrows_) public {
        totalBorrows = totalBorrows_;
    }

    function setTotalReserves(uint256 totalReserves_) public {
        totalReserves = totalReserves_;
    }

    function getBlockTimestamp() internal view returns (uint256) {
        GtrollerScenario gTrollerScenario = GtrollerScenario(address(gTroller));
        return gTrollerScenario.blockTimestamp();
    }
}

contract JEvil is GXrc20Scenario {
    constructor(
        address underlying_,
        GtrollerInterface gTroller_,
        InterestRateModel interestRateModel_,
        uint256 initialExchangeRateMantissa_,
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        address payable admin_
    )
        public
        GXrc20Scenario(
            underlying_,
            gTroller_,
            interestRateModel_,
            initialExchangeRateMantissa_,
            name_,
            symbol_,
            decimals_,
            admin_
        )
    {}

    function evilSeize(
        GToken treasure,
        address liquidator,
        address borrower,
        uint256 seizeTokens
    ) public returns (uint256) {
        return treasure.seize(liquidator, borrower, seizeTokens);
    }
}

contract GXrc20DelegatorScenario is GXrc20Delegator {
    constructor(
        address underlying_,
        GtrollerInterface gTroller_,
        InterestRateModel interestRateModel_,
        uint256 initialExchangeRateMantissa_,
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        address payable admin_,
        address implementation_,
        bytes memory becomeImplementationData
    )
        public
        GXrc20Delegator(
            underlying_,
            gTroller_,
            interestRateModel_,
            initialExchangeRateMantissa_,
            name_,
            symbol_,
            decimals_,
            admin_,
            implementation_,
            becomeImplementationData
        )
    {}

    function setTotalBorrows(uint256 totalBorrows_) public {
        totalBorrows = totalBorrows_;
    }

    function setTotalReserves(uint256 totalReserves_) public {
        totalReserves = totalReserves_;
    }
}

contract GCollateralCapXrc20DelegatorScenario is GCollateralCapXrc20Delegator {
    constructor(
        address underlying_,
        GtrollerInterface gTroller_,
        InterestRateModel interestRateModel_,
        uint256 initialExchangeRateMantissa_,
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        address payable admin_,
        address implementation_,
        bytes memory becomeImplementationData
    )
        public
        GCollateralCapXrc20Delegator(
            underlying_,
            gTroller_,
            interestRateModel_,
            initialExchangeRateMantissa_,
            name_,
            symbol_,
            decimals_,
            admin_,
            implementation_,
            becomeImplementationData
        )
    {}

    function setTotalBorrows(uint256 totalBorrows_) public {
        totalBorrows = totalBorrows_;
    }

    function setTotalReserves(uint256 totalReserves_) public {
        totalReserves = totalReserves_;
    }
}

contract GWrappedNativeDelegatorScenario is GWrappedNativeDelegator {
    constructor(
        address underlying_,
        GtrollerInterface gTroller_,
        InterestRateModel interestRateModel_,
        uint256 initialExchangeRateMantissa_,
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        address payable admin_,
        address implementation_,
        bytes memory becomeImplementationData
    )
        public
        GWrappedNativeDelegator(
            underlying_,
            gTroller_,
            interestRateModel_,
            initialExchangeRateMantissa_,
            name_,
            symbol_,
            decimals_,
            admin_,
            implementation_,
            becomeImplementationData
        )
    {}

    function setTotalBorrows(uint256 totalBorrows_) public {
        totalBorrows = totalBorrows_;
    }

    function setTotalReserves(uint256 totalReserves_) public {
        totalReserves = totalReserves_;
    }

    function() external payable {}
}

contract GXrc20DelegateHarness is GXrc20Delegate {
    event Log(string x, address y);
    event Log(string x, uint256 y);

    uint256 blockTimestamp = 100000;
    uint256 harnessExchangeRate;
    bool harnessExchangeRateStored;

    mapping(address => bool) public failTransferToAddresses;

    function exchangeRateStoredInternal() internal view returns (uint256) {
        if (harnessExchangeRateStored) {
            return harnessExchangeRate;
        }
        return super.exchangeRateStoredInternal();
    }

    function doTransferOut(
        address payable to,
        uint256 amount,
        bool isNative
    ) internal {
        require(failTransferToAddresses[to] == false, "TOKEN_TRANSFER_OUT_FAILED");
        return super.doTransferOut(to, amount, isNative);
    }

    function getBlockTimestamp() internal view returns (uint256) {
        return blockTimestamp;
    }

    function getBorrowRateMaxMantissa() public pure returns (uint256) {
        return borrowRateMaxMantissa;
    }

    function harnessSetBlockTimestamp(uint256 newBlockTimestamp) public {
        blockTimestamp = newBlockTimestamp;
    }

    function harnessFastForward(uint256 blocks) public {
        blockTimestamp += blocks;
    }

    function harnessSetBalance(address account, uint256 amount) external {
        accountTokens[account] = amount;
    }

    function harnessSetAccrualBlockTimestamp(uint256 _accrualBlockTimestamp) public {
        accrualBlockTimestamp = _accrualBlockTimestamp;
    }

    function harnessSetTotalSupply(uint256 totalSupply_) public {
        totalSupply = totalSupply_;
    }

    function harnessSetTotalBorrows(uint256 totalBorrows_) public {
        totalBorrows = totalBorrows_;
    }

    function harnessIncrementTotalBorrows(uint256 addtlBorrow_) public {
        totalBorrows = totalBorrows + addtlBorrow_;
    }

    function harnessSetTotalReserves(uint256 totalReserves_) public {
        totalReserves = totalReserves_;
    }

    function harnessExchangeRateDetails(
        uint256 totalSupply_,
        uint256 totalBorrows_,
        uint256 totalReserves_
    ) public {
        totalSupply = totalSupply_;
        totalBorrows = totalBorrows_;
        totalReserves = totalReserves_;
    }

    function harnessSetExchangeRate(uint256 exchangeRate) public {
        harnessExchangeRate = exchangeRate;
        harnessExchangeRateStored = true;
    }

    function harnessSetFailTransferToAddress(address _to, bool _fail) public {
        failTransferToAddresses[_to] = _fail;
    }

    function harnessMintFresh(address account, uint256 mintAmount) public returns (uint256) {
        (uint256 err, ) = super.mintFresh(account, mintAmount, false);
        return err;
    }

    function harnessRedeemFresh(
        address payable account,
        uint256 jTokenAmount,
        uint256 underlyingAmount
    ) public returns (uint256) {
        return super.redeemFresh(account, jTokenAmount, underlyingAmount, false);
    }

    function harnessAccountBorrows(address account) public view returns (uint256 principal, uint256 interestIndex) {
        BorrowSnapshot memory snapshot = accountBorrows[account];
        return (snapshot.principal, snapshot.interestIndex);
    }

    function harnessSetAccountBorrows(
        address account,
        uint256 principal,
        uint256 interestIndex
    ) public {
        accountBorrows[account] = BorrowSnapshot({principal: principal, interestIndex: interestIndex});
    }

    function harnessSetBorrowIndex(uint256 borrowIndex_) public {
        borrowIndex = borrowIndex_;
    }

    function harnessBorrowFresh(address payable account, uint256 borrowAmount) public returns (uint256) {
        return borrowFresh(account, borrowAmount, false);
    }

    function harnessRepayBorrowFresh(
        address payer,
        address account,
        uint256 repayAmount
    ) public returns (uint256) {
        (uint256 err, ) = repayBorrowFresh(payer, account, repayAmount, false);
        return err;
    }

    function harnessLiquidateBorrowFresh(
        address liquidator,
        address borrower,
        uint256 repayAmount,
        GToken jTokenCollateral
    ) public returns (uint256) {
        (uint256 err, ) = liquidateBorrowFresh(liquidator, borrower, repayAmount, jTokenCollateral, false);
        return err;
    }

    function harnessReduceReservesFresh(uint256 amount) public returns (uint256) {
        return _reduceReservesFresh(amount);
    }

    function harnessSetReserveFactorFresh(uint256 newReserveFactorMantissa) public returns (uint256) {
        return _setReserveFactorFresh(newReserveFactorMantissa);
    }

    function harnessSetInterestRateModelFresh(InterestRateModel newInterestRateModel) public returns (uint256) {
        return _setInterestRateModelFresh(newInterestRateModel);
    }

    function harnessSetInterestRateModel(address newInterestRateModelAddress) public {
        interestRateModel = InterestRateModel(newInterestRateModelAddress);
    }

    function harnessCallBorrowAllowed(uint256 amount) public returns (uint256) {
        return gTroller.borrowAllowed(address(this), msg.sender, amount);
    }
}

contract GXrc20DelegateScenario is GXrc20Delegate {
    constructor() public {}

    function setTotalBorrows(uint256 totalBorrows_) public {
        totalBorrows = totalBorrows_;
    }

    function setTotalReserves(uint256 totalReserves_) public {
        totalReserves = totalReserves_;
    }

    function getBlockTimestamp() internal view returns (uint256) {
        GtrollerScenario gTrollerScenario = GtrollerScenario(address(gTroller));
        return gTrollerScenario.blockTimestamp();
    }
}

contract GXrc20DelegateScenarioExtra is GXrc20DelegateScenario {
    function iHaveSpoken() public pure returns (string memory) {
        return "i have spoken";
    }

    function itIsTheWay() public {
        admin = address(1); // make a change to test effect
    }

    function babyYoda() public pure {
        revert("protect the baby");
    }
}

contract JJLPDelegateHarness is JJLPDelegate {
    uint256 blockTimestamp = 100000;
    uint256 harnessExchangeRate;
    bool harnessExchangeRateStored;

    mapping(address => bool) public failTransferToAddresses;

    function exchangeRateStoredInternal() internal view returns (uint256) {
        if (harnessExchangeRateStored) {
            return harnessExchangeRate;
        }
        return super.exchangeRateStoredInternal();
    }

    function getBlockTimestamp() internal view returns (uint256) {
        return blockTimestamp;
    }

    function getBorrowRateMaxMantissa() public pure returns (uint256) {
        return borrowRateMaxMantissa;
    }

    function harnessSetAccrualBlockTimestamp(uint256 _accrualBlockTimestamp) public {
        accrualBlockTimestamp = _accrualBlockTimestamp;
    }

    function harnessSetBlockTimestamp(uint256 newBlockTimestamp) public {
        blockTimestamp = newBlockTimestamp;
    }

    function harnessFastForward(uint256 blocks) public {
        blockTimestamp += blocks;
    }

    function harnessSetBalance(address account, uint256 amount) external {
        accountTokens[account] = amount;
    }

    function harnessSetTotalSupply(uint256 totalSupply_) public {
        totalSupply = totalSupply_;
    }

    function harnessSetTotalBorrows(uint256 totalBorrows_) public {
        totalBorrows = totalBorrows_;
    }

    function harnessSetTotalReserves(uint256 totalReserves_) public {
        totalReserves = totalReserves_;
    }

    function harnessExchangeRateDetails(
        uint256 totalSupply_,
        uint256 totalBorrows_,
        uint256 totalReserves_
    ) public {
        totalSupply = totalSupply_;
        totalBorrows = totalBorrows_;
        totalReserves = totalReserves_;
    }

    function harnessSetExchangeRate(uint256 exchangeRate) public {
        harnessExchangeRate = exchangeRate;
        harnessExchangeRateStored = true;
    }

    function harnessSetFailTransferToAddress(address _to, bool _fail) public {
        failTransferToAddresses[_to] = _fail;
    }

    function harnessMintFresh(address account, uint256 mintAmount) public returns (uint256) {
        (uint256 err, ) = super.mintFresh(account, mintAmount, false);
        return err;
    }

    function harnessRedeemFresh(
        address payable account,
        uint256 jTokenAmount,
        uint256 underlyingAmount
    ) public returns (uint256) {
        return super.redeemFresh(account, jTokenAmount, underlyingAmount, false);
    }

    function harnessAccountBorrows(address account) public view returns (uint256 principal, uint256 interestIndex) {
        BorrowSnapshot memory snapshot = accountBorrows[account];
        return (snapshot.principal, snapshot.interestIndex);
    }

    function harnessSetAccountBorrows(
        address account,
        uint256 principal,
        uint256 interestIndex
    ) public {
        accountBorrows[account] = BorrowSnapshot({principal: principal, interestIndex: interestIndex});
    }

    function harnessSetBorrowIndex(uint256 borrowIndex_) public {
        borrowIndex = borrowIndex_;
    }

    function harnessBorrowFresh(address payable account, uint256 borrowAmount) public returns (uint256) {
        return borrowFresh(account, borrowAmount, false);
    }

    function harnessRepayBorrowFresh(
        address payer,
        address account,
        uint256 repayAmount
    ) public returns (uint256) {
        (uint256 err, ) = repayBorrowFresh(payer, account, repayAmount, false);
        return err;
    }

    function harnessLiquidateBorrowFresh(
        address liquidator,
        address borrower,
        uint256 repayAmount,
        GToken jTokenCollateral
    ) public returns (uint256) {
        (uint256 err, ) = liquidateBorrowFresh(liquidator, borrower, repayAmount, jTokenCollateral, false);
        return err;
    }

    function harnessReduceReservesFresh(uint256 amount) public returns (uint256) {
        return _reduceReservesFresh(amount);
    }

    function harnessSetReserveFactorFresh(uint256 newReserveFactorMantissa) public returns (uint256) {
        return _setReserveFactorFresh(newReserveFactorMantissa);
    }

    function harnessSetInterestRateModelFresh(InterestRateModel newInterestRateModel) public returns (uint256) {
        return _setInterestRateModelFresh(newInterestRateModel);
    }

    function harnessSetInterestRateModel(address newInterestRateModelAddress) public {
        interestRateModel = InterestRateModel(newInterestRateModelAddress);
    }

    function harnessCallBorrowAllowed(uint256 amount) public returns (uint256) {
        return gTroller.borrowAllowed(address(this), msg.sender, amount);
    }
}

contract JJLPDelegateScenario is JJLPDelegate {
    function setTotalBorrows(uint256 totalBorrows_) public {
        totalBorrows = totalBorrows_;
    }

    function setTotalReserves(uint256 totalReserves_) public {
        totalReserves = totalReserves_;
    }

    function getBlockTimestamp() internal view returns (uint256) {
        GtrollerScenario gTrollerScenario = GtrollerScenario(address(gTroller));
        return gTrollerScenario.blockTimestamp();
    }
}

contract JGTokenDelegateHarness is JGTokenDelegate {
    uint256 blockTimestamp = 100000;
    uint256 harnessExchangeRate;
    bool harnessExchangeRateStored;

    mapping(address => bool) public failTransferToAddresses;

    function exchangeRateStoredInternal() internal view returns (uint256) {
        if (harnessExchangeRateStored) {
            return harnessExchangeRate;
        }
        return super.exchangeRateStoredInternal();
    }

    function getBlockTimestamp() internal view returns (uint256) {
        return blockTimestamp;
    }

    function getBorrowRateMaxMantissa() public pure returns (uint256) {
        return borrowRateMaxMantissa;
    }

    function harnessSetAccrualBlockTimestamp(uint256 _accrualBlockTimestamp) public {
        accrualBlockTimestamp = _accrualBlockTimestamp;
    }

    function harnessSetBlockTimestamp(uint256 newBlockTimestamp) public {
        blockTimestamp = newBlockTimestamp;
    }

    function harnessFastForward(uint256 blocks) public {
        blockTimestamp += blocks;
    }

    function harnessSetBalance(address account, uint256 amount) external {
        accountTokens[account] = amount;
    }

    function harnessSetTotalSupply(uint256 totalSupply_) public {
        totalSupply = totalSupply_;
    }

    function harnessSetTotalBorrows(uint256 totalBorrows_) public {
        totalBorrows = totalBorrows_;
    }

    function harnessSetTotalReserves(uint256 totalReserves_) public {
        totalReserves = totalReserves_;
    }

    function harnessExchangeRateDetails(
        uint256 totalSupply_,
        uint256 totalBorrows_,
        uint256 totalReserves_
    ) public {
        totalSupply = totalSupply_;
        totalBorrows = totalBorrows_;
        totalReserves = totalReserves_;
    }

    function harnessSetExchangeRate(uint256 exchangeRate) public {
        harnessExchangeRate = exchangeRate;
        harnessExchangeRateStored = true;
    }

    function harnessSetFailTransferToAddress(address _to, bool _fail) public {
        failTransferToAddresses[_to] = _fail;
    }

    function harnessMintFresh(address account, uint256 mintAmount) public returns (uint256) {
        (uint256 err, ) = super.mintFresh(account, mintAmount, false);
        return err;
    }

    function harnessRedeemFresh(
        address payable account,
        uint256 jTokenAmount,
        uint256 underlyingAmount
    ) public returns (uint256) {
        return super.redeemFresh(account, jTokenAmount, underlyingAmount, false);
    }

    function harnessAccountBorrows(address account) public view returns (uint256 principal, uint256 interestIndex) {
        BorrowSnapshot memory snapshot = accountBorrows[account];
        return (snapshot.principal, snapshot.interestIndex);
    }

    function harnessSetAccountBorrows(
        address account,
        uint256 principal,
        uint256 interestIndex
    ) public {
        accountBorrows[account] = BorrowSnapshot({principal: principal, interestIndex: interestIndex});
    }

    function harnessSetBorrowIndex(uint256 borrowIndex_) public {
        borrowIndex = borrowIndex_;
    }

    function harnessBorrowFresh(address payable account, uint256 borrowAmount) public returns (uint256) {
        return borrowFresh(account, borrowAmount, false);
    }

    function harnessRepayBorrowFresh(
        address payer,
        address account,
        uint256 repayAmount
    ) public returns (uint256) {
        (uint256 err, ) = repayBorrowFresh(payer, account, repayAmount, false);
        return err;
    }

    function harnessLiquidateBorrowFresh(
        address liquidator,
        address borrower,
        uint256 repayAmount,
        GToken jTokenCollateral
    ) public returns (uint256) {
        (uint256 err, ) = liquidateBorrowFresh(liquidator, borrower, repayAmount, jTokenCollateral, false);
        return err;
    }

    function harnessReduceReservesFresh(uint256 amount) public returns (uint256) {
        return _reduceReservesFresh(amount);
    }

    function harnessSetReserveFactorFresh(uint256 newReserveFactorMantissa) public returns (uint256) {
        return _setReserveFactorFresh(newReserveFactorMantissa);
    }

    function harnessSetInterestRateModelFresh(InterestRateModel newInterestRateModel) public returns (uint256) {
        return _setInterestRateModelFresh(newInterestRateModel);
    }

    function harnessSetInterestRateModel(address newInterestRateModelAddress) public {
        interestRateModel = InterestRateModel(newInterestRateModelAddress);
    }

    function harnessCallBorrowAllowed(uint256 amount) public returns (uint256) {
        return gTroller.borrowAllowed(address(this), msg.sender, amount);
    }

    function harnessSetInternalCash(uint256 amount) public returns (uint256) {
        internalCash = amount;
    }
}

contract JGTokenDelegateScenario is JGTokenDelegate {
    function setTotalBorrows(uint256 totalBorrows_) public {
        totalBorrows = totalBorrows_;
    }

    function setTotalReserves(uint256 totalReserves_) public {
        totalReserves = totalReserves_;
    }

    function getBlockTimestamp() internal view returns (uint256) {
        GtrollerScenario gTrollerScenario = GtrollerScenario(address(gTroller));
        return gTrollerScenario.blockTimestamp();
    }
}

contract GCollateralCapXrc20DelegateHarness is GCollateralCapXrc20Delegate {
    event Log(string x, address y);
    event Log(string x, uint256 y);

    uint256 blockTimestamp = 100000;
    uint256 harnessExchangeRate;
    bool harnessExchangeRateStored;

    mapping(address => bool) public failTransferToAddresses;

    function exchangeRateStoredInternal() internal view returns (uint256) {
        if (harnessExchangeRateStored) {
            return harnessExchangeRate;
        }
        return super.exchangeRateStoredInternal();
    }

    function doTransferOut(
        address payable to,
        uint256 amount,
        bool isNative
    ) internal {
        require(failTransferToAddresses[to] == false, "TOKEN_TRANSFER_OUT_FAILED");
        return super.doTransferOut(to, amount, isNative);
    }

    function getBlockTimestamp() internal view returns (uint256) {
        return blockTimestamp;
    }

    function getBorrowRateMaxMantissa() public pure returns (uint256) {
        return borrowRateMaxMantissa;
    }

    function harnessSetBlockTimestamp(uint256 newBlockTimestamp) public {
        blockTimestamp = newBlockTimestamp;
    }

    function harnessFastForward(uint256 blocks) public {
        blockTimestamp += blocks;
    }

    function harnessSetBalance(address account, uint256 amount) external {
        accountTokens[account] = amount;
    }

    function harnessSetCollateralBalance(address account, uint256 amount) external {
        accountCollateralTokens[account] = amount;
    }

    function harnessSetCollateralBalanceInit(address account) external {
        isCollateralTokenInit[account] = true;
    }

    function harnessSetAccrualBlockTimestamp(uint256 _accrualBlockTimestamp) public {
        accrualBlockTimestamp = _accrualBlockTimestamp;
    }

    function harnessSetTotalSupply(uint256 totalSupply_) public {
        totalSupply = totalSupply_;
    }

    function harnessSetTotalCollateralTokens(uint256 totalCollateralTokens_) public {
        totalCollateralTokens = totalCollateralTokens_;
    }

    function harnessSetTotalBorrows(uint256 totalBorrows_) public {
        totalBorrows = totalBorrows_;
    }

    function harnessIncrementTotalBorrows(uint256 addtlBorrow_) public {
        totalBorrows = totalBorrows + addtlBorrow_;
    }

    function harnessSetTotalReserves(uint256 totalReserves_) public {
        totalReserves = totalReserves_;
    }

    function harnessExchangeRateDetails(
        uint256 totalSupply_,
        uint256 totalBorrows_,
        uint256 totalReserves_
    ) public {
        totalSupply = totalSupply_;
        totalBorrows = totalBorrows_;
        totalReserves = totalReserves_;
    }

    function harnessSetExchangeRate(uint256 exchangeRate) public {
        harnessExchangeRate = exchangeRate;
        harnessExchangeRateStored = true;
    }

    function harnessSetFailTransferToAddress(address _to, bool _fail) public {
        failTransferToAddresses[_to] = _fail;
    }

    function harnessMintFresh(address account, uint256 mintAmount) public returns (uint256) {
        (uint256 err, ) = super.mintFresh(account, mintAmount, false);
        return err;
    }

    function harnessRedeemFresh(
        address payable account,
        uint256 jTokenAmount,
        uint256 underlyingAmount
    ) public returns (uint256) {
        return super.redeemFresh(account, jTokenAmount, underlyingAmount, false);
    }

    function harnessAccountBorrows(address account) public view returns (uint256 principal, uint256 interestIndex) {
        BorrowSnapshot memory snapshot = accountBorrows[account];
        return (snapshot.principal, snapshot.interestIndex);
    }

    function harnessSetAccountBorrows(
        address account,
        uint256 principal,
        uint256 interestIndex
    ) public {
        accountBorrows[account] = BorrowSnapshot({principal: principal, interestIndex: interestIndex});
    }

    function harnessSetBorrowIndex(uint256 borrowIndex_) public {
        borrowIndex = borrowIndex_;
    }

    function harnessBorrowFresh(address payable account, uint256 borrowAmount) public returns (uint256) {
        return borrowFresh(account, borrowAmount, false);
    }

    function harnessRepayBorrowFresh(
        address payer,
        address account,
        uint256 repayAmount
    ) public returns (uint256) {
        (uint256 err, ) = repayBorrowFresh(payer, account, repayAmount, false);
        return err;
    }

    function harnessLiquidateBorrowFresh(
        address liquidator,
        address borrower,
        uint256 repayAmount,
        GToken jTokenCollateral
    ) public returns (uint256) {
        (uint256 err, ) = liquidateBorrowFresh(liquidator, borrower, repayAmount, jTokenCollateral, false);
        return err;
    }

    function harnessReduceReservesFresh(uint256 amount) public returns (uint256) {
        return _reduceReservesFresh(amount);
    }

    function harnessSetReserveFactorFresh(uint256 newReserveFactorMantissa) public returns (uint256) {
        return _setReserveFactorFresh(newReserveFactorMantissa);
    }

    function harnessSetInterestRateModelFresh(InterestRateModel newInterestRateModel) public returns (uint256) {
        return _setInterestRateModelFresh(newInterestRateModel);
    }

    function harnessSetInterestRateModel(address newInterestRateModelAddress) public {
        interestRateModel = InterestRateModel(newInterestRateModelAddress);
    }

    function harnessCallBorrowAllowed(uint256 amount) public returns (uint256) {
        return gTroller.borrowAllowed(address(this), msg.sender, amount);
    }

    function harnessSetInternalCash(uint256 amount) public returns (uint256) {
        internalCash = amount;
    }
}

contract GCollateralCapXrc20DelegateScenario is GCollateralCapXrc20Delegate {
    constructor() public {}

    function setTotalBorrows(uint256 totalBorrows_) public {
        totalBorrows = totalBorrows_;
    }

    function setTotalReserves(uint256 totalReserves_) public {
        totalReserves = totalReserves_;
    }

    function getBlockTimestamp() internal view returns (uint256) {
        GtrollerScenario gTrollerScenario = GtrollerScenario(address(gTroller));
        return gTrollerScenario.blockTimestamp();
    }
}

contract GWrappedNativeDelegateHarness is GWrappedNativeDelegate {
    event Log(string x, address y);
    event Log(string x, uint256 y);

    uint256 blockTimestamp = 100000;
    uint256 harnessExchangeRate;
    bool harnessExchangeRateStored;

    mapping(address => bool) public failTransferToAddresses;

    function exchangeRateStoredInternal() internal view returns (uint256) {
        if (harnessExchangeRateStored) {
            return harnessExchangeRate;
        }
        return super.exchangeRateStoredInternal();
    }

    function doTransferOut(
        address payable to,
        uint256 amount,
        bool isNative
    ) internal {
        require(failTransferToAddresses[to] == false, "TOKEN_TRANSFER_OUT_FAILED");
        return super.doTransferOut(to, amount, isNative);
    }

    function getBlockTimestamp() internal view returns (uint256) {
        return blockTimestamp;
    }

    function getBorrowRateMaxMantissa() public pure returns (uint256) {
        return borrowRateMaxMantissa;
    }

    function harnessSetBlockTimestamp(uint256 newBlockTimestamp) public {
        blockTimestamp = newBlockTimestamp;
    }

    function harnessFastForward(uint256 blocks) public {
        blockTimestamp += blocks;
    }

    function harnessSetBalance(address account, uint256 amount) external {
        accountTokens[account] = amount;
    }

    function harnessSetAccrualBlockTimestamp(uint256 _accrualBlockTimestamp) public {
        accrualBlockTimestamp = _accrualBlockTimestamp;
    }

    function harnessSetTotalSupply(uint256 totalSupply_) public {
        totalSupply = totalSupply_;
    }

    function harnessSetTotalBorrows(uint256 totalBorrows_) public {
        totalBorrows = totalBorrows_;
    }

    function harnessIncrementTotalBorrows(uint256 addtlBorrow_) public {
        totalBorrows = totalBorrows + addtlBorrow_;
    }

    function harnessSetTotalReserves(uint256 totalReserves_) public {
        totalReserves = totalReserves_;
    }

    function harnessExchangeRateDetails(
        uint256 totalSupply_,
        uint256 totalBorrows_,
        uint256 totalReserves_
    ) public {
        totalSupply = totalSupply_;
        totalBorrows = totalBorrows_;
        totalReserves = totalReserves_;
    }

    function harnessSetExchangeRate(uint256 exchangeRate) public {
        harnessExchangeRate = exchangeRate;
        harnessExchangeRateStored = true;
    }

    function harnessSetFailTransferToAddress(address _to, bool _fail) public {
        failTransferToAddresses[_to] = _fail;
    }

    function harnessMintFresh(address account, uint256 mintAmount) public returns (uint256) {
        // isNative is not important for mint fresh testing.
        (uint256 err, ) = mintFresh(account, mintAmount, true);
        return err;
    }

    function harnessRedeemFresh(
        address payable account,
        uint256 jTokenAmount,
        uint256 underlyingAmount
    ) public returns (uint256) {
        // isNative is not important for redeem fresh testing.
        return redeemFresh(account, jTokenAmount, underlyingAmount, true);
    }

    function harnessAccountBorrows(address account) public view returns (uint256 principal, uint256 interestIndex) {
        BorrowSnapshot memory snapshot = accountBorrows[account];
        return (snapshot.principal, snapshot.interestIndex);
    }

    function harnessSetAccountBorrows(
        address account,
        uint256 principal,
        uint256 interestIndex
    ) public {
        accountBorrows[account] = BorrowSnapshot({principal: principal, interestIndex: interestIndex});
    }

    function harnessSetBorrowIndex(uint256 borrowIndex_) public {
        borrowIndex = borrowIndex_;
    }

    function harnessBorrowFresh(address payable account, uint256 borrowAmount) public returns (uint256) {
        // isNative is not important for borrow fresh testing.
        return borrowFresh(account, borrowAmount, true);
    }

    function harnessRepayBorrowFresh(
        address payer,
        address account,
        uint256 repayAmount
    ) public payable returns (uint256) {
        // isNative is not important for repay borrow fresh testing.
        (uint256 err, ) = repayBorrowFresh(payer, account, repayAmount, true);
        return err;
    }

    function harnessLiquidateBorrowFresh(
        address liquidator,
        address borrower,
        uint256 repayAmount,
        GToken jTokenCollateral
    ) public returns (uint256) {
        // isNative is not important for liquidate borrow fresh testing.
        (uint256 err, ) = liquidateBorrowFresh(liquidator, borrower, repayAmount, jTokenCollateral, true);
        return err;
    }

    function harnessReduceReservesFresh(uint256 amount) public returns (uint256) {
        return _reduceReservesFresh(amount);
    }

    function harnessSetReserveFactorFresh(uint256 newReserveFactorMantissa) public returns (uint256) {
        return _setReserveFactorFresh(newReserveFactorMantissa);
    }

    function harnessSetInterestRateModelFresh(InterestRateModel newInterestRateModel) public returns (uint256) {
        return _setInterestRateModelFresh(newInterestRateModel);
    }

    function harnessSetInterestRateModel(address newInterestRateModelAddress) public {
        interestRateModel = InterestRateModel(newInterestRateModelAddress);
    }

    function harnessCallBorrowAllowed(uint256 amount) public returns (uint256) {
        return gTroller.borrowAllowed(address(this), msg.sender, amount);
    }

    function harnessDoTransferIn(address from, uint256 amount) public payable returns (uint256) {
        return doTransferIn(from, amount, true);
    }

    function harnessDoTransferOut(address payable to, uint256 amount) public payable {
        return doTransferOut(to, amount, true);
    }

    function() external payable {}
}

contract GWrappedNativeDelegateScenario is GWrappedNativeDelegate {
    constructor() public {}

    function setTotalBorrows(uint256 totalBorrows_) public {
        totalBorrows = totalBorrows_;
    }

    function setTotalReserves(uint256 totalReserves_) public {
        totalReserves = totalReserves_;
    }

    function getBlockTimestamp() internal view returns (uint256) {
        GtrollerScenario gTrollerScenario = GtrollerScenario(address(gTroller));
        return gTrollerScenario.blockTimestamp();
    }

    function() external payable {}
}
