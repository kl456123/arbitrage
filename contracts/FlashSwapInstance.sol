pragma solidity =0.6.6;

import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Callee.sol';
import '@uniswap/v2-periphery/contracts/interfaces/V1/IUniswapV1Factory.sol';
import '@uniswap/v2-periphery/contracts/interfaces/V1/IUniswapV1Exchange.sol';
import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router01.sol';
import '@uniswap/v2-periphery/contracts/interfaces/IWETH.sol';
import '@uniswap/v2-periphery/contracts/interfaces/IERC20.sol';
import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol';
import '@uniswap/v2-periphery/contracts/libraries/UniswapV2Library.sol';


contract FlashSwapInstance is IUniswapV2Callee {
  IUniswapV1Factory immutable factoryV1;
  address immutable factory;
  IWETH immutable WETH;

  constructor(address factoryAddressV2, address factoryAddressV1, address router) public{
    factoryV1 = IUniswapV1Factory(factoryAddressV1);
    factory = factoryAddressV2;
    WETH = IWETH(IUniswapV2Router01(router).WETH());
  }

  receive() external payable {}
  event Log(uint, uint);

  function uniswapV2Call(address sender, uint amount0, uint amount1, bytes calldata data) external override {
    address token0 = IUniswapV2Pair(msg.sender).token0();
    address token1 = IUniswapV2Pair(msg.sender).token1();

    address[] memory path = new address[](2);
    assert(amount0==0|| amount1==0);
    path[0] = amount0==0? token0 : token1;
    path[1] = amount0==0? token1: token0;
    uint amountToken = token0==address(WETH)? amount1: amount0;
    uint amountETH = token0==address(WETH)? amount0: amount1;

    // get exchange in uniswapv1
    // wethpartner token
    IERC20 token = IERC20(token0==address(WETH)?token1: token0);
    IUniswapV1Exchange exchangeV1 = IUniswapV1Exchange(factoryV1.getExchange(address(token)));

    // decode data

    if(amountToken>0){
      (uint minETH) = abi.decode(data, (uint)); // slippage parameter for V1, passed in by caller
      // use token loan to swap eth in uniswapv1 and repay back to uniswapv2 using weth
      token.approve(address(exchangeV1), amountToken);
      // get eth from uniswapv1
      uint amountReceived = exchangeV1.tokenToEthSwapInput(amountToken, minETH, uint(-1));
      uint amountRequired = UniswapV2Library.getAmountsIn(factory, amountToken, path)[0];
      emit Log(amountReceived, amountRequired);
      assert(amountReceived>amountRequired);// has profit
      // mint weth and payback to uniswapv2
      WETH.deposit{value:amountRequired}();
      WETH.transfer(msg.sender, amountRequired);// msg.sender will be token pair of uniswapv2
      // keep profit in wallet
      (bool success,) = sender.call{value: amountReceived-amountRequired}(new bytes(0));
      assert(success);
    }else{
      // use weth loan instead
    }
  }
}
