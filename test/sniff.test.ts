///////////////////////////////
// find oppotunity to arbitrage
///////////////////////////////
import {expect, use} from 'chai';
import {MockProvider, deployContract, solidity, createFixtureLoader} from 'ethereum-waffle';
import {Wallet, Contract, BigNumber, constants, utils} from 'ethers';
import {v2Fixture} from './shared/fixtures';
import {computeProfitMaximizingTrade, expandTo18Decimals} from '../src/utils';
import FlashSwapInstance from '../build/FlashSwapInstance.json';

use(solidity);

const overrides = {
  gasLimit: 9999999,
  gasPrice: 0
};


describe('Fixtures', ()=>{
  let WETH: Contract;
  let WETHPartner: Contract;
  let WETHPair: Contract;
  let WETHExchangeV1: Contract;
  let flashSwapInstance: Contract;
  let factoryV2: Contract;

  const provider = new MockProvider({
    ganacheOptions:{
      gasLimit: 9999999
    }
  });
  const [wallet] = provider.getWallets();
  const loadFixture = createFixtureLoader([wallet], provider);

  beforeEach(async function(){
    const fixture = await loadFixture(v2Fixture);
    WETH = fixture.WETH;
    WETHPartner = fixture.WETHPartner;
    WETHExchangeV1 = fixture.WETHExchangeV1;
    WETHPair = fixture.WETHPair;
    flashSwapInstance = await deployContract(
      wallet,
      FlashSwapInstance,
      [fixture.factoryV2.address, fixture.factoryV1.address, fixture.router01.address],
      overrides
    );
    factoryV2 = fixture.factoryV2;
  });

  it('uniswapV2Call:1', async()=>{
    // init uniswap pools, add liquidity to uniswapv1 and uniswapv2
    // uniswapv1
    const WETHPartnerAmountV1 = expandTo18Decimals(1000);
    const ETHAmountV1 = expandTo18Decimals(10);
    await WETHPartner.approve(WETHExchangeV1.address, WETHPartnerAmountV1);
    await WETHExchangeV1.addLiquidity(BigNumber.from(1), WETHPartnerAmountV1, constants.MaxUint256,
      {...overrides, value: ETHAmountV1}
    );

    // uniswapv2
    const WETHPartnerAmountV2 = expandTo18Decimals(2000);
    const ETHAmountV2 = expandTo18Decimals(10);
    await WETHPartner.transfer(WETHPair.address, WETHPartnerAmountV2);
    // when depositing eth, weth will be sended to wallet
    await WETH.deposit({value: ETHAmountV2});
    await WETH.transfer(WETHPair.address, ETHAmountV2);
    // get lp for reserves
    await WETHPair.mint(wallet.address, overrides);
    // easy way: await router02.addLiquidity();

    const balanceBefore = await provider.getBalance(wallet.address);

    // flash swap in uniswapv2 and make arbitrage in uniswapv1, repay back to uniswapv2 finally
    // calculate max arbitrage amount
    const [aToB, amountIn] = computeProfitMaximizingTrade(2000, 10, 1000, 10);
    let amount0: BigNumber;
    let amount1: BigNumber;
    // the order is the same as pair tokens
    const WETHPairToken0 = await WETHPair.token0()
    if(aToB){
      const arbitrageAmount = expandTo18Decimals(Math.round(amountIn));
      amount0 = WETHPairToken0 === WETHPartner.address ? arbitrageAmount : BigNumber.from(0);
      amount1 = WETHPairToken0 === WETHPartner.address ? BigNumber.from(0) : arbitrageAmount;
    }else{
      const arbitrageAmount = expandTo18Decimals(Math.round(amountIn));
      amount0 = WETHPairToken0 === WETH.address ? arbitrageAmount : BigNumber.from(0);
      amount1 = WETHPairToken0 === WETH.address ? BigNumber.from(0) : arbitrageAmount;
    }

    // amount0 and amount1 means loan amount for specific token
    // loan token to swap and payback with weth
    //
    const gasLimit:BigNumber = await WETHPair.estimateGas.swap(
      amount0,
      amount1,
      flashSwapInstance.address,
      utils.defaultAbiCoder.encode(['uint'], [BigNumber.from(1)]),
      overrides
    );
    const gasPrice:BigNumber = await provider.getGasPrice();
    const cost:BigNumber = gasPrice.mul(gasLimit);
    console.log(utils.formatEther(cost));
    await WETHPair.swap(
      amount0,
      amount1,
      flashSwapInstance.address,
      utils.defaultAbiCoder.encode(['uint'], [BigNumber.from(1)]),
      overrides
    );
    // flashSwapInstance.once('Log',
      // function(amountReceived:BigNumber, amountRequired:BigNumber){
        // console.log(utils.formatEther(amountReceived), utils.formatEther(amountRequired));
    // });

    // check profits
    const balanceAfter = await provider.getBalance(wallet.address);
    const profit = balanceAfter.sub(balanceBefore);
    console.log(utils.formatEther(profit));
    console.log(utils.formatEther(await provider.getBalance(flashSwapInstance.address)));
  });

  it('factoryv2', async()=>{
    const allPairsLength = await factoryV2.allPairsLength();
    for(let i: number=0; i<allPairsLength; ++i){
      const pair:string = await factoryV2.allPairs(i);
      console.log(pair);
    }
  });
});
