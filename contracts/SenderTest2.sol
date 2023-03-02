// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

/**
 * Test contract to represent KIR contract implementing getState()
 */
contract SenderTest2 {
    address[] _adminList;

    constructor() {
        _adminList.push(msg.sender);
    }

    /*
     * Getter functions
     */
    function getState() external view returns (address[] memory, uint256) {
        return (_adminList, 1);
    }

    /*
     *  Deposit function
     */
    /// @dev Fallback function that allows to deposit KLAY
    fallback() external payable {
        require(msg.value > 0, "Invalid value.");
    }
}
