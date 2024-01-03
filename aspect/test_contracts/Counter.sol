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
}

