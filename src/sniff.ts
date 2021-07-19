import {Wallet, Contract, BigNumber, constants, utils, Signer} from 'ethers';
import {ethers} from 'ethers';
import UniswapV2Factory from '@uniswap/v2-core/build/UniswapV2Factory.json';
import UniswapV2Pair from '@uniswap/v2-core/build/UniswapV2Pair.json';
import ERC20 from '@uniswap/v2-periphery/build/ERC20.json';
import {FACTORY_ADDRESS, ChainId, Token, TokenAmount, Pair, WETH, Price, Fetcher, Route} from '@uniswap/sdk'
import {Fetcher as SushiFetcher, Token as SushiToken, Route as SushiRoute, Pair as SushiPair} from '@sushiswap/sdk';
import {computeProfitMaximizingTrade, expandTo18Decimals, estimateIncome} from '../src/utils';
import dotenv from 'dotenv';

dotenv.config();

const DAIAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
const SUSHI_FACTORY_ADDRESS = '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac';
const USDTAddress = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const AAVEAddress = '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9';
const MATICAddress = '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0';
const WETHAddress = WETH[ChainId.MAINNET].address;

// init provider and wallet
// const provider = ethers.getDefaultProvider();
// const wallet:Wallet = ethers.Wallet.createRandom();
// const account = wallet.connect(provider);
// console.log(await provider.getNetwork());
const provider = new ethers.providers.InfuraProvider("homestead", process.env.INFURA_PROJECT_ID);
let passwd:string='';
if(typeof process.env.PASSWD!="undefined"){
  passwd = process.env.PASSWD;
}
const signer = new ethers.Wallet(passwd);
const account = signer.connect(provider);


// get price of tokenA compared with tokenB
async function pairinfo(tokenAAddress:string, tokenBAddress:string, account: Signer, swapName:string)
  :Promise<number>{
  const tokenAContract = new Contract(tokenAAddress, JSON.stringify(ERC20.abi), account);
  const tokenBContract = new Contract(tokenBAddress, JSON.stringify(ERC20.abi), account);
  const tokenAName:string = await tokenAContract.symbol();
  const tokenBName:string = await tokenBContract.symbol();
  const tokenAdecimals:number = await tokenAContract.decimals();
  const tokenBdecimals:number = await tokenBContract.decimals();
  let price0, price1;

  if(swapName==="SUSHI"){
    const tokenA = new SushiToken(ChainId.MAINNET, tokenAAddress, tokenAdecimals, tokenAName);
    const tokenB = new SushiToken(ChainId.MAINNET, tokenBAddress, tokenBdecimals, tokenBName);
    const pair = await SushiFetcher.fetchPairData(tokenA, tokenB);
    const route = new SushiRoute([pair], tokenA);
    price0 = route.midPrice.toSignificant(6);
    price1 = route.midPrice.invert().toSignificant(6);
    console.log(tokenAName, '=>', tokenBName, ' : ', price0);
    console.log(tokenAName,' : ', pair.reserveOf(tokenA).toSignificant(6), tokenBName, ' : ',
      pair.reserveOf(tokenB).toSignificant(6));
    const pairAddress = SushiPair.getAddress(tokenA, tokenB);
    const tokenAAmount = await tokenAContract.balanceOf(pairAddress);
    const tokenBAmount = await tokenBContract.balanceOf(pairAddress);
    console.log('sushi pair address: ', pairAddress, 'balanceA: ',
      tokenAAmount.toString(), 'balanceB: ', tokenBAmount.toString());
  }else{
    const tokenA = new Token(ChainId.MAINNET, tokenAAddress, tokenAdecimals, tokenAName);
    const tokenB = new Token(ChainId.MAINNET, tokenBAddress, tokenBdecimals, tokenBName);
    const pair = await Fetcher.fetchPairData(tokenA, tokenB);
    const route = new Route([pair], tokenA);
    price0 = route.midPrice.toSignificant(6);
    price1 = route.midPrice.invert().toSignificant(6);
    console.log(tokenAName, '=>', tokenBName, ' : ', price0);
    console.log(tokenAName,' : ', pair.reserveOf(tokenA).toSignificant(6), tokenBName, ' : ',
      pair.reserveOf(tokenB).toSignificant(6));

    const pairAddress = Pair.getAddress(tokenA, tokenB);
    const tokenAAmount = await tokenAContract.balanceOf(pairAddress);
    const tokenBAmount = await tokenBContract.balanceOf(pairAddress);
    console.log('uni pair address: ', pairAddress, 'balanceA: ',
      tokenAAmount.toString(), 'balanceB: ', tokenBAmount.toString());
  }
  const price_number:number = +price0;
  return price_number;
}

async function tokeninfo(tokenAddress:string){
  const token = await Fetcher.fetchTokenData(ChainId.MAINNET, tokenAddress);
}

async function getAllTokens(factoryV2: Contract, account: Signer){
  const allPairsLength = await factoryV2.allPairsLength();
  console.log(allPairsLength.toString());
  let tokenset = new Set<string>();

  for(let i: number=0; i<10; ++i){
    const pairAddress:string = await factoryV2.allPairs(i);
    console.log('pair address: ', pairAddress);
    const pair: Contract = new Contract(pairAddress,
      JSON.stringify(UniswapV2Pair.abi), account);
    tokenset.add(await pair.token0());
    tokenset.add(await pair.token1());
  }
  return Array.from(tokenset);
}


async function main(){
  // find arbitrage oppotunity
  // init all necessary addresses
  type AddressMap = {[index: string]: string};
  let address_map: AddressMap= {};
  address_map["UniswapV2Factory"] = FACTORY_ADDRESS;
  address_map["SushiswapFactory"] = SUSHI_FACTORY_ADDRESS;



  let uniswapFactoryV2: Contract = new Contract(
    address_map["UniswapV2Factory"], JSON.stringify(UniswapV2Factory.abi), account
  );
  let sushiFactoryV2: Contract = new Contract(
    address_map["UniswapV2Factory"], JSON.stringify(UniswapV2Factory.abi), account
  );

  // compare eth/dai between two swaps
  const price_sushi = await pairinfo(WETHAddress, MATICAddress, account, "SUSHI");
  const price_uni = await pairinfo(WETHAddress, MATICAddress, account, "UNI");
  // const price_dai = await pairinfo(DAIAddress, USDTAddress, account, "UNI");

  // arbitrage
  // A/B = DAI/ETH
  const [aToB, amountIn] = computeProfitMaximizingTrade(price_uni, 1, price_sushi, 1);
  console.log(aToB, amountIn);
  const income:number = estimateIncome(aToB, amountIn, [price_uni, 1], [price_sushi, 1]);
  console.log(income);

  // const allTokens = await getAllTokens(uniswapFactoryV2, account);

  // await pairinfo(WETH[ChainId.MAINNET].address, DAIAddress, account);
  // for(let i: number=0; i<allTokens.length; ++i){
  // pairinfo(allTokens[i], DAIAddress, account).then(console.log, console.error);
  // }

}


main();
