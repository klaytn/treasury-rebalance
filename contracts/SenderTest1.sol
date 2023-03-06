// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

/**
 * Test contract to represent KGF contract implementing getState()
 */
contract SenderTest1 {
    address[] _adminList;
    uint256 public minReq = 1;

    constructor() {
        _adminList.push(msg.sender);
    }

    /*
     * Getter functions
     */
    function getState() external view returns (address[] memory, uint256) {
        return (_adminList, minReq);
    }

    function emptyAdminList() public {
        _adminList.pop();
    }

    function changeMinReq(uint256 req) public {
        minReq = req;
    }

    function addAdmin(address admin) public {
        _adminList.push(admin);
    }

    /*
     *  Deposit function
     */
    /// @dev Fallback function that allows to deposit KLAY
    fallback() external payable {
        require(msg.value > 0, "Invalid value.");
    }
}
