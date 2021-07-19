import {expect, use} from 'chai';
import {computeProfitMaximizingTrade, expandTo18Decimals, estimateIncome, getAmountIn} from '../src/utils';

describe('utilTest', ()=>{
  it('computeProfitMaximizingTradeTest: no profit',()=>{
    const [aToB, amountIn] = computeProfitMaximizingTrade(2077.57, 1, 2077.65, 1);
    expect(aToB).to.be.false;
  });

  it('computeProfitMaximizingTradeTest: profit',()=>{
    const [aToB, amountIn] = computeProfitMaximizingTrade(2000, 1, 1000, 1);
    expect(aToB).to.be.true;
  });

  it('estimateIncomeTest: no profit, false',()=>{
    const amountIn = 0.000019311009913813848;
    const aToB = false;
    const income:number = estimateIncome(aToB, amountIn, [2077.57, 1], [2077.65, 1]);
    // no profits
    expect(income).to.be.eq(0);
  });

  it('estimateIncomeTest: no profit, true',()=>{
    const amountIn = 1.1932402341835768;
    const aToB = true;
    const income:number = estimateIncome(aToB, amountIn, [2086.84, 1], [2084.46, 1]);
    // no profits
    expect(income).to.be.eq(0);
  });

  it('estimateIncomeTest: profit, true',()=>{
    const [aToB, amountIn] = computeProfitMaximizingTrade(2000, 10, 1000, 10);
    const income:number = estimateIncome(aToB, amountIn, [2000, 10], [1000, 10]);
    // no profits
    expect(income).to.be.gt(0);
  });

  it('estimateIncomeTest: profit, false',()=>{
    const [aToB, amountIn] = computeProfitMaximizingTrade(1000, 10, 2000, 10);
    const income:number = estimateIncome(aToB, amountIn, [1000, 10], [2000, 10]);
    // no profits
    // expect(income).to.be.gt(0);
  });
  it('getAmountIn', ()=>{
    getAmountIn(415.4599, 10, 2000);
  });
});
