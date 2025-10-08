import { AAVEPlugin, BalancerPlugin, IComet, ICometCollateralSwap, IERC20 } from "../../typechain-types";
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
    BALANCER_VAULT
} from "../helpers/helpers";
import { expect } from "chai";
import { CometCollateralSwap } from "../../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { config } from "dotenv";

describe("CometCollateralSwap", function () {
    let snapshot: SnapshotRestorer;

    // Contracts
    let collateralSwap: CometCollateralSwap;
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

        // balancerPluginA = {
        //     endpoint: await balancerPlugin.endpoint.getAddress(),
        //     flp: balancerPlugin.flp
        // };
        // aavePluginA = {
        //     endpoint: await aavePlugin.endpoint.getAddress(),
        //     flp: aavePlugin.flp
        // };

        balancerPluginA = {
            endpoint: await balancerPlugin.endpoint.getAddress(),
            config: "0x"
        };
        aavePluginA = {
            endpoint: await aavePlugin.endpoint.getAddress(),
            config: "0x"
        };

        ({ lifiPlugin } = await getSwapPlugins());

        collateralSwap = await deployCollateralSwap([balancerPluginA, aavePluginA], SWAP_ROUTER, lifiPlugin.endpoint);

        comet = await getComet();
        ({ weth, wstETH, rsETH, rETH, wbtc } = await tokensInstances());
        ({ wethWhale, wstETHWhale, wbtcWhale } = await getWhales());

        await wstETH.connect(wstETHWhale).transfer(alice, SUPPLY_AMOUNT);

        // supply and borrow on comet
        const supplyAmount = exp(2, 18);
        const borrowAmount = exp(0.5, 18);
        await wstETH.connect(alice).approve(comet, supplyAmount);
        await comet.connect(alice).supply(wstETH, supplyAmount);
        await comet.connect(alice).withdraw(weth, borrowAmount);

        await comet.connect(alice).allow(collateralSwap, true);

        snapshot = await takeSnapshot();
    });

    afterEach(async () => await snapshot.restore());

    describe("deployment", function () {
        it("deploys with correct params", async () => {
            const collateralSwap = await ethers.deployContract("CometCollateralSwap", [
                [balancerPluginA, aavePluginA],
                SWAP_ROUTER,
                lifiPlugin.endpoint
            ]);

            // Check plugins
            const balancerSelector = await balancerPl.CALLBACK_SELECTOR();
            const aaveSelector = await aavePl.CALLBACK_SELECTOR();

            const balancerPluginInfo = await collateralSwap.plugins(balancerSelector);
            expect(balancerPluginInfo.endpoint).to.equal(balancerPluginA.endpoint);
            expect(balancerPluginInfo.config).to.equal(balancerPluginA.config);

            const aavePluginInfo = await collateralSwap.plugins(aaveSelector);
            expect(aavePluginInfo.endpoint).to.equal(aavePluginA.endpoint);
            expect(aavePluginInfo.config).to.equal(aavePluginA.config);

            // Check swap router
            expect(await collateralSwap.swapRouter()).to.equal(SWAP_ROUTER);
            expect(await collateralSwap.swapPlugin()).to.equal(lifiPlugin.endpoint);
        });

        it("emits an event on deployment", async () => {
            // First get selectors
            const balancerSelector = await balancerPl.CALLBACK_SELECTOR();
            const aaveSelector = await aavePl.CALLBACK_SELECTOR();

            expect(
                await ethers.deployContract("CometCollateralSwap", [
                    [balancerPluginA, aavePluginA],
                    SWAP_ROUTER,
                    lifiPlugin.endpoint
                ])
            )
                .to.emit(collateralSwap, "PluginRegistered")
                .withArgs(balancerSelector, balancerPluginA.endpoint, balancerPluginA.config)
                .to.emit(collateralSwap, "PluginRegistered")
                .withArgs(aaveSelector, aavePluginA.endpoint, aavePluginA.config);
        });

        it("reverts when swapRouter is zero address", async () => {
            await expect(
                ethers.deployContract("CometCollateralSwap", [
                    [balancerPluginA, aavePluginA],
                    ZERO_ADDRESS,
                    lifiPlugin.endpoint
                ])
            ).to.be.revertedWithCustomError(collateralSwap, "ZeroAddress");
        });

        it("reverts when swapPlugin is zero address", async () => {
            await expect(
                ethers.deployContract("CometCollateralSwap", [
                    [balancerPluginA, aavePluginA],
                    SWAP_ROUTER,
                    ZERO_ADDRESS
                ])
            ).to.be.revertedWithCustomError(collateralSwap, "ZeroAddress");
        });

        it("reverts when deploying with empty plugins array", async () => {
            await expect(
                ethers.deployContract("CometCollateralSwap", [[], SWAP_ROUTER, lifiPlugin.endpoint])
            ).to.be.revertedWithCustomError(collateralSwap, "ZeroLength");
        });
    });

    describe("swap params validation", function () {
        let swapParams: ICometCollateralSwap.SwapParamsStruct;
        beforeEach(async () => {
            swapParams = {
                comet: comet,
                callbackSelector: await balancerPl.CALLBACK_SELECTOR(),
                fromAsset: wstETH,
                fromAmount: exp(1, 18),
                toAsset: rETH,
                flp: balancerFLP,
                swapCalldata: "0x1234",
                minAmountOut: exp(1, 18),
                maxHealthFactorDropBps: 500
            };
        });

        it("reverts when comet is zero address", async () => {
            swapParams.comet = ZERO_ADDRESS;
            await expect(collateralSwap.connect(alice).swap(swapParams)).to.be.revertedWithCustomError(
                collateralSwap,
                "InvalidSwapParameters"
            );
        });

        it("reverts when fromAsset is zero address", async () => {
            swapParams.fromAsset = ZERO_ADDRESS;
            await expect(collateralSwap.connect(alice).swap(swapParams)).to.be.revertedWithCustomError(
                collateralSwap,
                "InvalidSwapParameters"
            );
        });

        it("reverts when toAsset is zero address", async () => {
            swapParams.toAsset = ZERO_ADDRESS;
            await expect(collateralSwap.connect(alice).swap(swapParams)).to.be.revertedWithCustomError(
                collateralSwap,
                "InvalidSwapParameters"
            );
        });

        it("reverts when minAmountOut is zero", async () => {
            swapParams.minAmountOut = 0;
            await expect(collateralSwap.connect(alice).swap(swapParams)).to.be.revertedWithCustomError(
                collateralSwap,
                "InvalidSwapParameters"
            );
        });

        it("reverts when maxHealthFactorDropBps >= BPS_DROP_DENOMINATOR", async () => {
            const BPS_DROP_DENOMINATOR = await collateralSwap.BPS_DROP_DENOMINATOR();
            swapParams.maxHealthFactorDropBps = BPS_DROP_DENOMINATOR;
            await expect(collateralSwap.connect(alice).swap(swapParams)).to.be.revertedWithCustomError(
                collateralSwap,
                "InvalidSwapParameters"
            );
        });
    });

    describe("swap", function () {
        describe("happy cases", function () {
            let swapParams: ICometCollateralSwap.SwapParamsStruct;

            it("allows to make a swap with 0 fee on flashloan", async () => {
                // Check that approve is set for the swap contract
                expect(await comet.hasPermission(alice, collateralSwap)).to.be.true;

                await expect(
                    executeWithRetry(async () => {
                        swapParams = {
                            comet: comet,
                            callbackSelector: await balancerPl.CALLBACK_SELECTOR(),
                            fromAsset: wstETH,
                            fromAmount: exp(0.2, 18),
                            flp: balancerFLP,
                            toAsset: rETH,
                            swapCalldata: "",
                            minAmountOut: 0,
                            maxHealthFactorDropBps: 1000 // 10% max health factor drop
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

                        collateralSwap.connect(alice).swap(swapParams);
                    })
                ).to.not.be.reverted;
            });

            it("allows to make a swap with some fee on flashloan", async () => {
                swapParams.callbackSelector = await aavePl.CALLBACK_SELECTOR();

                // decrease the amountOutMin by 0.05% to cover fees
                swapParams.minAmountOut = (BigInt(swapParams.minAmountOut) * 9995n) / 10000n;

                // Check that approve is set for the swap contract
                expect(await comet.hasPermission(alice, collateralSwap)).to.be.true;

                await expect(
                    executeWithRetry(async () => {
                        swapParams = {
                            comet: comet,
                            callbackSelector: await balancerPl.CALLBACK_SELECTOR(),
                            fromAsset: wstETH,
                            fromAmount: exp(0.2, 18),
                            flp: balancerFLP,
                            toAsset: rETH,
                            swapCalldata: "",
                            minAmountOut: 0,
                            maxHealthFactorDropBps: 1000 // 10% max health factor drop
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

                        collateralSwap.connect(alice).swap(swapParams);
                    })
                ).to.not.be.reverted;
            });

            it("allows to make a swap with approve", async () => {
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
                    v: splitSig.v,
                    owner: signatureArgs.owner,
                    isAllowed: signatureArgs.isAllowed,
                    manager: signatureArgs.manager
                };

                await expect(
                    executeWithRetry(async () => {
                        swapParams = {
                            comet: comet,
                            callbackSelector: await balancerPl.CALLBACK_SELECTOR(),
                            fromAsset: wstETH,
                            fromAmount: exp(0.2, 18),
                            toAsset: rETH,
                            flp: balancerFLP,
                            swapCalldata: "",
                            minAmountOut: 0,
                            maxHealthFactorDropBps: 1000 // 10% max health factor drop
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

                        collateralSwap.connect(alice).swapWithPermit(swapParams, allowParams);
                    })
                ).to.not.be.reverted;
            });

            it("contract token balances are zero after swap", async () => {
                expect(await wstETH.balanceOf(collateralSwap)).to.equal(0);
                expect(await rETH.balanceOf(collateralSwap)).to.equal(0);

                await collateralSwap.connect(alice).swap(swapParams);

                expect(await wstETH.balanceOf(collateralSwap)).to.equal(0);
                expect(await rETH.balanceOf(collateralSwap)).to.equal(0);
            });

            it("updates user collateral balances after swap properly", async () => {
                const userCollateralBeforeFrom = await comet.userCollateral(alice, swapParams.fromAsset);
                const userCollateralBeforeTo = await comet.userCollateral(alice, swapParams.toAsset);

                await collateralSwap.connect(alice).swap(swapParams);

                const userCollateralAfterFrom = await comet.userCollateral(alice, swapParams.fromAsset);
                const userCollateralAfterTo = await comet.userCollateral(alice, swapParams.toAsset);

                expect(userCollateralBeforeFrom.balance - userCollateralAfterFrom.balance).to.eq(swapParams.fromAmount);
                expect(userCollateralAfterTo.balance - userCollateralBeforeTo.balance).to.be.greaterThanOrEqual(
                    swapParams.minAmountOut
                );
            });
        });

        describe("revert cases", function () {
            it("reverts when callbackSelector refers to an unregistered plugin", async () => {
                const swapParams: ICometCollateralSwap.SwapParamsStruct = {
                    comet: comet,
                    callbackSelector: "0x12345678", // Unregistered selector
                    fromAsset: wstETH,
                    flp: balancerFLP,
                    fromAmount: exp(1, 18),
                    toAsset: rETH,
                    swapCalldata: "0x1234",
                    minAmountOut: exp(1, 18),
                    maxHealthFactorDropBps: 500
                };

                expect(await collateralSwap.plugins(swapParams.callbackSelector)).to.deep.equal([ZERO_ADDRESS, "0x"]);

                await expect(collateralSwap.connect(alice).swap(swapParams)).to.be.revertedWithCustomError(
                    collateralSwap,
                    "UnknownPlugin"
                );
            });

            it("reverts when incorrect contract balance of loaned token after flash loan", async () => {
                const attackContract = await ethers.deployContract("FlashloanPluginTest", [aavePl, aavePl]);

                const abi = ["function attackCallback()"];
                const iface = new ethers.Interface(abi);

                const calldata = iface.encodeFunctionData("attackCallback", []);

                const plugin = {
                    endpoint: attackContract,
                    config: "0x"
                };

                const collateralSwap = await ethers.deployContract("CometCollateralSwap", [
                    [plugin],
                    SWAP_ROUTER,
                    lifiPlugin.endpoint
                ]);

                const expectedReturnData = await attackContract.attackCallback();

                const assetData = await ethers.getContractAt("IERC20", expectedReturnData.asset);
                expect(await assetData.balanceOf(collateralSwap)).to.equal(0n);
                expect(expectedReturnData.debt + expectedReturnData.snapshot).to.equal(1000n);

                await expect(
                    alice.sendTransaction({
                        to: collateralSwap,
                        data: calldata
                    })
                ).to.be.revertedWithCustomError(collateralSwap, "InvalidAmountOut");
            });

            it("reverts when flash loan cannot be repaid", async () => {
                let swapParams = {
                    comet: comet,
                    callbackSelector: await aavePl.CALLBACK_SELECTOR(),
                    fromAsset: wstETH,
                    fromAmount: exp(0.2, 18),
                    toAsset: rETH,
                    flp: aaveFLP,
                    swapCalldata: "",
                    minAmountOut: exp(1, 18),
                    maxHealthFactorDropBps: 6000 // 60% max health factor drop
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

                /*
                Note: this reverts with panic 0x11 because of Arithmetic operation 
                overflowed outside of an unchecked block
                this happens when we supply dust of swapped asset, thus causing the balance 
                of the contract to be less than the debt which causes the flash loan to fail during repayment
                */
                await expect(collateralSwap.connect(alice).swap(swapParams)).to.be.revertedWithPanic(0x11);
            });

            it("reverts when collateral swap has no approval on comet actions", async () => {
                let swapParams = {
                    comet: comet,
                    callbackSelector: await balancerPl.CALLBACK_SELECTOR(),
                    fromAsset: wstETH,
                    fromAmount: exp(0.2, 18),
                    toAsset: rETH,
                    flp: balancerFLP,
                    swapCalldata: "",
                    minAmountOut: 0n,
                    maxHealthFactorDropBps: 1000 // 10% max health factor drop
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

                await expect(collateralSwap.connect(alice).swap(swapParams)).to.be.revertedWithCustomError(
                    comet,
                    "Unauthorized"
                );
            });
        });
    });
});
