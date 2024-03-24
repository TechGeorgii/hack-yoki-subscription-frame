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

const CONTRACT = process.env.CONTRACT_ADDRESS as `0x` || ""
const account = privateKeyToAccount((process.env.PRIVATE_KEY as `0x`) || "");
const wallet = process.env.WALLET as `0x` || "";  // linked to Farcaster

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
      ],
      title: "TechGeorgii - Already subscribed",
    });
  } else {
    return c.res({
      action: "/finish",
      image: "https://apricot-electoral-bobcat-94.mypinata.cloud/ipfs/QmZJSzLpdhKRCLXAZDheit2ABgnqEFnG1VgKDptCpPH7wC",  // support me

      imageAspectRatio: "1:1",
      intents: [
        <Button action="/support">Subscribe</Button>,
      ],
      title: "TechGeorgii - Support my work",
    });
  }
});

app.frame("/support", async (c) => {
  const bal = await getUSDTBalance(wallet);
  console.log(`${wallet} USDT balance: ${bal}`)
  if (bal < 10000)  { // 0.01 USDT 
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
  if (allowance < 10000) {  // less than 0.01 USDT
    return c.res({
      action: "/finish",
      image: "https://apricot-electoral-bobcat-94.mypinata.cloud/ipfs/QmbG3to1UgTQ9PHnW3grrwkByimCBBtnQTRshLztsmihvt", // no allowance
      imageAspectRatio: "1:1",
      intents: [
        <Button.Transaction target="/approve">
          Approve
        </Button.Transaction>,
        <Button action="/support">Refresh</Button>,
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

app.transaction("/approve", async (c) => {
  console.log("approve called");
  console.log(c);


  var bigApproval: bigint;
  var rawApproval = Number(c.inputText);

  if (!rawApproval)
    bigApproval = BigInt(60000); // 0.06 USDT by default if nothing specified/incorrect number
   else {
    bigApproval = parseUnits(""+rawApproval, 6);
    if (bigApproval < 60000) {
      bigApproval = BigInt(60000);
    }
  }
  console.log(`about to approve ${CONTRACT} to spend ${bigApproval}`);

  // c.frameData?.fid
  return c.contract({
    abi: ERC20_abi,
    // @ts-ignore
    chainId: chainId,
    functionName: "approve",
    args: [CONTRACT, bigApproval],
    to: subscriptionTokenAddress,
  });
});

// app.frame("/preApprove", async (c) => {
//   return c.res({
//     image:
//       "https://apricot-electoral-bobcat-94.mypinata.cloud/ipfs/QmUL8aUBiHHUSC8VUWUW7sy3pjKFLp8QHCqijF4ZpEHxrh",
//     imageAspectRatio: "1:1",
//     intents: [
//       <TextInput placeholder="Wallet Address (not ens)" />,
//       <Button>Receive Coupon</Button>,
//     ],
//     title: "Pinta Hat Store",
//   });
// });

app.frame('/finish', (c) => {
  const { transactionId } = c
  return c.res({
    image: (
      <div style={{ color: 'white', display: 'flex', fontSize: 60 }}>
        Transaction ID: {transactionId}
      </div>
    )
  })
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

export const GET = handle(app);
export const POST = handle(app);
