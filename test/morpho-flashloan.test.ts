import { ethers } from "hardhat";
import { expect } from "chai";
import { Contract } from "ethers";
import { CometMultiplierAdapter, EulerV2Plugin, IComet, IERC20, IEulerMarkets, MorphoPlugin } from "../typechain-types";
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
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  return res.data.tx.data;
}

describe("Morpho", function () {
  let adapter: CometMultiplierAdapter;
  let plugin: MorphoPlugin;
  let comet: IComet;
  let weth: IERC20;
  let usdc: IERC20;
  let eulerMarkets: IEulerMarkets;
  
  let user: any;
  const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  const COMET_USDC_MARKET = "0xc3d688B66703497DAA19211EEdff47f25384cdc3";
  const ONE_INCH_ROUTER_V6 = "0x111111125421cA6dc452d289314280a0f8842A65";

  const MORPHO = "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb";

  before(async () => {
    [user] = await ethers.getSigners();

    weth = await ethers.getContractAt("IERC20", WETH_ADDRESS);
    usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
    comet = await ethers.getContractAt("IComet", COMET_USDC_MARKET);

    const EulerPlugin = await ethers.getContractFactory("MorphoPlugin");
    plugin = await EulerPlugin.deploy();

    const Adapter = await ethers.getContractFactory("CometMultiplierAdapter");
    adapter = await Adapter.deploy(ONE_INCH_ROUTER_V6, [
      { endpoint: await plugin.getAddress(),  config: "0x"},
    ]);


    const whale = await ethers.getImpersonatedSigner("0xF04a5cC80B1E94C69B48f5ee68a08CD2F09A7c3E");

    await ethers.provider.send("hardhat_setBalance", [whale.address, "0xffffffffffffffffffffff"]); 

    const amount = ethers.parseEther("10");
    await weth.connect(whale).transfer(user.address, amount);
  });

  it("should execute multiplier using real market and 1inch", async () => {
    const initialAmount = ethers.parseEther("0.1");
    const leverage = 30000;
    const minAmountOut = 1;

    await weth.connect(user).approve(await adapter.getAddress(), initialAmount);

    const CALLBACK_SELECTOR = await plugin.CALLBACK_SELECTOR();
    await adapter.connect(user).addAsset(await comet.getAddress(), await weth.getAddress(), MORPHO, CALLBACK_SELECTOR, leverage);

    const swapData = await get1inchSwapData(
      await usdc.getAddress(),
      await weth.getAddress(),
      "904144896",
      await adapter.getAddress(),
    );

    const allowAbi = ["function allow(address, bool)"];
    const cometAsSigner = new ethers.Contract(await comet.getAddress(), allowAbi, user) as any;

    await cometAsSigner.connect(user).allow(await adapter.getAddress(), true);

    await expect(
      adapter
        .connect(user)
        .executeMultiplier(await comet.getAddress(), await weth.getAddress(), initialAmount, leverage, swapData, minAmountOut)
    ).to.not.be.reverted;
  });
});
