const {expect} = require("chai");
const {ethers} = require("hardhat");

describe("TreasuryRebalance", function () {
    let TreasuryRebalance, treasuryRebalance, kgf, kir, owner, sender1, sender2, receiver1, receiver2;
    let currentBlock, executionBlock;

    beforeEach(async function () {
        [owner, account1, receiver1, receiver2] = await ethers.getSigners();
        currentBlock = await ethers.provider.getBlockNumber();
        executionBlock = currentBlock + 40;

        // Deploy dependancy treasuryRebalances to register as senders
        // sender1 and sender2 simulates KGF and KIR treasuryRebalances respectively
        const KGF = await ethers.getContractFactory("SenderTest1");
        kgf = await KGF.deploy();
        sender1 = kgf.address;

        const KIR = await ethers.getContractFactory("SenderTest2");
        kir = await KIR.deploy();
        sender2 = kir.address;

        // Send some funds to sender1 to simulate KFG funds
        await owner.sendTransaction({to: sender1, value: hre.ethers.utils.parseEther("20")});

        // Send some funds to sender2 to simulate KIR funds
        await owner.sendTransaction({to: sender2, value: hre.ethers.utils.parseEther("20")});

        // Deploy Treasury Rebalance treasuryRebalance
        treasuryFund = hre.ethers.utils.parseEther("30");
        TreasuryRebalance = await ethers.getContractFactory("TreasuryRebalance");
        treasuryRebalance = await TreasuryRebalance.deploy(executionBlock);
    });

    describe("Deployment", function () {
        it("Should check the correct initial values for dependancy treasuryRebalances", async function () {
            const sender1Balance = await ethers.provider.getBalance(sender1);
            const sender2Balance = await ethers.provider.getBalance(sender1);
            expect(await sender1Balance).to.equal(hre.ethers.utils.parseEther("20"));
            expect(await sender2Balance).to.equal(hre.ethers.utils.parseEther("20"));

            const [adminList] = await kgf.getState();
            expect(adminList[0]).to.equal(owner.address);
        });

        it("Should set the correct initial values for main treasuryRebalance", async function () {
            expect(await treasuryRebalance.status()).to.equal(0);
            expect(await treasuryRebalance.getTreasuryAmount()).to.equal(0);
            expect(await treasuryRebalance.rebalanceBlockNumber()).to.be.greaterThan(currentBlock);
        });
    });

    describe("registerSender()", function () {
        it("Should add a sender", async function () {
            await treasuryRebalance.registerSender(sender1);
            const sender = await treasuryRebalance.getSender(sender1);
            expect(sender[0]).to.equal(sender1);
            expect(sender[1].length).to.equal(0);
        });

        it("Should emit a RegisterSender event", async function () {
            await expect(treasuryRebalance.registerSender(sender1))
                .to.emit(treasuryRebalance, "RegisterSender")
                .withArgs(sender1, []);
        });

        it("Should not allow adding the same sender twice", async function () {
            await treasuryRebalance.registerSender(sender1);
            await expect(treasuryRebalance.registerSender(sender1)).to.be.revertedWith("Sender is already registered");
        });

        it("Should not allow non-owner to add a sender", async function () {
            await expect(treasuryRebalance.connect(account1).registerSender(sender2)).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
        });

        it("Should not register sender when contract is not in Initialized state", async function () {
            await treasuryRebalance.finalizeRegistration();
            await expect(treasuryRebalance.registerSender(sender1)).to.be.revertedWith(
                "function not allowed at this stage"
            );
        });

        it("senders length should be one", async function () {
            await treasuryRebalance.registerSender(sender1);
            const length = await treasuryRebalance.getSenderCount();
            expect(length).to.equal(1);
        });

        it("Should revert if the sender address is zero", async function () {
            await expect(treasuryRebalance.registerSender(ethers.constants.AddressZero)).to.be.revertedWith(
                "Invalid address"
            );
        });
    });

    describe("removeSender()", function () {
        beforeEach(async function () {
            await treasuryRebalance.registerSender(sender1);
        });

        it("Should remove a sender", async function () {
            await treasuryRebalance.removeSender(sender1);
            await expect(treasuryRebalance.getSender(sender1)).to.be.revertedWith("Sender does not exist");
        });

        it("Should emit a RemoveSender event", async function () {
            await expect(treasuryRebalance.removeSender(sender1))
                .to.emit(treasuryRebalance, "RemoveSender")
                .withArgs(sender1, 0);
        });

        it("Should not allow removing a non-existent sender", async function () {
            await expect(treasuryRebalance.removeSender(owner.address)).to.be.revertedWith("Sender does not exist");
        });

        it("Should not allow non-owner to remove a sender", async function () {
            await expect(treasuryRebalance.connect(account1).removeSender(sender1)).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
        });

        it("Should not remove sender when contract is not in Initialized state", async function () {
            await treasuryRebalance.finalizeRegistration();
            await expect(treasuryRebalance.removeSender(sender1)).to.be.revertedWith(
                "function not allowed at this stage"
            );
        });
    });

    describe("registerReceiver", function () {
        let receiverAddress;

        beforeEach(async function () {
            receiverAddress = receiver1.address;
        });

        it("Should register receiver address and its fund distribution", async function () {
            const amount = hre.ethers.utils.parseEther("20");

            await treasuryRebalance.registerReceiver(receiverAddress, amount);
            const receiver = await treasuryRebalance.getReceiver(receiverAddress);
            expect(receiver[0]).to.equal(receiverAddress);
            expect(receiver[1]).to.equal(amount);
            expect(await treasuryRebalance.getReceiverCount()).to.equal(1);

            const treasuryAmount = await treasuryRebalance.getTreasuryAmount();
            expect(treasuryAmount).to.equal(amount);
        });

        it("Should emit a RegisterReceiver event", async function () {
            const amount = hre.ethers.utils.parseEther("20");
            await expect(treasuryRebalance.registerReceiver(receiverAddress, amount))
                .to.emit(treasuryRebalance, "RegisterReceiver")
                .withArgs(receiverAddress, amount);
        });

        it("Should revert if register receiver twice", async function () {
            const amount1 = hre.ethers.utils.parseEther("20");
            await treasuryRebalance.registerReceiver(receiverAddress, amount1);
            await expect(treasuryRebalance.registerReceiver(receiverAddress, amount1)).to.be.revertedWith(
                "Receiver is already registered"
            );
        });

        it("Should revert if receiver when contract is not in Initialized state", async function () {
            const amount1 = hre.ethers.utils.parseEther("20");
            await treasuryRebalance.finalizeRegistration();
            await expect(treasuryRebalance.registerReceiver(receiverAddress, amount1)).to.be.revertedWith(
                "function not allowed at this stage"
            );
        });

        it("Should revert if the amount is set to 0", async function () {
            await expect(treasuryRebalance.registerReceiver(receiverAddress, 0)).to.be.revertedWith(
                "Amount cannot be set to 0"
            );
        });
    });

    describe("removeReceiver", function () {
        let receiverAddress;
        let amount;

        beforeEach(async function () {
            receiverAddress = receiver1.address;
            amount = hre.ethers.utils.parseEther("20");
            await treasuryRebalance.registerReceiver(receiverAddress, amount);
        });

        it("Should remove receiver", async function () {
            await treasuryRebalance.removeReceiver(receiverAddress);
            expect(await treasuryRebalance.getReceiverCount()).to.equal(0);
            expect(await treasuryRebalance.getTreasuryAmount()).to.equal(0);
            await expect(treasuryRebalance.getReceiver(receiverAddress)).to.be.revertedWith("Receiver does not exist");
        });

        it("Should emit RemoveReceiver event", async function () {
            await expect(treasuryRebalance.removeReceiver(receiverAddress))
                .to.emit(treasuryRebalance, "RemoveReceiver")
                .withArgs(receiverAddress, 0);
        });

        it("Should not remove unregistered receiver", async function () {
            await expect(treasuryRebalance.removeReceiver(receiver2.address)).to.be.revertedWith(
                "Receiver does not exist"
            );
        });

        it("Should not allow non-owner to remove a receiver", async function () {
            await expect(treasuryRebalance.connect(account1).removeReceiver(receiverAddress)).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
        });

        it("Should not remove receiver when contract is not in Initialized state", async function () {
            await treasuryRebalance.finalizeRegistration();
            await expect(treasuryRebalance.removeReceiver(receiverAddress)).to.be.revertedWith(
                "function not allowed at this stage"
            );
        });
    });

    describe("approve", function () {
        beforeEach(async function () {
            await treasuryRebalance.registerSender(sender1);
            await treasuryRebalance.registerSender(sender2);
            await treasuryRebalance.registerSender(owner.address);
            await treasuryRebalance.registerSender(receiver1.address);
            await treasuryRebalance.registerSender(treasuryRebalance.address);
            await treasuryRebalance.finalizeRegistration();
        });

        it("Should approve sender if msg.sender is admin of sender contract", async function () {
            const sender = await treasuryRebalance.getSender(sender1);
            expect(sender[1].length).to.equal(0);
            const tx = await treasuryRebalance.approve(sender1);
            await treasuryRebalance.approve(sender2);

            const updatedSenderDetails = await treasuryRebalance.getSender(sender1);
            expect(updatedSenderDetails[1][0]).to.equal(owner.address);

            await expect(tx).to.emit(treasuryRebalance, "Approve").withArgs(sender1, owner.address, 1);
        });

        it("Should approve senderAddress is the msg.sender if sender is a EOA", async function () {
            await treasuryRebalance.approve(owner.address);
            const sender = await treasuryRebalance.getSender(owner.address);
            expect(sender[1][0]).to.equal(owner.address);
        });

        it("Should revert if sender is already approved", async function () {
            await treasuryRebalance.approve(sender1);
            await expect(treasuryRebalance.approve(sender1)).to.be.revertedWith(
                "Duplicate approvers cannot be allowed"
            );
        });

        it("Should revert if sender is not registered", async function () {
            // try to approve unregistered sender
            await expect(treasuryRebalance.approve(receiver2.address)).to.be.revertedWith(
                "sender needs to be registered before approval"
            );
        });

        it("Should revert if sender is a EOA and if msg.sender is not the admin", async function () {
            await expect(treasuryRebalance.approve(receiver1.address)).to.be.revertedWith(
                "senderAddress is not the msg.sender"
            );
        });

        it("Should revert if sender is a contract address but does not have getState() method", async function () {
            await expect(treasuryRebalance.approve(treasuryRebalance.address)).to.be.revertedWith("call failed");
        });

        it("Should revert if sender is a contract but adminList is empty", async function () {
            await kgf.emptyAdminList();
            await expect(treasuryRebalance.approve(sender1)).to.be.revertedWith("admin list cannot be empty");
        });

        it("Should not approve if sender is a contract but msg.sender is not the admin", async function () {
            await expect(treasuryRebalance.connect(account1).approve(sender1)).to.be.revertedWith(
                "msg.sender is not the admin"
            );
        });
    });

    describe("setStatus", function () {
        let initialStatus;

        beforeEach(async function () {
            initialStatus = await treasuryRebalance.status();
            await treasuryRebalance.registerSender(sender1);
            await treasuryRebalance.registerSender(sender2);
        });

        it("Should set status to Registered", async function () {
            expect(initialStatus).to.equal(0);
            await treasuryRebalance.finalizeRegistration();
            expect(await treasuryRebalance.status()).to.equal(1);
        });

        it("Should set status to Approved", async function () {
            await treasuryRebalance.finalizeRegistration();
            await treasuryRebalance.approve(sender1);
            await treasuryRebalance.approve(sender2);
            await treasuryRebalance.finalizeApproval();
            expect(await treasuryRebalance.status()).to.equal(2);
        });

        it("Should not set status to Approved when treasury amount exceeds balance of senders", async function () {
            const amount = hre.ethers.utils.parseEther("50");
            await treasuryRebalance.registerReceiver(receiver1.address, amount);
            await treasuryRebalance.finalizeRegistration();
            await treasuryRebalance.approve(sender1);
            await treasuryRebalance.approve(sender2);
            await expect(treasuryRebalance.finalizeApproval()).to.be.revertedWith(
                "treasury amount should be less than the sum of all sender address balances"
            );
        });

        it("Should revert if the current status is tried to set again", async function () {
            await treasuryRebalance.finalizeRegistration();
            await expect(treasuryRebalance.finalizeRegistration()).to.be.revertedWith(
                "function not allowed at this stage"
            );
        });

        it("Should revert if owner tries to set Finalize after Registered", async function () {
            await treasuryRebalance.finalizeRegistration();
            await expect(treasuryRebalance.finalizeContract("memo")).to.be.revertedWith(
                "function not allowed at this stage"
            );
        });

        it("Should revert if owner tries to set Approved before Registered", async function () {
            await expect(treasuryRebalance.finalizeApproval()).to.be.revertedWith("function not allowed at this stage");
        });

        it("Should revert if owner tries to set Registered after Approved", async function () {
            await treasuryRebalance.finalizeRegistration();
            await treasuryRebalance.approve(sender1);
            await treasuryRebalance.approve(sender2);
            await treasuryRebalance.finalizeApproval();
            await expect(treasuryRebalance.finalizeRegistration()).to.be.revertedWith(
                "function not allowed at this stage"
            );
        });

        it("Should emit SetStatus event", async function () {
            await treasuryRebalance.finalizeRegistration();
            await treasuryRebalance.approve(sender1);
            await treasuryRebalance.approve(sender2);
            await expect(treasuryRebalance.finalizeApproval()).to.emit(treasuryRebalance, "SetStatus").withArgs(2);
        });

        describe("Reach Quorom", function () {
            it("Should revert if min required admins does not approve", async function () {
                await treasuryRebalance.finalizeRegistration();
                await expect(treasuryRebalance.finalizeApproval()).to.be.revertedWith(
                    "min required admins should approve"
                );
            });

            it("Should revert if approved admin change during the contract ", async function () {
                await treasuryRebalance.finalizeRegistration();
                await treasuryRebalance.approve(sender1);
                await treasuryRebalance.approve(sender2);
                await kgf.addAdmin(account1.address);
                await kgf.changeMinReq(2);
                await expect(treasuryRebalance.finalizeApproval()).to.be.revertedWith(
                    "min required admins should approve"
                );

                await treasuryRebalance.connect(account1).approve(sender1);
                await treasuryRebalance.finalizeApproval();
            });

            it("Should revert if approved admin change during the contract ", async function () {
                await treasuryRebalance.finalizeRegistration();
                await treasuryRebalance.approve(sender1);
                await kgf.changeMinReq(2);
                await expect(treasuryRebalance.finalizeApproval()).to.be.revertedWith(
                    "min required admins should approve"
                );

                await expect(treasuryRebalance.connect(account1).approve(sender1), "msg.sender is not the admin");
            });
        });
    });

    describe("finalize contract", function () {
        const memo = "Treasury Fund Rebalancing successfull";

        beforeEach(async function () {
            await treasuryRebalance.registerSender(sender1);
            await treasuryRebalance.registerSender(sender2);
            await treasuryRebalance.finalizeRegistration();
            await treasuryRebalance.approve(sender1);
            await treasuryRebalance.approve(sender2);
        });

        it("should set the memo and status to Finalized", async function () {
            await treasuryRebalance.finalizeApproval();
            await treasuryRebalance.finalizeContract(memo);
            expect(await treasuryRebalance.memo()).to.equal(memo);
            expect(await treasuryRebalance.status()).to.equal(3);
        });

        it("Should emit Finalize event", async function () {
            await treasuryRebalance.finalizeApproval();
            await expect(treasuryRebalance.finalizeContract(memo))
                .to.emit(treasuryRebalance, "Finalized")
                .withArgs(memo, 3);
        });

        it("should revert if not called by the owner", async () => {
            await treasuryRebalance.finalizeApproval();
            await expect(treasuryRebalance.connect(account1).finalizeContract(memo)).to.be.revertedWith(
                "Ownable: caller is not the owner"
            );
        });

        it("should revert if its not called at the Approved stage", async () => {
            await expect(treasuryRebalance.finalizeContract(memo)).to.be.revertedWith(
                "function not allowed at this stage"
            );
        });
    });

    describe("reset", function () {
        beforeEach(async function () {
            await treasuryRebalance;
        });

        it("should reset all storage values to 0 at Initialize state", async function () {
            await treasuryRebalance.reset();
            expect(await treasuryRebalance.getSenderCount()).to.equal(0);
            expect(await treasuryRebalance.getReceiverCount()).to.equal(0);
            expect(await treasuryRebalance.getTreasuryAmount()).to.equal(0);
            expect(await treasuryRebalance.memo()).to.equal("");
            expect(await treasuryRebalance.status()).to.equal(0);
            expect(await treasuryRebalance.rebalanceBlockNumber()).to.not.equal(0);
        });

        it("should reset all storage values to 0 at Registered state", async function () {
            const amount = hre.ethers.utils.parseEther("50");
            await treasuryRebalance.registerSender(sender1);
            await treasuryRebalance.registerSender(sender2);

            await treasuryRebalance.registerReceiver(receiver1.address, amount);
            await treasuryRebalance.finalizeRegistration();
            expect(await treasuryRebalance.getSenderCount()).to.equal(2);
            expect(await treasuryRebalance.getReceiverCount()).to.equal(1);

            await treasuryRebalance.reset();
            expect(await treasuryRebalance.getSenderCount()).to.equal(0);
            expect(await treasuryRebalance.getReceiverCount()).to.equal(0);
            expect(await treasuryRebalance.getTreasuryAmount()).to.equal(0);
            expect(await treasuryRebalance.memo()).to.equal("");
            expect(await treasuryRebalance.status()).to.equal(0);
            expect(await treasuryRebalance.rebalanceBlockNumber()).to.not.equal(0);
        });

        it("should reset all storage values to 0 at Approved state", async function () {
            const amount = hre.ethers.utils.parseEther("10");
            await treasuryRebalance.registerSender(sender1);
            await treasuryRebalance.registerReceiver(receiver1.address, amount);
            await treasuryRebalance.finalizeRegistration();

            await treasuryRebalance.approve(sender1);
            await treasuryRebalance.finalizeApproval();
            expect(await treasuryRebalance.status()).to.equal(2);

            expect(await treasuryRebalance.getSenderCount()).to.equal(1);
            expect(await treasuryRebalance.getReceiverCount()).to.equal(1);

            await treasuryRebalance.reset();
            expect(await treasuryRebalance.getSenderCount()).to.equal(0);
            expect(await treasuryRebalance.getReceiverCount()).to.equal(0);
            expect(await treasuryRebalance.getTreasuryAmount()).to.equal(0);
            expect(await treasuryRebalance.memo()).to.equal("");
            expect(await treasuryRebalance.status()).to.equal(0);
            expect(await treasuryRebalance.rebalanceBlockNumber()).to.not.equal(0);
        });

        it("should revert when tried to reset after finalization", async function () {
            const amount = hre.ethers.utils.parseEther("10");
            await treasuryRebalance.registerSender(sender1);
            await treasuryRebalance.registerReceiver(receiver1.address, amount);
            await treasuryRebalance.finalizeRegistration();

            await treasuryRebalance.approve(sender1);
            await treasuryRebalance.finalizeApproval();
            await treasuryRebalance.finalizeContract("memo");
            expect(await treasuryRebalance.status()).to.equal(3);

            expect(await treasuryRebalance.getSenderCount()).to.equal(1);
            expect(await treasuryRebalance.getReceiverCount()).to.equal(1);

            await expect(treasuryRebalance.reset()).to.be.revertedWith("Contract is finalized, cannot reset values");
        });

        it("should revert when tried to reset after it passes the execution block", async function () {
            await hre.network.provider.send("hardhat_mine", ["0x32"]);
            await expect(treasuryRebalance.reset()).to.be.revertedWith("Contract is finalized, cannot reset values");
        });
    });

    describe("fallback", function () {
        it("should revert if KLAY is sent to the contract address", async function () {
            await expect(
                owner.sendTransaction({to: treasuryRebalance.address, value: hre.ethers.utils.parseEther("20")})
            ).to.be.revertedWith("This contract does not accept any payments");
        });
    });

    describe("isContract", function () {
        it("should check whether EOA/contract address", async function () {
            const eoa = await treasuryRebalance.isContractAddr(owner.address);
            const contractAddress = await treasuryRebalance.isContractAddr(treasuryRebalance.address);
            expect(eoa).to.equal(false);
            expect(contractAddress).to.equal(true);
        });
    });
});
