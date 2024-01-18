// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.2 <0.9.0;

contract Counter {
    uint256 private counter;
    address private owner;

    constructor() {
        owner = msg.sender;
    }
    function isOwner(address user) external view returns (bool result) {
        return user == owner;
    }
    function add(uint256 number) public {
        counter = counter + number;
    }
    function get() external view returns (uint256 result)  {
        return counter;
    }

    // Vault Contract
    // 存储每个地址的余额
    mapping(address => uint) public balances;

    // 充值事件
    event Deposit(address indexed sender, uint amount);

    // 取现事件
    event Withdraw(address indexed receiver, uint amount);

    // 充值函数
    function deposit() public payable {
        require(msg.value > 0, "Deposit amount must be greater than 0");
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    // 取现函数
    function withdraw(uint amount) public {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);
        emit Withdraw(msg.sender, amount);
    }

    // 查询余额
    function getBalance() public view returns (uint) {
        return balances[msg.sender];
    }

    // 查询余额
    function checkBalance(address acc) public view returns (uint) {
        return balances[acc];
    }
}

