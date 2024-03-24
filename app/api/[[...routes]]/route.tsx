/** @jsxImportSource frog/jsx */

import { Button, Frog, TextInput, parseEther } from "frog";
import { handle } from "frog/next";
import { createWalletClient, http, createPublicClient, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { PinataFDK } from "pinata-fdk";
import abi from "./abi.json";
import ERC20_abi from "./ERC20_abi.json";

const fdk = new PinataFDK({
  pinata_jwt: process.env.PINATA_JWT || "",
  pinata_gateway: "",
});

const subscriptionTokenAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";  // USDC base
const chainId = base;
const chainIdStr = "eip155:8453";

const CONTRACT = process.env.CONTRACT_ADDRESS as `0x` || ""
const account = privateKeyToAccount((process.env.PRIVATE_KEY as `0x`) || "");

const publicClient = createPublicClient({
  chain: chainId,
  transport: http(process.env.ALCHEMY_URL),
});

const walletClient = createWalletClient({
  account,
  chain: chainId,
  transport: http(process.env.ALCHEMY_URL),
});

async function getUSDTBalance(address: any) {
  const balance = await publicClient.readContract({
    address: subscriptionTokenAddress,
    abi: ERC20_abi,
    functionName: "balanceOf",
    args: [address],
  });
  const readableBalance = Number(balance);
  return readableBalance;
}

async function getUSDTAllowance(address: any, spender: string) {
  const allowance = await publicClient.readContract({
    address: subscriptionTokenAddress,
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
    return c.res({
      image:
        "https://apricot-electoral-bobcat-94.mypinata.cloud/ipfs/QmZJSzLpdhKRCLXAZDheit2ABgnqEFnG1VgKDptCpPH7wC", // support me
      imageAspectRatio: "1:1",
      intents: [
        <TextInput placeholder="Wallet Address (not ens)" />,
        <Button action="/checkWallet">Check wallet</Button>,      
      ],
      title: "TechGeorgii",
    });
});


app.frame("/checkWallet", async (c) => {
  const wallet = c.inputText ?? "";
  const subscribed = await isSubscriber(wallet);
  console.log(`${wallet} subscribed: ${subscribed}`);
  console.log(c);
  
  if (subscribed) {
    return c.res({
      image:
        "https://apricot-electoral-bobcat-94.mypinata.cloud/ipfs/QmVbd6q41ZrYsa8iQzVD3vXPNRUejSkQJAZ7AFMi5DGrQP", // thank you
      imageAspectRatio: "1:1",
      intents: [
        <Button.Link href="https://warpcast.com/techgeorgii">
          Read me on Warpcast
        </Button.Link>,
      ]
    });
  } else {
    const actionSupport = "/support/" + wallet;
    
    return c.res({
      image: "https://apricot-electoral-bobcat-94.mypinata.cloud/ipfs/QmVTB493sxf5AhSMRNC4p3iXw99LB5qp8S661qMhCW5DpQ",  // not subscribed
      imageAspectRatio: "1:1",
      intents: [ <Button action={actionSupport}>Subscribe</Button> ]
    });
  }
});

app.frame("/support/:wallet", async (c) => {
  const wallet = c.req.param('wallet');

  console.log("/support called");
  console.log(c);

  const bal = await getUSDTBalance(wallet);
  console.log(`${wallet} USDT balance: ${bal}`)
  if (bal < 1000)  { // 0.001 USDC 
    const polygonscanUrl = `https://basescan.org/address/${wallet}`;

    return c.res({
      image: "https://apricot-electoral-bobcat-94.mypinata.cloud/ipfs/Qmd6iXnGDQKk1LGynWQefWLcaNJBnzuM9A21czssagsxXv", // no USDC
      imageAspectRatio: "1:1",
      intents: [
        <Button.Link href={polygonscanUrl}>
          Check on scan
        </Button.Link>,
        <Button action="/support">I topped up. Refresh</Button>,
      ],
      title: "TechGeorgii - Subscribing",
    });      
  }

  const allowance = await getUSDTAllowance(wallet, CONTRACT);
  if (allowance < 1000) {  // less than 0.001 USDC

    const scan = `https://basescan.org/address/${CONTRACT}`;
    return c.res({
      action: "/approveSuccess",
      image: "https://apricot-electoral-bobcat-94.mypinata.cloud/ipfs/QmbG3to1UgTQ9PHnW3grrwkByimCBBtnQTRshLztsmihvt", // no allowance
      imageAspectRatio: "1:1",
      intents: [
        <Button.Transaction target="/approve">
          Approve 0.006
        </Button.Transaction>,
        <Button.Link href={scan}>Contract</Button.Link>,
        <Button action="/support">Refresh</Button>,
      ],
      title: "TechGeorgii - Subscribing",
    });      
  }
    
  return c.res({
    image: "https://apricot-electoral-bobcat-94.mypinata.cloud/ipfs/QmVTB493sxf5AhSMRNC4p3iXw99LB5qp8S661qMhCW5DpQ",  // not subscribed
    imageAspectRatio: "1:1",
    intents: [
      <Button.Transaction target="/subscribe">
        Subscribe
      </Button.Transaction>,
    ],
  });
});

app.frame("/approveSuccess", async (c) => {
  console.log("approveSuccess called");
  console.log(c);

  return c.res({
    action: "/finish",
    image:
      "https://apricot-electoral-bobcat-94.mypinata.cloud/ipfs/QmeNWvNTC66KyjbS5KLz4tyV3RtE4MXt7tbpEdqAMDVbvP", // approve success
    imageAspectRatio: "1:1",
    intents: [
      <Button.Transaction target="/subscribe">
        Subscribe
      </Button.Transaction>,
    ]
  });
});


app.transaction("/approve", async (c) => {
  console.log("approve called: CONTRACT " + CONTRACT);
  console.log(c);

  // c.frameData?.fid
  return c.contract({
    abi: ERC20_abi,
    // @ts-ignore
    chainId: chainIdStr,
    functionName: "approve",
    //args: [CONTRACT, "6000"],  // we approve 0.006 USDC
    to: subscriptionTokenAddress,
  });
});

app.transaction("/subscribe", async (c) => {
  console.log("subscribe called");
  console.log(c);

  return c.contract({
    abi: abi,
    // @ts-ignore
    chainId: chainIdStr,
    functionName: "subscribe",
    args: [],
    to: CONTRACT,
  });
});


app.frame('/finish', (c) => {
  const { transactionId } = c
  const scanUrl = "https://basescan.org/tx/" + transactionId;
  return c.res({
    image: "https://apricot-electoral-bobcat-94.mypinata.cloud/ipfs/QmVbd6q41ZrYsa8iQzVD3vXPNRUejSkQJAZ7AFMi5DGrQP", 
    intents: [
      <Button.Link href={scanUrl}>
        See tx
      </Button.Link>,
    ]
  })
});

export const GET = handle(app);
export const POST = handle(app);
