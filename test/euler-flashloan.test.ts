import { ethers } from "hardhat";
import { expect } from "chai";
import { Contract } from "ethers";
import { CometMultiplierAdapter, EulerV2Plugin, IComet, IERC20, IEulerMarkets } from "../typechain-types";
import axios from "axios";


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

describe("Forked Test: executeMultiplier (real 1inch, Compound, Euler)", function () {
  let adapter: CometMultiplierAdapter;
  let plugin: EulerV2Plugin;
  let comet: IComet;
  let weth: IERC20;
  let usdc: IERC20;
  let eulerMarkets: IEulerMarkets;
  
  let user: any;
  const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  const COMET_USDC_MARKET = "0xc3d688B66703497DAA19211EEdff47f25384cdc3";
  const ONE_INCH_ROUTER_V6 = "0x111111125421cA6dc452d289314280a0f8842A65";

  const EULER_ADDRESS = "0x27182842E098f60e3D576794A5bFFb0777E025d3";
  const EULER_MARKETS_ADDRESS = "0x3520d5a913427E6F0D6A83E07ccD4A4da316e4d3";

  const USDC_EVAULT = "0x797DD80692c3b2dAdabCe8e30C07fDE5307D48a9";

  before(async () => {
    [user] = await ethers.getSigners();

    weth = await ethers.getContractAt("IERC20", WETH_ADDRESS);
    usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
    comet = await ethers.getContractAt("IComet", COMET_USDC_MARKET);

    const EulerPlugin = await ethers.getContractFactory("EulerV2Plugin");
    plugin = await EulerPlugin.deploy();

    const config = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address"],
      [EULER_ADDRESS, EULER_MARKETS_ADDRESS]
    );

    const Adapter = await ethers.getContractFactory("CometMultiplierAdapter");
    adapter = await Adapter.deploy(ONE_INCH_ROUTER_V6, [
      { endpoint: await plugin.getAddress(), config },
    ]);

    eulerMarkets = await ethers.getContractAt("IEulerMarkets", EULER_MARKETS_ADDRESS);

    const whale = await ethers.getImpersonatedSigner("0xF04a5cC80B1E94C69B48f5ee68a08CD2F09A7c3E");

    await ethers.provider.send("hardhat_setBalance", [whale.address, "0xffffffffffffffffffffff"]); 

    const amount = ethers.parseEther("10");
    await weth.connect(whale).transfer(user.address, amount);
  });

  it("should execute multiplier using real market and 1inch", async () => {
    const initialAmount = ethers.parseEther("1");
    const leverage = 5000;
    const minAmountOut = 1;

    await weth.connect(user).approve(await adapter.getAddress(), initialAmount);

    const CALLBACK_SELECTOR = await plugin.CALLBACK_SELECTOR();
    await adapter.connect(user).addAsset(await comet.getAddress(), await weth.getAddress(), USDC_EVAULT, CALLBACK_SELECTOR, leverage);
    const swapData = await get1inchSwapData(
      await usdc.getAddress(),
      await weth.getAddress(),
      "926172000000",
      await adapter.getAddress(),
    );

    console.log("swapData:", swapData);

    await  adapter
        .connect(user)
        .executeMultiplier(await comet.getAddress(), await weth.getAddress(), initialAmount, leverage, swapData, minAmountOut);

    await expect(
      adapter
        .connect(user)
        .executeMultiplier(await comet.getAddress(), await weth.getAddress(), initialAmount, leverage, swapData, minAmountOut)
    ).to.not.be.reverted;
  });
});
