pragma solidity ^0.5.16;

import "./ERC20.sol";
import "../../contracts/GCollateralCapXrc20.sol";
import "../../contracts/ERC3156FlashLenderInterface.sol";
import "../../contracts/GWrappedNative.sol";
import "../../contracts/SafeMath.sol";

// FlashloanReceiver is a simple flashloan receiver implementation for testing
contract FlashloanReceiver is ERC3156FlashBorrowerInterface {
    using SafeMath for uint256;

    uint256 totalBorrows;
    address borrowToken;

    function doFlashloan(
        address flashloanLender,
        address gToken,
        uint256 borrowAmount,
        uint256 repayAmount
    ) external {
        borrowToken = GCollateralCapXrc20(gToken).underlying();
        uint256 balanceBefore = ERC20(borrowToken).balanceOf(address(this));
        bytes memory data = abi.encode(gToken, borrowAmount, repayAmount);
        totalBorrows = GCollateralCapXrc20(gToken).totalBorrows();
        ERC3156FlashLenderInterface(flashloanLender).flashLoan(this, borrowToken, borrowAmount, data);
    }

    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external returns (bytes32) {
        require(initiator == address(this), "FlashBorrower: Untrusted loan initiator");
        ERC20(borrowToken).approve(msg.sender, amount.add(fee));
        (address gToken, uint256 borrowAmount, uint256 repayAmount) = abi.decode(data, (address, uint256, uint256));
        require(amount == borrowAmount, "Params not match");
        uint256 totalBorrowsAfter = GCollateralCapXrc20(gToken).totalBorrows();
        require(totalBorrows.add(borrowAmount) == totalBorrowsAfter, "totalBorrow mismatch");
        return keccak256("ERC3156FlashBorrowerInterface.onFlashLoan");
    }
}

contract FlashloanAndMint is ERC3156FlashBorrowerInterface {
    using SafeMath for uint256;
    uint256 totalBorrows;
    address borrowToken;

    function doFlashloan(
        address flashloanLender,
        address gToken,
        uint256 borrowAmount
    ) external {
        borrowToken = GCollateralCapXrc20(gToken).underlying();
        bytes memory data = abi.encode(gToken);
        ERC3156FlashLenderInterface(flashloanLender).flashLoan(this, borrowToken, borrowAmount, data);
    }

    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external returns (bytes32) {
        require(initiator == address(this), "FlashBorrower: Untrusted loan initiator");
        ERC20(borrowToken).approve(msg.sender, amount.add(fee));
        address gToken = abi.decode(data, (address));
        GCollateralCapXrc20(gToken).mint(amount.add(fee));
        return keccak256("ERC3156FlashBorrowerInterface.onFlashLoan");
    }
}

contract FlashloanAndRepayBorrow is ERC3156FlashBorrowerInterface {
    using SafeMath for uint256;

    address borrowToken;

    function doFlashloan(
        address flashloanLender,
        address gToken,
        uint256 borrowAmount
    ) external {
        borrowToken = GCollateralCapXrc20(gToken).underlying();
        bytes memory data = abi.encode(gToken);
        ERC3156FlashLenderInterface(flashloanLender).flashLoan(this, borrowToken, borrowAmount, data);
    }

    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external returns (bytes32) {
        require(initiator == address(this), "FlashBorrower: Untrusted loan initiator");
        ERC20(borrowToken).approve(msg.sender, amount.add(fee));
        address gToken = abi.decode(data, (address));
        GCollateralCapXrc20(gToken).repayBorrow(amount.add(fee));
        return keccak256("ERC3156FlashBorrowerInterface.onFlashLoan");
    }
}

contract FlashloanTwice is ERC3156FlashBorrowerInterface {
    using SafeMath for uint256;
    address borrowToken;

    function doFlashloan(
        address flashloanLender,
        address gToken,
        uint256 borrowAmount
    ) external {
        borrowToken = GCollateralCapXrc20(gToken).underlying();

        bytes memory data = abi.encode(gToken);
        ERC3156FlashLenderInterface(flashloanLender).flashLoan(this, borrowToken, borrowAmount, data);
    }

    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external returns (bytes32) {
        require(initiator == address(this), "FlashBorrower: Untrusted loan initiator");
        ERC20(borrowToken).approve(msg.sender, amount.add(fee));
        address gToken = abi.decode(data, (address));
        GCollateralCapXrc20(gToken).flashLoan(this, address(this), amount, data);
        return keccak256("ERC3156FlashBorrowerInterface.onFlashLoan");
    }
}

contract FlashloanReceiverNative is ERC3156FlashBorrowerInterface {
    using SafeMath for uint256;

    uint256 totalBorrows;

    function doFlashloan(
        address flashloanLender,
        address payable gToken,
        uint256 borrowAmount,
        uint256 repayAmount
    ) external {
        ERC20 underlying = ERC20(GWrappedNative(gToken).underlying());
        uint256 balanceBefore = underlying.balanceOf(address(this));
        bytes memory data = abi.encode(gToken, borrowAmount);
        totalBorrows = GWrappedNative(gToken).totalBorrows();
        underlying.approve(gToken, repayAmount);
        ERC3156FlashLenderInterface(flashloanLender).flashLoan(this, address(underlying), borrowAmount, data);
        uint256 balanceAfter = underlying.balanceOf(address(this));
        require(balanceAfter == balanceBefore.add(borrowAmount).sub(repayAmount), "Balance inconsistent");
    }

    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external returns (bytes32) {
        require(initiator == address(this), "FlashBorrower: Untrusted loan initiator");
        (address payable gToken, uint256 borrowAmount) = abi.decode(data, (address, uint256));
        require(token == GWrappedNative(gToken).underlying(), "Params not match");
        require(amount == borrowAmount, "Params not match");
        uint256 totalBorrowsAfter = GWrappedNative(gToken).totalBorrows();
        require(totalBorrows.add(borrowAmount) == totalBorrowsAfter, "totalBorrow mismatch");
        return keccak256("ERC3156FlashBorrowerInterface.onFlashLoan");
    }

    function() external payable {}
}

contract FlashloanAndMintNative is ERC3156FlashBorrowerInterface {
    using SafeMath for uint256;

    function doFlashloan(
        address flashloanLender,
        address payable gToken,
        uint256 borrowAmount
    ) external {
        bytes memory data = abi.encode(gToken);
        ERC3156FlashLenderInterface(flashloanLender).flashLoan(
            this,
            GWrappedNative(gToken).underlying(),
            borrowAmount,
            data
        );
    }

    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external returns (bytes32) {
        require(initiator == address(this), "FlashBorrower: Untrusted loan initiator");
        address payable gToken = abi.decode(data, (address));
        GWrappedNative(gToken).mint(amount.add(fee));
        return keccak256("ERC3156FlashBorrowerInterface.onFlashLoan");
    }
}

contract FlashloanAndRepayBorrowNative is ERC3156FlashBorrowerInterface {
    using SafeMath for uint256;

    function doFlashloan(
        address flashloanLender,
        address payable gToken,
        uint256 borrowAmount
    ) external {
        bytes memory data = abi.encode(gToken);
        ERC3156FlashLenderInterface(flashloanLender).flashLoan(
            this,
            GWrappedNative(gToken).underlying(),
            borrowAmount,
            data
        );
    }

    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external returns (bytes32) {
        require(initiator == address(this), "FlashBorrower: Untrusted loan initiator");
        address payable gToken = abi.decode(data, (address));
        GWrappedNative(gToken).repayBorrow(amount.add(fee));
        return keccak256("ERC3156FlashBorrowerInterface.onFlashLoan");
    }
}

contract FlashloanTwiceNative is ERC3156FlashBorrowerInterface {
    using SafeMath for uint256;

    function doFlashloan(
        address flashloanLender,
        address payable gToken,
        uint256 borrowAmount
    ) external {
        address borrowToken = GWrappedNative(gToken).underlying();
        bytes memory data = abi.encode(flashloanLender);
        ERC3156FlashLenderInterface(flashloanLender).flashLoan(this, borrowToken, borrowAmount, data);
    }

    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external returns (bytes32) {
        require(initiator == address(this), "FlashBorrower: Untrusted loan initiator");
        address flashloanLender = abi.decode(data, (address));
        ERC3156FlashLenderInterface(flashloanLender).flashLoan(this, token, amount, data);
        return keccak256("ERC3156FlashBorrowerInterface.onFlashLoan");
    }
}
