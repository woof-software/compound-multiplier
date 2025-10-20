**THIS CHECKLIST IS NOT COMPLETE**. Use `--show-ignored-findings` to show all the results.
Summary

- [controlled-delegatecall](#controlled-delegatecall) (1 results) (High)
- [uninitialized-local](#uninitialized-local) (1 results) (Medium)
- [missing-zero-check](#missing-zero-check) (2 results) (Low)
- [calls-loop](#calls-loop) (4 results) (Low)
- [reentrancy-events](#reentrancy-events) (6 results) (Low)
- [assembly](#assembly) (17 results) (Informational)
- [low-level-calls](#low-level-calls) (7 results) (Informational)

## controlled-delegatecall

Impact: High
Confidence: Medium

- [ ] ID-0
      [CometFoundation.\_loan(address,ICometStructs.CallbackData)](contracts/CometFoundation.sol#L493-L503) uses delegatecall to a input-controlled function id - [(ok,None) = loanPlugin.delegatecall(abi.encodeWithSelector(ICometFlashLoanPlugin.takeFlashLoan.selector,data,\_config(loanPlugin,ICometFlashLoanPlugin.CALLBACK_SELECTOR.selector)))](contracts/CometFoundation.sol#L495-L501)

contracts/CometFoundation.sol#L493-L503

## uninitialized-local

Impact: Medium
Confidence: Medium

- [ ] ID-1
      [CometFoundation.constructor(ICometStructs.Plugin[],address).pluginSelector](contracts/CometFoundation.sol#L144) is a local variable never initialized

contracts/CometFoundation.sol#L144

## missing-zero-check

Impact: Low
Confidence: Medium

- [ ] ID-2
      [OneInchV6SwapPlugin.swap(address,address,uint256,bytes,bytes).router](contracts/plugins/swap/OneInchV6Plugin.sol#L43) lacks a zero-check on : - [(ok,None) = router.call(swapData)](contracts/plugins/swap/OneInchV6Plugin.sol#L48)

contracts/plugins/swap/OneInchV6Plugin.sol#L43

- [ ] ID-3
      [LiFiPlugin.swap(address,address,uint256,bytes,bytes).router](contracts/plugins/swap/LiFiPlugin.sol#L44) lacks a zero-check on : - [(ok,None) = router.call(swapData)](contracts/plugins/swap/LiFiPlugin.sol#L49)

contracts/plugins/swap/LiFiPlugin.sol#L44

## calls-loop

Impact: Low
Confidence: Medium

- [ ] ID-4
      [CometFoundation.constructor(ICometStructs.Plugin[],address)](contracts/CometFoundation.sol#L143-L170) has external calls inside a loop: [IERC165(plugin.endpoint).supportsInterface(type()(ICometSwapPlugin).interfaceId)](contracts/CometFoundation.sol#L152)

contracts/CometFoundation.sol#L143-L170

- [ ] ID-5
      [CometFoundation.constructor(ICometStructs.Plugin[],address)](contracts/CometFoundation.sol#L143-L170) has external calls inside a loop: [pluginSelector = ICometSwapPlugin(plugin.endpoint).SWAP_SELECTOR()](contracts/CometFoundation.sol#L154)

contracts/CometFoundation.sol#L143-L170

- [ ] ID-6
      [CometFoundation.constructor(ICometStructs.Plugin[],address)](contracts/CometFoundation.sol#L143-L170) has external calls inside a loop: [IERC165(plugin.endpoint).supportsInterface(type()(ICometFlashLoanPlugin).interfaceId)](contracts/CometFoundation.sol#L149)

contracts/CometFoundation.sol#L143-L170

- [ ] ID-7
      [CometFoundation.constructor(ICometStructs.Plugin[],address)](contracts/CometFoundation.sol#L143-L170) has external calls inside a loop: [pluginSelector = ICometFlashLoanPlugin(plugin.endpoint).CALLBACK_SELECTOR()](contracts/CometFoundation.sol#L151)

contracts/CometFoundation.sol#L143-L170

## reentrancy-events

Impact: Low
Confidence: Medium

- [ ] ID-8
      Reentrancy in [CometFoundation.\_process(IComet,address,ICometStructs.ProcessParams,ICometStructs.CallbackData,address,address,ICometStructs.Mode)](contracts/CometFoundation.sol#L406-L453):
      External calls: - [amountOut = \_swap(swapPlugin,data.asset,params.supplyAsset,data.debt,data.swapData)](contracts/CometFoundation.sol#L419) - [(ok,data) = address(swapPlugin).delegatecall(abi.encodeWithSelector(ICometSwapPlugin.swap.selector,srcToken,dstToken,amount,\_config(swapPlugin,ICometSwapPlugin.SWAP_SELECTOR.selector),swapData))](contracts/CometFoundation.sol#L472-L481) - [comet.supplyTo(user,params.supplyAsset,params.supplyAmount)](contracts/CometFoundation.sol#L431) - [comet.withdrawFrom(user,address(this),params.withdrawAsset,params.withdrawAmount)](contracts/CometFoundation.sol#L432) - [amountOut = \_swap(swapPlugin,params.withdrawAsset,data.asset,params.withdrawAmount,data.swapData)](contracts/CometFoundation.sol#L435) - [(ok,data) = address(swapPlugin).delegatecall(abi.encodeWithSelector(ICometSwapPlugin.swap.selector,srcToken,dstToken,amount,\_config(swapPlugin,ICometSwapPlugin.SWAP_SELECTOR.selector),swapData))](contracts/CometFoundation.sol#L472-L481) - [\_dust(user,data.asset,comet,amountOut - repaymentAmount)](contracts/CometFoundation.sol#L440) - [comet.supplyTo(user,asset,amount)](contracts/CometFoundation.sol#L537)
      Event emitted after the call(s): - [ICometEvents.Covered(user,address(comet),address(params.withdrawAsset),params.withdrawAmount,amountOut - (data.debt + data.fee))](contracts/CometFoundation.sol#L443-L449)

contracts/CometFoundation.sol#L406-L453

- [ ] ID-9
      Reentrancy in [LiFiPlugin.swap(address,address,uint256,bytes,bytes)](contracts/plugins/swap/LiFiPlugin.sol#L30-L62):
      External calls: - [(ok,None) = router.call(swapData)](contracts/plugins/swap/LiFiPlugin.sol#L49)
      Event emitted after the call(s): - [ICometEvents.Swap(router,srcToken,dstToken,amountOut)](contracts/plugins/swap/LiFiPlugin.sol#L61)

contracts/plugins/swap/LiFiPlugin.sol#L30-L62

- [ ] ID-10
      Reentrancy in [CometFoundation.\_process(IComet,address,ICometStructs.ProcessParams,ICometStructs.CallbackData,address,address,ICometStructs.Mode)](contracts/CometFoundation.sol#L406-L453):
      External calls: - [amountOut = \_swap(swapPlugin,data.asset,params.supplyAsset,data.debt,data.swapData)](contracts/CometFoundation.sol#L419) - [(ok,data) = address(swapPlugin).delegatecall(abi.encodeWithSelector(ICometSwapPlugin.swap.selector,srcToken,dstToken,amount,\_config(swapPlugin,ICometSwapPlugin.SWAP_SELECTOR.selector),swapData))](contracts/CometFoundation.sol#L472-L481)
      Event emitted after the call(s): - [ICometEvents.Multiplied(user,address(comet),address(params.supplyAsset),params.supplyAmount + amountOut,data.debt)](contracts/CometFoundation.sol#L421-L427)

contracts/CometFoundation.sol#L406-L453

- [ ] ID-11
      Reentrancy in [CometFoundation.fallback()](contracts/CometFoundation.sol#L75-L121):
      External calls: - [(ok,payload) = loanPlugin.delegatecall(msg.data)](contracts/CometFoundation.sol#L89) - [\_process(comet,user,params,data,loanPlugin,swapPlugin,mode)](contracts/CometFoundation.sol#L115) - [(ok,None) = loanPlugin.delegatecall(abi.encodeWithSelector(ICometFlashLoanPlugin.repayFlashLoan.selector,flp,baseAsset,amount))](contracts/CometFoundation.sol#L514-L516) - [(ok,data) = address(swapPlugin).delegatecall(abi.encodeWithSelector(ICometSwapPlugin.swap.selector,srcToken,dstToken,amount,\_config(swapPlugin,ICometSwapPlugin.SWAP_SELECTOR.selector),swapData))](contracts/CometFoundation.sol#L472-L481) - [comet.supplyTo(user,asset,amount)](contracts/CometFoundation.sol#L537) - [comet.supplyTo(user,params.supplyAsset,params.supplyAmount)](contracts/CometFoundation.sol#L431) - [comet.withdrawFrom(user,address(this),params.withdrawAsset,params.withdrawAmount)](contracts/CometFoundation.sol#L432)
      Event emitted after the call(s): - [ICometEvents.Covered(user,address(comet),address(params.withdrawAsset),params.withdrawAmount,amountOut - (data.debt + data.fee))](contracts/CometFoundation.sol#L443-L449) - [\_process(comet,user,params,data,loanPlugin,swapPlugin,mode)](contracts/CometFoundation.sol#L115) - [ICometEvents.Multiplied(user,address(comet),address(params.supplyAsset),params.supplyAmount + amountOut,data.debt)](contracts/CometFoundation.sol#L421-L427) - [\_process(comet,user,params,data,loanPlugin,swapPlugin,mode)](contracts/CometFoundation.sol#L115)

contracts/CometFoundation.sol#L75-L121

- [ ] ID-12
      Reentrancy in [OneInchV6SwapPlugin.swap(address,address,uint256,bytes,bytes)](contracts/plugins/swap/OneInchV6Plugin.sol#L29-L61):
      External calls: - [(ok,None) = router.call(swapData)](contracts/plugins/swap/OneInchV6Plugin.sol#L48)
      Event emitted after the call(s): - [ICometEvents.Swap(router,srcToken,dstToken,amountOut)](contracts/plugins/swap/OneInchV6Plugin.sol#L60)

contracts/plugins/swap/OneInchV6Plugin.sol#L29-L61

- [ ] ID-13
      Reentrancy in [WstEthPlugin.\_lidoSwap(address,address,address,uint256,uint256)](contracts/plugins/swap/WstEthPlugin.sol#L55-L70):
      External calls: - [IWEth(wEth).withdraw(amountIn)](contracts/plugins/swap/WstEthPlugin.sol#L63) - [stAmount = IStEth(stEth).submit{value: amountIn}(address(this))](contracts/plugins/swap/WstEthPlugin.sol#L64) - [require(bool,error)(IWstEth(wstEth).wrap(stAmount) > 0,ICometAlerts.InvalidAmountOut())](contracts/plugins/swap/WstEthPlugin.sol#L66)
      External calls sending eth: - [stAmount = IStEth(stEth).submit{value: amountIn}(address(this))](contracts/plugins/swap/WstEthPlugin.sol#L64)
      Event emitted after the call(s): - [ICometEvents.Swap(wstEth,wEth,wstEth,amountOut)](contracts/plugins/swap/WstEthPlugin.sol#L69)

contracts/plugins/swap/WstEthPlugin.sol#L55-L70

## assembly

Impact: Informational
Confidence: High

- [ ] ID-14
      [BalancerPlugin.takeFlashLoan(ICometStructs.CallbackData,bytes)](contracts/plugins/flashloan/BalancerPlugin.sol#L29-L44) uses assembly - [INLINE ASM](contracts/plugins/flashloan/BalancerPlugin.sol#L34-L36)

contracts/plugins/flashloan/BalancerPlugin.sol#L29-L44

- [ ] ID-15
      [MorphoPlugin.takeFlashLoan(ICometStructs.CallbackData,bytes)](contracts/plugins/flashloan/MorphoPlugin.sol#L31-L38) uses assembly - [INLINE ASM](contracts/plugins/flashloan/MorphoPlugin.sol#L34-L36)

contracts/plugins/flashloan/MorphoPlugin.sol#L31-L38

- [ ] ID-16
      [MorphoPlugin.onMorphoFlashLoan(uint256,bytes)](contracts/plugins/flashloan/MorphoPlugin.sol#L53-L64) uses assembly - [INLINE ASM](contracts/plugins/flashloan/MorphoPlugin.sol#L56-L59)

contracts/plugins/flashloan/MorphoPlugin.sol#L53-L64

- [ ] ID-17
      [UniswapV3Plugin.uniswapV3FlashCallback(uint256,uint256,bytes)](contracts/plugins/flashloan/UniswapV3Plugin.sol#L93-L122) uses assembly - [INLINE ASM](contracts/plugins/flashloan/UniswapV3Plugin.sol#L102-L105)

contracts/plugins/flashloan/UniswapV3Plugin.sol#L93-L122

- [ ] ID-18
      [AAVEPlugin.takeFlashLoan(ICometStructs.CallbackData,bytes)](contracts/plugins/flashloan/AAVEPlugin.sol#L33-L43) uses assembly - [INLINE ASM](contracts/plugins/flashloan/AAVEPlugin.sol#L38-L40)

contracts/plugins/flashloan/AAVEPlugin.sol#L33-L43

- [ ] ID-19
      [UniswapV3Plugin.takeFlashLoan(ICometStructs.CallbackData,bytes)](contracts/plugins/flashloan/UniswapV3Plugin.sol#L33-L57) uses assembly - [INLINE ASM](contracts/plugins/flashloan/UniswapV3Plugin.sol#L43-L45)

contracts/plugins/flashloan/UniswapV3Plugin.sol#L33-L57

- [ ] ID-20
      [EulerV2Plugin.onFlashLoan(bytes)](contracts/plugins/flashloan/EulerV2Plugin.sol#L55-L68) uses assembly - [INLINE ASM](contracts/plugins/flashloan/EulerV2Plugin.sol#L58-L61)

contracts/plugins/flashloan/EulerV2Plugin.sol#L55-L68

- [ ] ID-21
      [EulerV2Plugin.takeFlashLoan(ICometStructs.CallbackData,bytes)](contracts/plugins/flashloan/EulerV2Plugin.sol#L32-L40) uses assembly - [INLINE ASM](contracts/plugins/flashloan/EulerV2Plugin.sol#L36-L38)

contracts/plugins/flashloan/EulerV2Plugin.sol#L32-L40

- [ ] ID-22
      [OneInchV6SwapPlugin.swap(address,address,uint256,bytes,bytes)](contracts/plugins/swap/OneInchV6Plugin.sol#L29-L61) uses assembly - [INLINE ASM](contracts/plugins/swap/OneInchV6Plugin.sol#L50-L54)

contracts/plugins/swap/OneInchV6Plugin.sol#L29-L61

- [ ] ID-23
      [CometFoundation.\_catch(bool)](contracts/CometFoundation.sol#L677-L685) uses assembly - [INLINE ASM](contracts/CometFoundation.sol#L679-L683)

contracts/CometFoundation.sol#L677-L685

- [ ] ID-24
      [BalancerPlugin.receiveFlashLoan(IERC20[],uint256[],uint256[],bytes)](contracts/plugins/flashloan/BalancerPlugin.sol#L53-L75) uses assembly - [INLINE ASM](contracts/plugins/flashloan/BalancerPlugin.sol#L61-L64)

contracts/plugins/flashloan/BalancerPlugin.sol#L53-L75

- [ ] ID-25
      [CometFoundation.fallback()](contracts/CometFoundation.sol#L75-L121) uses assembly - [INLINE ASM](contracts/CometFoundation.sol#L117-L120)

contracts/CometFoundation.sol#L75-L121

- [ ] ID-26
      [LiFiPlugin.swap(address,address,uint256,bytes,bytes)](contracts/plugins/swap/LiFiPlugin.sol#L30-L62) uses assembly - [INLINE ASM](contracts/plugins/swap/LiFiPlugin.sol#L51-L55)

contracts/plugins/swap/LiFiPlugin.sol#L30-L62

- [ ] ID-27
      [AAVEPlugin.executeOperation(address,uint256,uint256,address,bytes)](contracts/plugins/flashloan/AAVEPlugin.sol#L53-L80) uses assembly - [INLINE ASM](contracts/plugins/flashloan/AAVEPlugin.sol#L62-L65)

contracts/plugins/flashloan/AAVEPlugin.sol#L53-L80

- [ ] ID-28
      [CometFoundation.\_config(address,bytes4)](contracts/CometFoundation.sol#L651-L670) uses assembly - [INLINE ASM](contracts/CometFoundation.sol#L657-L659) - [INLINE ASM](contracts/CometFoundation.sol#L665-L669)

contracts/CometFoundation.sol#L651-L670

- [ ] ID-29
      [CometFoundation.\_tload()](contracts/CometFoundation.sol#L733-L765) uses assembly - [INLINE ASM](contracts/CometFoundation.sol#L747-L764)

contracts/CometFoundation.sol#L733-L765

- [ ] ID-30
      [CometFoundation.\_tstore(uint256,address,address,IComet,IERC20,uint256,address,ICometStructs.Mode)](contracts/CometFoundation.sol#L698-L719) uses assembly - [INLINE ASM](contracts/CometFoundation.sol#L709-L718)

contracts/CometFoundation.sol#L698-L719

## low-level-calls

Impact: Informational
Confidence: High

- [ ] ID-31
      Low level call in [OneInchV6SwapPlugin.swap(address,address,uint256,bytes,bytes)](contracts/plugins/swap/OneInchV6Plugin.sol#L29-L61): - [(ok,None) = router.call(swapData)](contracts/plugins/swap/OneInchV6Plugin.sol#L48)

contracts/plugins/swap/OneInchV6Plugin.sol#L29-L61

- [ ] ID-32
      Low level call in [CometFoundation.\_config(address,bytes4)](contracts/CometFoundation.sol#L651-L670): - [(ok,data) = plugin.staticcall(abi.encodeWithSelector(selector))](contracts/CometFoundation.sol#L652)

contracts/CometFoundation.sol#L651-L670

- [ ] ID-33
      Low level call in [LiFiPlugin.swap(address,address,uint256,bytes,bytes)](contracts/plugins/swap/LiFiPlugin.sol#L30-L62): - [(ok,None) = router.call(swapData)](contracts/plugins/swap/LiFiPlugin.sol#L49)

contracts/plugins/swap/LiFiPlugin.sol#L30-L62

- [ ] ID-34
      Low level call in [CometFoundation.\_swap(address,IERC20,IERC20,uint256,bytes)](contracts/CometFoundation.sol#L464-L485): - [(ok,data) = address(swapPlugin).delegatecall(abi.encodeWithSelector(ICometSwapPlugin.swap.selector,srcToken,dstToken,amount,\_config(swapPlugin,ICometSwapPlugin.SWAP_SELECTOR.selector),swapData))](contracts/CometFoundation.sol#L472-L481)

contracts/CometFoundation.sol#L464-L485

- [ ] ID-35
      Low level call in [CometFoundation.fallback()](contracts/CometFoundation.sol#L75-L121): - [(ok,payload) = loanPlugin.delegatecall(msg.data)](contracts/CometFoundation.sol#L89)

contracts/CometFoundation.sol#L75-L121

- [ ] ID-36
      Low level call in [CometFoundation.\_repay(address,address,IERC20,uint256)](contracts/CometFoundation.sol#L512-L518): - [(ok,None) = loanPlugin.delegatecall(abi.encodeWithSelector(ICometFlashLoanPlugin.repayFlashLoan.selector,flp,baseAsset,amount))](contracts/CometFoundation.sol#L514-L516)

contracts/CometFoundation.sol#L512-L518

- [ ] ID-37
      Low level call in [CometFoundation.\_loan(address,ICometStructs.CallbackData)](contracts/CometFoundation.sol#L493-L503): - [(ok,None) = loanPlugin.delegatecall(abi.encodeWithSelector(ICometFlashLoanPlugin.takeFlashLoan.selector,data,\_config(loanPlugin,ICometFlashLoanPlugin.CALLBACK_SELECTOR.selector)))](contracts/CometFoundation.sol#L495-L501)

contracts/CometFoundation.sol#L493-L503

---

'forge clean' running (wd: /home/martik/Work/woof/compound-multiplier)
'forge config --json' running
'forge build --build-info --skip _/test/\*\* _/script/\*\* --force' running (wd: /home/martik/Work/woof/compound-multiplier)
INFO:Detectors:
CometFoundation.\_loan(address,ICometStructs.CallbackData) (contracts/CometFoundation.sol#493-503) uses delegatecall to a input-controlled function id - (ok,None) = loanPlugin.delegatecall(abi.encodeWithSelector(ICometFlashLoanPlugin.takeFlashLoan.selector,data,\_config(loanPlugin,ICometFlashLoanPlugin.CALLBACK_SELECTOR.selector))) (contracts/CometFoundation.sol#495-501)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#controlled-delegatecall
INFO:Detectors:
CometFoundation.constructor(ICometStructs.Plugin[],address).pluginSelector (contracts/CometFoundation.sol#144) is a local variable never initialized
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#uninitialized-local-variables
INFO:Detectors:
LiFiPlugin.swap(address,address,uint256,bytes,bytes).router (contracts/plugins/swap/LiFiPlugin.sol#44) lacks a zero-check on : - (ok,None) = router.call(swapData) (contracts/plugins/swap/LiFiPlugin.sol#49)
OneInchV6SwapPlugin.swap(address,address,uint256,bytes,bytes).router (contracts/plugins/swap/OneInchV6Plugin.sol#43) lacks a zero-check on : - (ok,None) = router.call(swapData) (contracts/plugins/swap/OneInchV6Plugin.sol#48)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#missing-zero-address-validation
INFO:Detectors:
CometFoundation.constructor(ICometStructs.Plugin[],address) (contracts/CometFoundation.sol#143-170) has external calls inside a loop: IERC165(plugin.endpoint).supportsInterface(type()(ICometFlashLoanPlugin).interfaceId) (contracts/CometFoundation.sol#149)
CometFoundation.constructor(ICometStructs.Plugin[],address) (contracts/CometFoundation.sol#143-170) has external calls inside a loop: pluginSelector = ICometFlashLoanPlugin(plugin.endpoint).CALLBACK_SELECTOR() (contracts/CometFoundation.sol#151)
CometFoundation.constructor(ICometStructs.Plugin[],address) (contracts/CometFoundation.sol#143-170) has external calls inside a loop: IERC165(plugin.endpoint).supportsInterface(type()(ICometSwapPlugin).interfaceId) (contracts/CometFoundation.sol#152)
CometFoundation.constructor(ICometStructs.Plugin[],address) (contracts/CometFoundation.sol#143-170) has external calls inside a loop: pluginSelector = ICometSwapPlugin(plugin.endpoint).SWAP_SELECTOR() (contracts/CometFoundation.sol#154)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation/#calls-inside-a-loop
INFO:Detectors:
Reentrancy in WstEthPlugin.\_lidoSwap(address,address,address,uint256,uint256) (contracts/plugins/swap/WstEthPlugin.sol#55-70):
External calls: - IWEth(wEth).withdraw(amountIn) (contracts/plugins/swap/WstEthPlugin.sol#63) - stAmount = IStEth(stEth).submit{value: amountIn}(address(this)) (contracts/plugins/swap/WstEthPlugin.sol#64) - require(bool,error)(IWstEth(wstEth).wrap(stAmount) > 0,ICometAlerts.InvalidAmountOut()) (contracts/plugins/swap/WstEthPlugin.sol#66)
External calls sending eth: - stAmount = IStEth(stEth).submit{value: amountIn}(address(this)) (contracts/plugins/swap/WstEthPlugin.sol#64)
Event emitted after the call(s): - ICometEvents.Swap(wstEth,wEth,wstEth,amountOut) (contracts/plugins/swap/WstEthPlugin.sol#69)
Reentrancy in CometFoundation.\_process(IComet,address,ICometStructs.ProcessParams,ICometStructs.CallbackData,address,address,ICometStructs.Mode) (contracts/CometFoundation.sol#406-453):
External calls: - amountOut = \_swap(swapPlugin,data.asset,params.supplyAsset,data.debt,data.swapData) (contracts/CometFoundation.sol#419) - (ok,data) = address(swapPlugin).delegatecall(abi.encodeWithSelector(ICometSwapPlugin.swap.selector,srcToken,dstToken,amount,\_config(swapPlugin,ICometSwapPlugin.SWAP_SELECTOR.selector),swapData)) (contracts/CometFoundation.sol#472-481)
Event emitted after the call(s): - ICometEvents.Multiplied(user,address(comet),address(params.supplyAsset),params.supplyAmount + amountOut,data.debt) (contracts/CometFoundation.sol#421-427)
Reentrancy in CometFoundation.\_process(IComet,address,ICometStructs.ProcessParams,ICometStructs.CallbackData,address,address,ICometStructs.Mode) (contracts/CometFoundation.sol#406-453):
External calls: - amountOut = \_swap(swapPlugin,data.asset,params.supplyAsset,data.debt,data.swapData) (contracts/CometFoundation.sol#419) - (ok,data) = address(swapPlugin).delegatecall(abi.encodeWithSelector(ICometSwapPlugin.swap.selector,srcToken,dstToken,amount,\_config(swapPlugin,ICometSwapPlugin.SWAP_SELECTOR.selector),swapData)) (contracts/CometFoundation.sol#472-481) - comet.supplyTo(user,params.supplyAsset,params.supplyAmount) (contracts/CometFoundation.sol#431) - comet.withdrawFrom(user,address(this),params.withdrawAsset,params.withdrawAmount) (contracts/CometFoundation.sol#432) - amountOut = \_swap(swapPlugin,params.withdrawAsset,data.asset,params.withdrawAmount,data.swapData) (contracts/CometFoundation.sol#435) - (ok,data) = address(swapPlugin).delegatecall(abi.encodeWithSelector(ICometSwapPlugin.swap.selector,srcToken,dstToken,amount,\_config(swapPlugin,ICometSwapPlugin.SWAP_SELECTOR.selector),swapData)) (contracts/CometFoundation.sol#472-481) - \_dust(user,data.asset,comet,amountOut - repaymentAmount) (contracts/CometFoundation.sol#440) - comet.supplyTo(user,asset,amount) (contracts/CometFoundation.sol#537)
Event emitted after the call(s): - ICometEvents.Covered(user,address(comet),address(params.withdrawAsset),params.withdrawAmount,amountOut - (data.debt + data.fee)) (contracts/CometFoundation.sol#443-449)
Reentrancy in CometFoundation.fallback() (contracts/CometFoundation.sol#75-121):
External calls: - (ok,payload) = loanPlugin.delegatecall(msg.data) (contracts/CometFoundation.sol#89) - \_process(comet,user,params,data,loanPlugin,swapPlugin,mode) (contracts/CometFoundation.sol#115) - (ok,None) = loanPlugin.delegatecall(abi.encodeWithSelector(ICometFlashLoanPlugin.repayFlashLoan.selector,flp,baseAsset,amount)) (contracts/CometFoundation.sol#514-516) - (ok,data) = address(swapPlugin).delegatecall(abi.encodeWithSelector(ICometSwapPlugin.swap.selector,srcToken,dstToken,amount,\_config(swapPlugin,ICometSwapPlugin.SWAP_SELECTOR.selector),swapData)) (contracts/CometFoundation.sol#472-481) - comet.supplyTo(user,asset,amount) (contracts/CometFoundation.sol#537) - comet.supplyTo(user,params.supplyAsset,params.supplyAmount) (contracts/CometFoundation.sol#431) - comet.withdrawFrom(user,address(this),params.withdrawAsset,params.withdrawAmount) (contracts/CometFoundation.sol#432)
Event emitted after the call(s): - ICometEvents.Covered(user,address(comet),address(params.withdrawAsset),params.withdrawAmount,amountOut - (data.debt + data.fee)) (contracts/CometFoundation.sol#443-449) - \_process(comet,user,params,data,loanPlugin,swapPlugin,mode) (contracts/CometFoundation.sol#115) - ICometEvents.Multiplied(user,address(comet),address(params.supplyAsset),params.supplyAmount + amountOut,data.debt) (contracts/CometFoundation.sol#421-427) - \_process(comet,user,params,data,loanPlugin,swapPlugin,mode) (contracts/CometFoundation.sol#115)
Reentrancy in LiFiPlugin.swap(address,address,uint256,bytes,bytes) (contracts/plugins/swap/LiFiPlugin.sol#30-62):
External calls: - (ok,None) = router.call(swapData) (contracts/plugins/swap/LiFiPlugin.sol#49)
Event emitted after the call(s): - ICometEvents.Swap(router,srcToken,dstToken,amountOut) (contracts/plugins/swap/LiFiPlugin.sol#61)
Reentrancy in OneInchV6SwapPlugin.swap(address,address,uint256,bytes,bytes) (contracts/plugins/swap/OneInchV6Plugin.sol#29-61):
External calls: - (ok,None) = router.call(swapData) (contracts/plugins/swap/OneInchV6Plugin.sol#48)
Event emitted after the call(s): - ICometEvents.Swap(router,srcToken,dstToken,amountOut) (contracts/plugins/swap/OneInchV6Plugin.sol#60)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#reentrancy-vulnerabilities-3
INFO:Detectors:
CometFoundation.fallback() (contracts/CometFoundation.sol#75-121) uses assembly - INLINE ASM (contracts/CometFoundation.sol#117-120)
CometFoundation.\_config(address,bytes4) (contracts/CometFoundation.sol#651-670) uses assembly - INLINE ASM (contracts/CometFoundation.sol#657-659) - INLINE ASM (contracts/CometFoundation.sol#665-669)
CometFoundation.\_catch(bool) (contracts/CometFoundation.sol#677-685) uses assembly - INLINE ASM (contracts/CometFoundation.sol#679-683)
CometFoundation.\_tstore(uint256,address,address,IComet,IERC20,uint256,address,ICometStructs.Mode) (contracts/CometFoundation.sol#698-719) uses assembly - INLINE ASM (contracts/CometFoundation.sol#709-718)
CometFoundation.\_tload() (contracts/CometFoundation.sol#733-765) uses assembly - INLINE ASM (contracts/CometFoundation.sol#747-764)
AAVEPlugin.takeFlashLoan(ICometStructs.CallbackData,bytes) (contracts/plugins/flashloan/AAVEPlugin.sol#33-43) uses assembly - INLINE ASM (contracts/plugins/flashloan/AAVEPlugin.sol#38-40)
AAVEPlugin.executeOperation(address,uint256,uint256,address,bytes) (contracts/plugins/flashloan/AAVEPlugin.sol#53-80) uses assembly - INLINE ASM (contracts/plugins/flashloan/AAVEPlugin.sol#62-65)
BalancerPlugin.takeFlashLoan(ICometStructs.CallbackData,bytes) (contracts/plugins/flashloan/BalancerPlugin.sol#29-44) uses assembly - INLINE ASM (contracts/plugins/flashloan/BalancerPlugin.sol#34-36)
BalancerPlugin.receiveFlashLoan(IERC20[],uint256[],uint256[],bytes) (contracts/plugins/flashloan/BalancerPlugin.sol#53-75) uses assembly - INLINE ASM (contracts/plugins/flashloan/BalancerPlugin.sol#61-64)
EulerV2Plugin.takeFlashLoan(ICometStructs.CallbackData,bytes) (contracts/plugins/flashloan/EulerV2Plugin.sol#32-40) uses assembly - INLINE ASM (contracts/plugins/flashloan/EulerV2Plugin.sol#36-38)
EulerV2Plugin.onFlashLoan(bytes) (contracts/plugins/flashloan/EulerV2Plugin.sol#55-68) uses assembly - INLINE ASM (contracts/plugins/flashloan/EulerV2Plugin.sol#58-61)
MorphoPlugin.takeFlashLoan(ICometStructs.CallbackData,bytes) (contracts/plugins/flashloan/MorphoPlugin.sol#31-38) uses assembly - INLINE ASM (contracts/plugins/flashloan/MorphoPlugin.sol#34-36)
MorphoPlugin.onMorphoFlashLoan(uint256,bytes) (contracts/plugins/flashloan/MorphoPlugin.sol#53-64) uses assembly - INLINE ASM (contracts/plugins/flashloan/MorphoPlugin.sol#56-59)
UniswapV3Plugin.takeFlashLoan(ICometStructs.CallbackData,bytes) (contracts/plugins/flashloan/UniswapV3Plugin.sol#33-57) uses assembly - INLINE ASM (contracts/plugins/flashloan/UniswapV3Plugin.sol#43-45)
UniswapV3Plugin.uniswapV3FlashCallback(uint256,uint256,bytes) (contracts/plugins/flashloan/UniswapV3Plugin.sol#93-122) uses assembly - INLINE ASM (contracts/plugins/flashloan/UniswapV3Plugin.sol#102-105)
LiFiPlugin.swap(address,address,uint256,bytes,bytes) (contracts/plugins/swap/LiFiPlugin.sol#30-62) uses assembly - INLINE ASM (contracts/plugins/swap/LiFiPlugin.sol#51-55)
OneInchV6SwapPlugin.swap(address,address,uint256,bytes,bytes) (contracts/plugins/swap/OneInchV6Plugin.sol#29-61) uses assembly - INLINE ASM (contracts/plugins/swap/OneInchV6Plugin.sol#50-54)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#assembly-usage
INFO:Detectors:
Low level call in CometFoundation.fallback() (contracts/CometFoundation.sol#75-121): - (ok,payload) = loanPlugin.delegatecall(msg.data) (contracts/CometFoundation.sol#89)
Low level call in CometFoundation.\_swap(address,IERC20,IERC20,uint256,bytes) (contracts/CometFoundation.sol#464-485): - (ok,data) = address(swapPlugin).delegatecall(abi.encodeWithSelector(ICometSwapPlugin.swap.selector,srcToken,dstToken,amount,\_config(swapPlugin,ICometSwapPlugin.SWAP_SELECTOR.selector),swapData)) (contracts/CometFoundation.sol#472-481)
Low level call in CometFoundation.\_loan(address,ICometStructs.CallbackData) (contracts/CometFoundation.sol#493-503): - (ok,None) = loanPlugin.delegatecall(abi.encodeWithSelector(ICometFlashLoanPlugin.takeFlashLoan.selector,data,\_config(loanPlugin,ICometFlashLoanPlugin.CALLBACK_SELECTOR.selector))) (contracts/CometFoundation.sol#495-501)
Low level call in CometFoundation.\_repay(address,address,IERC20,uint256) (contracts/CometFoundation.sol#512-518): - (ok,None) = loanPlugin.delegatecall(abi.encodeWithSelector(ICometFlashLoanPlugin.repayFlashLoan.selector,flp,baseAsset,amount)) (contracts/CometFoundation.sol#514-516)
Low level call in CometFoundation.\_config(address,bytes4) (contracts/CometFoundation.sol#651-670): - (ok,data) = plugin.staticcall(abi.encodeWithSelector(selector)) (contracts/CometFoundation.sol#652)
Low level call in LiFiPlugin.swap(address,address,uint256,bytes,bytes) (contracts/plugins/swap/LiFiPlugin.sol#30-62): - (ok,None) = router.call(swapData) (contracts/plugins/swap/LiFiPlugin.sol#49)
Low level call in OneInchV6SwapPlugin.swap(address,address,uint256,bytes,bytes) (contracts/plugins/swap/OneInchV6Plugin.sol#29-61): - (ok,None) = router.call(swapData) (contracts/plugins/swap/OneInchV6Plugin.sol#48)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#low-level-calls
INFO:Slither:. analyzed (56 contracts with 97 detectors), 38 result(s) found
