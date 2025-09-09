import { ethers } from "hardhat";
import { expect } from "chai";
import {
  CometMultiplierAdapter,
  EulerV2Plugin,
  OneInchV6SwapPlugin,
  IComet,
  IERC20,
} from "../typechain-types";
import { get1inchQuote, get1inchSwapData } from "./utils/oneinch";


(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};



let opts = { maxFeePerGas: 3_000_000_000 };

describe("Euler Plugin (updated core)", function () {
  let adapter: CometMultiplierAdapter;
  let loanPlugin: EulerV2Plugin;
  let swapPlugin: OneInchV6SwapPlugin;
  let comet: IComet;
  let weth: IERC20;
  let usdc: IERC20;

  let owner: any;
  let user: any;

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

    const LOAN_SELECTOR = await loanPlugin.CALLBACK_SELECTOR();
    const SWAP_SELECTOR = await swapPlugin.CALLBACK_SELECTOR();

    const plugins = [
      { 
        endpoint: await loanPlugin.getAddress(), 
        config: "0x" 
      },
      {
        endpoint: await swapPlugin.getAddress(),
        config: ethers.AbiCoder.defaultAbiCoder().encode(
          ["address"],
          [ONE_INCH_ROUTER_V6]
        ),
      },
    ];

    const markets = [
      {
        market: COMET_USDC_MARKET,
        baseAsset: {
          loanSelector: LOAN_SELECTOR,
          swapSelector: SWAP_SELECTOR,
          flp: USDC_EVAULT,
        },
        collaterals: [
          {
            asset: WETH_ADDRESS,
            config: {
              loanSelector: LOAN_SELECTOR,
              swapSelector: SWAP_SELECTOR,
              flp: USDC_EVAULT,
            },
            leverage: 30_000,
          }
        ]
      }
    ];

    const Adapter = await ethers.getContractFactory("CometMultiplierAdapter", owner);
    adapter = await Adapter.deploy(plugins, markets, opts);

    const whale = await ethers.getImpersonatedSigner(WETH_WHALE);
    await ethers.provider.send("hardhat_setBalance", [
      whale.address,
      "0xffffffffffffffffffffff",
    ]);
    await weth.connect(whale).transfer(user.address, ethers.parseEther("10"), opts);
  });

  it("should execute multiplier using real market and 1inch", async () => {
    const initialAmount = ethers.parseEther("0.1");
    const leverageBps = 30_000;
    const minAmountOut = 1n;

    await weth.connect(user).approve(await adapter.getAddress(), initialAmount);
    
    const allowAbi = ["function allow(address, bool)"];
    const cometAsUser = new ethers.Contract(await comet.getAddress(), allowAbi, user) as any;
    await cometAsUser.allow(await adapter.getAddress(), true);

    const info = await comet.getAssetInfoByAddress(await weth.getAddress());
    const price = await comet.getPrice(info.priceFeed);
    const baseScale = await comet.baseScale();
    const scale = info.scale;

    const initialValueBase =
      (initialAmount * price * baseScale) / (scale * 1_00000000n);

    const delta = BigInt(leverageBps - 10_000);
    const baseAmount = (initialValueBase * delta) / 10_000n;

    const swapData = await get1inchSwapData(
      await usdc.getAddress(),
      await weth.getAddress(),
      baseAmount.toString(),
      await adapter.getAddress()
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

    const userCollateralBalance = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
    const userBorrowBalance = await comet.borrowBalanceOf(user.address);
    

    expect(userCollateralBalance).to.be.gt(initialAmount);
    expect(userBorrowBalance).to.be.gt(0);
  });

  it("withdraws multiplier position (partial)", async () => {
    const debt = await comet.borrowBalanceOf(user.address);
    const userCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
    const sellAmount = userCol / 4n;

    const quote = await get1inchQuote(WETH_ADDRESS, USDC_ADDRESS, sellAmount.toString());
    const minBaseOut = (BigInt(quote) * 99n) / 100n;

    const swapData = await get1inchSwapData(
      WETH_ADDRESS,
      USDC_ADDRESS,
      sellAmount.toString(),
      await adapter.getAddress()
    );

    await expect(
      adapter.connect(user).withdrawMultiplier(
        await comet.getAddress(),
        WETH_ADDRESS,
        sellAmount,
        swapData,
        minBaseOut
      )
    ).to.not.be.reverted;

    const newDebt = await comet.borrowBalanceOf(user.address);
    const newCol = await comet.collateralBalanceOf(user.address, WETH_ADDRESS);
    expect(newDebt).to.be.lt(debt);
    expect(newCol).to.be.lte(userCol);
  });
});