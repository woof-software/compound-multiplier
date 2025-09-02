import { ethers } from "hardhat";
import { expect } from "chai";
import { CometMultiplierAdapter, EulerV2Plugin, OneInchV6SwapPlugin, IComet, IERC20 } from "../typechain-types";
import axios from "axios";

(BigInt.prototype as any).toJSON = function () {
    return this.toString();
};

async function get1inchSwapData(
    fromToken: string,
    toToken: string,
    amount: string,
    userAddress: string,
    slippage: string = "1"
): Promise<string> {
    const apiKey = process.env.ONE_INCH_API_KEY;
    const url = `https://api.1inch.dev/swap/v6.1/1/swap?src=${fromToken}&dst=${toToken}&amount=${amount}&from=${userAddress}&slippage=${slippage}&disableEstimate=true&includeTokensInfo=true`;
    const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${apiKey}` }
    });
    return res.data.tx.data;
}

let opts = { maxFeePerGas: 2_000_000_000 };

describe("Euler Plugin (updated core)", function () {
    let adapter: CometMultiplierAdapter;
    let loanPlugin: EulerV2Plugin;
    let swapPlugin: OneInchV6SwapPlugin;
    let comet: IComet;
    let weth: IERC20;
    let usdc: IERC20;

    let owner: any; // deployer = owner
    let user: any;

    // mainnet addresses
    const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    const COMET_USDC_MARKET = "0xc3d688B66703497DAA19211EEdff47f25384cdc3";
    const ONE_INCH_ROUTER_V6 = "0x111111125421cA6dc452d289314280a0f8842A65";
    const USDC_EVAULT = "0x797DD80692c3b2dAdabCe8e30C07fDE5307D48a9";
    const WETH_WHALE = "0xF04a5cC80B1E94C69B48f5ee68a08CD2F09A7c3E";

    before(async () => {
        [owner, user] = await ethers.getSigners();

        weth = await ethers.getContractAt("IERC20", WETH_ADDRESS);
        usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
        comet = await ethers.getContractAt("IComet", COMET_USDC_MARKET);

        const LoanFactory = await ethers.getContractFactory("EulerV2Plugin", owner);
        loanPlugin = await LoanFactory.deploy(opts);

        const SwapFactory = await ethers.getContractFactory("OneInchV6SwapPlugin", owner);
        swapPlugin = await SwapFactory.deploy(opts);

        const Adapter = await ethers.getContractFactory("CometMultiplierAdapter", owner);
        adapter = await Adapter.deploy(
            [
                // плагин флешлоана
                { endpoint: await loanPlugin.getAddress(), config: "0x" },
                // плагин свопа (с конфигом — адресом роутера 1inch v6)
                {
                    endpoint: await swapPlugin.getAddress(),
                    config: ethers.AbiCoder.defaultAbiCoder().encode(["address"], [ONE_INCH_ROUTER_V6])
                }
            ],
            opts
        );

        // раздаём пользователю WETH
        const whale = await ethers.getImpersonatedSigner(WETH_WHALE);
        await ethers.provider.send("hardhat_setBalance", [whale.address, "0xffffffffffffffffffffff"]);
        await weth.connect(whale).transfer(user.address, ethers.parseEther("10"), opts);
    });

    it("should execute multiplier using real market and 1inch (updated core)", async () => {
        const initialAmount = ethers.parseEther("0.1");
        const leverageBps = 30_000;
        const minAmountOut = 1n;

        const LOAN_SELECTOR = await loanPlugin.CALLBACK_SELECTOR();
        const SWAP_SELECTOR = await swapPlugin.CALLBACK_SELECTOR();

        await adapter.connect(owner).addMarket(await comet.getAddress(), {
            loanSelector: LOAN_SELECTOR,
            swapSelector: SWAP_SELECTOR,
            flp: USDC_EVAULT
        });

        await adapter.connect(owner).addCollateral(
            await comet.getAddress(),
            await weth.getAddress(),
            {
                loanSelector: LOAN_SELECTOR,
                swapSelector: SWAP_SELECTOR,
                flp: USDC_EVAULT
            },
            leverageBps
        );

        await weth.connect(user).approve(await adapter.getAddress(), initialAmount);
        const allowAbi = ["function allow(address, bool)"];
        const cometAsUser = new ethers.Contract(await comet.getAddress(), allowAbi, user) as any;
        await cometAsUser.allow(await adapter.getAddress(), true);

        const info = await comet.getAssetInfoByAddress(await weth.getAddress());
        const price = await comet.getPrice(info.priceFeed);
        const baseScale = await comet.baseScale();
        const scale = info.scale;

        const initialValueBase = (initialAmount * price * baseScale) / (scale * 1_00000000n);

        const delta = BigInt(leverageBps - 10_000);
        const loan1 = (initialValueBase * delta) / 10_000n;
        const debt = (loan1 * delta) / 10_000n;

        const swapData = await get1inchSwapData(
            await usdc.getAddress(),
            await weth.getAddress(),
            debt.toString(),
            await adapter.getAddress()
        );
        await adapter
            .connect(user)
            .executeMultiplier(
                await comet.getAddress(),
                await weth.getAddress(),
                initialAmount,
                leverageBps,
                swapData,
                minAmountOut
            );
        await expect(
            adapter
                .connect(user)
                .executeMultiplier(
                    await comet.getAddress(),
                    await weth.getAddress(),
                    initialAmount,
                    leverageBps,
                    swapData,
                    minAmountOut
                )
        ).to.not.be.reverted;
    });
});
