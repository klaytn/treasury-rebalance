// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

interface ITreasuryRebalance {
    // Events
    event ContractDeployed(
        uint256 rebalanceBlockNumber,
        uint256 deployedBlockNumber
    );
    event RetiredRegistered(address retired, address[] approvers);
    event RetiredRemoved(address retired, uint256 retiredCount);
    event NewbieRegistered(address newbie, uint256 fundAllocation);
    event NewbieRemoved(address newbie, uint256 newbieCount);
    event Approved(address retired, address approver, uint256 approversCount);
    event Finalized(string memo);

    // Enums
    enum Status {
        Initialized,
        Registered,
        Approved,
        Finalized
    }

    struct Retired {
        address retired;
        address[] approvers;
    }

    struct Newbie {
        address newbie;
        uint256 amount;
    }

    // State variables
    function retirees() external view returns (Retired[] memory);

    function newbies() external view returns (Newbie[] memory);

    function status() external view returns (Status);

    function rebalanceBlockNumber() external view returns (uint256);

    function memo() external view returns (string memory);

    // State changing functions
    function registerRetired(address retiredAddress) external;

    function removeRetired(address retiredAddress) external;

    function registerNewbie(address newbieAddress, uint256 amount) external;

    function removeNewbie(address newbieAddress) external;

    function approve(address retiredAddress) external;

    function finalizeRegistration(Status newStatus) external;

    function finalizeApproval(Status newStatus) external;

    function finalizeRegistration(string memory memo) external;

    function reset() external;
}
