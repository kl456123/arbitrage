
import {Wallet, Contract, BigNumber} from 'ethers';


export function expandTo18Decimals(n: number): BigNumber {
  return BigNumber.from(n).mul(BigNumber.from(10).pow(18))
}



// when trade in a specific swap
export function computeProfitMaximizingTrade(
  truePriceTokenA: number,
  truePriceTokenB: number,
  reserveA: number,
  reserveB: number): [boolean, number]{
    const aToB: boolean = reserveA * truePriceTokenB/reserveB<truePriceTokenA;
    // if price of tokenA is higher in swap, trade a to b, otherwise trade reversely
    //
    const invariant = reserveA * reserveB;

    const rightSide: number = (aToB? reserveA*1000: reserveB*1000)/997;
    const leftSide: number = Math.sqrt(
      invariant * (aToB?truePriceTokenA: truePriceTokenB)
      /(aToB? truePriceTokenB:  truePriceTokenA)
    ) * 1000/ 997;

    if(leftSide<rightSide){
      // when no profit
      return [false, 0];
    }

    const amountIn:number = leftSide-rightSide;

    return [aToB, amountIn];
  }


// when flash swap between two DEX
export function computeProfitMaximizingSwap(reserveA1: number,
  reserveB1: number, reserveA2: number, reserveB2: number){
}

export function getAmountIn(amountOut:number, reserveIn: number, reserveOut: number): number{
  // require(amountOut > 0, 'UniswapV2Library: INSUFFICIENT_OUTPUT_AMOUNT');
  // require(reserveIn > 0 && reserveOut > 0, 'UniswapV2Library: INSUFFICIENT_LIQUIDITY');
  const numerator:number = reserveIn*amountOut*1000;
  const denominator:number = (reserveOut-amountOut)*997;
  const amountIn = (numerator / denominator);
  return amountIn;
}


// modified from uniswap solidity code
export function getAmountOut(amountIn:number, reserveIn:number, reserveOut:number):number {
  // require(amountIn > 0, 'UniswapV2Library: INSUFFICIENT_INPUT_AMOUNT');
  // require(reserveIn > 0 && reserveOut > 0, 'UniswapV2Library: INSUFFICIENT_LIQUIDITY');
  const amountInWithFee:number = amountIn*997;
  const numerator:number = amountInWithFee*reserveOut;
  const denominator:number = (reserveIn*1000)+amountInWithFee;
  const amountOut:number = numerator / denominator;
  return amountOut;
}

type SwapReservePair = [number, number];// [A, B]
// loan in swap1 and arbitrage in swap2
// force to consider b as ETH or WETH, so return amount of eth
export function estimateIncome(aToB: boolean, amountIn: number,
  swapReserve1:SwapReservePair, swapReserve2:SwapReservePair):number{
  let amountReceived:number;
  let amountRequired:number;
  if(aToB){
    amountReceived = getAmountOut(amountIn, swapReserve2[0], swapReserve2[1]);
    amountRequired = getAmountIn(amountIn, swapReserve1[1], swapReserve1[0]);
    return Math.max(amountReceived - amountRequired, 0);
  }else{
    amountReceived = getAmountOut(amountIn, swapReserve2[1], swapReserve2[0]);
    amountRequired = getAmountIn(amountIn, swapReserve1[0], swapReserve1[1]);
    // use swapReserve1 to get true price
    return Math.max(amountReceived - amountRequired, 0)*swapReserve1[1]/swapReserve1[0];
  }
}

export function estimateGas(){
}
