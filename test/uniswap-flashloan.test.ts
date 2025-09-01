import { ethers } from "hardhat";
import { expect } from "chai";
import {
  CometMultiplierAdapter,
  IComet,
  IERC20,
  UniswapV3Plugin,
  OneInchV6SwapPlugin,
} from "../typechain-types";
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
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  return res.data.tx.data;
}

describe("UniswapV3", function () {
  let adapter: CometMultiplierAdapter;
  let loanPlugin: UniswapV3Plugin;
  let swapPlugin: OneInchV6SwapPlugin;
  let comet: IComet;
  let weth: IERC20;
  let usdc: IERC20;
  let user: any;

  const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  const COMET_USDC_MARKET = "0xc3d688B66703497DAA19211EEdff47f25384cdc3";
  const ONE_INCH_ROUTER_V6 = "0x111111125421cA6dc452d289314280a0f8842A65";
  const UNI_V3_USDC_WETH_005 = "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640";
  const WETH_WHALE = "0xF04a5cC80B1E94C69B48f5ee68a08CD2F09A7c3E";

  before(async () => {
    [user] = await ethers.getSigners();

    weth = await ethers.getContractAt("IERC20", WETH_ADDRESS);
    usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
    comet = await ethers.getContractAt("IComet", COMET_USDC_MARKET);

    const LoanFactory = await ethers.getContractFactory("UniswapV3Plugin");
    loanPlugin = (await LoanFactory.deploy()) as UniswapV3Plugin;

    const SwapFactory = await ethers.getContractFactory("OneInchV6SwapPlugin");
    swapPlugin = (await SwapFactory.deploy()) as OneInchV6SwapPlugin;

    const AdapterFactory = await ethers.getContractFactory("CometMultiplierAdapter");
    adapter = (await AdapterFactory.deploy([
      { endpoint: await loanPlugin.getAddress(), config: "0x" },
      {
        endpoint: await swapPlugin.getAddress(),
        config: ethers.AbiCoder.defaultAbiCoder().encode(["address"], [ONE_INCH_ROUTER_V6]),
      },
    ])) as CometMultiplierAdapter;

    const whale = await ethers.getImpersonatedSigner(WETH_WHALE);
    await ethers.provider.send("hardhat_setBalance", [whale.address, "0xffffffffffffffffffffff"]);
    await weth.connect(whale).transfer(user.address, ethers.parseEther("10"));
  });

  it("should execute multiplier using Uniswap V3 flash + 1inch swap", async () => {
    const initialAmount = ethers.parseEther("0.1");
    const leverage = 30000;
    const minAmountOut = 1;

    await weth.connect(user).approve(await adapter.getAddress(), initialAmount);

    const LOAN_SELECTOR = await loanPlugin.CALLBACK_SELECTOR();
    const SWAP_SELECTOR = await swapPlugin.CALLBACK_SELECTOR();

    await adapter
      .connect(user)
      .addAsset(
        await comet.getAddress(),
        await weth.getAddress(),
        UNI_V3_USDC_WETH_005,
        leverage,
        SWAP_SELECTOR,
        LOAN_SELECTOR
      );

    const swapData = await get1inchSwapData(
      await usdc.getAddress(),
      await weth.getAddress(),
      "867801528",
      await adapter.getAddress()
    );

    const allowAbi = ["function allow(address, bool)"];
    const cometAsSigner = new ethers.Contract(await comet.getAddress(), allowAbi, user) as any;
    await cometAsSigner.connect(user).allow(await adapter.getAddress(), true);

    await expect(
      adapter
        .connect(user)
        .executeMultiplier(
          await comet.getAddress(),
          await weth.getAddress(),
          initialAmount,
          leverage,
          swapData,
          minAmountOut
        )
    ).to.not.be.reverted;
  });
});
