/** @jsxImportSource frog/jsx */

import { Button, Frog, TextInput, parseEther } from "frog";
import { handle } from "frog/next";
import { createWalletClient, http, createPublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { polygon } from "viem/chains";
import { PinataFDK } from "pinata-fdk";
import abi from "./abi.json";
import ERC20_abi from "./ERC20_abi.json";

const fdk = new PinataFDK({
  pinata_jwt: process.env.PINATA_JWT || "",
  pinata_gateway: "",
});

const CONTRACT = process.env.CONTRACT_ADDRESS as `0x` || ""

const account = privateKeyToAccount((process.env.PRIVATE_KEY as `0x`) || "");
const USDTAddress = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
const wallet = process.env.WALLET as `0x` || "";  // linked to Farcaster

const publicClient = createPublicClient({
  chain: polygon,
  transport: http(process.env.ALCHEMY_URL),
});

const walletClient = createWalletClient({
  account,
  chain: polygon,
  transport: http(process.env.ALCHEMY_URL),
});

async function getUSDTBalance(address: any) {
  const balance = await publicClient.readContract({
    address: USDTAddress,
    abi: ERC20_abi,
    functionName: "balanceOf",
    args: [address],
  });
  const readableBalance = Number(balance);
  return readableBalance;
}

async function getUSDTAllowance(address: any, spender: string) {
  const allowance = await publicClient.readContract({
    address: USDTAddress,
    abi: ERC20_abi,
    functionName: "allowance",
    args: [address, spender],
  });
  return Number(allowance);
}

async function isSubscriber(address : string) : Promise<boolean> {
    const sub = await publicClient.readContract({
      address: CONTRACT,
      abi: abi,
      functionName: "isSubscriber",
      args: [address]
    });
    const s = Boolean(sub);
    return s;
}

const app = new Frog({
  assetsPath: "/",
  basePath: "/api",
});

app.use(
  "/ad",
  fdk.analyticsMiddleware({ frameId: "hats-store", customId: "ad" }),
);
app.use(
  "/finish",
  fdk.analyticsMiddleware({ frameId: "hats-store", customId: "purchased" }),
);

app.frame("/", async (c) => {
  const subscribed = await isSubscriber(wallet);
  console.log(`${wallet} subscribed: ${subscribed}`);
  if (subscribed) {
    return c.res({
      image:
        "https://apricot-electoral-bobcat-94.mypinata.cloud/ipfs/QmVbd6q41ZrYsa8iQzVD3vXPNRUejSkQJAZ7AFMi5DGrQP", // thank you
      imageAspectRatio: "1:1",
      intents: [
        <Button.Link href="https://warpcast.com/techgeorgii">
          Read me on Warpcast
        </Button.Link>,
      ],
      title: "TechGeorgii - Already subscribed",
    });
  } else {
    return c.res({
      action: "/finish",
      image:
        "https://apricot-electoral-bobcat-94.mypinata.cloud/ipfs/Qmd3hQePdBcMuidf991FUFYcvdg5wiKAnpRqjuc1sWRmeZ", // support me
      imageAspectRatio: "1:1",
      intents: [
        <Button action="/support">Subscribe for 0.01 USDT/month</Button>,
      ],
      title: "TechGeorgii - Support my work",
    });
  }
});

app.frame("/support", async (c) => {
  const bal = await getUSDTBalance(wallet);
  console.log(`${wallet} USDT balance: ${bal}`)
  if (bal < 10000)  { // 0.01 USDT 
    const polygonscanUrl = `https://polygonscan.com/address/${wallet}`;

    return c.res({
      image: "https://apricot-electoral-bobcat-94.mypinata.cloud/ipfs/QmbJ5C2PRZQM12neTFat35CCU4kMtLqdFPzwxnjGwn81QB", // no USDT
      imageAspectRatio: "1:1",
      intents: [
        <Button.Link href={polygonscanUrl}>
          Check on Polygonscan
        </Button.Link>,
        <Button action="/support">I topped up. Refresh</Button>,
      ],
      title: "TechGeorgii - Subscribing",
    });      
  }

  const allowance = await getUSDTAllowance(wallet, CONTRACT);
  if (allowance < 10000) {  // less than 0.01 USDT
    const approvalsUrl = `https://polygonscan.com/tokenapprovalchecker?search=${wallet}`;
    return c.res({
      image: "https://apricot-electoral-bobcat-94.mypinata.cloud/ipfs/Qmdd29NvGKKG3hufRnSWzsPYDod39hhuwqUXmpdd7kvYAs", // no allowance
      imageAspectRatio: "1:1",
      intents: [
        <Button.Link href={approvalsUrl}>
          View on Polygonscan
        </Button.Link>,
        <Button action="/support">I approved. Refresh</Button>,
      ],
      title: "TechGeorgii - Subscribing",
    });      
  }

  return c.res({
    action: "/coupon",
    image:
      "https://dweb.mypinata.cloud/ipfs/QmeUmBtAMBfwcFRLdoaCVJUNSXeAPzEy3dDGomL32X8HuP",
    imageAspectRatio: "1:1",
    intents: [
      <TextInput placeholder="Wallet Address (not ens)" />,
      <Button>Receive Coupon</Button>,
    ],
    title: "Pinta Hat Store",
  });
});


app.frame("/finish", (c) => {
  return c.res({
    image:
      "https://dweb.mypinata.cloud/ipfs/QmZPysm8ZiR9PaNxNGQvqdT2gBjdYsjNskDkZ1vkVs3Tju",
    imageAspectRatio: "1:1",
    intents: [
      <Button.Link href="https://warpcast.com/~/channel/pinata">
        Join the Pinata Channel
      </Button.Link>,
    ],
    title: "Pinta Hat Store",
  });
});

app.frame("/ad", async (c) => {
  return c.res({
    action: "/coupon",
    image:
      "https://dweb.mypinata.cloud/ipfs/QmeUmBtAMBfwcFRLdoaCVJUNSXeAPzEy3dDGomL32X8HuP",
    imageAspectRatio: "1:1",
    intents: [
      <TextInput placeholder="Wallet Address (not ens)" />,
      <Button>Receive Coupon</Button>,
    ],
    title: "Pinta Hat Store",
  });
});

app.frame("/coupon", async (c) => {
  const supply = 0;// await remainingSupply();
  const address = c.inputText;
  const balance = 0;// await checkBalance(address);

  if (
    typeof balance === "number" &&
    balance < 1 &&
    typeof supply === "number" &&
    supply > 0
  ) {
    const { request: mint } = await publicClient.simulateContract({
      account,
      address: CONTRACT,
      abi: abi,
      functionName: "mint",
      args: [address],
    });
    const mintTransaction = await walletClient.writeContract(mint);
    console.log(mintTransaction);

    const mintReceipt = await publicClient.waitForTransactionReceipt({
      hash: mintTransaction,
    });
    console.log("Mint Status:", mintReceipt.status);
  }

  return c.res({
    action: "/finish",
    image:
      "https://dweb.mypinata.cloud/ipfs/QmeUmBtAMBfwcFRLdoaCVJUNSXeAPzEy3dDGomL32X8HuP",
    imageAspectRatio: "1:1",
    intents: [
      <Button.Transaction target="/buy/0.0025">
        Buy for 0.0025 ETH
      </Button.Transaction>,
    ],
    title: "Pinta Hat Store",
  });
});

app.transaction("/buy/:price", async (c) => {
  
  const price = c.req.param('price')

  return c.contract({
    abi: abi,
    // @ts-ignore
    chainId: "eip155:84532",
    functionName: "buyHat",
    args: [c.frameData?.fid],
    to: CONTRACT,
    value: parseEther(`${price}`),
  });
});

export const GET = handle(app);
export const POST = handle(app);
