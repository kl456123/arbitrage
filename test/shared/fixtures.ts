// load aave and uniswap contract instance
// load aave flashloan and uniswap flashswap to arbitrage

import {Wallet, Contract, BigNumber} from 'ethers';
import {Web3Provider} from '@ethersproject/providers';
import {deployContract} from 'ethereum-waffle';
import {expandTo18Decimals} from '../../src/utils';

// uniswap contracts
import UniswapV2Factory from '@uniswap/v2-core/build/UniswapV2Factory.json';
import UniswapV1Factory from '@uniswap/v2-periphery/build/UniswapV1Factory.json';
import UniswapV1Exchange from '@uniswap/v2-periphery/build/UniswapV1Exchange.json';
import IUniswapV2Pair from '@uniswap/v2-core/build/IUniswapV2Pair.json';
import UniswapV2Router02 from '@uniswap/v2-periphery/build/UniswapV2Router02.json';
import UniswapV2Router01 from '@uniswap/v2-periphery/build/UniswapV2Router01.json';
import WETH9 from '@uniswap/v2-periphery/build/WETH9.json';
import ERC20 from '@uniswap/v2-periphery/build/ERC20.json';
import ILendingPool from "@aave/protocol-v2/artifacts/contracts/interfaces/ILendingPool.sol/ILendingPool.json";


// aave contracts
// import DemoFlashLoanReceiver from '../build/FlashLoanReceiver.json';
//
interface V2Fixture{
  // uniswap contracts
  WETH: Contract
  WETHPartner: Contract
  factoryV1: Contract
  factoryV2: Contract
  router01: Contract
  router02: Contract
  WETHExchangeV1: Contract
  WETHPair: Contract


  // aave contracts
  flashloan?: Contract
  lendingPoolInstance?: Contract
};

const overrides = {
  gasLimit: 9999999
};



export async function v2Fixture([wallet]: Wallet[], provider: Web3Provider): Promise<V2Fixture>{
  // create uniswap instance with weth and dai token swap pool
  const WETH = await deployContract(wallet, WETH9);
  const WETHPartner = await deployContract(wallet, ERC20, [expandTo18Decimals(10000)]);

  // deploy V1
  const factoryV1 = await deployContract(wallet, UniswapV1Factory, [])
  await factoryV1.initializeFactory((await deployContract(wallet, UniswapV1Exchange, [])).address)

  // deploy V1
  const factoryV2 = await deployContract(wallet, UniswapV2Factory, [wallet.address]);

  const router01 = await deployContract(wallet, UniswapV2Router01, [factoryV2.address, WETH.address], overrides)
  const router02 = await deployContract(wallet, UniswapV2Router02, [factoryV2.address, WETH.address], overrides);

  // create swap pool
  await factoryV2.createPair(WETH.address, WETHPartner.address);
  const WETHPairAddress = factoryV2.getPair(WETH.address, WETHPartner.address);
  const WETHPair = new Contract(WETHPairAddress, JSON.stringify(IUniswapV2Pair.abi), provider).connect(wallet);

  // initialize V1
  await factoryV1.createExchange(WETHPartner.address, overrides);
  const WETHExchangeV1Address = await factoryV1.getExchange(WETHPartner.address)
  const WETHExchangeV1 = new Contract(WETHExchangeV1Address, JSON.stringify(UniswapV1Exchange.abi), provider).connect(
    wallet
  )

  // aave contracts
  // const demoFlashLoanReceiver = deployContract(wallet, DemoFlashLoanReceiver, [], overrides);

  // const lendingPoolInstance = deployContract(wallet, );

  return {
    WETH,
    WETHPartner,
    factoryV1,
    factoryV2,
    router01,
    router02,
    WETHExchangeV1,
    WETHPair,
    // wallet,
    // demoFlashLoanReceiver,
    // lendingPoolInstance
  };
}
