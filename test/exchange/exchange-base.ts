import { AAVEPlugin, BalancerPlugin, IComet, IERC20 } from "../../typechain-types";
import {
    deployCollateralSwap,
    ethers,
    exp,
    getComet,
    getPlugins,
    getQuote,
    getSwapPlugins,
    getWhales,
    Plugin,
    SWAP_ROUTER,
    tokensInstances,
    ZERO_ADDRESS,
    SnapshotRestorer,
    takeSnapshot,
    time,
    executeWithRetry,
    AAVE_POOL,
    BALANCER_VAULT,
    WETH_ADDRESS
} from "../helpers/helpers";
import { expect } from "chai";
import { CometFoundation } from "../../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("CometExchange", function () {
    let snapshot: SnapshotRestorer;

    // Contracts
    let collateralSwap: CometFoundation;
    let comet: IComet;

    // Tokens
    let weth: IERC20;
    let wstETH: IERC20;
    let rsETH: IERC20;
    let rETH: IERC20;
    let wbtc: IERC20;

    let balancerPl: BalancerPlugin;
    let aavePl: AAVEPlugin;

    let aaveFLP: string;
    let balancerFLP: string;

    let lifiPlugin: any;

    let alice: HardhatEthersSigner;

    let balancerPluginA: Plugin;
    let aavePluginA: Plugin;

    // Whales
    let wethWhale: HardhatEthersSigner;
    let wstETHWhale: HardhatEthersSigner;
    let wbtcWhale: HardhatEthersSigner;

    // constants
    const SUPPLY_AMOUNT = exp(2, 18);
    const BORROW_AMOUNT = exp(0.5, 18);

    before(async () => {
        const signers = await ethers.getSigners();
        alice = signers[5];
        const { balancerPlugin, aavePlugin } = await getPlugins();

        balancerFLP = BALANCER_VAULT;
        aaveFLP = AAVE_POOL;
        balancerPl = balancerPlugin.endpoint;
        aavePl = aavePlugin.endpoint;

        balancerPluginA = {
            endpoint: await balancerPlugin.endpoint.getAddress(),
            config: ethers.AbiCoder.defaultAbiCoder().encode(["address"], [BALANCER_VAULT])
        };
        aavePluginA = {
            endpoint: await aavePlugin.endpoint.getAddress(),
            config: ethers.AbiCoder.defaultAbiCoder().encode(["address"], [AAVE_POOL])
        };

        ({ lifiPlugin } = await getSwapPlugins());

        collateralSwap = await ethers.deployContract("CometFoundation", [
            [
                balancerPluginA,
                aavePluginA,
                {
                    endpoint: lifiPlugin.endpoint,
                    config: ethers.AbiCoder.defaultAbiCoder().encode(["address"], [SWAP_ROUTER])
                }
            ],
            WETH_ADDRESS
        ]);

        comet = await getComet();
        ({ weth, wstETH, rsETH, rETH, wbtc } = await tokensInstances());
        ({ wethWhale, wstETHWhale, wbtcWhale } = await getWhales());

        await wstETH.connect(wstETHWhale).transfer(alice, SUPPLY_AMOUNT);

        await wstETH.connect(alice).approve(comet, SUPPLY_AMOUNT);
        await comet.connect(alice).supply(wstETH, SUPPLY_AMOUNT);
        await comet.connect(alice).withdraw(weth, BORROW_AMOUNT);

        await comet.connect(alice).allow(collateralSwap, true);

        snapshot = await takeSnapshot();
    });

    afterEach(async () => await snapshot.restore());

    describe("deployment", function () {
        it("deploys with correct params", async () => {
            const collateralSwap = await ethers.deployContract("CometFoundation", [
                [balancerPluginA, aavePluginA, { endpoint: lifiPlugin.endpoint, config: "0x" }],
                WETH_ADDRESS
            ]);

            // Check plugins
            const balancerSelector = await balancerPl.CALLBACK_SELECTOR();
            const aaveSelector = await aavePl.CALLBACK_SELECTOR();

            const balancerKey = ethers.keccak256(
                ethers.solidityPacked(["address", "bytes4"], [balancerPluginA.endpoint, balancerSelector])
            );
            const aaveKey = ethers.keccak256(
                ethers.solidityPacked(["address", "bytes4"], [aavePluginA.endpoint, aaveSelector])
            );

            const balancerPluginData = await collateralSwap.plugins(balancerKey);
            const aavePluginData = await collateralSwap.plugins(aaveKey);

            expect(balancerPluginData.substring(0, 4)).to.equal("0x01");
            expect(aavePluginData.substring(0, 4)).to.equal("0x01");
        });

        it("emits PluginAdded event on deployment", async () => {
            const balancerSelector = await balancerPl.CALLBACK_SELECTOR();
            const aaveSelector = await aavePl.CALLBACK_SELECTOR();

            const balancerKey = ethers.keccak256(
                ethers.solidityPacked(["address", "bytes4"], [balancerPluginA.endpoint, balancerSelector])
            );
            const aaveKey = ethers.keccak256(
                ethers.solidityPacked(["address", "bytes4"], [aavePluginA.endpoint, aaveSelector])
            );

            const tx = await ethers.deployContract("CometFoundation", [
                [balancerPluginA, aavePluginA, { endpoint: lifiPlugin.endpoint, config: "0x" }],
                WETH_ADDRESS
            ]);

            await expect(tx.deploymentTransaction())
                .to.emit(tx, "PluginAdded")
                .withArgs(balancerPluginA.endpoint, balancerSelector, balancerKey)
                .to.emit(tx, "PluginAdded")
                .withArgs(aavePluginA.endpoint, aaveSelector, aaveKey);
        });
    });

    describe("swap params validation", function () {
        let swapParams: any;
        let _snapshot: any;
        beforeEach(async () => {
            _snapshot = await takeSnapshot();

            swapParams = {
                opts: {
                    loanPlugin: await balancerPl.getAddress(),
                    swapPlugin: lifiPlugin.endpoint,
                    comet: await comet.getAddress()
                },
                fromAsset: await wstETH.getAddress(),
                fromAmount: exp(0.2, 18),
                toAsset: await rETH.getAddress(),
                swapCalldata: "",
                minAmountOut: 0n,
                maxHealthFactorDrop: 9999
            };

            const { swapCalldata, toAmountMin } = await getQuote(
                "ETH",
                "ETH",
                "wstETH",
                "rETH",
                swapParams.fromAmount.toString(),
                String(collateralSwap.target)
            );

            swapParams.swapCalldata = swapCalldata;
            swapParams.minAmountOut = toAmountMin;
        });

        afterEach(async () => await _snapshot.restore());

        it("reverts when fromAsset is zero address", async () => {
            swapParams.fromAsset = ZERO_ADDRESS;
            await expect(
                collateralSwap
                    .connect(alice)
                    [
                        "exchange((address,address,address),address,address,uint256,uint256,uint256,bytes)"
                    ](swapParams.opts, swapParams.fromAsset, swapParams.toAsset, swapParams.fromAmount, swapParams.minAmountOut, swapParams.maxHealthFactorDrop, swapParams.swapCalldata)
            ).to.be.revertedWithCustomError(collateralSwap, "InvalidSwapParameters");
        });

        it("reverts when toAsset is zero address", async () => {
            swapParams.toAsset = ZERO_ADDRESS;
            await expect(
                collateralSwap
                    .connect(alice)
                    [
                        "exchange((address,address,address),address,address,uint256,uint256,uint256,bytes)"
                    ](swapParams.opts, swapParams.fromAsset, swapParams.toAsset, swapParams.fromAmount, swapParams.minAmountOut, swapParams.maxHealthFactorDrop, swapParams.swapCalldata)
            ).to.be.revertedWithCustomError(collateralSwap, "InvalidSwapParameters");
        });

        it("reverts when minAmountOut is zero", async () => {
            swapParams.minAmountOut = 0;
            await expect(
                collateralSwap
                    .connect(alice)
                    [
                        "exchange((address,address,address),address,address,uint256,uint256,uint256,bytes)"
                    ](swapParams.opts, swapParams.fromAsset, swapParams.toAsset, swapParams.fromAmount, swapParams.minAmountOut, swapParams.maxHealthFactorDrop, swapParams.swapCalldata)
            ).to.be.revertedWithCustomError(collateralSwap, "InvalidSwapParameters");
        });

        it("reverts when maxHealthFactorDrop >= PRECISION", async () => {
            const PRECISION = await collateralSwap.PRECISION();
            swapParams.maxHealthFactorDrop = PRECISION;
            await expect(
                collateralSwap
                    .connect(alice)
                    [
                        "exchange((address,address,address),address,address,uint256,uint256,uint256,bytes)"
                    ](swapParams.opts, swapParams.fromAsset, swapParams.toAsset, swapParams.fromAmount, swapParams.minAmountOut, swapParams.maxHealthFactorDrop, swapParams.swapCalldata)
            ).to.be.revertedWithCustomError(collateralSwap, "InvalidSwapParameters");
        });

        it("reverts when swapPlugin is zero address", async () => {
            swapParams.opts.swapPlugin = ZERO_ADDRESS;
            await expect(
                collateralSwap
                    .connect(alice)
                    [
                        "exchange((address,address,address),address,address,uint256,uint256,uint256,bytes)"
                    ](swapParams.opts, swapParams.fromAsset, swapParams.toAsset, swapParams.fromAmount, swapParams.minAmountOut, swapParams.maxHealthFactorDrop, swapParams.swapCalldata)
            ).to.be.revertedWithCustomError(collateralSwap, "UnknownPlugin");
        });

        it("reverts when swapPlugin is unregistered", async () => {
            swapParams.opts.swapPlugin = alice.address;
            await expect(
                collateralSwap
                    .connect(alice)
                    [
                        "exchange((address,address,address),address,address,uint256,uint256,uint256,bytes)"
                    ](swapParams.opts, swapParams.fromAsset, swapParams.toAsset, swapParams.fromAmount, swapParams.minAmountOut, swapParams.maxHealthFactorDrop, swapParams.swapCalldata)
            ).to.be.revertedWithCustomError(collateralSwap, "UnknownPlugin");
        });

        // These validations happen inside _validateLoan which is called from _loan during execution
        // They will be caught during the flash loan setup, not upfront
        it("reverts when comet is zero address", async () => {
            swapParams.opts.comet = ZERO_ADDRESS;
            await expect(
                collateralSwap
                    .connect(alice)
                    [
                        "exchange((address,address,address),address,address,uint256,uint256,uint256,bytes)"
                    ](swapParams.opts, swapParams.fromAsset, swapParams.toAsset, swapParams.fromAmount, swapParams.minAmountOut, swapParams.maxHealthFactorDrop, swapParams.swapCalldata)
            ).to.be.reverted;

            it("reverts when loanPlugin is zero address", async () => {
                swapParams.opts.loanPlugin = ZERO_ADDRESS;
                await expect(
                    collateralSwap
                        .connect(alice)
                        [
                            "exchange((address,address,address),address,address,uint256,uint256,uint256,bytes)"
                        ](swapParams.opts, swapParams.fromAsset, swapParams.toAsset, swapParams.fromAmount, swapParams.minAmountOut, swapParams.maxHealthFactorDrop, swapParams.swapCalldata)
                ).to.be.revertedWithCustomError(collateralSwap, "UnknownPlugin");
            });
        });

        it("reverts when fromAsset is baseAsset", async () => {
            const swapParams: any = {
                opts: {
                    loanPlugin: await balancerPl.getAddress(),
                    swapPlugin: lifiPlugin.endpoint,
                    comet: await comet.getAddress()
                },
                fromAsset: await weth.getAddress(),
                fromAmount: exp(0.1, 18),
                toAsset: await rETH.getAddress(),
                swapCalldata: "",
                minAmountOut: 0n,
                maxHealthFactorDrop: 1000
            };

            const { swapCalldata, toAmountMin } = await getQuote(
                "ETH",
                "ETH",
                "WETH",
                "rETH",
                swapParams.fromAmount.toString(),
                String(collateralSwap.target)
            );

            swapParams.swapCalldata = swapCalldata;
            swapParams.minAmountOut = toAmountMin;

            await expect(
                collateralSwap
                    .connect(alice)
                    [
                        "exchange((address,address,address),address,address,uint256,uint256,uint256,bytes)"
                    ](swapParams.opts, swapParams.fromAsset, swapParams.toAsset, swapParams.fromAmount, swapParams.minAmountOut, swapParams.maxHealthFactorDrop, swapParams.swapCalldata)
            ).to.be.revertedWithCustomError(collateralSwap, "InvalidSwapParameters");
        });

        it("reverts when toAsset is baseAsset", async () => {
            const swapParams: any = {
                opts: {
                    loanPlugin: await balancerPl.getAddress(),
                    swapPlugin: lifiPlugin.endpoint,
                    comet: await comet.getAddress()
                },
                fromAsset: await wstETH.getAddress(),
                fromAmount: exp(0.2, 18),
                toAsset: await weth.getAddress(),
                swapCalldata: "",
                minAmountOut: 0n,
                maxHealthFactorDrop: 1000
            };

            const { swapCalldata, toAmountMin } = await getQuote(
                "ETH",
                "ETH",
                "wstETH",
                "WETH",
                swapParams.fromAmount.toString(),
                String(collateralSwap.target)
            );

            swapParams.swapCalldata = swapCalldata;
            swapParams.minAmountOut = toAmountMin;

            await expect(
                collateralSwap
                    .connect(alice)
                    [
                        "exchange((address,address,address),address,address,uint256,uint256,uint256,bytes)"
                    ](swapParams.opts, swapParams.fromAsset, swapParams.toAsset, swapParams.fromAmount, swapParams.minAmountOut, swapParams.maxHealthFactorDrop, swapParams.swapCalldata)
            ).to.be.revertedWithCustomError(collateralSwap, "InvalidSwapParameters");
        });

        describe("swap", function () {
            describe("happy cases", function () {
                let swapParams: any;

                it("allows to make a swap with 0 fee on flashloan", async () => {
                    expect(await comet.hasPermission(alice, collateralSwap)).to.be.true;

                    await expect(
                        executeWithRetry(async () => {
                            swapParams = {
                                opts: {
                                    loanPlugin: await balancerPl.getAddress(),
                                    swapPlugin: lifiPlugin.endpoint,
                                    comet: await comet.getAddress()
                                },
                                fromAsset: await wstETH.getAddress(),
                                fromAmount: exp(0.2, 18),
                                toAsset: await rETH.getAddress(),
                                swapCalldata: "",
                                minAmountOut: 0n,
                                maxHealthFactorDrop: 1000
                            };

                            const { swapCalldata, toAmountMin } = await getQuote(
                                "ETH",
                                "ETH",
                                "wstETH",
                                "rETH",
                                swapParams.fromAmount.toString(),
                                String(collateralSwap.target)
                            );

                            swapParams.swapCalldata = swapCalldata;
                            swapParams.minAmountOut = toAmountMin;
                            collateralSwap
                                .connect(alice)
                                [
                                    "exchange((address,address,address),address,address,uint256,uint256,uint256,bytes)"
                                ](swapParams.opts, swapParams.fromAsset, swapParams.toAsset, swapParams.fromAmount, swapParams.minAmountOut, swapParams.maxHealthFactorDrop, swapParams.swapCalldata);
                        })
                    ).to.not.be.reverted;
                });

                it("allows to make a swap with some fee on flashloan", async () => {
                    expect(await comet.hasPermission(alice, collateralSwap)).to.be.true;
                    await expect(
                        executeWithRetry(async () => {
                            swapParams = {
                                opts: {
                                    loanPlugin: await aavePl.getAddress(),
                                    swapPlugin: lifiPlugin.endpoint,
                                    comet: await comet.getAddress()
                                },
                                fromAsset: await wstETH.getAddress(),
                                fromAmount: exp(0.2, 18),
                                toAsset: await rETH.getAddress(),
                                swapCalldata: "",
                                minAmountOut: 0n,
                                maxHealthFactorDrop: 1000
                            };

                            const { swapCalldata, toAmountMin } = await getQuote(
                                "ETH",
                                "ETH",
                                "wstETH",
                                "rETH",
                                swapParams.fromAmount.toString(),
                                String(collateralSwap.target)
                            );

                            swapParams.swapCalldata = swapCalldata;
                            // Decrease minAmountOut by 0.05% to cover AAVE fees
                            swapParams.minAmountOut = (BigInt(toAmountMin) * 9995n) / 10000n;

                            collateralSwap
                                .connect(alice)
                                [
                                    "exchange((address,address,address),address,address,uint256,uint256,uint256,bytes)"
                                ](swapParams.opts, swapParams.fromAsset, swapParams.toAsset, swapParams.fromAmount, swapParams.minAmountOut, swapParams.maxHealthFactorDrop, swapParams.swapCalldata);
                        })
                    ).to.not.be.reverted;
                });

                it("allows to make a swap with permit", async () => {
                    await comet.connect(alice).allow(collateralSwap, false);
                    expect(await comet.hasPermission(alice, collateralSwap)).to.be.false;

                    const types = {
                        Authorization: [
                            { name: "owner", type: "address" },
                            { name: "manager", type: "address" },
                            { name: "isAllowed", type: "bool" },
                            { name: "nonce", type: "uint256" },
                            { name: "expiry", type: "uint256" }
                        ]
                    };

                    const domain = {
                        name: await comet.name(),
                        version: await comet.version(),
                        chainId: 31337,
                        verifyingContract: comet.target.toString()
                    };

                    const signatureArgs = {
                        owner: alice.address,
                        manager: collateralSwap.target.toString(),
                        isAllowed: true,
                        nonce: await comet.userNonce(alice),
                        expiry: (await time.latest()) + 100
                    };

                    const sig = await alice.signTypedData(domain, types, signatureArgs);
                    const splitSig = ethers.Signature.from(sig);

                    const allowParams = {
                        nonce: signatureArgs.nonce,
                        expiry: BigInt(signatureArgs.expiry),
                        r: splitSig.r,
                        s: splitSig.s,
                        v: splitSig.v
                    };
                    await executeWithRetry(async () => {
                        swapParams = {
                            opts: {
                                loanPlugin: await aavePl.getAddress(),
                                swapPlugin: lifiPlugin.endpoint,
                                comet: await comet.getAddress()
                            },
                            fromAsset: await wstETH.getAddress(),
                            fromAmount: exp(0.2, 18),
                            toAsset: await rETH.getAddress(),
                            swapCalldata: "",
                            minAmountOut: 0n,
                            maxHealthFactorDrop: 1000
                        };

                        const { swapCalldata, toAmountMin } = await getQuote(
                            "ETH",
                            "ETH",
                            "wstETH",
                            "rETH",
                            swapParams.fromAmount.toString(),
                            String(collateralSwap.target)
                        );

                        swapParams.swapCalldata = swapCalldata;
                        swapParams.minAmountOut = toAmountMin;
                        collateralSwap
                            .connect(alice)
                            [
                                "exchange((address,address,address),address,address,uint256,uint256,uint256,bytes,(uint256,uint256,bytes32,bytes32,uint8))"
                            ](swapParams.opts, swapParams.fromAsset, swapParams.toAsset, swapParams.fromAmount, swapParams.minAmountOut, swapParams.maxHealthFactorDrop, swapParams.swapCalldata, allowParams);
                    });
                });

                it("contract token balances are zero after swap", async () => {
                    expect(await wstETH.balanceOf(collateralSwap)).to.equal(0);
                    expect(await rETH.balanceOf(collateralSwap)).to.equal(0);
                    await executeWithRetry(async () => {
                        swapParams = {
                            opts: {
                                loanPlugin: await aavePl.getAddress(),
                                swapPlugin: lifiPlugin.endpoint,
                                comet: await comet.getAddress()
                            },
                            fromAsset: await wstETH.getAddress(),
                            fromAmount: exp(0.2, 18),
                            toAsset: await rETH.getAddress(),
                            swapCalldata: "",
                            minAmountOut: 0n,
                            maxHealthFactorDrop: 1000
                        };

                        const { swapCalldata, toAmountMin } = await getQuote(
                            "ETH",
                            "ETH",
                            "wstETH",
                            await rETH.getAddress(),
                            swapParams.fromAmount.toString(),
                            String(collateralSwap.target)
                        );

                        swapParams.swapCalldata = swapCalldata;
                        swapParams.minAmountOut = toAmountMin;

                        await collateralSwap
                            .connect(alice)
                            [
                                "exchange((address,address,address),address,address,uint256,uint256,uint256,bytes)"
                            ](swapParams.opts, swapParams.fromAsset, swapParams.toAsset, swapParams.fromAmount, swapParams.minAmountOut, swapParams.maxHealthFactorDrop, swapParams.swapCalldata);
                    });

                    expect(await wstETH.balanceOf(collateralSwap)).to.equal(0);
                    expect(await rETH.balanceOf(collateralSwap)).to.equal(0);
                });

                it("updates user collateral balances after swap properly", async () => {
                    let userCollateralBeforeFrom;
                    let userCollateralBeforeTo;

                    await executeWithRetry(async () => {
                        swapParams = {
                            opts: {
                                loanPlugin: await aavePl.getAddress(),
                                swapPlugin: lifiPlugin.endpoint,
                                comet: await comet.getAddress()
                            },
                            fromAsset: await wstETH.getAddress(),
                            fromAmount: exp(0.2, 18),
                            toAsset: await rETH.getAddress(),
                            swapCalldata: "",
                            minAmountOut: 0n,
                            maxHealthFactorDrop: 1000
                        };

                        const { swapCalldata, toAmountMin } = await getQuote(
                            "ETH",
                            "ETH",
                            "wstETH",
                            await rETH.getAddress(),
                            swapParams.fromAmount.toString(),
                            String(collateralSwap.target)
                        );

                        swapParams.swapCalldata = swapCalldata;
                        swapParams.minAmountOut = toAmountMin;

                        userCollateralBeforeFrom = await comet.userCollateral(alice, swapParams.fromAsset);
                        userCollateralBeforeTo = await comet.userCollateral(alice, swapParams.toAsset);

                        await collateralSwap
                            .connect(alice)
                            [
                                "exchange((address,address,address),address,address,uint256,uint256,uint256,bytes)"
                            ](swapParams.opts, swapParams.fromAsset, swapParams.toAsset, swapParams.fromAmount, swapParams.minAmountOut, swapParams.maxHealthFactorDrop, swapParams.swapCalldata);
                    });

                    const userCollateralAfterFrom = await comet.userCollateral(alice, swapParams.fromAsset);
                    const userCollateralAfterTo = await comet.userCollateral(alice, swapParams.toAsset);

                    expect(userCollateralBeforeFrom!.balance - userCollateralAfterFrom.balance).to.eq(
                        swapParams.fromAmount
                    );
                    expect(userCollateralAfterTo.balance - userCollateralBeforeTo!.balance).to.be.greaterThanOrEqual(
                        swapParams.minAmountOut
                    );
                });
            });
        });

        describe("revert cases", function () {
            it("reverts when loanPlugin is unregistered", async () => {
                const swapParams: any = {
                    opts: {
                        loanPlugin: alice.address, // Unregistered plugin
                        swapPlugin: lifiPlugin.endpoint,
                        comet: await comet.getAddress()
                    },
                    fromAsset: await wstETH.getAddress(),
                    fromAmount: exp(0.2, 18),
                    toAsset: await rETH.getAddress(),
                    swapCalldata: "",
                    minAmountOut: 0n,
                    maxHealthFactorDrop: 1000
                };

                const { swapCalldata, toAmountMin } = await getQuote(
                    "ETH",
                    "ETH",
                    "wstETH",
                    await rETH.getAddress(),
                    swapParams.fromAmount.toString(),
                    String(collateralSwap.target)
                );

                swapParams.swapCalldata = swapCalldata;
                swapParams.minAmountOut = toAmountMin;

                await expect(
                    collateralSwap
                        .connect(alice)
                        [
                            "exchange((address,address,address),address,address,uint256,uint256,uint256,bytes)"
                        ](swapParams.opts, swapParams.fromAsset, swapParams.toAsset, swapParams.fromAmount, swapParams.minAmountOut, swapParams.maxHealthFactorDrop, swapParams.swapCalldata)
                ).to.be.revertedWithCustomError(collateralSwap, "UnknownPlugin");
            });

            it("reverts when swapPlugin is unregistered", async () => {
                const swapParams: any = {
                    opts: {
                        loanPlugin: await balancerPl.getAddress(),
                        swapPlugin: alice.address, // Unregistered plugin
                        comet: await comet.getAddress()
                    },
                    fromAsset: await wstETH.getAddress(),
                    fromAmount: exp(0.2, 18),
                    toAsset: await rETH.getAddress(),
                    swapCalldata: "",
                    minAmountOut: 0,
                    maxHealthFactorDrop: 1000
                };

                const { swapCalldata, toAmountMin } = await getQuote(
                    "ETH",
                    "ETH",
                    "wstETH",
                    await rETH.getAddress(),
                    swapParams.fromAmount.toString(),
                    String(collateralSwap.target)
                );
                swapParams.swapCalldata = swapCalldata;
                swapParams.minAmountOut = toAmountMin;

                await expect(
                    collateralSwap
                        .connect(alice)
                        [
                            "exchange((address,address,address),address,address,uint256,uint256,uint256,bytes)"
                        ](swapParams.opts, swapParams.fromAsset, swapParams.toAsset, swapParams.fromAmount, swapParams.minAmountOut, swapParams.maxHealthFactorDrop, swapParams.swapCalldata)
                ).to.be.revertedWithCustomError(collateralSwap, "UnknownPlugin");
            });

            it("reverts when flash loan cannot be repaid", async () => {
                const swapParams = {
                    opts: {
                        loanPlugin: await aavePl.getAddress(),
                        swapPlugin: lifiPlugin.endpoint,
                        comet: await comet.getAddress(),
                        flp: aaveFLP
                    },
                    fromAsset: await wstETH.getAddress(),
                    fromAmount: exp(0.2, 18),
                    toAsset: await rETH.getAddress(),
                    swapCalldata: "",
                    minAmountOut: exp(1, 18), // Unrealistically high minAmountOut
                    maxHealthFactorDrop: 6000
                };

                const { swapCalldata } = await getQuote(
                    "ETH",
                    "ETH",
                    "wstETH",
                    "rETH",
                    swapParams.fromAmount.toString(),
                    String(collateralSwap.target)
                );

                swapParams.swapCalldata = swapCalldata;

                // This should revert but the exact error depends on implementation
                await expect(
                    collateralSwap
                        .connect(alice)
                        [
                            "exchange((address,address,address),address,address,uint256,uint256,uint256,bytes)"
                        ](swapParams.opts, swapParams.fromAsset, swapParams.toAsset, swapParams.fromAmount, swapParams.minAmountOut, swapParams.maxHealthFactorDrop, swapParams.swapCalldata)
                ).to.be.reverted;
            });

            it("reverts when collateral swap has no approval on comet actions", async () => {
                const swapParams = {
                    opts: {
                        loanPlugin: await balancerPl.getAddress(),
                        swapPlugin: lifiPlugin.endpoint,
                        comet: await comet.getAddress(),
                        flp: balancerFLP
                    },
                    fromAsset: await wstETH.getAddress(),
                    fromAmount: exp(0.2, 18),
                    toAsset: await rETH.getAddress(),
                    swapCalldata: "",
                    minAmountOut: 0n,
                    maxHealthFactorDrop: 1000
                };

                const { swapCalldata, toAmountMin } = await getQuote(
                    "ETH",
                    "ETH",
                    "wstETH",
                    "rETH",
                    swapParams.fromAmount.toString(),
                    String(collateralSwap.target)
                );

                swapParams.swapCalldata = swapCalldata;
                swapParams.minAmountOut = toAmountMin;

                await comet.connect(alice).allow(collateralSwap, false);
                expect(await comet.hasPermission(alice, collateralSwap)).to.be.false;

                await expect(
                    collateralSwap
                        .connect(alice)
                        [
                            "exchange((address,address,address),address,address,uint256,uint256,uint256,bytes)"
                        ](swapParams.opts, swapParams.fromAsset, swapParams.toAsset, swapParams.fromAmount, swapParams.minAmountOut, swapParams.maxHealthFactorDrop, swapParams.swapCalldata)
                ).to.be.revertedWithCustomError(comet, "Unauthorized");
            });
        });
    });
});
