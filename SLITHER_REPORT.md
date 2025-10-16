**THIS CHECKLIST IS NOT COMPLETE**. Use `--show-ignored-findings` to show all the results.
Summary

- [controlled-delegatecall](#controlled-delegatecall) (1 results) (High)
- [incorrect-equality](#incorrect-equality) (1 results) (Medium)
- [uninitialized-local](#uninitialized-local) (1 results) (Medium)
- [missing-zero-check](#missing-zero-check) (2 results) (Low)
- [calls-loop](#calls-loop) (4 results) (Low)
- [reentrancy-events](#reentrancy-events) (8 results) (Low)
- [assembly](#assembly) (21 results) (Informational)
- [low-level-calls](#low-level-calls) (7 results) (Informational)

## controlled-delegatecall

Impact: High
Confidence: Medium

- [ ] ID-0
      [CometFoundation.\_loan(address,ICometFoundation.CallbackData,bytes)](contracts/CometFoundation.sol#L132-L137) uses delegatecall to a input-controlled function id - [(ok,None) = endpoint.delegatecall(abi.encodeWithSelector(ICometFlashLoanPlugin.takeFlashLoan.selector,data,config))](contracts/CometFoundation.sol#L133-L135)

contracts/CometFoundation.sol#L132-L137

## incorrect-equality

Impact: Medium
Confidence: High

- [ ] ID-1
      [CometCollateralSwap.fallback()](contracts/CometCollateralSwap.sol#L93-L136) uses a dangerous strict equality: - [require(bool,error)(asset.balanceOf(address(this)) == snapshot + debt,ICometAlerts.InvalidAmountOut())](contracts/CometCollateralSwap.sol#L113)

contracts/CometCollateralSwap.sol#L93-L136

## uninitialized-local

Impact: Medium
Confidence: Medium

- [ ] ID-2
      [CometFoundation.constructor(ICometFoundation.Plugin[]).pluginSelector](contracts/CometFoundation.sol#L74) is a local variable never initialized

contracts/CometFoundation.sol#L74

## missing-zero-check

Impact: Low
Confidence: Medium

- [ ] ID-3
      [LiFiPlugin.executeSwap(address,address,uint256,bytes,bytes).router](contracts/plugins/swap/LiFiPlugin.sol#L44) lacks a zero-check on : - [(ok,None) = router.call(swapData)](contracts/plugins/swap/LiFiPlugin.sol#L49)

contracts/plugins/swap/LiFiPlugin.sol#L44

- [ ] ID-4
      [OneInchV6SwapPlugin.executeSwap(address,address,uint256,bytes,bytes).router](contracts/plugins/swap/OneInchV6Plugin.sol#L42) lacks a zero-check on : - [(ok,None) = router.call(swapData)](contracts/plugins/swap/OneInchV6Plugin.sol#L47)

contracts/plugins/swap/OneInchV6Plugin.sol#L42

## calls-loop

Impact: Low
Confidence: Medium

- [ ] ID-5
      [CometFoundation.constructor(ICometFoundation.Plugin[])](contracts/CometFoundation.sol#L73-L92) has external calls inside a loop: [pluginSelector = ICometFlashLoanPlugin(plugin.endpoint).CALLBACK_SELECTOR()](contracts/CometFoundation.sol#L80)

contracts/CometFoundation.sol#L73-L92

- [ ] ID-6
      [CometFoundation.constructor(ICometFoundation.Plugin[])](contracts/CometFoundation.sol#L73-L92) has external calls inside a loop: [pluginSelector = ICometSwapPlugin(plugin.endpoint).SWAP_SELECTOR()](contracts/CometFoundation.sol#L82)

contracts/CometFoundation.sol#L73-L92

- [ ] ID-7
      [CometFoundation.constructor(ICometFoundation.Plugin[])](contracts/CometFoundation.sol#L73-L92) has external calls inside a loop: [IERC165(plugin.endpoint).supportsInterface(type()(ICometFlashLoanPlugin).interfaceId)](contracts/CometFoundation.sol#L79)

contracts/CometFoundation.sol#L73-L92

- [ ] ID-8
      [CometFoundation.constructor(ICometFoundation.Plugin[])](contracts/CometFoundation.sol#L73-L92) has external calls inside a loop: [IERC165(plugin.endpoint).supportsInterface(type()(ICometSwapPlugin).interfaceId)](contracts/CometFoundation.sol#L81)

contracts/CometFoundation.sol#L73-L92

## reentrancy-events

Impact: Low
Confidence: Medium

- [ ] ID-9
      Reentrancy in [CometMultiplier.\_withdraw(ICometFoundation.CallbackData,address)](contracts/CometMultiplier.sol#L252-L276):
      External calls: - [comet.supplyTo(user,data.asset,data.debt)](contracts/CometMultiplier.sol#L259) - [comet.withdrawFrom(user,address(this),collateral,take)](contracts/CometMultiplier.sol#L261) - [amountOut = \_swap(swapPlugin,collateral,data.asset,take,data.swapData)](contracts/CometMultiplier.sol#L263) - [(ok,data) = address(swapPlugin).delegatecall(abi.encodeWithSelector(ICometSwapPlugin.executeSwap.selector,srcToken,dstToken,amount,\_validateSwap(swapPlugin),swapData))](contracts/CometFoundation.sol#L110-L119) - [\_repay(loanPlugin,data.flp,data.asset,repaymentAmount)](contracts/CometMultiplier.sol#L269) - [(ok,None) = endpoint.delegatecall(abi.encodeWithSelector(ICometFlashLoanPlugin.repayFlashLoan.selector,flp,baseAsset,amount))](contracts/CometFoundation.sol#L147-L149)
      Event emitted after the call(s): - [ICometEvents.MultiplierWithdrawn(user,address(comet),address(collateral),take,amountOut)](contracts/CometMultiplier.sol#L275)

contracts/CometMultiplier.sol#L252-L276

- [ ] ID-10
      Reentrancy in [OneInchV6SwapPlugin.executeSwap(address,address,uint256,bytes,bytes)](contracts/plugins/swap/OneInchV6Plugin.sol#L28-L60):
      External calls: - [(ok,None) = router.call(swapData)](contracts/plugins/swap/OneInchV6Plugin.sol#L47)
      Event emitted after the call(s): - [ICometEvents.Swap(router,srcToken,dstToken,amountOut)](contracts/plugins/swap/OneInchV6Plugin.sol#L59)

contracts/plugins/swap/OneInchV6Plugin.sol#L28-L60

- [ ] ID-11
      Reentrancy in [CometCollateralSwap.fallback()](contracts/CometCollateralSwap.sol#L93-L136):
      External calls: - [(success,payload) = loanPlugin.delegatecall(msg.data)](contracts/CometCollateralSwap.sol#L106) - [comet.supplyTo(user,asset,debt)](contracts/CometCollateralSwap.sol#L116) - [comet.withdrawFrom(user,address(this),fromAsset,fromAmount)](contracts/CometCollateralSwap.sol#L117) - [amountOut = \_swap(swapPlugin,fromAsset,data.asset,fromAmount,data.swapData)](contracts/CometCollateralSwap.sol#L121) - [(ok,data) = address(swapPlugin).delegatecall(abi.encodeWithSelector(ICometSwapPlugin.executeSwap.selector,srcToken,dstToken,amount,\_validateSwap(swapPlugin),swapData))](contracts/CometFoundation.sol#L110-L119) - [\_supplyDust(user,asset,comet,amountOut - repayAmount)](contracts/CometCollateralSwap.sol#L125) - [comet.supplyTo(user,asset,amount)](contracts/CometCollateralSwap.sol#L333) - [\_repay(loanPlugin,data.flp,data.asset,repayAmount)](contracts/CometCollateralSwap.sol#L127) - [(ok,None) = endpoint.delegatecall(abi.encodeWithSelector(ICometFlashLoanPlugin.repayFlashLoan.selector,flp,baseAsset,amount))](contracts/CometFoundation.sol#L147-L149)
      Event emitted after the call(s): - [ICometEvents.SwapExecuted(address(comet),address(fromAsset),address(data.asset),fromAmount,amountOut)](contracts/CometCollateralSwap.sol#L129)

contracts/CometCollateralSwap.sol#L93-L136

- [ ] ID-12
      Reentrancy in [CometMultiplier.fallback()](contracts/CometMultiplier.sol#L51-L72):
      External calls: - [(ok,payload) = loanPlugin.delegatecall(msg.data)](contracts/CometMultiplier.sol#L55) - [\_execute(data,loanPlugin)](contracts/CometMultiplier.sol#L61) - [(ok,None) = endpoint.delegatecall(abi.encodeWithSelector(ICometFlashLoanPlugin.repayFlashLoan.selector,flp,baseAsset,amount))](contracts/CometFoundation.sol#L147-L149) - [(ok,data) = address(swapPlugin).delegatecall(abi.encodeWithSelector(ICometSwapPlugin.executeSwap.selector,srcToken,dstToken,amount,\_validateSwap(swapPlugin),swapData))](contracts/CometFoundation.sol#L110-L119) - [comet.supplyTo(user,collateral,amountOut)](contracts/CometMultiplier.sol#L234) - [comet.withdrawFrom(user,address(this),data.asset,repayAmount)](contracts/CometMultiplier.sol#L236)
      Event emitted after the call(s): - [ICometEvents.MultiplierExecuted(user,address(comet),address(collateral),amountOut,data.debt)](contracts/CometMultiplier.sol#L239) - [\_execute(data,loanPlugin)](contracts/CometMultiplier.sol#L61)

contracts/CometMultiplier.sol#L51-L72

- [ ] ID-13
      Reentrancy in [CometMultiplier.\_execute(ICometFoundation.CallbackData,address)](contracts/CometMultiplier.sol#L229-L240):
      External calls: - [amountOut = \_swap(swapPlugin,data.asset,collateral,data.debt,data.swapData) + amount](contracts/CometMultiplier.sol#L231) - [(ok,data) = address(swapPlugin).delegatecall(abi.encodeWithSelector(ICometSwapPlugin.executeSwap.selector,srcToken,dstToken,amount,\_validateSwap(swapPlugin),swapData))](contracts/CometFoundation.sol#L110-L119) - [comet.supplyTo(user,collateral,amountOut)](contracts/CometMultiplier.sol#L234) - [comet.withdrawFrom(user,address(this),data.asset,repayAmount)](contracts/CometMultiplier.sol#L236) - [\_repay(loanPlugin,data.flp,data.asset,repayAmount)](contracts/CometMultiplier.sol#L237) - [(ok,None) = endpoint.delegatecall(abi.encodeWithSelector(ICometFlashLoanPlugin.repayFlashLoan.selector,flp,baseAsset,amount))](contracts/CometFoundation.sol#L147-L149)
      Event emitted after the call(s): - [ICometEvents.MultiplierExecuted(user,address(comet),address(collateral),amountOut,data.debt)](contracts/CometMultiplier.sol#L239)

contracts/CometMultiplier.sol#L229-L240

- [ ] ID-14
      Reentrancy in [WstEthPlugin.\_lidoSwap(address,address,address,uint256,uint256)](contracts/plugins/swap/WstEthPlugin.sol#L55-L70):
      External calls: - [IWEth(wEth).withdraw(amountIn)](contracts/plugins/swap/WstEthPlugin.sol#L63) - [stAmount = IStEth(stEth).submit{value: amountIn}(address(this))](contracts/plugins/swap/WstEthPlugin.sol#L64) - [require(bool,error)(IWstEth(wstEth).wrap(stAmount) > 0,ICometAlerts.InvalidAmountOut())](contracts/plugins/swap/WstEthPlugin.sol#L66)
      External calls sending eth: - [stAmount = IStEth(stEth).submit{value: amountIn}(address(this))](contracts/plugins/swap/WstEthPlugin.sol#L64)
      Event emitted after the call(s): - [ICometEvents.Swap(wstEth,wEth,wstEth,amountOut)](contracts/plugins/swap/WstEthPlugin.sol#L69)

contracts/plugins/swap/WstEthPlugin.sol#L55-L70

- [ ] ID-15
      Reentrancy in [LiFiPlugin.executeSwap(address,address,uint256,bytes,bytes)](contracts/plugins/swap/LiFiPlugin.sol#L30-L62):
      External calls: - [(ok,None) = router.call(swapData)](contracts/plugins/swap/LiFiPlugin.sol#L49)
      Event emitted after the call(s): - [ICometEvents.Swap(router,srcToken,dstToken,amountOut)](contracts/plugins/swap/LiFiPlugin.sol#L61)

contracts/plugins/swap/LiFiPlugin.sol#L30-L62

- [ ] ID-16
      Reentrancy in [CometMultiplier.fallback()](contracts/CometMultiplier.sol#L51-L72):
      External calls: - [(ok,payload) = loanPlugin.delegatecall(msg.data)](contracts/CometMultiplier.sol#L55) - [\_withdraw(data,loanPlugin)](contracts/CometMultiplier.sol#L63) - [(ok,None) = endpoint.delegatecall(abi.encodeWithSelector(ICometFlashLoanPlugin.repayFlashLoan.selector,flp,baseAsset,amount))](contracts/CometFoundation.sol#L147-L149) - [(ok,data) = address(swapPlugin).delegatecall(abi.encodeWithSelector(ICometSwapPlugin.executeSwap.selector,srcToken,dstToken,amount,\_validateSwap(swapPlugin),swapData))](contracts/CometFoundation.sol#L110-L119) - [comet.supplyTo(user,data.asset,data.debt)](contracts/CometMultiplier.sol#L259) - [comet.withdrawFrom(user,address(this),collateral,take)](contracts/CometMultiplier.sol#L261)
      Event emitted after the call(s): - [ICometEvents.MultiplierWithdrawn(user,address(comet),address(collateral),take,amountOut)](contracts/CometMultiplier.sol#L275) - [\_withdraw(data,loanPlugin)](contracts/CometMultiplier.sol#L63)

contracts/CometMultiplier.sol#L51-L72

## assembly

Impact: Informational
Confidence: High

- [ ] ID-17
      [UniswapV3Plugin.uniswapV3FlashCallback(uint256,uint256,bytes)](contracts/plugins/flashloan/UniswapV3Plugin.sol#L92-L121) uses assembly - [INLINE ASM](contracts/plugins/flashloan/UniswapV3Plugin.sol#L101-L104)

contracts/plugins/flashloan/UniswapV3Plugin.sol#L92-L121

- [ ] ID-18
      [CometFoundation.\_config(address,bytes4)](contracts/CometFoundation.sol#L182-L191) uses assembly - [INLINE ASM](contracts/CometFoundation.sol#L186-L190)

contracts/CometFoundation.sol#L182-L191

- [ ] ID-19
      [EulerV2Plugin.onFlashLoan(bytes)](contracts/plugins/flashloan/EulerV2Plugin.sol#L54-L67) uses assembly - [INLINE ASM](contracts/plugins/flashloan/EulerV2Plugin.sol#L57-L60)

contracts/plugins/flashloan/EulerV2Plugin.sol#L54-L67

- [ ] ID-20
      [CometCollateralSwap.\_tstore(uint256,address,address,address,IERC20,uint256,address)](contracts/CometCollateralSwap.sol#L246-L265) uses assembly - [INLINE ASM](contracts/CometCollateralSwap.sol#L256-L264)

contracts/CometCollateralSwap.sol#L246-L265

- [ ] ID-21
      [LiFiPlugin.executeSwap(address,address,uint256,bytes,bytes)](contracts/plugins/swap/LiFiPlugin.sol#L30-L62) uses assembly - [INLINE ASM](contracts/plugins/swap/LiFiPlugin.sol#L51-L55)

contracts/plugins/swap/LiFiPlugin.sol#L30-L62

- [ ] ID-22
      [CometFoundation.\_catch(bool)](contracts/CometFoundation.sol#L198-L206) uses assembly - [INLINE ASM](contracts/CometFoundation.sol#L200-L204)

contracts/CometFoundation.sol#L198-L206

- [ ] ID-23
      [MorphoPlugin.takeFlashLoan(ICometFoundation.CallbackData,bytes)](contracts/plugins/flashloan/MorphoPlugin.sol#L30-L37) uses assembly - [INLINE ASM](contracts/plugins/flashloan/MorphoPlugin.sol#L33-L35)

contracts/plugins/flashloan/MorphoPlugin.sol#L30-L37

- [ ] ID-24
      [UniswapV3Plugin.takeFlashLoan(ICometFoundation.CallbackData,bytes)](contracts/plugins/flashloan/UniswapV3Plugin.sol#L32-L56) uses assembly - [INLINE ASM](contracts/plugins/flashloan/UniswapV3Plugin.sol#L42-L44)

contracts/plugins/flashloan/UniswapV3Plugin.sol#L32-L56

- [ ] ID-25
      [CometMultiplier.\_tloadFirst()](contracts/CometMultiplier.sol#L384-L394) uses assembly - [INLINE ASM](contracts/CometMultiplier.sol#L386-L393)

contracts/CometMultiplier.sol#L384-L394

- [ ] ID-26
      [AAVEPlugin.executeOperation(address,uint256,uint256,address,bytes)](contracts/plugins/flashloan/AAVEPlugin.sol#L52-L79) uses assembly - [INLINE ASM](contracts/plugins/flashloan/AAVEPlugin.sol#L61-L64)

contracts/plugins/flashloan/AAVEPlugin.sol#L52-L79

- [ ] ID-27
      [CometCollateralSwap.\_tload()](contracts/CometCollateralSwap.sol#L277-L306) uses assembly - [INLINE ASM](contracts/CometCollateralSwap.sol#L290-L305)

contracts/CometCollateralSwap.sol#L277-L306

- [ ] ID-28
      [CometCollateralSwap.fallback()](contracts/CometCollateralSwap.sol#L93-L136) uses assembly - [INLINE ASM](contracts/CometCollateralSwap.sol#L132-L135)

contracts/CometCollateralSwap.sol#L93-L136

- [ ] ID-29
      [EulerV2Plugin.takeFlashLoan(ICometFoundation.CallbackData,bytes)](contracts/plugins/flashloan/EulerV2Plugin.sol#L31-L39) uses assembly - [INLINE ASM](contracts/plugins/flashloan/EulerV2Plugin.sol#L35-L37)

contracts/plugins/flashloan/EulerV2Plugin.sol#L31-L39

- [ ] ID-30
      [BalancerPlugin.receiveFlashLoan(IERC20[],uint256[],uint256[],bytes)](contracts/plugins/flashloan/BalancerPlugin.sol#L52-L74) uses assembly - [INLINE ASM](contracts/plugins/flashloan/BalancerPlugin.sol#L60-L63)

contracts/plugins/flashloan/BalancerPlugin.sol#L52-L74

- [ ] ID-31
      [MorphoPlugin.onMorphoFlashLoan(uint256,bytes)](contracts/plugins/flashloan/MorphoPlugin.sol#L52-L63) uses assembly - [INLINE ASM](contracts/plugins/flashloan/MorphoPlugin.sol#L55-L58)

contracts/plugins/flashloan/MorphoPlugin.sol#L52-L63

- [ ] ID-32
      [OneInchV6SwapPlugin.executeSwap(address,address,uint256,bytes,bytes)](contracts/plugins/swap/OneInchV6Plugin.sol#L28-L60) uses assembly - [INLINE ASM](contracts/plugins/swap/OneInchV6Plugin.sol#L49-L53)

contracts/plugins/swap/OneInchV6Plugin.sol#L28-L60

- [ ] ID-33
      [CometMultiplier.\_tstore(uint256,address,address,IComet,IERC20,uint256,address,ICometFoundation.Mode)](contracts/CometMultiplier.sol#L354-L375) uses assembly - [INLINE ASM](contracts/CometMultiplier.sol#L365-L374)

contracts/CometMultiplier.sol#L354-L375

- [ ] ID-34
      [BalancerPlugin.takeFlashLoan(ICometFoundation.CallbackData,bytes)](contracts/plugins/flashloan/BalancerPlugin.sol#L28-L43) uses assembly - [INLINE ASM](contracts/plugins/flashloan/BalancerPlugin.sol#L33-L35)

contracts/plugins/flashloan/BalancerPlugin.sol#L28-L43

- [ ] ID-35
      [AAVEPlugin.takeFlashLoan(ICometFoundation.CallbackData,bytes)](contracts/plugins/flashloan/AAVEPlugin.sol#L32-L42) uses assembly - [INLINE ASM](contracts/plugins/flashloan/AAVEPlugin.sol#L37-L39)

contracts/plugins/flashloan/AAVEPlugin.sol#L32-L42

- [ ] ID-36
      [CometMultiplier.\_tloadSecond()](contracts/CometMultiplier.sol#L405-L422) uses assembly - [INLINE ASM](contracts/CometMultiplier.sol#L410-L421)

contracts/CometMultiplier.sol#L405-L422

- [ ] ID-37
      [CometMultiplier.fallback()](contracts/CometMultiplier.sol#L51-L72) uses assembly - [INLINE ASM](contracts/CometMultiplier.sol#L68-L71)

contracts/CometMultiplier.sol#L51-L72

## low-level-calls

Impact: Informational
Confidence: High

- [ ] ID-38
      Low level call in [CometFoundation.\_swap(address,IERC20,IERC20,uint256,bytes)](contracts/CometFoundation.sol#L103-L123): - [(ok,data) = address(swapPlugin).delegatecall(abi.encodeWithSelector(ICometSwapPlugin.executeSwap.selector,srcToken,dstToken,amount,\_validateSwap(swapPlugin),swapData))](contracts/CometFoundation.sol#L110-L119)

contracts/CometFoundation.sol#L103-L123

- [ ] ID-39
      Low level call in [LiFiPlugin.executeSwap(address,address,uint256,bytes,bytes)](contracts/plugins/swap/LiFiPlugin.sol#L30-L62): - [(ok,None) = router.call(swapData)](contracts/plugins/swap/LiFiPlugin.sol#L49)

contracts/plugins/swap/LiFiPlugin.sol#L30-L62

- [ ] ID-40
      Low level call in [CometFoundation.\_loan(address,ICometFoundation.CallbackData,bytes)](contracts/CometFoundation.sol#L132-L137): - [(ok,None) = endpoint.delegatecall(abi.encodeWithSelector(ICometFlashLoanPlugin.takeFlashLoan.selector,data,config))](contracts/CometFoundation.sol#L133-L135)

contracts/CometFoundation.sol#L132-L137

- [ ] ID-41
      Low level call in [CometFoundation.\_repay(address,address,IERC20,uint256)](contracts/CometFoundation.sol#L146-L151): - [(ok,None) = endpoint.delegatecall(abi.encodeWithSelector(ICometFlashLoanPlugin.repayFlashLoan.selector,flp,baseAsset,amount))](contracts/CometFoundation.sol#L147-L149)

contracts/CometFoundation.sol#L146-L151

- [ ] ID-42
      Low level call in [OneInchV6SwapPlugin.executeSwap(address,address,uint256,bytes,bytes)](contracts/plugins/swap/OneInchV6Plugin.sol#L28-L60): - [(ok,None) = router.call(swapData)](contracts/plugins/swap/OneInchV6Plugin.sol#L47)

contracts/plugins/swap/OneInchV6Plugin.sol#L28-L60

- [ ] ID-43
      Low level call in [CometCollateralSwap.fallback()](contracts/CometCollateralSwap.sol#L93-L136): - [(success,payload) = loanPlugin.delegatecall(msg.data)](contracts/CometCollateralSwap.sol#L106)

contracts/CometCollateralSwap.sol#L93-L136

- [ ] ID-44
      Low level call in [CometMultiplier.fallback()](contracts/CometMultiplier.sol#L51-L72): - [(ok,payload) = loanPlugin.delegatecall(msg.data)](contracts/CometMultiplier.sol#L55)

contracts/CometMultiplier.sol#L51-L72

---

'forge clean' running (wd: /home/martik/Work/woof/compound-multiplier)
'forge config --json' running
'forge build --build-info --skip _/test/\*\* _/script/\*\* --force' running (wd: /home/martik/Work/woof/compound-multiplier)
INFO:Detectors:
CometFoundation.\_loan(address,ICometFoundation.CallbackData,bytes) (contracts/CometFoundation.sol#132-137) uses delegatecall to a input-controlled function id - (ok,None) = endpoint.delegatecall(abi.encodeWithSelector(ICometFlashLoanPlugin.takeFlashLoan.selector,data,config)) (contracts/CometFoundation.sol#133-135)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#controlled-delegatecall
INFO:Detectors:
CometCollateralSwap.fallback() (contracts/CometCollateralSwap.sol#93-136) uses a dangerous strict equality: - require(bool,error)(asset.balanceOf(address(this)) == snapshot + debt,ICometAlerts.InvalidAmountOut()) (contracts/CometCollateralSwap.sol#113)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#dangerous-strict-equalities
INFO:Detectors:
CometFoundation.constructor(ICometFoundation.Plugin[]).pluginSelector (contracts/CometFoundation.sol#74) is a local variable never initialized
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#uninitialized-local-variables
INFO:Detectors:
LiFiPlugin.executeSwap(address,address,uint256,bytes,bytes).router (contracts/plugins/swap/LiFiPlugin.sol#44) lacks a zero-check on : - (ok,None) = router.call(swapData) (contracts/plugins/swap/LiFiPlugin.sol#49)
OneInchV6SwapPlugin.executeSwap(address,address,uint256,bytes,bytes).router (contracts/plugins/swap/OneInchV6Plugin.sol#42) lacks a zero-check on : - (ok,None) = router.call(swapData) (contracts/plugins/swap/OneInchV6Plugin.sol#47)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#missing-zero-address-validation
INFO:Detectors:
CometFoundation.constructor(ICometFoundation.Plugin[]) (contracts/CometFoundation.sol#73-92) has external calls inside a loop: IERC165(plugin.endpoint).supportsInterface(type()(ICometFlashLoanPlugin).interfaceId) (contracts/CometFoundation.sol#79)
CometFoundation.constructor(ICometFoundation.Plugin[]) (contracts/CometFoundation.sol#73-92) has external calls inside a loop: pluginSelector = ICometFlashLoanPlugin(plugin.endpoint).CALLBACK_SELECTOR() (contracts/CometFoundation.sol#80)
CometFoundation.constructor(ICometFoundation.Plugin[]) (contracts/CometFoundation.sol#73-92) has external calls inside a loop: IERC165(plugin.endpoint).supportsInterface(type()(ICometSwapPlugin).interfaceId) (contracts/CometFoundation.sol#81)
CometFoundation.constructor(ICometFoundation.Plugin[]) (contracts/CometFoundation.sol#73-92) has external calls inside a loop: pluginSelector = ICometSwapPlugin(plugin.endpoint).SWAP_SELECTOR() (contracts/CometFoundation.sol#82)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation/#calls-inside-a-loop
INFO:Detectors:
Reentrancy in CometMultiplier.\_execute(ICometFoundation.CallbackData,address) (contracts/CometMultiplier.sol#229-240):
External calls: - amountOut = \_swap(swapPlugin,data.asset,collateral,data.debt,data.swapData) + amount (contracts/CometMultiplier.sol#231) - (ok,data) = address(swapPlugin).delegatecall(abi.encodeWithSelector(ICometSwapPlugin.executeSwap.selector,srcToken,dstToken,amount,\_validateSwap(swapPlugin),swapData)) (contracts/CometFoundation.sol#110-119) - comet.supplyTo(user,collateral,amountOut) (contracts/CometMultiplier.sol#234) - comet.withdrawFrom(user,address(this),data.asset,repayAmount) (contracts/CometMultiplier.sol#236) - \_repay(loanPlugin,data.flp,data.asset,repayAmount) (contracts/CometMultiplier.sol#237) - (ok,None) = endpoint.delegatecall(abi.encodeWithSelector(ICometFlashLoanPlugin.repayFlashLoan.selector,flp,baseAsset,amount)) (contracts/CometFoundation.sol#147-149)
Event emitted after the call(s): - ICometEvents.MultiplierExecuted(user,address(comet),address(collateral),amountOut,data.debt) (contracts/CometMultiplier.sol#239)
Reentrancy in WstEthPlugin.\_lidoSwap(address,address,address,uint256,uint256) (contracts/plugins/swap/WstEthPlugin.sol#55-70):
External calls: - IWEth(wEth).withdraw(amountIn) (contracts/plugins/swap/WstEthPlugin.sol#63) - stAmount = IStEth(stEth).submit{value: amountIn}(address(this)) (contracts/plugins/swap/WstEthPlugin.sol#64) - require(bool,error)(IWstEth(wstEth).wrap(stAmount) > 0,ICometAlerts.InvalidAmountOut()) (contracts/plugins/swap/WstEthPlugin.sol#66)
External calls sending eth: - stAmount = IStEth(stEth).submit{value: amountIn}(address(this)) (contracts/plugins/swap/WstEthPlugin.sol#64)
Event emitted after the call(s): - ICometEvents.Swap(wstEth,wEth,wstEth,amountOut) (contracts/plugins/swap/WstEthPlugin.sol#69)
Reentrancy in CometMultiplier.\_withdraw(ICometFoundation.CallbackData,address) (contracts/CometMultiplier.sol#252-276):
External calls: - comet.supplyTo(user,data.asset,data.debt) (contracts/CometMultiplier.sol#259) - comet.withdrawFrom(user,address(this),collateral,take) (contracts/CometMultiplier.sol#261) - amountOut = \_swap(swapPlugin,collateral,data.asset,take,data.swapData) (contracts/CometMultiplier.sol#263) - (ok,data) = address(swapPlugin).delegatecall(abi.encodeWithSelector(ICometSwapPlugin.executeSwap.selector,srcToken,dstToken,amount,\_validateSwap(swapPlugin),swapData)) (contracts/CometFoundation.sol#110-119) - \_repay(loanPlugin,data.flp,data.asset,repaymentAmount) (contracts/CometMultiplier.sol#269) - (ok,None) = endpoint.delegatecall(abi.encodeWithSelector(ICometFlashLoanPlugin.repayFlashLoan.selector,flp,baseAsset,amount)) (contracts/CometFoundation.sol#147-149)
Event emitted after the call(s): - ICometEvents.MultiplierWithdrawn(user,address(comet),address(collateral),take,amountOut) (contracts/CometMultiplier.sol#275)
Reentrancy in LiFiPlugin.executeSwap(address,address,uint256,bytes,bytes) (contracts/plugins/swap/LiFiPlugin.sol#30-62):
External calls: - (ok,None) = router.call(swapData) (contracts/plugins/swap/LiFiPlugin.sol#49)
Event emitted after the call(s): - ICometEvents.Swap(router,srcToken,dstToken,amountOut) (contracts/plugins/swap/LiFiPlugin.sol#61)
Reentrancy in OneInchV6SwapPlugin.executeSwap(address,address,uint256,bytes,bytes) (contracts/plugins/swap/OneInchV6Plugin.sol#28-60):
External calls: - (ok,None) = router.call(swapData) (contracts/plugins/swap/OneInchV6Plugin.sol#47)
Event emitted after the call(s): - ICometEvents.Swap(router,srcToken,dstToken,amountOut) (contracts/plugins/swap/OneInchV6Plugin.sol#59)
Reentrancy in CometCollateralSwap.fallback() (contracts/CometCollateralSwap.sol#93-136):
External calls: - (success,payload) = loanPlugin.delegatecall(msg.data) (contracts/CometCollateralSwap.sol#106) - comet.supplyTo(user,asset,debt) (contracts/CometCollateralSwap.sol#116) - comet.withdrawFrom(user,address(this),fromAsset,fromAmount) (contracts/CometCollateralSwap.sol#117) - amountOut = \_swap(swapPlugin,fromAsset,data.asset,fromAmount,data.swapData) (contracts/CometCollateralSwap.sol#121) - (ok,data) = address(swapPlugin).delegatecall(abi.encodeWithSelector(ICometSwapPlugin.executeSwap.selector,srcToken,dstToken,amount,\_validateSwap(swapPlugin),swapData)) (contracts/CometFoundation.sol#110-119) - \_supplyDust(user,asset,comet,amountOut - repayAmount) (contracts/CometCollateralSwap.sol#125) - comet.supplyTo(user,asset,amount) (contracts/CometCollateralSwap.sol#333) - \_repay(loanPlugin,data.flp,data.asset,repayAmount) (contracts/CometCollateralSwap.sol#127) - (ok,None) = endpoint.delegatecall(abi.encodeWithSelector(ICometFlashLoanPlugin.repayFlashLoan.selector,flp,baseAsset,amount)) (contracts/CometFoundation.sol#147-149)
Event emitted after the call(s): - ICometEvents.SwapExecuted(address(comet),address(fromAsset),address(data.asset),fromAmount,amountOut) (contracts/CometCollateralSwap.sol#129)
Reentrancy in CometMultiplier.fallback() (contracts/CometMultiplier.sol#51-72):
External calls: - (ok,payload) = loanPlugin.delegatecall(msg.data) (contracts/CometMultiplier.sol#55) - \_execute(data,loanPlugin) (contracts/CometMultiplier.sol#61) - (ok,None) = endpoint.delegatecall(abi.encodeWithSelector(ICometFlashLoanPlugin.repayFlashLoan.selector,flp,baseAsset,amount)) (contracts/CometFoundation.sol#147-149) - (ok,data) = address(swapPlugin).delegatecall(abi.encodeWithSelector(ICometSwapPlugin.executeSwap.selector,srcToken,dstToken,amount,\_validateSwap(swapPlugin),swapData)) (contracts/CometFoundation.sol#110-119) - comet.supplyTo(user,collateral,amountOut) (contracts/CometMultiplier.sol#234) - comet.withdrawFrom(user,address(this),data.asset,repayAmount) (contracts/CometMultiplier.sol#236)
Event emitted after the call(s): - ICometEvents.MultiplierExecuted(user,address(comet),address(collateral),amountOut,data.debt) (contracts/CometMultiplier.sol#239) - \_execute(data,loanPlugin) (contracts/CometMultiplier.sol#61)
Reentrancy in CometMultiplier.fallback() (contracts/CometMultiplier.sol#51-72):
External calls: - (ok,payload) = loanPlugin.delegatecall(msg.data) (contracts/CometMultiplier.sol#55) - \_withdraw(data,loanPlugin) (contracts/CometMultiplier.sol#63) - (ok,None) = endpoint.delegatecall(abi.encodeWithSelector(ICometFlashLoanPlugin.repayFlashLoan.selector,flp,baseAsset,amount)) (contracts/CometFoundation.sol#147-149) - (ok,data) = address(swapPlugin).delegatecall(abi.encodeWithSelector(ICometSwapPlugin.executeSwap.selector,srcToken,dstToken,amount,\_validateSwap(swapPlugin),swapData)) (contracts/CometFoundation.sol#110-119) - comet.supplyTo(user,data.asset,data.debt) (contracts/CometMultiplier.sol#259) - comet.withdrawFrom(user,address(this),collateral,take) (contracts/CometMultiplier.sol#261)
Event emitted after the call(s): - ICometEvents.MultiplierWithdrawn(user,address(comet),address(collateral),take,amountOut) (contracts/CometMultiplier.sol#275) - \_withdraw(data,loanPlugin) (contracts/CometMultiplier.sol#63)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#reentrancy-vulnerabilities-3
INFO:Detectors:
CometCollateralSwap.fallback() (contracts/CometCollateralSwap.sol#93-136) uses assembly - INLINE ASM (contracts/CometCollateralSwap.sol#132-135)
CometCollateralSwap.\_tstore(uint256,address,address,address,IERC20,uint256,address) (contracts/CometCollateralSwap.sol#246-265) uses assembly - INLINE ASM (contracts/CometCollateralSwap.sol#256-264)
CometCollateralSwap.\_tload() (contracts/CometCollateralSwap.sol#277-306) uses assembly - INLINE ASM (contracts/CometCollateralSwap.sol#290-305)
CometFoundation.\_config(address,bytes4) (contracts/CometFoundation.sol#182-191) uses assembly - INLINE ASM (contracts/CometFoundation.sol#186-190)
CometFoundation.\_catch(bool) (contracts/CometFoundation.sol#198-206) uses assembly - INLINE ASM (contracts/CometFoundation.sol#200-204)
CometMultiplier.fallback() (contracts/CometMultiplier.sol#51-72) uses assembly - INLINE ASM (contracts/CometMultiplier.sol#68-71)
CometMultiplier.\_tstore(uint256,address,address,IComet,IERC20,uint256,address,ICometFoundation.Mode) (contracts/CometMultiplier.sol#354-375) uses assembly - INLINE ASM (contracts/CometMultiplier.sol#365-374)
CometMultiplier.\_tloadFirst() (contracts/CometMultiplier.sol#384-394) uses assembly - INLINE ASM (contracts/CometMultiplier.sol#386-393)
CometMultiplier.\_tloadSecond() (contracts/CometMultiplier.sol#405-422) uses assembly - INLINE ASM (contracts/CometMultiplier.sol#410-421)
AAVEPlugin.takeFlashLoan(ICometFoundation.CallbackData,bytes) (contracts/plugins/flashloan/AAVEPlugin.sol#32-42) uses assembly - INLINE ASM (contracts/plugins/flashloan/AAVEPlugin.sol#37-39)
AAVEPlugin.executeOperation(address,uint256,uint256,address,bytes) (contracts/plugins/flashloan/AAVEPlugin.sol#52-79) uses assembly - INLINE ASM (contracts/plugins/flashloan/AAVEPlugin.sol#61-64)
BalancerPlugin.takeFlashLoan(ICometFoundation.CallbackData,bytes) (contracts/plugins/flashloan/BalancerPlugin.sol#28-43) uses assembly - INLINE ASM (contracts/plugins/flashloan/BalancerPlugin.sol#33-35)
BalancerPlugin.receiveFlashLoan(IERC20[],uint256[],uint256[],bytes) (contracts/plugins/flashloan/BalancerPlugin.sol#52-74) uses assembly - INLINE ASM (contracts/plugins/flashloan/BalancerPlugin.sol#60-63)
EulerV2Plugin.takeFlashLoan(ICometFoundation.CallbackData,bytes) (contracts/plugins/flashloan/EulerV2Plugin.sol#31-39) uses assembly - INLINE ASM (contracts/plugins/flashloan/EulerV2Plugin.sol#35-37)
EulerV2Plugin.onFlashLoan(bytes) (contracts/plugins/flashloan/EulerV2Plugin.sol#54-67) uses assembly - INLINE ASM (contracts/plugins/flashloan/EulerV2Plugin.sol#57-60)
MorphoPlugin.takeFlashLoan(ICometFoundation.CallbackData,bytes) (contracts/plugins/flashloan/MorphoPlugin.sol#30-37) uses assembly - INLINE ASM (contracts/plugins/flashloan/MorphoPlugin.sol#33-35)
MorphoPlugin.onMorphoFlashLoan(uint256,bytes) (contracts/plugins/flashloan/MorphoPlugin.sol#52-63) uses assembly - INLINE ASM (contracts/plugins/flashloan/MorphoPlugin.sol#55-58)
UniswapV3Plugin.takeFlashLoan(ICometFoundation.CallbackData,bytes) (contracts/plugins/flashloan/UniswapV3Plugin.sol#32-56) uses assembly - INLINE ASM (contracts/plugins/flashloan/UniswapV3Plugin.sol#42-44)
UniswapV3Plugin.uniswapV3FlashCallback(uint256,uint256,bytes) (contracts/plugins/flashloan/UniswapV3Plugin.sol#92-121) uses assembly - INLINE ASM (contracts/plugins/flashloan/UniswapV3Plugin.sol#101-104)
LiFiPlugin.executeSwap(address,address,uint256,bytes,bytes) (contracts/plugins/swap/LiFiPlugin.sol#30-62) uses assembly - INLINE ASM (contracts/plugins/swap/LiFiPlugin.sol#51-55)
OneInchV6SwapPlugin.executeSwap(address,address,uint256,bytes,bytes) (contracts/plugins/swap/OneInchV6Plugin.sol#28-60) uses assembly - INLINE ASM (contracts/plugins/swap/OneInchV6Plugin.sol#49-53)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#assembly-usage
INFO:Detectors:
Low level call in CometCollateralSwap.fallback() (contracts/CometCollateralSwap.sol#93-136): - (success,payload) = loanPlugin.delegatecall(msg.data) (contracts/CometCollateralSwap.sol#106)
Low level call in CometFoundation.\_swap(address,IERC20,IERC20,uint256,bytes) (contracts/CometFoundation.sol#103-123): - (ok,data) = address(swapPlugin).delegatecall(abi.encodeWithSelector(ICometSwapPlugin.executeSwap.selector,srcToken,dstToken,amount,\_validateSwap(swapPlugin),swapData)) (contracts/CometFoundation.sol#110-119)
Low level call in CometFoundation.\_loan(address,ICometFoundation.CallbackData,bytes) (contracts/CometFoundation.sol#132-137): - (ok,None) = endpoint.delegatecall(abi.encodeWithSelector(ICometFlashLoanPlugin.takeFlashLoan.selector,data,config)) (contracts/CometFoundation.sol#133-135)
Low level call in CometFoundation.\_repay(address,address,IERC20,uint256) (contracts/CometFoundation.sol#146-151): - (ok,None) = endpoint.delegatecall(abi.encodeWithSelector(ICometFlashLoanPlugin.repayFlashLoan.selector,flp,baseAsset,amount)) (contracts/CometFoundation.sol#147-149)
Low level call in CometMultiplier.fallback() (contracts/CometMultiplier.sol#51-72): - (ok,payload) = loanPlugin.delegatecall(msg.data) (contracts/CometMultiplier.sol#55)
Low level call in LiFiPlugin.executeSwap(address,address,uint256,bytes,bytes) (contracts/plugins/swap/LiFiPlugin.sol#30-62): - (ok,None) = router.call(swapData) (contracts/plugins/swap/LiFiPlugin.sol#49)
Low level call in OneInchV6SwapPlugin.executeSwap(address,address,uint256,bytes,bytes) (contracts/plugins/swap/OneInchV6Plugin.sol#28-60): - (ok,None) = router.call(swapData) (contracts/plugins/swap/OneInchV6Plugin.sol#47)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#low-level-calls
INFO:Slither:. analyzed (56 contracts with 97 detectors), 45 result(s) found
