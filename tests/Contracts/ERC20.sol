pragma solidity ^0.5.16;

import "../../contracts/SafeMath.sol";

interface ERC20Base {
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Transfer(address indexed from, address indexed to, uint256 value);

    function totalSupply() external view returns (uint256);

    function allowance(address owner, address spender) external view returns (uint256);

    function approve(address spender, uint256 value) external returns (bool);

    function balanceOf(address who) external view returns (uint256);
}

contract ERC20 is ERC20Base {
    function transfer(address to, uint256 value) external returns (bool);

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external returns (bool);
}

contract ERC20NS is ERC20Base {
    function transfer(address to, uint256 value) external;

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external;
}

/**
 * @title Standard ERC20 token
 * @dev Implementation of the basic standard token.
 *  See https://github.com/ethereum/EIPs/issues/20
 */
contract StandardToken is ERC20 {
    using SafeMath for uint256;

    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => uint256) public balanceOf;

    constructor(
        uint256 _initialAmount,
        string memory _tokenName,
        uint8 _decimalUnits,
        string memory _tokenSymbol
    ) public {
        totalSupply = _initialAmount;
        balanceOf[msg.sender] = _initialAmount;
        name = _tokenName;
        symbol = _tokenSymbol;
        decimals = _decimalUnits;
    }

    function transfer(address dst, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] = balanceOf[msg.sender].sub(amount, "Insufficient balance");
        balanceOf[dst] = balanceOf[dst].add(amount, "Balance overflow");
        emit Transfer(msg.sender, dst, amount);
        return true;
    }

    function transferFrom(
        address src,
        address dst,
        uint256 amount
    ) external returns (bool) {
        allowance[src][msg.sender] = allowance[src][msg.sender].sub(amount, "Insufficient allowance");
        balanceOf[src] = balanceOf[src].sub(amount, "Insufficient balance");
        balanceOf[dst] = balanceOf[dst].add(amount, "Balance overflow");
        emit Transfer(src, dst, amount);
        return true;
    }

    function approve(address _spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][_spender] = amount;
        emit Approval(msg.sender, _spender, amount);
        return true;
    }
}

/**
 * @title Non-Standard ERC20 token
 * @dev Version of ERC20 with no return values for `transfer` and `transferFrom`
 *  See https://medium.com/coinmonks/missing-return-value-bug-at-least-130-tokens-affected-d67bf08521ca
 */
contract NonStandardToken is ERC20NS {
    using SafeMath for uint256;

    string public name;
    uint8 public decimals;
    string public symbol;
    uint256 public totalSupply;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => uint256) public balanceOf;

    constructor(
        uint256 _initialAmount,
        string memory _tokenName,
        uint8 _decimalUnits,
        string memory _tokenSymbol
    ) public {
        totalSupply = _initialAmount;
        balanceOf[msg.sender] = _initialAmount;
        name = _tokenName;
        symbol = _tokenSymbol;
        decimals = _decimalUnits;
    }

    function transfer(address dst, uint256 amount) external {
        balanceOf[msg.sender] = balanceOf[msg.sender].sub(amount, "Insufficient balance");
        balanceOf[dst] = balanceOf[dst].add(amount, "Balance overflow");
        emit Transfer(msg.sender, dst, amount);
    }

    function transferFrom(
        address src,
        address dst,
        uint256 amount
    ) external {
        allowance[src][msg.sender] = allowance[src][msg.sender].sub(amount, "Insufficient allowance");
        balanceOf[src] = balanceOf[src].sub(amount, "Insufficient balance");
        balanceOf[dst] = balanceOf[dst].add(amount, "Balance overflow");
        emit Transfer(src, dst, amount);
    }

    function approve(address _spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][_spender] = amount;
        emit Approval(msg.sender, _spender, amount);
        return true;
    }
}

contract ERC20Harness is StandardToken {
    // To support testing, we can specify addresses for which transferFrom should fail and return false
    mapping(address => bool) public failTransferFromAddresses;

    // To support testing, we allow the contract to always fail `transfer`.
    mapping(address => bool) public failTransferToAddresses;

    constructor(
        uint256 _initialAmount,
        string memory _tokenName,
        uint8 _decimalUnits,
        string memory _tokenSymbol
    ) public StandardToken(_initialAmount, _tokenName, _decimalUnits, _tokenSymbol) {}

    function harnessSetFailTransferFromAddress(address src, bool _fail) public {
        failTransferFromAddresses[src] = _fail;
    }

    function harnessSetFailTransferToAddress(address dst, bool _fail) public {
        failTransferToAddresses[dst] = _fail;
    }

    function harnessSetBalance(address _account, uint256 _amount) public {
        balanceOf[_account] = _amount;
    }

    function transfer(address dst, uint256 amount) external returns (bool success) {
        // Added for testing purposes
        if (failTransferToAddresses[dst]) {
            return false;
        }
        balanceOf[msg.sender] = balanceOf[msg.sender].sub(amount, "Insufficient balance");
        balanceOf[dst] = balanceOf[dst].add(amount, "Balance overflow");
        emit Transfer(msg.sender, dst, amount);
        return true;
    }

    function transferFrom(
        address src,
        address dst,
        uint256 amount
    ) external returns (bool success) {
        // Added for testing purposes
        if (failTransferFromAddresses[src]) {
            return false;
        }
        allowance[src][msg.sender] = allowance[src][msg.sender].sub(amount, "Insufficient allowance");
        balanceOf[src] = balanceOf[src].sub(amount, "Insufficient balance");
        balanceOf[dst] = balanceOf[dst].add(amount, "Balance overflow");
        emit Transfer(src, dst, amount);
        return true;
    }
}

contract GTokenHarness is ERC20Harness {
    bool public constant isGToken = true;

    address public gTroller;

    constructor(
        uint256 _initialAmount,
        string memory _tokenName,
        uint8 _decimalUnits,
        string memory _tokenSymbol,
        address _gTroller
    ) public ERC20Harness(_initialAmount, _tokenName, _decimalUnits, _tokenSymbol) {
        gTroller = _gTroller;
    }
}

interface CurveTokenV3Interface {
    function minter() external view returns (address);
}

contract CurveTokenHarness is ERC20Harness, CurveTokenV3Interface {
    address public minter;

    constructor(
        uint256 _initialAmount,
        string memory _tokenName,
        uint8 _decimalUnits,
        string memory _tokenSymbol,
        address _minter
    ) public ERC20Harness(_initialAmount, _tokenName, _decimalUnits, _tokenSymbol) {
        minter = _minter;
    }
}

interface CurveSwapInterface {
    function get_virtual_price() external view returns (uint256);
}

contract CurveSwapHarness is CurveSwapInterface {
    uint256 private virtualPrice;

    constructor(uint256 _virtualPrice) public {
        virtualPrice = _virtualPrice;
    }

    function get_virtual_price() external view returns (uint256) {
        return virtualPrice;
    }
}

interface YVaultV1Interface {
    function token() external view returns (address);

    function getPricePerFullShare() external view returns (uint256);
}

contract YVaultV1TokenHarness is ERC20Harness, YVaultV1Interface {
    address private underlying;
    uint256 private price;

    constructor(
        uint256 _initialAmount,
        string memory _tokenName,
        uint8 _decimalUnits,
        string memory _tokenSymbol,
        address _token,
        uint256 _price
    ) public ERC20Harness(_initialAmount, _tokenName, _decimalUnits, _tokenSymbol) {
        underlying = _token;
        price = _price;
    }

    function token() external view returns (address) {
        return underlying;
    }

    function getPricePerFullShare() external view returns (uint256) {
        return price;
    }
}

interface YVaultV2Interface {
    function token() external view returns (address);

    function pricePerShare() external view returns (uint256);
}

contract YVaultV2TokenHarness is ERC20Harness, YVaultV2Interface {
    address private underlying;
    uint256 private price;

    constructor(
        uint256 _initialAmount,
        string memory _tokenName,
        uint8 _decimalUnits,
        string memory _tokenSymbol,
        address _token,
        uint256 _price
    ) public ERC20Harness(_initialAmount, _tokenName, _decimalUnits, _tokenSymbol) {
        underlying = _token;
        price = _price;
    }

    function token() external view returns (address) {
        return underlying;
    }

    function pricePerShare() external view returns (uint256) {
        return price;
    }
}

interface LPInterface {
    function token0() external view returns (address);

    function token1() external view returns (address);
}

contract LPTokenHarness is ERC20Harness, LPInterface {
    constructor(
        uint256 _initialAmount,
        string memory _tokenName,
        uint8 _decimalUnits,
        string memory _tokenSymbol
    ) public ERC20Harness(_initialAmount, _tokenName, _decimalUnits, _tokenSymbol) {}

    function token0() external view returns (address) {
        return address(0);
    }

    function token1() external view returns (address) {
        return address(0);
    }
}
