
import axios from "axios";


export async function get1inchSwapData(
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

export async function get1inchQuote(
  fromToken: string,
  toToken: string,
  amount: string,
  slippage: string = "1"
): Promise<string> {
  const apiKey = process.env.ONE_INCH_API_KEY;
  const url = `https://api.1inch.dev/swap/v6.1/1/quote?src=${fromToken}&dst=${toToken}&amount=${amount}&slippage=${slippage}`;
  const res = await axios.get(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  return res.data.dstAmount;
}
