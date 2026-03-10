"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Plus, Trash2, Upload, X, Save } from "lucide-react";

export default function Page() {
    const defaultCards = [
        {
            title: "Moving Averages & Trend",
            description: "SMA, EMA, WMA, VWMA, Ichimoku, MACD, ADX, SuperTrend",
            image: "/MovingAveragesTrend.png",
            content: `
//@version=5
indicator("Moving Averages & Trend Analysis", overlay=true)

// === INPUTS ===
// Moving Averages
maLength = input.int(20, "MA Length", minval=1)
showSMA = input.bool(true, "Show SMA")
showEMA = input.bool(true, "Show EMA")
showWMA = input.bool(true, "Show WMA")
showVWMA = input.bool(true, "Show VWMA")

// Ichimoku
showIchimoku = input.bool(true, "Show Ichimoku")
tenkanLength = input.int(9, "Tenkan Length", minval=1)
kijunLength = input.int(26, "Kijun Length", minval=1)
senkouBLength = input.int(52, "Senkou B Length", minval=1)
displacement = input.int(26, "Displacement", minval=1)

// SuperTrend
showSuperTrend = input.bool(true, "Show SuperTrend")
stLength = input.int(10, "SuperTrend Length", minval=1)
stMultiplier = input.float(3.0, "SuperTrend Multiplier", minval=0.1, step=0.1)

// MACD
macdFast = input.int(12, "MACD Fast", minval=1)
macdSlow = input.int(26, "MACD Slow", minval=1)
macdSignal = input.int(9, "MACD Signal", minval=1)

// ADX
adxLength = input.int(14, "ADX Length", minval=1)

// Display Options
showSignals = input.bool(true, "Show Trend Signals")
showPanel = input.bool(true, "Show Trend Panel")

// === MOVING AVERAGES ===
sma_val = ta.sma(close, maLength)
ema_val = ta.ema(close, maLength)
wma_val = ta.wma(close, maLength)
vwma_val = ta.vwma(close, maLength)

// === ICHIMOKU ===
tenkanSen = (ta.highest(high, tenkanLength) + ta.lowest(low, tenkanLength)) / 2
kijunSen = (ta.highest(high, kijunLength) + ta.lowest(low, kijunLength)) / 2
senkouSpanA = (tenkanSen + kijunSen) / 2
senkouSpanB = (ta.highest(high, senkouBLength) + ta.lowest(low, senkouBLength)) / 2
chikouSpan = close

// === SUPERTREND ===
atr_val = ta.atr(stLength)
upperBand = (high + low) / 2 + stMultiplier * atr_val
lowerBand = (high + low) / 2 - stMultiplier * atr_val

var float superTrend = na
var bool trendUp = true

prevSuperTrend = superTrend[1]
prevTrendUp = trendUp[1]

if na(prevSuperTrend)
    superTrend := lowerBand
    trendUp := true
else
    if prevTrendUp
        lowerBand := lowerBand > prevSuperTrend ? lowerBand : prevSuperTrend
        superTrend := close <= lowerBand ? upperBand : lowerBand
        trendUp := close > lowerBand
    else
        upperBand := upperBand < prevSuperTrend ? upperBand : prevSuperTrend
        superTrend := close >= upperBand ? lowerBand : upperBand
        trendUp := close < upperBand

// === MACD ===
macdLine = ta.ema(close, macdFast) - ta.ema(close, macdSlow)
signalLine = ta.ema(macdLine, macdSignal)
macdHistogram = macdLine - signalLine

// === ADX & DMI ===
// Calculate True Range and Directional Movement
tr = ta.tr
dmPlus = high - high[1] > low[1] - low ? math.max(high - high[1], 0) : 0
dmMinus = low[1] - low > high - high[1] ? math.max(low[1] - low, 0) : 0

// Smooth the values
smoothedTR = ta.rma(tr, adxLength)
smoothedDMPlus = ta.rma(dmPlus, adxLength)
smoothedDMMinus = ta.rma(dmMinus, adxLength)

// Calculate DI+ and DI-
diPlus = 100 * smoothedDMPlus / smoothedTR
diMinus = 100 * smoothedDMMinus / smoothedTR

// Calculate DX and ADX
dx = 100 * math.abs(diPlus - diMinus) / (diPlus + diMinus)
adxValue = ta.rma(dx, adxLength)

// === TREND ANALYSIS ===
// MA Trend
maTrend = close > sma_val ? 1 : close < sma_val ? -1 : 0
emaTrend = close > ema_val ? 1 : close < ema_val ? -1 : 0

// Ichimoku Trend
ichimokuBullish = close > senkouSpanA and close > senkouSpanB and tenkanSen > kijunSen
ichimokuBearish = close < senkouSpanA and close < senkouSpanB and tenkanSen < kijunSen
ichimokuTrend = ichimokuBullish ? 1 : ichimokuBearish ? -1 : 0

// SuperTrend
superTrendSignal = trendUp ? 1 : -1

// MACD Trend
macdTrend = macdLine > signalLine ? 1 : macdLine < signalLine ? -1 : 0

// ADX Trend Strength
adxStrong = adxValue > 25
adxWeak = adxValue < 20

// Combined Trend Score
trendScore = maTrend + emaTrend + ichimokuTrend + superTrendSignal + macdTrend

// === SIGNALS ===
// Trend change signals
bullishSignal = trendScore >= 3 and trendScore[1] < 3
bearishSignal = trendScore <= -3 and trendScore[1] > -3

// SuperTrend signals
stBullish = trendUp and not trendUp[1]
stBearish = not trendUp and trendUp[1]

// === PLOTTING ===
// Moving Averages
plot(showSMA ? sma_val : na, color=color.gray, title="SMA", linewidth=2)
plot(showEMA ? ema_val : na, color=color.orange, title="EMA", linewidth=2)
plot(showWMA ? wma_val : na, color=color.blue, title="WMA", linewidth=2)
plot(showVWMA ? vwma_val : na, color=color.purple, title="VWMA", linewidth=2)

// Ichimoku
plot(showIchimoku ? tenkanSen : na, color=color.red, title="Tenkan Sen", linewidth=1)
plot(showIchimoku ? kijunSen : na, color=color.blue, title="Kijun Sen", linewidth=1)
plot(showIchimoku ? senkouSpanA : na, color=color.green, title="Senkou Span A", offset=displacement)
plot(showIchimoku ? senkouSpanB : na, color=color.red, title="Senkou Span B", offset=displacement)
plot(showIchimoku ? chikouSpan : na, color=color.yellow, title="Chikou Span", offset=-displacement)

// Ichimoku Cloud
spanA = plot(showIchimoku ? senkouSpanA : na, color=na, offset=displacement)
spanB = plot(showIchimoku ? senkouSpanB : na, color=na, offset=displacement)
fill(spanA, spanB, color=senkouSpanA > senkouSpanB ? color.new(color.green, 80) : color.new(color.red, 80))

// SuperTrend
plot(showSuperTrend ? superTrend : na, color=trendUp ? color.green : color.red, title="SuperTrend", linewidth=2)

// === SIGNALS ===
plotshape(showSignals and bullishSignal, style=shape.triangleup, location=location.belowbar, color=color.lime, size=size.normal, title="Bullish Trend")
plotshape(showSignals and bearishSignal, style=shape.triangledown, location=location.abovebar, color=color.red, size=size.normal, title="Bearish Trend")
plotshape(showSignals and stBullish, style=shape.labelup, location=location.belowbar, color=color.green, size=size.small, title="ST Bullish")
plotshape(showSignals and stBearish, style=shape.labeldown, location=location.abovebar, color=color.red, size=size.small, title="ST Bearish")

// === TREND PANEL ===
var table trendTable = table.new(position.bottom_right, 2, 8, border_width=1, border_color=color.white, frame_width=1, frame_color=color.gray)

if barstate.islast and showPanel
    // Header
    table.cell(trendTable, 0, 0, "TREND ANALYSIS", text_color=color.white, bgcolor=color.new(color.blue, 0), text_size=size.normal)
    table.cell(trendTable, 1, 0, "STATUS", text_color=color.white, bgcolor=color.new(color.blue, 0), text_size=size.normal)
    
    // Moving Averages
    maStatus = maTrend == 1 ? "🟢 Bullish" : maTrend == -1 ? "🔴 Bearish" : "⚪ Neutral"
    table.cell(trendTable, 0, 1, "MA Trend", text_color=color.gray, bgcolor=color.new(color.gray, 50))
    table.cell(trendTable, 1, 1, maStatus, text_color=color.white, bgcolor=maTrend == 1 ? color.new(color.green, 70) : maTrend == -1 ? color.new(color.red, 70) : color.new(color.gray, 70))
    
    // Ichimoku
    ichimokuStatus = ichimokuTrend == 1 ? "🟢 Bullish" : ichimokuTrend == -1 ? "🔴 Bearish" : "⚪ Neutral"
    table.cell(trendTable, 0, 2, "Ichimoku", text_color=color.yellow, bgcolor=color.new(color.gray, 50))
    table.cell(trendTable, 1, 2, ichimokuStatus, text_color=color.white, bgcolor=ichimokuTrend == 1 ? color.new(color.green, 70) : ichimokuTrend == -1 ? color.new(color.red, 70) : color.new(color.gray, 70))
    
    // SuperTrend
    stStatus = superTrendSignal == 1 ? "🟢 Bullish" : "🔴 Bearish"
    table.cell(trendTable, 0, 3, "SuperTrend", text_color=color.lime, bgcolor=color.new(color.gray, 50))
    table.cell(trendTable, 1, 3, stStatus, text_color=color.white, bgcolor=superTrendSignal == 1 ? color.new(color.green, 70) : color.new(color.red, 70))
    
    // MACD
    macdStatus = macdTrend == 1 ? "🟢 Bullish" : macdTrend == -1 ? "🔴 Bearish" : "⚪ Neutral"
    macdValueStr = str.tostring(macdHistogram, "#.####")
    table.cell(trendTable, 0, 4, "MACD (" + macdValueStr + ")", text_color=color.orange, bgcolor=color.new(color.gray, 50))
    table.cell(trendTable, 1, 4, macdStatus, text_color=color.white, bgcolor=macdTrend == 1 ? color.new(color.green, 70) : macdTrend == -1 ? color.new(color.red, 70) : color.new(color.gray, 70))
    
    // ADX
    adxStatus = adxStrong ? "🟢 Strong" : adxWeak ? "🔴 Weak" : "🟡 Moderate"
    adxValueStr = str.tostring(adxValue, "#.##")
    table.cell(trendTable, 0, 5, "ADX (" + adxValueStr + ")", text_color=color.teal, bgcolor=color.new(color.gray, 50))
    table.cell(trendTable, 1, 5, adxStatus, text_color=color.white, bgcolor=adxStrong ? color.new(color.green, 70) : adxWeak ? color.new(color.red, 70) : color.new(color.yellow, 70))
    
    // Overall Trend
    overallStatus = trendScore >= 3 ? "🟢 Strong Bull" : trendScore >= 1 ? "🟡 Weak Bull" : trendScore <= -3 ? "🔴 Strong Bear" : trendScore <= -1 ? "🟡 Weak Bear" : "⚪ Sideways"
    table.cell(trendTable, 0, 6, "Overall Trend", text_color=color.white, bgcolor=color.new(color.gray, 50))
    overallColor = trendScore >= 1 ? color.new(color.green, 70) : trendScore <= -1 ? color.new(color.red, 70) : color.new(color.gray, 70)
    table.cell(trendTable, 1, 6, overallStatus, text_color=color.white, bgcolor=overallColor)
    
    // Trend Score
    scoreValue = str.tostring(trendScore, "#")
    table.cell(trendTable, 0, 7, "Trend Score", text_color=color.purple, bgcolor=color.new(color.gray, 50))
    table.cell(trendTable, 1, 7, scoreValue + "/5", text_color=color.white, bgcolor=overallColor)

// === ALERTS ===
alertcondition(bullishSignal, title="Strong Bullish Trend", message="Multiple indicators confirm bullish trend")
alertcondition(bearishSignal, title="Strong Bearish Trend", message="Multiple indicators confirm bearish trend")
alertcondition(stBullish, title="SuperTrend Bullish", message="SuperTrend turned bullish")
alertcondition(stBearish, title="SuperTrend Bearish", message="SuperTrend turned bearish")
alertcondition(adxValue > 30, title="Strong Trend Detected", message="ADX indicates strong trending market")
alertcondition(adxValue < 15, title="Weak Trend Alert", message="ADX indicates weak/sideways market")

      `,
        },
        {
            title: "Volatility Envelopes",
            image: "/VolatilityEnvelopes.png",
            description: "(ATR, Bollinger Bands, Keltner Channel, Donchian Channel)",
            content: `
//@version=5
indicator("Volatility Envelopes", overlay=true)

// === INPUTS ===
length = input.int(20, "Length", minval=1)
mult = input.float(2.0, "Multiplier", minval=0.1, step=0.1)
atrLength = input.int(14, "ATR Length", minval=1)

// Display Options
showBB = input.bool(true, "Show Bollinger Bands")
showKC = input.bool(true, "Show Keltner Channel")
showDC = input.bool(true, "Show Donchian Channel")
showFill = input.bool(true, "Show Fill Areas")
showSignals = input.bool(true, "Show Breakout Signals")
showPanel = input.bool(true, "Show Volatility Panel")

// === CALCULATIONS ===
// ATR
atr_val = ta.atr(atrLength)

// Bollinger Bands
basis = ta.sma(close, length)
dev = mult * ta.stdev(close, length)
upperBB = basis + dev
lowerBB = basis - dev

// Keltner Channel
ema_val = ta.ema(close, length)
upperKC = ema_val + mult * atr_val
lowerKC = ema_val - mult * atr_val

// Donchian Channel
donch_high = ta.highest(high, length)
donch_low = ta.lowest(low, length)
donch_mid = (donch_high + donch_low) / 2

// === VOLATILITY ANALYSIS ===
// Current volatility metrics
bbWidth = (upperBB - lowerBB) / basis * 100
kcWidth = (upperKC - lowerKC) / ema_val * 100
dcWidth = (donch_high - donch_low) / donch_mid * 100

// Volatility percentile (last 100 bars)
bbWidthPercentile = ta.percentrank(bbWidth, 100)
kcWidthPercentile = ta.percentrank(kcWidth, 100)
dcWidthPercentile = ta.percentrank(dcWidth, 100)

// Average volatility
avgVolatility = (bbWidthPercentile + kcWidthPercentile + dcWidthPercentile) / 3

// === BREAKOUT SIGNALS ===
// Bollinger Band breakouts
bbUpperBreakout = ta.crossover(close, upperBB)
bbLowerBreakout = ta.crossunder(close, lowerBB)

// Keltner Channel breakouts
kcUpperBreakout = ta.crossover(close, upperKC)
kcLowerBreakout = ta.crossunder(close, lowerKC)

// Donchian Channel breakouts
dcUpperBreakout = ta.crossover(close, donch_high)
dcLowerBreakout = ta.crossunder(close, donch_low)

// Combined breakout signals
bullishBreakout = bbUpperBreakout or kcUpperBreakout or dcUpperBreakout
bearishBreakout = bbLowerBreakout or kcLowerBreakout or dcLowerBreakout

// === SQUEEZE DETECTION ===
// Bollinger Bands inside Keltner Channel (squeeze)
squeeze = lowerBB > lowerKC and upperBB < upperKC
squeezRelease = squeeze[1] and not squeeze

// === PLOTTING ===
// Bollinger Bands
plot(showBB ? upperBB : na, color=color.red, title="Upper BB", linewidth=2)
plot(showBB ? lowerBB : na, color=color.red, title="Lower BB", linewidth=2)
plot(showBB ? basis : na, color=color.red, title="BB Basis", linewidth=1, style=plot.style_line)

// Keltner Channel
plot(showKC ? upperKC : na, color=color.orange, title="Upper KC", linewidth=2)
plot(showKC ? lowerKC : na, color=color.orange, title="Lower KC", linewidth=2)
plot(showKC ? ema_val : na, color=color.orange, title="KC EMA", linewidth=1, style=plot.style_line)

// Donchian Channel
plot(showDC ? donch_high : na, color=color.green, title="Donchian High", linewidth=2)
plot(showDC ? donch_low : na, color=color.green, title="Donchian Low", linewidth=2)
plot(showDC ? donch_mid : na, color=color.green, title="Donchian Mid", linewidth=1, style=plot.style_line)

// Fill areas
fill(plot(showBB and showFill ? upperBB : na), plot(showBB and showFill ? lowerBB : na), color=color.new(color.red, 90), title="BB Fill")
fill(plot(showKC and showFill ? upperKC : na), plot(showKC and showFill ? lowerKC : na), color=color.new(color.orange, 90), title="KC Fill")
fill(plot(showDC and showFill ? donch_high : na), plot(showDC and showFill ? donch_low : na), color=color.new(color.green, 90), title="DC Fill")

// === SIGNALS ===
// Breakout signals
plotshape(showSignals and bullishBreakout, style=shape.triangleup, location=location.belowbar, color=color.lime, size=size.small, title="Bullish Breakout")
plotshape(showSignals and bearishBreakout, style=shape.triangledown, location=location.abovebar, color=color.red, size=size.small, title="Bearish Breakout")

// Squeeze signals
plotshape(showSignals and squeeze, style=shape.circle, location=location.bottom, color=color.yellow, size=size.tiny, title="Squeeze")
plotshape(showSignals and squeezRelease, style=shape.diamond, location=location.bottom, color=color.blue, size=size.small, title="Squeeze Release")

// === VOLATILITY PANEL ===
var table volatilityTable = table.new(position.bottom_right, 2, 6, border_width=1, border_color=color.white, frame_width=1, frame_color=color.gray)

if barstate.islast and showPanel
    // Header
    table.cell(volatilityTable, 0, 0, "VOLATILITY", text_color=color.white, bgcolor=color.new(color.blue, 0), text_size=size.normal)
    table.cell(volatilityTable, 1, 0, "STATUS", text_color=color.white, bgcolor=color.new(color.blue, 0), text_size=size.normal)
    
    // Bollinger Bands
    bbStatus = bbWidthPercentile > 80 ? "🔴 High" : bbWidthPercentile < 20 ? "🟢 Low" : "🟡 Normal"
    bbValue = str.tostring(bbWidth, "#.##") + "%"
    table.cell(volatilityTable, 0, 1, "BB Width (" + bbValue + ")", text_color=color.red, bgcolor=color.new(color.gray, 50))
    table.cell(volatilityTable, 1, 1, bbStatus, text_color=color.rgb(146, 146, 146), bgcolor=bbWidthPercentile > 80 ? color.new(color.red, 70) : bbWidthPercentile < 20 ? color.new(color.green, 70) : color.new(color.yellow, 70))
    
    // Keltner Channel
    kcStatus = kcWidthPercentile > 80 ? "🔴 High" : kcWidthPercentile < 20 ? "🟢 Low" : "🟡 Normal"
    kcValue = str.tostring(kcWidth, "#.##") + "%"
    table.cell(volatilityTable, 0, 2, "KC Width (" + kcValue + ")", text_color=color.orange, bgcolor=color.new(color.gray, 50))
    table.cell(volatilityTable, 1, 2, kcStatus, text_color=color.rgb(143, 143, 143), bgcolor=kcWidthPercentile > 80 ? color.new(color.red, 70) : kcWidthPercentile < 20 ? color.new(color.green, 70) : color.new(color.yellow, 70))
    
    // Donchian Channel
    dcStatus = dcWidthPercentile > 80 ? "🔴 High" : dcWidthPercentile < 20 ? "🟢 Low" : "🟡 Normal"
    dcValue = str.tostring(dcWidth, "#.##") + "%"
    table.cell(volatilityTable, 0, 3, "DC Width (" + dcValue + ")", text_color=color.green, bgcolor=color.new(color.gray, 50))
    table.cell(volatilityTable, 1, 3, dcStatus, text_color=color.rgb(145, 145, 145), bgcolor=dcWidthPercentile > 80 ? color.new(color.red, 70) : dcWidthPercentile < 20 ? color.new(color.green, 70) : color.new(color.yellow, 70))
    
    // Overall Volatility
    overallStatus = avgVolatility > 70 ? "🔴 High Vol" : avgVolatility < 30 ? "🟢 Low Vol" : "🟡 Normal Vol"
    overallValue = str.tostring(avgVolatility, "#.##")
    table.cell(volatilityTable, 0, 4, "Overall (" + overallValue + ")", text_color=color.white, bgcolor=color.new(color.gray, 50))
    table.cell(volatilityTable, 1, 4, overallStatus, text_color=color.rgb(146, 146, 146), bgcolor=avgVolatility > 70 ? color.new(color.red, 70) : avgVolatility < 30 ? color.new(color.green, 70) : color.new(color.yellow, 70))
    
    // Squeeze Status
    squeezeStatus = squeeze ? "🟡 Squeeze ON" : "⚪ Squeeze OFF"
    table.cell(volatilityTable, 0, 5, "Squeeze", text_color=color.purple, bgcolor=color.new(color.gray, 50))
    table.cell(volatilityTable, 1, 5, squeezeStatus, text_color=color.rgb(145, 145, 145), bgcolor=squeeze ? color.new(color.yellow, 70) : color.new(color.gray, 70))

// === ALERTS ===
alertcondition(bullishBreakout, title="Bullish Breakout", message="Price breaking above volatility envelope")
alertcondition(bearishBreakout, title="Bearish Breakout", message="Price breaking below volatility envelope")
alertcondition(squeeze, title="Volatility Squeeze", message="Bollinger Bands inside Keltner Channel - low volatility")
alertcondition(squeezRelease, title="Squeeze Release", message="Volatility squeeze released - expect increased movement")
alertcondition(avgVolatility > 80, title="High Volatility Alert", message="Volatility reaching extreme levels")
alertcondition(avgVolatility < 20, title="Low Volatility Alert", message="Volatility at extremely low levels")
      `,
        },
        {
            title: "Momentum",
            image: "/Momentum.png",
            description: "(RSI, Stochastic RSI, CCI, Williams %R)",
            content: `
//@version=5
indicator("Momentum Analysis", overlay=true)

// === INPUTS ===
rsiLength = input.int(14, "RSI Length", minval=1)
stochRsiLength = input.int(14, "Stochastic RSI Length", minval=1)
stochRsiK = input.int(3, "Stochastic RSI %K", minval=1)
stochRsiD = input.int(3, "Stochastic RSI %D", minval=1)
cciLength = input.int(20, "CCI Length", minval=1)
williamsLength = input.int(14, "Williams %R Length", minval=1)

showMomentumPanel = input.bool(true, "Show Momentum Panel")
showSignals = input.bool(true, "Show Buy/Sell Signals")
showDivergence = input.bool(true, "Show Divergence Signals")

// === RSI CALCULATION ===
rsi = ta.rsi(close, rsiLength)
rsiOverbought = rsi > 70
rsiOversold = rsi < 30
rsiNeutral = rsi >= 30 and rsi <= 70
rsiTrend = rsi > rsi[1] ? 1 : rsi < rsi[1] ? -1 : 0

// === STOCHASTIC RSI ===
rsiForStoch = ta.rsi(close, stochRsiLength)
stochK = ta.stoch(rsiForStoch, rsiForStoch, rsiForStoch, stochRsiK)
stochRsiK_val = ta.sma(stochK, stochRsiK)
stochRsiD_val = ta.sma(stochRsiK_val, stochRsiD)

stochRsiOverbought = stochRsiK_val > 80
stochRsiOversold = stochRsiK_val < 20
stochRsiBullishCross = ta.crossover(stochRsiK_val, stochRsiD_val)
stochRsiBearishCross = ta.crossunder(stochRsiK_val, stochRsiD_val)

// === CCI CALCULATION ===
cci = ta.cci(close, cciLength)
cciOverbought = cci > 100
cciOversold = cci < -100
cciNeutral = cci >= -100 and cci <= 100
cciTrend = cci > cci[1] ? 1 : cci < cci[1] ? -1 : 0

// === WILLIAMS %R ===
williamsR = ta.wpr(williamsLength)
williamsOverbought = williamsR > -20
williamsOversold = williamsR < -80
williamsNeutral = williamsR >= -80 and williamsR <= -20
williamsTrend = williamsR > williamsR[1] ? 1 : williamsR < williamsR[1] ? -1 : 0

// === MOMENTUM DIVERGENCE DETECTION ===
priceHigh = ta.pivothigh(high, 5, 5)
priceLow = ta.pivotlow(low, 5, 5)

var float lastPriceHigh = na
var float lastRsiHigh = na
var float lastPriceLow = na
var float lastRsiLow = na

if not na(priceHigh)
    lastPriceHigh := high[5]
    lastRsiHigh := rsi[5]

if not na(priceLow)
    lastPriceLow := low[5]
    lastRsiLow := rsi[5]

// Divergence conditions
bullishDivergenceCondition1 = not na(priceLow) and not na(lastPriceLow)
bullishDivergenceCondition2 = not na(lastRsiLow) and low[5] < lastPriceLow
bullishDivergenceCondition3 = rsi[5] > lastRsiLow
bullishDivergence = bullishDivergenceCondition1 and bullishDivergenceCondition2 and bullishDivergenceCondition3

bearishDivergenceCondition1 = not na(priceHigh) and not na(lastPriceHigh)
bearishDivergenceCondition2 = not na(lastRsiHigh) and high[5] > lastPriceHigh
bearishDivergenceCondition3 = rsi[5] < lastRsiHigh
bearishDivergence = bearishDivergenceCondition1 and bearishDivergenceCondition2 and bearishDivergenceCondition3

// === COMBINED MOMENTUM SIGNALS ===
bullishCondition1 = rsiOversold and rsiTrend == 1
bullishCondition2 = stochRsiOversold and stochRsiBullishCross
bullishCondition3 = cciOversold and cciTrend == 1
bullishCondition4 = williamsOversold and williamsTrend == 1
bullishMomentum = bullishCondition1 or bullishCondition2 or bullishCondition3 or bullishCondition4

bearishCondition1 = rsiOverbought and rsiTrend == -1
bearishCondition2 = stochRsiOverbought and stochRsiBearishCross
bearishCondition3 = cciOverbought and cciTrend == -1
bearishCondition4 = williamsOverbought and williamsTrend == -1
bearishMomentum = bearishCondition1 or bearishCondition2 or bearishCondition3 or bearishCondition4

// === MOMENTUM STRENGTH CALCULATION ===
momentumScore = 0
momentumScore += rsiTrend == 1 ? 1 : rsiTrend == -1 ? -1 : 0
momentumScore += cciTrend == 1 ? 1 : cciTrend == -1 ? -1 : 0
momentumScore += williamsTrend == 1 ? 1 : williamsTrend == -1 ? -1 : 0
momentumScore += stochRsiK_val > stochRsiD_val ? 1 : -1

// === PLOTTING SIGNALS ===
plotshape(showSignals and bullishMomentum, style=shape.triangleup, location=location.belowbar, color=color.green, size=size.small, title="Bullish Momentum")
plotshape(showSignals and bearishMomentum, style=shape.triangledown, location=location.abovebar, color=color.red, size=size.small, title="Bearish Momentum")
plotshape(showDivergence and bullishDivergence, style=shape.diamond, location=location.belowbar, color=color.blue, size=size.small, title="Bullish Divergence")
plotshape(showDivergence and bearishDivergence, style=shape.diamond, location=location.abovebar, color=color.purple, size=size.small, title="Bearish Divergence")

// === MOMENTUM PANEL ===
var table momentumTable = table.new(position.bottom_right, 2, 7, border_width=1, border_color=color.white, frame_width=1, frame_color=color.gray)

if barstate.islast and showMomentumPanel
    table.cell(momentumTable, 0, 0, "MOMENTUM", text_color=color.white, bgcolor=color.new(color.purple, 0), text_size=size.normal)
    table.cell(momentumTable, 1, 0, "STATUS", text_color=color.white, bgcolor=color.new(color.purple, 0), text_size=size.normal)
    
    // RSI
    rsiStatus = rsiOverbought ? "🔴 Overbought" : rsiOversold ? "🟢 Oversold" : "⚪ Neutral"
    rsiValue = str.tostring(rsi, "#.##")
    rsiColor = rsiOverbought ? color.new(color.red, 70) : rsiOversold ? color.new(color.green, 70) : color.new(color.gray, 70)
    table.cell(momentumTable, 0, 1, "RSI (" + rsiValue + ")", text_color=color.yellow, bgcolor=color.new(color.gray, 50))
    table.cell(momentumTable, 1, 1, rsiStatus, text_color=color.white, bgcolor=rsiColor)
    
    // Stochastic RSI
    stochRsiStatus = stochRsiOverbought ? "🔴 Overbought" : stochRsiOversold ? "🟢 Oversold" : "⚪ Neutral"
    stochRsiValue = str.tostring(stochRsiK_val, "#.##")
    stochRsiColor = stochRsiOverbought ? color.new(color.red, 70) : stochRsiOversold ? color.new(color.green, 70) : color.new(color.gray, 70)
    table.cell(momentumTable, 0, 2, "Stoch RSI (" + stochRsiValue + ")", text_color=color.orange, bgcolor=color.new(color.gray, 50))
    table.cell(momentumTable, 1, 2, stochRsiStatus, text_color=color.white, bgcolor=stochRsiColor)
    
    // CCI
    cciStatus = cciOverbought ? "🔴 Overbought" : cciOversold ? "🟢 Oversold" : "⚪ Neutral"
    cciValue = str.tostring(cci, "#.##")
    cciColor = cciOverbought ? color.new(color.red, 70) : cciOversold ? color.new(color.green, 70) : color.new(color.gray, 70)
    table.cell(momentumTable, 0, 3, "CCI (" + cciValue + ")", text_color=color.blue, bgcolor=color.new(color.gray, 50))
    table.cell(momentumTable, 1, 3, cciStatus, text_color=color.white, bgcolor=cciColor)
    
    // Williams %R
    williamsStatus = williamsOverbought ? "🔴 Overbought" : williamsOversold ? "🟢 Oversold" : "⚪ Neutral"
    williamsValue = str.tostring(williamsR, "#.##")
    williamsColor = williamsOverbought ? color.new(color.red, 70) : williamsOversold ? color.new(color.green, 70) : color.new(color.gray, 70)
    table.cell(momentumTable, 0, 4, "Williams %R (" + williamsValue + ")", text_color=color.red, bgcolor=color.new(color.gray, 50))
    table.cell(momentumTable, 1, 4, williamsStatus, text_color=color.white, bgcolor=williamsColor)
    
    // Overall Momentum
    overallStatus = momentumScore > 1 ? "🟢 Strong Bull" : momentumScore == 1 ? "🟡 Weak Bull" : momentumScore == -1 ? "🟡 Weak Bear" : momentumScore < -1 ? "🔴 Strong Bear" : "⚪ Neutral"
    overallColor = momentumScore > 0 ? color.new(color.green, 70) : momentumScore < 0 ? color.new(color.red, 70) : color.new(color.gray, 70)
    table.cell(momentumTable, 0, 5, "Overall", text_color=color.white, bgcolor=color.new(color.gray, 50))
    table.cell(momentumTable, 1, 5, overallStatus, text_color=color.white, bgcolor=overallColor)
    
    // Signal Status
    signalStatus = bullishMomentum ? "🟢 BUY Signal" : bearishMomentum ? "🔴 SELL Signal" : "⚪ No Signal"
    signalColor = bullishMomentum ? color.new(color.green, 70) : bearishMomentum ? color.new(color.red, 70) : color.new(color.gray, 70)
    table.cell(momentumTable, 0, 6, "Signal", text_color=color.purple, bgcolor=color.new(color.gray, 50))
    table.cell(momentumTable, 1, 6, signalStatus, text_color=color.white, bgcolor=signalColor)

// === ALERTS ===
alertcondition(bullishMomentum, title="Bullish Momentum Signal", message="Multiple momentum indicators turning bullish")
alertcondition(bearishMomentum, title="Bearish Momentum Signal", message="Multiple momentum indicators turning bearish")
alertcondition(bullishDivergence, title="Bullish Divergence", message="Bullish divergence detected on RSI")
alertcondition(bearishDivergence, title="Bearish Divergence", message="Bearish divergence detected on RSI")
alertcondition(rsiOversold and rsiTrend == 1, title="RSI Oversold Recovery", message="RSI recovering from oversold levels")
alertcondition(rsiOverbought and rsiTrend == -1, title="RSI Overbought Decline", message="RSI declining from overbought levels")

      `,
        },
        {
            title: "Volume-Based Analysis",
            image: "/volumebased.png",
            description: "(Volume, OBV, Volume Profile, VWAP)",
            content: `

//@version=5
indicator("Volume Based Analysis", overlay=true)

// === INPUTS ===
obvSmooth = input.int(14, "OBV Smoothing Length", minval=1)
vpLookback = input.int(100, "Volume Profile Lookback", minval=50)
showVWAP = input.bool(true, "Show VWAP")
showOBV = input.bool(true, "Show OBV Signals")
showVolumeProfile = input.bool(true, "Show Volume Profile")
showVolumeAnalysis = input.bool(true, "Show Volume Analysis Panel")

// === VWAP CALCULATION ===
vwap_val = ta.vwap(close)
vwap_upper = vwap_val + ta.stdev(close, 20)
vwap_lower = vwap_val - ta.stdev(close, 20)

// === CUSTOM OBV IMPLEMENTATION ===
var float obv_val = 0.0
obv_val := nz(obv_val[1]) + (close > close[1] ? volume : close < close[1] ? -volume : 0)

// OBV Smoothed
obv_smooth = ta.sma(obv_val, obvSmooth)
obv_signal = obv_smooth > obv_smooth[1] ? 1 : obv_smooth < obv_smooth[1] ? -1 : 0

// === VOLUME ANALYSIS ===
avgVol = ta.sma(volume, 20)
volRatio = volume / avgVol
highVolume = volRatio > 1.5
lowVolume = volRatio < 0.5

// Volume trend
volTrend = ta.sma(volume, 10) > ta.sma(volume, 20) ? 1 : -1

// === VOLUME PROFILE (SIMPLIFIED) ===
// Calculate volume-weighted price levels
var float[] vol_profile_prices = array.new<float>()
var float[] vol_profile_volumes = array.new<float>()

if barstate.islast and showVolumeProfile
    // Clear previous data
    array.clear(vol_profile_prices)
    array.clear(vol_profile_volumes)
    
    // Get price range for lookback period
    highest_price = ta.highest(high, vpLookback)
    lowest_price = ta.lowest(low, vpLookback)
    price_range = highest_price - lowest_price
    
    // Create 10 price levels
    levels = 10
    level_size = price_range / levels
    
    // Calculate volume at each level
    for i = 0 to levels - 1
        level_price = lowest_price + (i * level_size)
        level_volume = 0.0
        
        // Sum volume for bars where price was at this level
        for j = 0 to vpLookback - 1
            if j < bar_index
                bar_high = high[j]
                bar_low = low[j]
                bar_vol = volume[j]
                
                if bar_low <= level_price and bar_high >= level_price
                    level_volume += bar_vol
        
        array.push(vol_profile_prices, level_price)
        array.push(vol_profile_volumes, level_volume)

// === VOLUME DIVERGENCE ===
// Price vs Volume divergence
priceChange = close - close[5]
volumeChange = ta.sma(volume, 5) - ta.sma(volume[5], 5)

bullish_divergence = priceChange < 0 and volumeChange > 0
bearish_divergence = priceChange > 0 and volumeChange < 0

// === PLOTTING ===
// VWAP and bands
plot(showVWAP ? vwap_val : na, color=color.orange, linewidth=2, title="VWAP")
plot(showVWAP ? vwap_upper : na, color=color.new(color.orange, 70), title="VWAP Upper")
plot(showVWAP ? vwap_lower : na, color=color.new(color.orange, 70), title="VWAP Lower")

// Volume bars coloring
barcolor(highVolume ? color.new(color.green, 70) : lowVolume ? color.new(color.red, 70) : na, title="Volume Bars")

// OBV signals
plotshape(showOBV and obv_signal == 1 and obv_signal[1] != 1, style=shape.triangleup, location=location.belowbar, color=color.green, size=size.small, title="OBV Buy Signal")
plotshape(showOBV and obv_signal == -1 and obv_signal[1] != -1, style=shape.triangledown, location=location.abovebar, color=color.red, size=size.small, title="OBV Sell Signal")

// Divergence signals
plotshape(bullish_divergence, style=shape.diamond, location=location.belowbar, color=color.blue, size=size.small, title="Bullish Divergence")
plotshape(bearish_divergence, style=shape.diamond, location=location.abovebar, color=color.purple, size=size.small, title="Bearish Divergence")

// === VOLUME ANALYSIS PANEL ===
var table volumeTable = table.new(position.bottom_right, 2, 6, border_width=1, border_color=color.white, frame_width=1, frame_color=color.gray)

if barstate.islast and showVolumeAnalysis
    // Header
    table.cell(volumeTable, 0, 0, "VOLUME ANALYSIS", text_color=color.white, bgcolor=color.new(color.blue, 0), text_size=size.normal)
    table.cell(volumeTable, 1, 0, "STATUS", text_color=color.white, bgcolor=color.new(color.blue, 0), text_size=size.normal)
    
    // Volume Level
    volStatus = highVolume ? "🟢 High" : lowVolume ? "🔴 Low" : "⚪ Normal"
    table.cell(volumeTable, 0, 1, "Volume", text_color=color.yellow, bgcolor=color.new(color.gray, 50))
    table.cell(volumeTable, 1, 1, volStatus, text_color=color.white, bgcolor=highVolume ? color.new(color.green, 70) : lowVolume ? color.new(color.red, 70) : color.new(color.gray, 70))
    
    // Volume Trend
    volTrendStatus = volTrend == 1 ? "🟢 Rising" : "🔴 Falling"
    table.cell(volumeTable, 0, 2, "Vol Trend", text_color=color.yellow, bgcolor=color.new(color.gray, 50))
    table.cell(volumeTable, 1, 2, volTrendStatus, text_color=color.white, bgcolor=volTrend == 1 ? color.new(color.green, 70) : color.new(color.red, 70))
    
    // OBV Signal
    obvStatus = obv_signal == 1 ? "🟢 Bullish" : obv_signal == -1 ? "🔴 Bearish" : "⚪ Neutral"
    table.cell(volumeTable, 0, 3, "OBV", text_color=color.blue, bgcolor=color.new(color.gray, 50))
    table.cell(volumeTable, 1, 3, obvStatus, text_color=color.white, bgcolor=obv_signal == 1 ? color.new(color.green, 70) : obv_signal == -1 ? color.new(color.red, 70) : color.new(color.gray, 70))
    
    // Price vs VWAP
    vwapStatus = close > vwap_val ? "🟢 Above VWAP" : "🔴 Below VWAP"
    table.cell(volumeTable, 0, 4, "VWAP", text_color=color.orange, bgcolor=color.new(color.gray, 50))
    table.cell(volumeTable, 1, 4, vwapStatus, text_color=color.white, bgcolor=close > vwap_val ? color.new(color.green, 70) : color.new(color.red, 70))
    
    // Overall Volume Strength
    volStrength = (highVolume ? 1 : 0) + (volTrend == 1 ? 1 : 0) + (obv_signal == 1 ? 1 : 0)
    strengthStatus = volStrength >= 2 ? "🟢 Strong" : volStrength == 1 ? "🟡 Moderate" : "🔴 Weak"
    table.cell(volumeTable, 0, 5, "Strength", text_color=color.purple, bgcolor=color.new(color.gray, 50))
    table.cell(volumeTable, 1, 5, strengthStatus, text_color=color.white, bgcolor=volStrength >= 2 ? color.new(color.green, 70) : volStrength == 1 ? color.new(color.orange, 70) : color.new(color.red, 70))

// === ALERTS ===
alertcondition(obv_signal == 1 and obv_signal[1] != 1, title="OBV Bullish Signal", message="OBV turning bullish")
alertcondition(obv_signal == -1 and obv_signal[1] != -1, title="OBV Bearish Signal", message="OBV turning bearish")
alertcondition(highVolume and close > vwap_val, title="High Volume Above VWAP", message="High volume breakout above VWAP")
alertcondition(bullish_divergence, title="Bullish Volume Divergence", message="Price down but volume up - potential reversal")
alertcondition(bearish_divergence, title="Bearish Volume Divergence", message="Price up but volume down - potential reversal")

      `,
        },
        {
            title: "Price Action & Market Structure",
            image: "/PriceActionStructure.png",
            description: "(Support/Resistance, BOS, FVG, Order Blocks)",
            content: `
//@version=5
indicator("Price Action & Structure", overlay=true)

// Swing High/Low Detection
pivot_high = ta.pivothigh(high, 5, 5)
pivot_low = ta.pivotlow(low, 5, 5)

// Plot swing points as SR zones
plotshape(pivot_high, location=location.abovebar, color=color.red, style=shape.triangledown, size=size.small)
plotshape(pivot_low, location=location.belowbar, color=color.green, style=shape.triangleup, size=size.small)

// Break of Structure (BOS) example: price breaks previous swing high/low
var float lastSwingHigh = na
var float lastSwingLow = na
if pivot_high
    lastSwingHigh := high[5]
if pivot_low
    lastSwingLow := low[5]

bos_up = low < lastSwingLow and not na(lastSwingLow)
bos_down = high > lastSwingHigh and not na(lastSwingHigh)

plotshape(bos_up, location=location.belowbar, color=color.orange, style=shape.labeldown, text="BOS Down")
plotshape(bos_down, location=location.abovebar, color=color.orange, style=shape.labelup, text="BOS Up")
      `,
        },
        {
            title: "Time/Session Based",
            image: "/SessionHighlow.png",
            description:
                "(Session High/Low, Time Range Highlighting, Opening Range Breakout)",
            content: `
//@version=5
indicator("Session High/Low and ORB", overlay=true)

// Define session times (e.g. London 08:00 - 16:00)
sess_start = timestamp("GMT+0", year, month, dayofmonth, 8, 0)
sess_end = timestamp("GMT+0", year, month, dayofmonth, 16, 0)

// Track session high/low
var float sessionHigh = na
var float sessionLow = na

if time >= sess_start and time <= sess_end
    sessionHigh := math.max(na(sessionHigh) ? low : sessionHigh, high)
    sessionLow := math.min(na(sessionLow) ? high : sessionLow, low)
else
    sessionHigh := na
    sessionLow := na

plot(sessionHigh, color=color.red, title="Session High")
plot(sessionLow, color=color.green, title="Session Low")

// Opening Range Breakout example (first 30 minutes)
openRangeStart = sess_start
openRangeEnd = sess_start + 30 * 60 * 1000 // 30 minutes in ms

var float openRangeHigh = na
var float openRangeLow = na

if time >= openRangeStart and time <= openRangeEnd
    openRangeHigh := math.max(na(openRangeHigh) ? low : openRangeHigh, high)
    openRangeLow := math.min(na(openRangeLow) ? high : openRangeLow, low)
else if time > openRangeEnd
    openRangeHigh := openRangeHigh
    openRangeLow := openRangeLow
else
    openRangeHigh := na
    openRangeLow := na

plot(openRangeHigh, color=color.orange, title="Opening Range High")
plot(openRangeLow, color=color.orange, title="Opening Range Low")
      `,
        },
        {
            title: "Confirmation & Alerts",
            image: "/Confirmalert.png",
            description:
                "(Divergence, Liquidity Sweep, Bias Meter, Institutional Order Flow)",
            content: `
//@version=5
indicator("MACD-RSI Divergence", overlay=true)

rsiVal = ta.rsi(close, 14)
[macdLine, signalLine, _] = ta.macd(close, 12, 26, 9)

divergenceBull = ta.lowest(low, 5)[1] < low and rsiVal[1] < rsiVal and macdLine[1] < macdLine
divergenceBear = ta.highest(high, 5)[1] > high and rsiVal[1] > rsiVal and macdLine[1] > macdLine

plotshape(divergenceBull, title="Bull Div", location=location.belowbar, color=color.green, style=shape.labelup, text="Bull Div")
plotshape(divergenceBear, title="Bear Div", location=location.abovebar, color=color.red, style=shape.labeldown, text="Bear Div")

alertcondition(divergenceBull, title="Bullish Divergence Alert", message="Bullish divergence detected")
alertcondition(divergenceBear, title="Bearish Divergence Alert", message="Bearish divergence detected")
      `,
        },
        {
            title: "Display table alertness",
            image: "/displaytable.png",
            description: "Shows Volume, Volatility, Trend condition, ATR",
            content: `
//@version=5
indicator("Trade Readiness Panel", overlay=true)

// === INPUTS ===
atrLen = input.int(14, "ATR Length")
emaLen = input.int(20, "EMA Trend Length")
volLen = input.int(20, "Volume Average Length")

// === VOLATILITY: ATR ===
atr = ta.atr(atrLen)
avgATR = ta.sma(atr, atrLen)
volatilityGood = atr > avgATR
volatilityStr = volatilityGood ? "High ✅" : "Low ❌"

// === VOLUME ===
avgVol = ta.sma(volume, volLen)
volumeGood = volume > avgVol
volumeStr = volumeGood ? "High ✅" : "Low ❌"

// === TREND: EMA vs Price ===
ema = ta.ema(close, emaLen)
trendUp = close > ema
trendStr = trendUp ? "Bullish ✅" : "Bearish ❌"

// === MARKET CONDITION ===
// Define consolidation: low volatility + choppy price action
priceRange = ta.highest(high, 10) - ta.lowest(low, 10)
avgRange = ta.sma(priceRange, 10)
isConsolidating = priceRange < avgRange * 0.7

marketCondition = isConsolidating ? "Consolidating ⚠️" : (trendUp ? "Trending Up ✅" : "Trending Down ❌")

// === FINAL READINESS ===
goodToTrade = volatilityGood and volumeGood and trendUp and not isConsolidating
status = goodToTrade ? "✅ READY TO TRADE" : "❌ WAIT FOR SETUP"

// === STABLE TABLE DISPLAY ===
var table infoTable = table.new(position.bottom_right, 2, 6, border_width=2, border_color=color.white, frame_width=1, frame_color=color.gray)

// Update table on every bar for real-time data
if barstate.islast
    // Header
    table.cell(infoTable, 0, 0, "TRADE READINESS", text_color=color.white, bgcolor=color.new(color.blue, 0), text_size=size.normal)
    table.cell(infoTable, 1, 0, status, text_color=color.white, bgcolor=goodToTrade ? color.new(color.green, 20) : color.new(color.red, 20), text_size=size.normal)
    
    // Volume Row
    table.cell(infoTable, 0, 1, "Volume", 
         text_color=color.white, 
         bgcolor=color.new(color.gray, 50))
    table.cell(infoTable, 1, 1, volumeStr, 
         text_color=color.white, 
         bgcolor=volumeGood ? color.new(color.green, 70) : color.new(color.red, 70))
    
    // Volatility Row
    table.cell(infoTable, 0, 2, "Volatility", 
         text_color=color.white, 
         bgcolor=color.new(color.gray, 50))
    table.cell(infoTable, 1, 2, volatilityStr, 
         text_color=color.white, 
         bgcolor=volatilityGood ? color.new(color.green, 70) : color.new(color.red, 70))
    
    // Trend Row
    table.cell(infoTable, 0, 3, "Trend", 
         text_color=color.white, 
         bgcolor=color.new(color.gray, 50))
    table.cell(infoTable, 1, 3, trendStr, 
         text_color=color.white, 
         bgcolor=trendUp ? color.new(color.green, 70) : color.new(color.red, 70))
    
    // Market Condition Row
    table.cell(infoTable, 0, 4, "Market", 
         text_color=color.white, 
         bgcolor=color.new(color.gray, 50))
    table.cell(infoTable, 1, 4, marketCondition, 
         text_color=color.white, 
         bgcolor=isConsolidating ? color.new(color.orange, 70) : (trendUp ? color.new(color.green, 70) : color.new(color.red, 70)))
    
    // ATR Value Row
    table.cell(infoTable, 0, 5, "ATR", 
         text_color=color.white, 
         bgcolor=color.new(color.gray, 50))
    table.cell(infoTable, 1, 5, str.tostring(atr, "#.####"), 
         text_color=color.white, 
         bgcolor=color.new(color.gray, 70))

// === PLOT EMA ON CHART ===
plot(ema, "EMA Trend", color=trendUp ? color.green : color.red, linewidth=2)

// === BACKGROUND COLOR FOR MARKET CONDITION ===
bgcolor(goodToTrade ? color.new(color.green, 95) : isConsolidating ? color.new(color.orange, 95) : color.new(color.red, 95), title="Market Condition Background")

        `,
        },

        {
            title: "Max RR Calculation Meter (in use✅)",
            image: "/MaxRRmeter.png",
            description: "Tradingview Pine Script RR meter",
            content: `
//@version=5
indicator("Max RR Calculator", overlay=true, max_lines_count=500, max_labels_count=500, max_boxes_count=100)

// Inputs
entryTimeInput = input.time(timestamp("2025-07-07 09:30"), title="Entry Time", confirm=true, group="Time")
stopPrice = input.price(0, title="Stop Loss Price", confirm=true, group="Stop Loss")
effectiveRR = input.float(title="First Trade RR", defval=4.5, minval=0.1, step=0.5,group="Risk to Reward")
second_effectiveRR = input.float(title="Second Trade RR", defval=2.0, minval=0.1, step=0.5,group="Risk to Reward")
backtestingMode = input.bool(title="Backtesting Mode", defval=false, group="Backtesting",tooltip = "Shows the maximum RR reached during the trading session.")
backtestingLabels = input.bool(title="Show 'Max RR' Labels in backtesting mode", defval=false,group="Backtesting")
showSecondTrade = input.bool(title="Enable Second Trade", defval=false,group="Settings",tooltip= "A second trade will be taken if the first trade gets stopped out. (Disable this if not needed for your strategy)")
Target_Hit_Label = input.bool(title="Show 'Target Hit' Labels", defval=true,group="Settings")
Stop_Hit_Label = input.bool(title="Show 'Stop Hit' Labels", defval=true,group="Settings")
Start_Stop_Labels = input.bool(title="Show 'Start/End Times' Labels", defval=false,group="Settings")
Ticks_Labels = input.bool(title="Show 'Ticks to Stop Loss' Labels", defval=false,group="Settings")
price_LevelsLabels = input.bool(title="Show Price Levels", defval=true,group="Settings")

// Use fixed RR of 500 in backtesting mode
rrRatio = backtestingMode ? 500 : effectiveRR
second_rrRatio = backtestingMode ? 500 : second_effectiveRR

// Input for reset time
resetTimeInput = input.time(defval=timestamp("2025-04-28 09:30"), title="End Time", confirm=false, group="Time")
hourOffset = input.float(title="Hour Offset", defval=-2, minval=-12, maxval=12,step=1, group = "Time")
resetAtnow = input.bool(title="Set End Time to Current Time",defval=true,group="Time")

autoResetTime = time <= (entryTimeInput + timeframe.in_seconds() * 10000) ? 
     entryTimeInput + (time - time[10]) : time

resetTimeInput := resetAtnow ? autoResetTime : resetTimeInput

// Box Style
firstTradeRiskColor = input.color(color.new(color.red, 80), "First Trade Risk  ", group="Box Style",inline = "01")
firstTradeRewardColor = input.color(color.new(color.green, 80), "First Trade Reward  ", group="Box Style",inline = "01")
secondTradeRiskColor = input.color(color.new(#FF5722, 80), "Second Trade Risk", group="Box Style",inline = "02")
secondTradeRewardColor = input.color(color.new(#4CAF50, 80), "Second Trade Reward", group="Box Style",inline = "02")
borderWidth = input.int(1, "Border Width", minval=1, maxval=20, group="Box Style",inline = "03")
borderOpacity = input.int(100, "Border Opacity", minval=0, maxval=100, group="Box Style",inline = "03")

//Lines Style
startLine = input.bool(title="Start Line", defval=true,group="Lines",inline = "04")
startLineColor = input.color(color.new(#9c27b0, 0), "", group="Lines",inline = "04")
startLineWidth = input.int(1, "Width", minval=1, maxval=10, group="Lines",inline = "04")
startStyleOption = input.string("solid (─)", title="Line Style", options=["solid (─)", "dotted (┈)", "dashed (╌)"],group="Lines",inline="04")
startLineStyle = startStyleOption == "dotted (┈)" ? line.style_dotted :
     startStyleOption == "dashed (╌)" ? line.style_dashed :
         line.style_solid
endLine = input.bool(title="End Line ", defval=false,group="Lines",inline = "05")
endLineColor = input.color(color.new(#787b86, 0), "", group="Lines",inline = "05")
endLineWidth = input.int(1, "Width", minval=1, maxval=10, group="Lines",inline = "05")
endStyleOption = input.string("solid (─)", title="Line Style", options=["solid (─)", "dotted (┈)", "dashed (╌)"],group="Lines",inline="05")
endLineStyle = endStyleOption == "dotted (┈)" ? line.style_dotted :
     endStyleOption == "dashed (╌)" ? line.style_dashed :
         line.style_solid
stopLine = input.bool(title="Stop Line", defval=false,group="Lines",inline = "06")
stopLineColor = input.color(color.new(#ff5252, 0), "", group="Lines",inline = "06")
stopLineWidth = input.int(2, "Width", minval=1, maxval=10, group="Lines",inline = "06")
stopStyleOption = input.string("solid (─)", title="Line Style", options=["solid (─)", "dotted (┈)", "dashed (╌)"],group="Lines",inline="06")
stopLineStyle = endStyleOption == "dotted (┈)" ? line.style_dotted :
     endStyleOption == "dashed (╌)" ? line.style_dashed :
         line.style_solid
stopLineLength = input.int(20, "Stop Line Length", minval=1, maxval=500,step=10, group="Lines",inline = "06")

//Table Style
Ticks_Table = input.bool(title="Show 'Ticks to Stop Loss' in Table", defval=true,group="Table Style")
tableHeadColor = input.color(color.new(#363a45, 0), "Table Header Color", group="Table Style",inline = "07")
tableTextHeadColor = input.color(color.new(#ffffff, 0), "Header Text Color", group="Table Style",inline = "07")
tableMainColor = input.color(color.new(#004985, 0), "Table Main Color  ", group="Table Style",inline = "08")
tableTextMainColor = input.color(color.new(#ffffff, 0), "Main Text Color  ", group="Table Style",inline = "08")
tableTextWinColor = input.color(color.new(#4caf50, 0), "Win Text Color    ", group="Table Style",inline = "09")
tableTextLossColor = input.color(color.new(#ff5252, 0), "Loss Text Color  ", group="Table Style",inline = "09")
tableSizeOption = input.string("Normal", title="Table Size", options=["Tiny", "Small", "Normal","Large","Huge"],group="Table Style",inline="10")
tableSize = tableSizeOption == "Tiny" ? size.tiny :
     tableSizeOption == "Small" ? size.small :
     tableSizeOption == "Normal" ? size.normal :
     tableSizeOption == "Large" ? size.large :
     tableSizeOption == "Huge" ? size.huge :
         size.large

tableSizeAdd = tableSizeOption == "Tiny" ? size.small : 
     tableSizeOption == "Small" ? size.normal :
     tableSizeOption == "Normal" ? size.large :
     tableSizeOption == "Large" ? size.huge :
     tableSizeOption == "Huge" ? size.huge : 
         size.normal

// Variables
var string tradeDirection = na
var float entryPrice = na
var float targetPrice = na
var int entryBarIndex = na
var bool tradeActive = false
var bool stopHit = false
var bool targetHit = false
var float maxRR = 0.0
var float maxRRPrice = na
var int maxRRBar = na
var float temp_extreme = na

// Label references
var label firstMaxRRLabel = na
var label secondMaxRRLabel = na
var label endLabel = na
var label firstTradeStopLabel = na
var label firstTradeTargetLabel = na
var label secondTradeStopLabel = na
var label secondTradeTargetLabel = na

var bool lookingForSecondTrade = false
var float secondEntryPrice = na
var float secondStopPrice = na
var float secondTargetPrice = na
var int secondEntryBarIndex = na
var bool secondTradeActive = false
var bool secondStopHit = false
var bool secondTargetHit = false
var float secondMaxRR = 0.0
var float secondMaxRRPrice = na
var int secondMaxRRBar = na
var float tempExtreme = na
var int stoppedBarIndex = na

// Box references
var box firstTradeRiskBox = na
var box firstTradeRewardBox = na
var box secondTradeRiskBox = na
var box secondTradeRewardBox = na

// Line references
var line entryTimeLine = na
var line resetTimeLine = na
var int resetLineBarIndex = na
var int boxRightIndex = na
var line stop_line = na

// Table for displaying RR
var table rrTable = table.new(position.top_right, 3, 6, bgcolor=tableMainColor, border_width=1, border_color = color.white)

// Calculate reset time based on user selection
resetTime = resetTimeInput
risk_ticks = str.tostring(math.abs(entryPrice - stopPrice) * 10, "###")

// Continuous color updates in realtime
updateBoxColors() =>
    if not na(firstTradeRiskBox)
        box.set_bgcolor(firstTradeRiskBox, firstTradeRiskColor)
        box.set_border_color(firstTradeRiskBox, color.new(firstTradeRiskColor, borderOpacity))
        box.set_border_width(firstTradeRiskBox,borderWidth)
    if not na(firstTradeRewardBox)
        box.set_bgcolor(firstTradeRewardBox, firstTradeRewardColor)
        box.set_border_color(firstTradeRewardBox, color.new(firstTradeRewardColor, borderOpacity))
        box.set_border_width(firstTradeRewardBox,borderWidth)
    if not na(secondTradeRiskBox)
        box.set_bgcolor(secondTradeRiskBox, secondTradeRiskColor)
        box.set_border_color(secondTradeRiskBox, color.new(secondTradeRiskColor, borderOpacity))
        box.set_border_width(secondTradeRiskBox,borderWidth)
    if not na(secondTradeRewardBox)
        box.set_bgcolor(secondTradeRewardBox, secondTradeRewardColor)
        box.set_border_color(secondTradeRewardBox, color.new(secondTradeRewardColor, borderOpacity))
        box.set_border_width(secondTradeRewardBox,borderWidth)

if barstate.isrealtime
    updateBoxColors()

// Update RR table
updateRRTable() =>
    if barstate.islast
        // Determine if we should show Trade 2 column
        bool showTrade2 = showSecondTrade and (not na(secondEntryPrice) and (secondStopHit or secondTargetHit or secondTradeActive))
        
        // Clear existing table
        table.clear(rrTable,0,0,2,5)
        
        // Set header row - only add Trade 2 column if needed
        table.cell(rrTable, 0, 0, "", bgcolor=tableHeadColor, text_color=tableTextHeadColor,text_size=tableSize)
        table.cell(rrTable, 1, 0, "Trade 1", bgcolor=tableHeadColor, text_color=tableTextHeadColor,text_size=tableSize)
        if showTrade2
            table.cell(rrTable, 2, 0, "Trade 2", bgcolor=tableHeadColor, text_color=tableTextHeadColor,text_size=tableSize)
        
        // Add date row
        table.cell(rrTable, 0, 1, "Date", text_color=tableTextMainColor,text_size=tableSize)
        table.cell(rrTable, 1, 1, str.tostring(year(time[bar_index - entryBarIndex])) + "/" + 
             str.tostring(month(time[bar_index - entryBarIndex]), "00") + "/" + 
             str.tostring(dayofmonth(time[bar_index - entryBarIndex]), "00"), 
             text_color=tableTextMainColor,text_size=tableSize)
        if showTrade2
            table.cell(rrTable, 2, 1, str.tostring(year(time[bar_index - secondEntryBarIndex])) + "/" + 
                 str.tostring(month(time[bar_index - secondEntryBarIndex]), "00") + "/" + 
                 str.tostring(dayofmonth(time[bar_index - secondEntryBarIndex]), "00"), 
                 text_color=tableTextMainColor,text_size=tableSize)
        
        // Add entry time row with timezone adjustment (UTC to America/Los_Angeles)
        table.cell(rrTable, 0, 2, "Entry Time", text_color=tableTextMainColor,text_size=tableSize)
        if not na(entryBarIndex)
            // Adjust for timezone (UTC to America/Los_Angeles)
            entryHour = hour(time[bar_index - entryBarIndex]) + hourOffset
            if entryHour < 0
                entryHour := entryHour + 24
            entryMin = minute(time[bar_index - entryBarIndex])
            ampm = entryHour >= 12 ? "PM" : "AM"
            entryHour := entryHour % 12
            entryHour := entryHour == 0 ? 12 : entryHour
            table.cell(rrTable, 1, 2, str.tostring(entryHour) + ":" + str.tostring(entryMin, "00") + " " + ampm, 
                 text_color=tableTextMainColor,text_size=tableSize)
        if showTrade2 and not na(secondEntryBarIndex)
            // Adjust for timezone (UTC to America/Los_Angeles)
            secondEntryHour = hour(time[bar_index - secondEntryBarIndex]) + hourOffset
            if secondEntryHour < 0
                secondEntryHour := secondEntryHour + 24
            secondEntryMin = minute(time[bar_index - secondEntryBarIndex])
            secondAmpm = secondEntryHour >= 12 ? "PM" : "AM"
            secondEntryHour := secondEntryHour % 12
            secondEntryHour := secondEntryHour == 0 ? 12 : secondEntryHour
            table.cell(rrTable, 2, 2, str.tostring(secondEntryHour) + ":" + str.tostring(secondEntryMin, "00") + " " + secondAmpm, 
                 text_color=tableTextMainColor,text_size=tableSize)
        
        // Add ticks to SL row if enabled
        if Ticks_Table
            table.cell(rrTable, 0, 3, "Ticks to SL", text_color=tableTextMainColor,text_size=tableSize)
            if not na(entryPrice)
                ticksToSL = math.round(math.abs(entryPrice - stopPrice) / syminfo.mintick)
                table.cell(rrTable, 1, 3, str.tostring(ticksToSL), 
                     text_color=tableTextMainColor,text_size=tableSize)
            if showTrade2 and not na(secondEntryPrice)
                secondTicksToSL = math.round(math.abs(secondEntryPrice - secondStopPrice) / syminfo.mintick)
                table.cell(rrTable, 2, 3, str.tostring(secondTicksToSL), 
                     text_color=tableTextMainColor,text_size=tableSize)
        
        // Add Max RR row
        table.cell(rrTable, 0, 4, "Max RR", text_color=tableTextMainColor,text_size=tableSize)
        if not na(maxRR)
            table.cell(rrTable, 1, 4, str.tostring(math.round(maxRR, 2)), 
                 text_color=backtestingMode ? color.orange : (maxRR >= effectiveRR ? tableTextWinColor : tableTextLossColor),text_size=tableSizeAdd)
        if showTrade2 and not na(secondMaxRR)
            table.cell(rrTable, 2, 4, str.tostring(math.round(secondMaxRR, 2)), 
                 text_color=backtestingMode ? color.orange : (secondMaxRR >= second_effectiveRR ? tableTextWinColor : tableTextLossColor),text_size=tableSizeAdd)
        
        // First trade result
        table.cell(rrTable, 0, 5, "Result", text_color=tableTextMainColor,text_size=tableSize)
        if not stopHit and not targetHit
            table.cell(rrTable, 1, 5, backtestingMode ? "Backtesting" : "In Progress",
                 text_color=backtestingMode ? color.orange : tableTextMainColor,text_size=tableSize)
        else if not na(maxRR)
            table.cell(rrTable, 1, 5, backtestingMode ? "Backtesting" : (maxRR >= effectiveRR ? "Won" : "Loss"), 
                 text_color=backtestingMode ? color.orange : (maxRR >= effectiveRR ? tableTextWinColor : tableTextLossColor),text_size=backtestingMode ? tableSize : tableSizeAdd)
        // Second trade result
        if showTrade2  // Only check if we actually have a second trade
            if not secondStopHit and not secondTargetHit
                table.cell(rrTable, 2, 5, backtestingMode ? "Backtesting" : "In Progress",
                     text_color=backtestingMode ? color.orange : tableTextMainColor,text_size=tableSize)
            else if not na(secondMaxRR)
                table.cell(rrTable, 2, 5, backtestingMode ? "Backtesting" : (secondMaxRR >= second_effectiveRR ? "Won" : "Loss"), 
                     text_color=backtestingMode ? color.orange : (secondMaxRR >= second_effectiveRR ? tableTextWinColor : tableTextLossColor),
                     text_size=backtestingMode ? tableSize : tableSizeAdd)

// Draw entry time vertical line
if time == entryTimeInput and startLine
    entryTimeLine := line.new(
         bar_index, high + 10000 * syminfo.mintick, 
         bar_index, low - 10000 * syminfo.mintick, 
         width=startLineWidth, color=startLineColor, 
         style=startLineStyle)
    if Start_Stop_Labels
        label.new(bar_index, high, "Entry Time", style=label.style_label_down, color=color.purple, textcolor=color.white, size=size.small)

// Draw reset time vertical line
if time == resetTimeInput and not resetAtnow and endLine
    resetTimeLine := line.new(
         bar_index, high + 10000 * syminfo.mintick, 
         bar_index, low - 10000 * syminfo.mintick, 
         width=endLineWidth, color=endLineColor, 
         style=endLineStyle)
    if Start_Stop_Labels
        label.new(bar_index, high, "End Time", style=label.style_label_down, color=color.gray, textcolor=color.white, size=size.small)

if barstate.islast and resetAtnow
    boxRightIndex := time <= (entryTimeInput + timeframe.in_seconds() * 10000) ? entryTimeInput + (time - time[10]) : time
    line.delete(resetTimeLine) 
    if endLine
        resetTimeLine := line.new(
             bar_index, high + 10000 * syminfo.mintick, 
             bar_index, low - 10000 * syminfo.mintick, 
             width=endLineWidth, color=endLineColor, 
             style=endLineStyle)
    
    // Update existing boxes to end at the current bar_index
    if not na(firstTradeRiskBox) and tradeActive
        box.set_right(firstTradeRiskBox, boxRightIndex)
    if not na(firstTradeRewardBox) and tradeActive
        box.set_right(firstTradeRewardBox, boxRightIndex)
    if not na(secondTradeRiskBox) and secondTradeActive
        box.set_right(secondTradeRiskBox, boxRightIndex)
    if not na(secondTradeRewardBox) and secondTradeActive
        box.set_right(secondTradeRewardBox, boxRightIndex)

    if Start_Stop_Labels
        label.delete(endLabel)
        endLabel := label.new(bar_index, high, "End Time", style=label.style_label_down, color=color.gray, textcolor=color.white, size=size.small)

// Draw stop price line
if time == entryTimeInput and stopLine
    if not na(stop_line)
        line.delete(stop_line)
    stop_line := line.new(
         x1=bar_index - stopLineLength, y1=stopPrice,  
         x2=bar_index + stopLineLength, y2=stopPrice,  
         width=stopLineWidth, color=stopLineColor,
         style= stopLineStyle)

// Entry condition (on the candle close at entry time)
if time == entryTimeInput and not tradeActive and not na(stopPrice) and stopPrice > 0
    entryPrice := close
    tradeDirection := entryPrice > stopPrice ? "Long" : "Short"
    targetPrice := tradeDirection == "Long" ? close + (close - stopPrice) * rrRatio : close - (stopPrice - close) * rrRatio
    entryBarIndex := bar_index
    tradeActive := true
    
    // For first trade boxes
    if tradeDirection == "Long"
        firstTradeRiskBox := box.new(
             left=time, top=entryPrice, 
             right=resetTimeInput, bottom=stopPrice,
             xloc=xloc.bar_time,
             bgcolor=firstTradeRiskColor , 
             border_color=color.new(firstTradeRiskColor,borderOpacity),
             border_width=borderWidth)
        firstTradeRewardBox := box.new(
             left=time, top=targetPrice, 
             right=resetTimeInput, bottom=entryPrice,
             xloc=xloc.bar_time,
             bgcolor=firstTradeRewardColor , 
             border_color=color.new(firstTradeRewardColor,borderOpacity),
             border_width=borderWidth)
    else
        firstTradeRiskBox := box.new(
             left=time, top=stopPrice, 
             right=resetTimeInput, bottom=entryPrice,
             xloc=xloc.bar_time,
             bgcolor=firstTradeRiskColor , 
             border_color=color.new(firstTradeRiskColor,borderOpacity),
             border_width=borderWidth)
        firstTradeRewardBox := box.new(
             left=time, top=entryPrice, 
             right=resetTimeInput, bottom=targetPrice,
             xloc=xloc.bar_time,
             bgcolor=firstTradeRewardColor , 
             border_color=color.new(firstTradeRewardColor,borderOpacity),
             border_width=borderWidth)

    if Ticks_Labels
        Risk_ticks = str.tostring(math.round(math.abs(entryPrice - stopPrice) / syminfo.mintick))
        label.new(bar_index, stopPrice, 
                 text=Risk_ticks + " Tick SL", 
                 style=tradeDirection == "Long" ? label.style_label_up : label.style_label_down,
                 color=color.blue, textcolor=color.white, size=size.small)

    if price_LevelsLabels
        label.delete(firstTradeStopLabel)
        firstTradeStopLabel := label.new(
             bar_index + 1, stopPrice, 
             text=str.tostring(stopPrice, format.mintick), 
             style=label.style_label_right, 
             color=color.new(color.black,100), 
             textcolor=color.new(firstTradeRiskColor,0), 
             size=size.small)

        if not backtestingMode
            label.delete(firstTradeTargetLabel)
            firstTradeTargetLabel := label.new(
                 bar_index + 1, targetPrice, 
                 text=str.tostring(targetPrice, format.mintick), 
                 style=label.style_label_right, 
                 color=color.new(color.black,100), 
                 textcolor=color.new(firstTradeRewardColor,0), 
                 size=size.small)

// Track max RR for first trade
if tradeActive and bar_index > entryBarIndex and not stopHit and not targetHit and time <= resetTime
    currentRR = 0.0
    if tradeDirection == "Long"
        currentRR := (high - entryPrice) / (entryPrice - stopPrice)
    else
        currentRR := (entryPrice - low) / (stopPrice - entryPrice)
    
    if currentRR > maxRR and not targetHit
        maxRR := currentRR
        maxRRPrice := tradeDirection == "Long" ? high : low
        maxRRBar := bar_index

// Show user's trade 1 RR target if target is hit while not in backtesting mode
if targetHit and not backtestingMode
    maxRR := effectiveRR

// Add Backtesting RR label for first trade
if backtestingMode and not na(maxRRPrice) and barstate.islast and backtestingLabels
    if not na(firstMaxRRLabel)
        label.delete(firstMaxRRLabel)
    firstMaxRRLabel := label.new(
         maxRRBar, maxRRPrice, 
         "Max RR: " + str.tostring(math.round(maxRR, 2)) + " (Trade 1)", 
         style=label.style_label_left, 
         color=color.rgb(217, 1, 255), 
         textcolor=color.white, 
         size=size.small)

// Check for stop hit on first trade
if tradeActive and bar_index > entryBarIndex and ((tradeDirection == "Long" and low < stopPrice) or (tradeDirection == "Short" and high > stopPrice)) and not stopHit and not targetHit
    stopHit := true
    tradeActive := false
    lookingForSecondTrade := true
    stoppedBarIndex := bar_index - 1
    tempExtreme := tradeDirection == "Long" ? low : high
    
    // Close first trade boxes by replacing with bar-index boxes
    if not na(firstTradeRiskBox)
        box.delete(firstTradeRiskBox)
        firstTradeRiskBox := box.new(
             left=entryBarIndex, 
             right=bar_index,
             top=tradeDirection == "Long" ? entryPrice : stopPrice,
             bottom=tradeDirection == "Long" ? stopPrice : entryPrice,
             bgcolor=firstTradeRiskColor, 
             border_color=color.new(firstTradeRiskColor,borderOpacity),
             border_width=borderWidth)
    
    if not na(firstTradeRewardBox)
        box.delete(firstTradeRewardBox)
        firstTradeRewardBox := box.new(
             left=entryBarIndex, 
             right=bar_index,
             top=tradeDirection == "Long" ? (backtestingMode and not na(maxRRPrice) ? maxRRPrice : targetPrice) : entryPrice,
             bottom=tradeDirection == "Long" ? entryPrice : (backtestingMode and not na(maxRRPrice) ? maxRRPrice : targetPrice),
             bgcolor=firstTradeRewardColor, 
             border_color=color.new(firstTradeRewardColor,borderOpacity),
             border_width=borderWidth)
    
    if Stop_Hit_Label
        label.new(bar_index, stopPrice, "Stop Hit 1", 
             style=label.style_label_right, 
             color=color.orange, textcolor=color.white, size=size.small)

// Check for target hit on first trade
if tradeActive and bar_index > entryBarIndex and ((tradeDirection == "Long" and high >= targetPrice) or (tradeDirection == "Short" and low <= targetPrice)) and not targetHit and not stopHit
    targetHit := true
    tradeActive := false

    if Target_Hit_Label
        label.new(bar_index, targetPrice, "Target Hit 1", style=label.style_label_right, size=size.small,
                 color=color.lime, textcolor=color.white, yloc=yloc.price)
    
    // Close first trade boxes
    if not na(firstTradeRiskBox)
        box.delete(firstTradeRiskBox)
        firstTradeRiskBox := box.new(
             left=entryBarIndex, 
             right=bar_index,
             top=tradeDirection == "Long" ? entryPrice : stopPrice,
             bottom=tradeDirection == "Long" ? stopPrice : entryPrice,
             bgcolor=firstTradeRiskColor, 
             border_color=color.new(firstTradeRiskColor,borderOpacity),
             border_width=borderWidth)
    
    if not na(firstTradeRewardBox)
        box.delete(firstTradeRewardBox)
        firstTradeRewardBox := box.new(
             left=entryBarIndex, 
             right=bar_index,
             top=tradeDirection == "Long" ? (backtestingMode and not na(maxRRPrice) ? maxRRPrice : targetPrice) : entryPrice,
             bottom=tradeDirection == "Long" ? entryPrice : (backtestingMode and not na(maxRRPrice) ? maxRRPrice : targetPrice),
             bgcolor=firstTradeRewardColor, 
             border_color=color.new(firstTradeRewardColor,borderOpacity),
             border_width=borderWidth)
    
// Second trade logic
if lookingForSecondTrade and bar_index > stoppedBarIndex and not secondTradeActive
    // Update extreme for second stop
    tempExtreme := tradeDirection == "Long" ? math.min(tempExtreme, low) : math.max(tempExtreme, high)
    
    // Second entry condition (next qualifying candle)
    bool validSecondEntry = (tradeDirection == "Long" and close > open) or (tradeDirection == "Short" and close < open)
    if validSecondEntry
        secondEntryPrice := close
        secondStopPrice := tempExtreme
        secondTargetPrice := tradeDirection == "Long" ? 
             secondEntryPrice + (secondEntryPrice - secondStopPrice) * second_rrRatio : 
             secondEntryPrice - (secondStopPrice - secondEntryPrice) * second_rrRatio
        secondEntryBarIndex := bar_index
        secondTradeActive := true
        lookingForSecondTrade := false
        
        // Draw second trade boxes
        if showSecondTrade
            if tradeDirection == "Long"
                secondTradeRiskBox := box.new(
                     left=time, top=secondEntryPrice, 
                     right=resetTimeInput, bottom=secondStopPrice,
                     xloc=xloc.bar_time,
                     bgcolor=secondTradeRiskColor, 
                     border_color=color.new(secondTradeRiskColor,borderOpacity),
                     border_width=borderWidth)
                secondTradeRewardBox := box.new(
                     left=time, top=secondTargetPrice, 
                     right=resetTimeInput, bottom=secondEntryPrice,
                     xloc=xloc.bar_time,
                     bgcolor=secondTradeRewardColor, 
                     border_color=color.new(secondTradeRewardColor,borderOpacity),
                     border_width=borderWidth)
            else
                secondTradeRiskBox := box.new(
                     left=time, top=secondStopPrice, 
                     right=resetTimeInput, bottom=secondEntryPrice,
                     xloc=xloc.bar_time,
                     bgcolor=secondTradeRiskColor, 
                     border_color=color.new(secondTradeRiskColor,borderOpacity),
                     border_width=borderWidth)
                secondTradeRewardBox := box.new(
                     left=time, top=secondEntryPrice, 
                     right=resetTimeInput, bottom=secondTargetPrice,
                     xloc=xloc.bar_time,
                     bgcolor=secondTradeRewardColor, 
                     border_color=color.new(secondTradeRewardColor,borderOpacity),
                     border_width=borderWidth)

        if Ticks_Labels and showSecondTrade
            secondRisk_ticks = str.tostring(math.round(math.abs(secondEntryPrice - secondStopPrice) / syminfo.mintick))
            label.new(bar_index, secondStopPrice, 
                 text=secondRisk_ticks + " Tick SL", 
                 style=tradeDirection == "Long" ? label.style_label_up : label.style_label_down,
                 color=color.blue, textcolor=color.white, size=size.small)

        if price_LevelsLabels and showSecondTrade
            label.delete(secondTradeStopLabel)
            secondTradeStopLabel := label.new(
                 bar_index + 1, secondStopPrice, 
                 text=str.tostring(secondStopPrice, format.mintick), 
                 style=label.style_label_right, 
                 color=color.new(color.black,100), 
                 textcolor=color.new(secondTradeRiskColor,0), 
                 size=size.small)
                
            if not backtestingMode
                label.delete(secondTradeTargetLabel)
                secondTradeTargetLabel := label.new(
                     bar_index + 1, secondTargetPrice, 
                     text=str.tostring(secondTargetPrice, format.mintick), 
                     style=label.style_label_right, 
                     color=color.new(color.black,100), 
                     textcolor=color.new(secondTradeRewardColor,0), 
                     size=size.small)
                
// Track max RR for second trade
if bar_index > secondEntryBarIndex and secondTradeActive and not secondStopHit and not secondTargetHit and time <= resetTime
    currentRR = 0.0
    if tradeDirection == "Long"
        currentRR := (high - secondEntryPrice) / (secondEntryPrice - secondStopPrice)
    else
        currentRR := (secondEntryPrice - low) / (secondStopPrice - secondEntryPrice)
    
    if currentRR > secondMaxRR
        secondMaxRR := currentRR
        secondMaxRRPrice := tradeDirection == "Long" ? high : low
        secondMaxRRBar := bar_index

// Show user's trade 2 RR target if target is hit while not in backtesting mode
if secondTargetHit and not backtestingMode
    secondMaxRR := second_effectiveRR

// Add Backtesting RR label for second trade
if backtestingMode and not na(secondMaxRRPrice) and barstate.islast and showSecondTrade and backtestingLabels
    if not na(secondMaxRRLabel)
        label.delete(secondMaxRRLabel)
    secondMaxRRLabel := label.new(
         secondMaxRRBar, secondMaxRRPrice, 
         "Max RR: " + str.tostring(math.round(secondMaxRR, 2)) + " (Trade 2)", 
         style=label.style_label_left, 
         color=color.purple, 
         textcolor=color.white, 
         size=size.small)

// Second trade stop hit
if secondTradeActive and bar_index > secondEntryBarIndex and ((tradeDirection == "Long" and low < secondStopPrice) or (tradeDirection == "Short" and high > secondStopPrice)) and not secondStopHit and not secondTargetHit
    secondStopHit := true
    secondTradeActive := false
    
    // Close second trade boxes
    if not na(secondTradeRiskBox)
        box.delete(secondTradeRiskBox)
        secondTradeRiskBox := box.new(
             left=secondEntryBarIndex, 
             right=bar_index,
             top=tradeDirection == "Long" ? secondEntryPrice : secondStopPrice,
             bottom=tradeDirection == "Long" ? secondStopPrice : secondEntryPrice,
             bgcolor=secondTradeRiskColor, 
             border_color=color.new(secondTradeRiskColor,borderOpacity),
             border_width=borderWidth)
    
    if not na(secondTradeRewardBox)
        box.delete(secondTradeRewardBox)
        secondTradeRewardBox := box.new(
             left=secondEntryBarIndex, 
             right=bar_index,
             top=tradeDirection == "Long" ? (backtestingMode and not na(secondMaxRRPrice) ? secondMaxRRPrice : secondTargetPrice) : secondEntryPrice,
             bottom=tradeDirection == "Long" ? secondEntryPrice : (backtestingMode and not na(secondMaxRRPrice) ? secondMaxRRPrice : secondTargetPrice),
             bgcolor=secondTradeRewardColor, 
             border_color=color.new(secondTradeRewardColor,borderOpacity),
             border_width=borderWidth)
    
    if Stop_Hit_Label and showSecondTrade
        label.new(bar_index, secondStopPrice, "Stop Hit 2", 
             style=label.style_label_right, 
             color=color.red, textcolor=color.white, size=size.small)

// Second trade target hit
if secondTradeActive and bar_index > secondEntryBarIndex and ((tradeDirection == "Long" and high >= secondTargetPrice) or (tradeDirection == "Short" and low <= secondTargetPrice)) and not secondTargetHit and not secondStopHit
    secondTargetHit := true
    secondTradeActive := false

    if Target_Hit_Label and showSecondTrade
        label.new(bar_index, secondTargetPrice, "Target Hit 2", style=label.style_label_right, size=size.small,
                 color=color.lime, textcolor=color.white, yloc=yloc.price)

    // Close second trade boxes
    if not na(secondTradeRiskBox)
        box.delete(secondTradeRiskBox)
        secondTradeRiskBox := box.new(
             left=secondEntryBarIndex, 
             right=bar_index,
             top=tradeDirection == "Long" ? secondEntryPrice : secondStopPrice,
             bottom=tradeDirection == "Long" ? secondStopPrice : secondEntryPrice,
             bgcolor=secondTradeRiskColor, 
             border_color=color.new(secondTradeRiskColor,borderOpacity),
             border_width=borderWidth)
    
    if not na(secondTradeRewardBox)
        box.delete(secondTradeRewardBox)
        secondTradeRewardBox := box.new(
             left=secondEntryBarIndex, 
             right=bar_index,
             top=tradeDirection == "Long" ? (backtestingMode and not na(secondMaxRRPrice) ? secondMaxRRPrice : secondTargetPrice) : secondEntryPrice,
             bottom=tradeDirection == "Long" ? secondEntryPrice : (backtestingMode and not na(secondMaxRRPrice) ? secondMaxRRPrice : secondTargetPrice),
             bgcolor=secondTradeRewardColor, 
             border_color=color.new(secondTradeRewardColor,borderOpacity),
             border_width=borderWidth)

// Reset at reset time
if time >= resetTime and not resetAtnow 
    tradeActive := false
    lookingForSecondTrade := false
    secondTradeActive := false
    if not na(firstTradeStopLabel)
        label.delete(firstTradeStopLabel)
        firstTradeStopLabel := na
    if not na(firstTradeTargetLabel)
        label.delete(firstTradeTargetLabel)
        firstTradeTargetLabel := na
    if not na(secondTradeStopLabel)
        label.delete(secondTradeStopLabel)
        secondTradeStopLabel := na
    if not na(secondTradeTargetLabel)
        label.delete(secondTradeTargetLabel)
        secondTradeTargetLabel := na

// Update the box positions in backtesting mode
if backtestingMode
    // For first trade
    if not na(firstTradeRewardBox) and not na(maxRRPrice)
        if tradeDirection == "Long"
            box.set_top(firstTradeRewardBox, maxRRPrice)
            box.set_bottom(firstTradeRewardBox, entryPrice)
        else
            box.set_top(firstTradeRewardBox, entryPrice)
            box.set_bottom(firstTradeRewardBox, maxRRPrice)
        
    // For second trade
    if not na(secondTradeRewardBox) and not na(secondMaxRRPrice)
        if tradeDirection == "Long"
            box.set_top(secondTradeRewardBox, secondMaxRRPrice)
            box.set_bottom(secondTradeRewardBox, secondEntryPrice)
        else
            box.set_top(secondTradeRewardBox, secondEntryPrice)
            box.set_bottom(secondTradeRewardBox, secondMaxRRPrice)
updateRRTable()      
      `,
        },
        {
            title: "Max RR & Risk",
            image: "/RRmeterRissk.png",
            description: "Input Acc size, RR, Risk Management, Set up stop loss",
            content: `
//@version=5
indicator("Enhanced RR Calculator with Limited Risk Management", overlay=true, max_lines_count=500, max_labels_count=500, max_boxes_count=100)

// === INPUTS ===
// Time Settings
entryTimeInput = input.time(timestamp("2025-07-07 09:30"), title="Entry Time", confirm=true, group="📅 Time Settings")
resetTimeInput = input.time(defval=timestamp("2025-07-07 16:00"), title="End Time", confirm=false, group="📅 Time Settings")
resetAtnow = input.bool(title="Auto End Time (Current Bar)", defval=true, group="📅 Time Settings")
hourOffset = input.float(title="Hour Offset", defval=0, minval=-12, maxval=12, step=1, group="📅 Time Settings")

// Trade Settings
stopPrice = input.price(0, title="Stop Loss Price", confirm=true, group="🎯 Trade Setup")
maxRRLimit = input.float(title="Maximum RR Limit", defval=2.0, minval=0.5, maxval=10.0, step=0.1, group="🎯 Trade Setup", tooltip="Maximum Risk:Reward ratio to calculate")
showSecondTrade = input.bool(title="Enable Second Trade", defval=false, group="🎯 Trade Setup")
secondMaxRR = input.float(title="Second Trade Max RR", defval=1.5, minval=0.5, maxval=10.0, step=0.1, group="🎯 Trade Setup")

// Risk Management
accountSize = input.float(title="Account Size ($)", defval=10000, minval=100, group="💰 Risk Management")
riskPercentage = input.float(title="Risk Percentage (%)", defval=1.0, minval=0.1, maxval=5.0, step=0.1, group="💰 Risk Management")
showRiskManagement = input.bool(title="Show Risk Management Table", defval=true, group="💰 Risk Management")

// Display Settings
showMaxRRLabels = input.bool(title="Show Max RR Labels", defval=true, group="📊 Display")
showPriceLevels = input.bool(title="Show Price Level Labels", defval=true, group="📊 Display")
showTicksToSL = input.bool(title="Show Ticks to Stop Loss", defval=true, group="📊 Display")
backtestingMode = input.bool(title="Backtesting Mode", defval=false, group="📊 Display")

// Visual Style
riskBoxColor = input.color(color.new(color.red, 85), "Risk Zone Color", group="🎨 Visual Style")
rewardBoxColor = input.color(color.new(color.green, 85), "Reward Zone Color", group="🎨 Visual Style")
borderWidth = input.int(2, "Border Width", minval=1, maxval=5, group="🎨 Visual Style")

// Table Style
tableSize = input.string("Normal", "Table Size", options=["Small", "Normal", "Large"], group="📋 Table Style")
tableBgColor = input.color(color.new(#1e293b, 0), "Table Background", group="📋 Table Style")
tableTextColor = input.color(color.new(#ffffff, 0), "Table Text", group="📋 Table Style")

// === VARIABLES ===
var string tradeDirection = na
var float entryPrice = na
var float calculatedTarget = na
var int entryBarIndex = na
var bool tradeActive = false
var bool stopHit = false
var bool targetHit = false
var float currentRR = 0.0
var float maxRRReached = 0.0
var float riskAmount = na
var float positionSize = na
var float potentialProfit = na
var float ticksToStopLoss = na

// Box and label references
var box riskBox = na
var box rewardBox = na
var label entryLabel = na
var label stopLabel = na
var label targetLabel = na
var label maxRRLabel = na

// Tables
var table riskTable = na
var table summaryTable = na

// === FUNCTIONS ===
// Calculate position size and risk metrics
calculateRiskMetrics(entry, stop) =>
    if not na(entry) and not na(stop) and stop > 0
        riskPerTrade = math.abs(entry - stop)
        riskInDollars = accountSize * (riskPercentage / 100)
        posSize = riskInDollars / riskPerTrade
        potentialGain = riskInDollars * maxRRLimit
        ticks = math.round(riskPerTrade / syminfo.mintick)
        [riskInDollars, posSize, potentialGain, ticks]
    else
        [na, na, na, na]

// Get table size
getTableSize() =>
    switch tableSize
        "Small" => size.small
        "Normal" => size.normal
        "Large" => size.large
        => size.normal

// === MAIN LOGIC ===
// Auto-calculate reset time
autoResetTime = resetAtnow ? time : resetTimeInput

// Entry condition
if time == entryTimeInput and not tradeActive and not na(stopPrice) and stopPrice > 0
    entryPrice := close
    tradeDirection := entryPrice > stopPrice ? "Long" : "Short"
    
    // Calculate target based on limited RR
    riskAmount := math.abs(entryPrice - stopPrice)
    calculatedTarget := tradeDirection == "Long" ? 
         entryPrice + (riskAmount * maxRRLimit) : 
         entryPrice - (riskAmount * maxRRLimit)
    
    entryBarIndex := bar_index
    tradeActive := true
    
    // Calculate risk management metrics
    [riskDollars, posSize, potentialGain, ticks] = calculateRiskMetrics(entryPrice, stopPrice)
    riskAmount := riskDollars
    positionSize := posSize
    potentialProfit := potentialGain
    ticksToStopLoss := ticks
    
    // Create visual boxes
    if tradeDirection == "Long"
        // Risk box (entry to stop)
        riskBox := box.new(
             left=time, top=entryPrice, 
             right=autoResetTime, bottom=stopPrice,
             xloc=xloc.bar_time,
             bgcolor=riskBoxColor, 
             border_color=color.new(color.red, 0),
             border_width=borderWidth)
        
        // Reward box (entry to target)
        rewardBox := box.new(
             left=time, top=calculatedTarget, 
             right=autoResetTime, bottom=entryPrice,
             xloc=xloc.bar_time,
             bgcolor=rewardBoxColor, 
             border_color=color.new(color.green, 0),
             border_width=borderWidth)
    else
        // Risk box (stop to entry)
        riskBox := box.new(
             left=time, top=stopPrice, 
             right=autoResetTime, bottom=entryPrice,
             xloc=xloc.bar_time,
             bgcolor=riskBoxColor, 
             border_color=color.new(color.red, 0),
             border_width=borderWidth)
        
        // Reward box (entry to target)
        rewardBox := box.new(
             left=time, top=entryPrice, 
             right=autoResetTime, bottom=calculatedTarget,
             xloc=xloc.bar_time,
             bgcolor=rewardBoxColor, 
             border_color=color.new(color.green, 0),
             border_width=borderWidth)
    
    // Add price level labels
    if showPriceLevels
        entryLabel := label.new(bar_index, entryPrice, 
             text="Entry: " + str.tostring(entryPrice, format.mintick), 
             style=label.style_label_left, 
             color=color.blue, textcolor=color.white, size=size.small)
        
        stopLabel := label.new(bar_index, stopPrice, 
             text="Stop: " + str.tostring(stopPrice, format.mintick), 
             style=label.style_label_left, 
             color=color.red, textcolor=color.white, size=size.small)
        
        targetLabel := label.new(bar_index, calculatedTarget, 
             text="Target: " + str.tostring(calculatedTarget, format.mintick) + " (1:" + str.tostring(maxRRLimit, "0.0") + ")", 
             style=label.style_label_left, 
             color=color.green, textcolor=color.white, size=size.small)

// Calculate current RR during active trade
if tradeActive and not stopHit and not targetHit
    if tradeDirection == "Long"
        if high >= calculatedTarget
            currentRR := maxRRLimit
            targetHit := true
        else if low <= stopPrice
            currentRR := 0.0
            stopHit := true
        else
            currentRR := (close - entryPrice) / (entryPrice - stopPrice)
    else
        if low <= calculatedTarget
            currentRR := maxRRLimit
            targetHit := true
        else if high >= stopPrice
            currentRR := 0.0
            stopHit := true
        else
            currentRR := (entryPrice - close) / (stopPrice - entryPrice)
    
    // Update max RR reached
    maxRRReached := math.max(maxRRReached, currentRR)

// Reset trade at end time
if time >= autoResetTime and tradeActive
    tradeActive := false

// === DISPLAY TABLES ===
// Risk Management Table
if barstate.islast and showRiskManagement
    riskTable := table.new(position.bottom_right, 2, 8, 
         bgcolor=tableBgColor, border_width=1, border_color=color.white)
    
    // Headers
    table.cell(riskTable, 0, 0, "Risk Management", 
         bgcolor=color.new(#374151, 0), text_color=color.white, text_size=getTableSize())
    table.cell(riskTable, 1, 0, "Values", 
         bgcolor=color.new(#374151, 0), text_color=color.white, text_size=getTableSize())
    
    // Account info
    table.cell(riskTable, 0, 1, "Account Size", text_color=tableTextColor, text_size=getTableSize())
    table.cell(riskTable, 1, 1, "$" + str.tostring(accountSize, "#,###"), text_color=tableTextColor, text_size=getTableSize())
    
    table.cell(riskTable, 0, 2, "Risk %", text_color=tableTextColor, text_size=getTableSize())
    table.cell(riskTable, 1, 2, str.tostring(riskPercentage, "0.0") + "%", text_color=tableTextColor, text_size=getTableSize())
    
    table.cell(riskTable, 0, 3, "Risk Amount", text_color=tableTextColor, text_size=getTableSize())
    table.cell(riskTable, 1, 3, not na(riskAmount) ? "$" + str.tostring(riskAmount, "#,###.00") : "N/A", 
         text_color=color.new(color.red, 0), text_size=getTableSize())
    
    table.cell(riskTable, 0, 4, "Position Size", text_color=tableTextColor, text_size=getTableSize())
    table.cell(riskTable, 1, 4, not na(positionSize) ? str.tostring(positionSize, "#,###.00") : "N/A", 
         text_color=tableTextColor, text_size=getTableSize())
    
    table.cell(riskTable, 0, 5, "Max RR Limit", text_color=tableTextColor, text_size=getTableSize())
    table.cell(riskTable, 1, 5, "1:" + str.tostring(maxRRLimit, "0.0"), text_color=tableTextColor, text_size=getTableSize())
    
    table.cell(riskTable, 0, 6, "Potential Profit", text_color=tableTextColor, text_size=getTableSize())
    table.cell(riskTable, 1, 6, not na(potentialProfit) ? "$" + str.tostring(potentialProfit, "#,###.00") : "N/A", 
         text_color=color.new(color.green, 0), text_size=getTableSize())
    
    table.cell(riskTable, 0, 7, "Ticks to SL", text_color=tableTextColor, text_size=getTableSize())
    table.cell(riskTable, 1, 7, not na(ticksToStopLoss) ? str.tostring(ticksToStopLoss, "0") : "N/A", 
         text_color=tableTextColor, text_size=getTableSize())

// Trade Summary Table
if barstate.islast
    summaryTable := table.new(position.top_right, 2, 6, 
         bgcolor=tableBgColor, border_width=1, border_color=color.white)
    
    // Headers
    table.cell(summaryTable, 0, 0, "Trade Summary", 
         bgcolor=color.new(#374151, 0), text_color=color.white, text_size=getTableSize())
    table.cell(summaryTable, 1, 0, "Status", 
         bgcolor=color.new(#374151, 0), text_color=color.white, text_size=getTableSize())
    
    // Trade direction
    table.cell(summaryTable, 0, 1, "Direction", text_color=tableTextColor, text_size=getTableSize())
    table.cell(summaryTable, 1, 1, not na(tradeDirection) ? tradeDirection : "N/A", 
         text_color=tableTextColor, text_size=getTableSize())
    
    // Current RR
    table.cell(summaryTable, 0, 2, "Current RR", text_color=tableTextColor, text_size=getTableSize())
    rrColor = currentRR >= maxRRLimit ? color.green : (currentRR > 0 ? color.yellow : color.red)
    table.cell(summaryTable, 1, 2, str.tostring(math.round(currentRR, 2)), 
         text_color=rrColor, text_size=size.large)
    
    // Max RR reached
    table.cell(summaryTable, 0, 3, "Max RR Reached", text_color=tableTextColor, text_size=getTableSize())
    maxRRColor = maxRRReached >= maxRRLimit ? color.green : (maxRRReached > 0 ? color.yellow : color.red)
    table.cell(summaryTable, 1, 3, str.tostring(math.round(maxRRReached, 2)), 
         text_color=maxRRColor, text_size=size.large)
    
    // Trade status
    table.cell(summaryTable, 0, 4, "Trade Status", text_color=tableTextColor, text_size=getTableSize())
    statusText = "Waiting"
    statusColor = tableTextColor
    if tradeActive
        statusText := "Active"
        statusColor := color.orange
    else if targetHit
        statusText := "Target Hit ✓"
        statusColor := color.green
    else if stopHit
        statusText := "Stop Hit ✗"
        statusColor := color.red
    
    table.cell(summaryTable, 1, 4, statusText, text_color=statusColor, text_size=getTableSize())
    
    // Result
    table.cell(summaryTable, 0, 5, "Result", text_color=tableTextColor, text_size=getTableSize())
    if targetHit or stopHit
        resultText = maxRRReached >= maxRRLimit ? "WIN" : "LOSS"
        resultColor = maxRRReached >= maxRRLimit ? color.green : color.red
        table.cell(summaryTable, 1, 5, resultText, text_color=resultColor, text_size=size.large)
    else
        table.cell(summaryTable, 1, 5, "Pending", text_color=tableTextColor, text_size=getTableSize())

// Show max RR label on chart
if showMaxRRLabels and tradeActive and maxRRReached > 0
    label.delete(maxRRLabel)
    maxRRLabel := label.new(bar_index, high, 
         text="Max RR: " + str.tostring(math.round(maxRRReached, 2)), 
         style=label.style_label_down, 
         color=maxRRReached >= maxRRLimit ? color.green : color.red, 
         textcolor=color.white, size=size.normal)

// Plot reference lines
plot(tradeActive ? entryPrice : na, title="Entry Price", color=color.blue, linewidth=1, style=plot.style_circles)
plot(tradeActive and not na(stopPrice) ? stopPrice : na, title="Stop Loss", color=color.red, linewidth=2)
plot(tradeActive and not na(calculatedTarget) ? calculatedTarget : na, title="Target", color=color.green, linewidth=2)      
      `

        },

        {
            title: "Advanced Risk Management",
            image: "/advancedriskmanagement.png",
            description: "Adjust acc balance, risk, commission, lot size, stop loss, leverage ....",
            content: `
        //@version=5
indicator("Risk Management with TP/SL Lines", overlay=true, max_lines_count=500, max_labels_count=500)

// ================================
// INPUT SETTINGS
// ================================

// Account Settings
accountBalance = input.float(1000, "Account Balance ($)", minval=1, group="Account Settings")
riskPerTrade = input.float(5, "Risk Amount per Trade ($)", minval=0.1, step=0.5, group="Account Settings")
commission = input.float(0.14, "Commission ($/lot)", minval=0, step=0.01, group="Account Settings")

// Position Settings
lotSizePercent = input.int(100, "Lot Size %", minval=10, maxval=100, step=5, group="Position Settings")
slPercent = input.int(100, "Stop Loss %", minval=10, maxval=100, step=5, group="Position Settings")
takeProfitPips = input.float(100, "Take Profit (pips)", minval=1, group="Position Settings")
leverage = input.int(2000, "Leverage (1:X)", minval=1, group="Position Settings")
contractSize = input.int(100, "Contract Size (oz/lot)", minval=1, group="Position Settings")

// Display Settings
tradeDirection = input.string("Long", "Trade Direction", options=["Long", "Short"], group="Display Settings")
showPriceLabels = input.bool(true, "Show Price Labels", group="Display Settings")
showPanel = input.bool(true, "Show Info Panel", group="Display Settings")
panelPosition = input.string("Top Right", "Panel Position", options=["Top Left", "Top Right", "Bottom Left", "Bottom Right"], group="Display Settings")
textSize = input.string("Normal", "Text Size", options=["Tiny", "Small", "Normal", "Large"], group="Display Settings")

// ================================
// CALCULATIONS
// ================================

currentPrice = close
pipValuePerLot = 1.0

// Lot size calculations
maxLotSize = (accountBalance * leverage) / (currentPrice * contractSize)
actualLotSize = maxLotSize * (lotSizePercent / 100.0)
pipValue = pipValuePerLot * actualLotSize
marginRequired = (actualLotSize * currentPrice * contractSize) / leverage

// Stop loss calculations
maxSL = riskPerTrade / pipValue
actualSL = maxSL * (slPercent / 100.0)
actualRisk = actualSL * pipValue
remainingBalance = accountBalance - actualRisk

// Profit calculations
commissionCost = actualLotSize * commission
grossProfit = pipValue * takeProfitPips
netProfit = grossProfit - commissionCost
riskRewardRatio = netProfit / actualRisk

// Safety checks
marginSafe = marginRequired <= accountBalance
slSafe = actualSL >= 10

// ================================
// PRICE LEVELS
// ================================

// Convert pips to price (for gold: 1 pip = 0.01)
pipToPrice = 0.01

// Calculate SL and TP prices based on direction
slPrice = tradeDirection == "Long" ? currentPrice - (actualSL * pipToPrice) : currentPrice + (actualSL * pipToPrice)
tpPrice = tradeDirection == "Long" ? currentPrice + (takeProfitPips * pipToPrice) : currentPrice - (takeProfitPips * pipToPrice)

// ================================
// DRAW LINES AND LABELS
// ================================

var label slLabel = na
var label tpLabel = na
var label entryLabel = na
var line entryLine = na
var line slLine = na
var line tpLine = na

if barstate.islast
    // Delete old objects
    label.delete(slLabel)
    label.delete(tpLabel)
    label.delete(entryLabel)
    line.delete(entryLine)
    line.delete(slLine)
    line.delete(tpLine)
    
    // Line dimensions
    lineLeft = bar_index - 50
    lineRight = bar_index + 50
    
    // Entry Line (current price)
    entryLine := line.new(lineLeft, currentPrice, lineRight, currentPrice, 
         color=color.new(#2196F3, 0), width=2, style=line.style_solid)
    
    // Stop Loss Line
    slLine := line.new(lineLeft, slPrice, lineRight, slPrice, 
         color=color.new(#f44336, 0), width=2, style=line.style_dashed)
    
    // Take Profit Line
    tpLine := line.new(lineLeft, tpPrice, lineRight, tpPrice, 
         color=color.new(#4CAF50, 0), width=2, style=line.style_dashed)
    
    // Labels with prices and values
    if showPriceLabels
        // Entry Label
        entryLabel := label.new(lineRight + 5, currentPrice, 
             "ENTRY: " + str.tostring(currentPrice, "#.##") + "\n" + 
             str.tostring(actualLotSize, "#.##") + " lots", 
             style=label.style_label_left, color=color.new(#2196F3, 10), 
             textcolor=color.white, size=size.normal)
        
        // Stop Loss Label
        slLabel := label.new(lineRight + 5, slPrice, 
             "SL: " + str.tostring(slPrice, "#.##") + "\n" + 
             "Risk: $" + str.tostring(actualRisk, "#.##") + "\n" +
             str.tostring(actualSL, "#.#") + " pips", 
             style=label.style_label_left, color=color.new(#f44336, 10), 
             textcolor=color.white, size=size.small)
        
        // Take Profit Label
        tpLabel := label.new(lineRight + 5, tpPrice, 
             "TP: " + str.tostring(tpPrice, "#.##") + "\n" + 
             "Profit: $" + str.tostring(netProfit, "#.##") + "\n" +
             str.tostring(takeProfitPips, "#.#") + " pips | R:R 1:" + str.tostring(riskRewardRatio, "#.##"), 
             style=label.style_label_left, color=color.new(#4CAF50, 10), 
             textcolor=color.white, size=size.small)

// ================================
// INFO PANEL
// ================================

var table panel = na
if barstate.islast and showPanel
    // Determine position
    posHoriz = panelPosition == "Top Left" or panelPosition == "Bottom Left" ? position.top_left : position.top_right
    
    // Create table
    panel := table.new(posHoriz, 2, 16, bgcolor=color.new(#1a1a2e, 10), border_width=2, border_color=color.new(#6c5ce7, 50))
    
    // Text size
    txtSize = textSize == "Tiny" ? size.tiny : textSize == "Small" ? size.small : textSize == "Large" ? size.large : size.normal
    
    // Header
    directionEmoji = tradeDirection == "Long" ? "🟢" : "🔴"
    table.cell(panel, 0, 0, directionEmoji + " " + tradeDirection + " POSITION", text_color=color.white, 
         bgcolor=tradeDirection == "Long" ? color.new(#4CAF50, 0) : color.new(#f44336, 0), 
         text_size=size.large, text_halign=text.align_center)
    table.merge_cells(panel, 0, 0, 1, 0)
    
    // Entry Price
    table.cell(panel, 0, 1, "Entry Price", text_color=color.new(#dfe6e9, 0), text_size=txtSize)
    table.cell(panel, 1, 1, str.tostring(currentPrice, "#.##"), text_color=color.new(#2196F3, 0), 
         text_size=size.large, text_halign=text.align_right)
    
    // Position Size
    table.cell(panel, 0, 2, "Position Size", text_color=color.new(#dfe6e9, 0), text_size=txtSize)
    table.cell(panel, 1, 2, str.tostring(actualLotSize, "#.####") + " lots", text_color=color.white, 
         text_size=txtSize, text_halign=text.align_right)
    
    // Separator
    table.cell(panel, 0, 3, "─────────────────", text_color=color.new(#636e72, 0), text_size=size.tiny)
    table.merge_cells(panel, 0, 3, 1, 3)
    
    // Stop Loss Section
    table.cell(panel, 0, 4, "🛑 STOP LOSS", text_color=color.new(#f44336, 0), bgcolor=color.new(#2d3436, 0), text_size=txtSize)
    table.merge_cells(panel, 0, 4, 1, 4)
    
    table.cell(panel, 0, 5, "SL Price", text_color=color.new(#dfe6e9, 0), text_size=txtSize)
    table.cell(panel, 1, 5, str.tostring(slPrice, "#.##"), text_color=color.new(#f44336, 0), 
         text_size=txtSize, text_halign=text.align_right)
    
    table.cell(panel, 0, 6, "SL Distance", text_color=color.new(#dfe6e9, 0), text_size=txtSize)
    table.cell(panel, 1, 6, str.tostring(actualSL, "#.#") + " pips", text_color=color.new(#ff7675, 0), 
         text_size=txtSize, text_halign=text.align_right)
    
    table.cell(panel, 0, 7, "Risk Amount", text_color=color.new(#dfe6e9, 0), text_size=txtSize)
    table.cell(panel, 1, 7, "$" + str.tostring(actualRisk, "#.##"), text_color=color.new(#f44336, 0), 
         text_size=size.large, text_halign=text.align_right)
    
    // Separator
    table.cell(panel, 0, 8, "─────────────────", text_color=color.new(#636e72, 0), text_size=size.tiny)
    table.merge_cells(panel, 0, 8, 1, 8)
    
    // Take Profit Section
    table.cell(panel, 0, 9, "💰 TAKE PROFIT", text_color=color.new(#4CAF50, 0), bgcolor=color.new(#2d3436, 0), text_size=txtSize)
    table.merge_cells(panel, 0, 9, 1, 9)
    
    table.cell(panel, 0, 10, "TP Price", text_color=color.new(#dfe6e9, 0), text_size=txtSize)
    table.cell(panel, 1, 10, str.tostring(tpPrice, "#.##"), text_color=color.new(#4CAF50, 0), 
         text_size=txtSize, text_halign=text.align_right)
    
    table.cell(panel, 0, 11, "TP Distance", text_color=color.new(#dfe6e9, 0), text_size=txtSize)
    table.cell(panel, 1, 11, str.tostring(takeProfitPips, "#.#") + " pips", text_color=color.new(#00b894, 0), 
         text_size=txtSize, text_halign=text.align_right)
    
    table.cell(panel, 0, 12, "Profit Amount", text_color=color.new(#dfe6e9, 0), text_size=txtSize)
    table.cell(panel, 1, 12, "$" + str.tostring(netProfit, "#.##"), text_color=color.new(#4CAF50, 0), 
         text_size=size.large, text_halign=text.align_right)
    
    // Separator
    table.cell(panel, 0, 13, "─────────────────", text_color=color.new(#636e72, 0), text_size=size.tiny)
    table.merge_cells(panel, 0, 13, 1, 13)
    
    // Risk/Reward
    table.cell(panel, 0, 14, "📈 Risk/Reward Ratio", text_color=color.new(#dfe6e9, 0), text_size=txtSize)
    rrColor = riskRewardRatio >= 2 ? color.new(#00b894, 0) : riskRewardRatio >= 1 ? color.new(#fdcb6e, 0) : color.new(#ff7675, 0)
    table.cell(panel, 1, 14, "1:" + str.tostring(riskRewardRatio, "#.##"), text_color=rrColor, 
         text_size=size.large, text_halign=text.align_right)
    
    // Balance After Loss
    table.cell(panel, 0, 15, "Balance After Loss", text_color=color.new(#dfe6e9, 0), text_size=size.small)
    table.cell(panel, 1, 15, "$" + str.tostring(remainingBalance, "#,###.##"), text_color=color.new(#636e72, 0), 
         text_size=size.small, text_halign=text.align_right)

// Alert conditions
alertcondition(not marginSafe, "Margin Warning", "Insufficient margin for trade!")
alertcondition(not slSafe, "Stop Loss Warning", "Stop loss too tight!")
      `
        },
        {
            title: "DYNAMIC POSITION TP SL RISK MANAGEMENT",
            image: "/dynamicrisk.png",
            description: "Input Acc size, RR, Risk Management, Set up stop loss",
            content: `
      //@version=5
indicator("Dynamic Risk Manager", overlay=true, max_lines_count=500, max_labels_count=500, max_boxes_count=500)

// ================================
// INPUT SETTINGS
// ================================

// Account Settings
accountBalance = input.float(1000, "Account Balance ($)", minval=1, group="Account Settings")
riskAmount = input.float(10, "Risk Amount ($)", minval=0.1, step=0.5, group="Account Settings")
commission = input.float(0.14, "Commission ($/lot)", minval=0, step=0.01, group="Account Settings")

// Position Settings
slPrice = input.float(2600.00, "Stop Loss Price", group="Position Settings")
tpPrice = input.float(2700.00, "Take Profit Price", group="Position Settings")
leverage = input.int(2000, "Leverage (1:X)", minval=1, group="Position Settings")
contractSize = input.int(100, "Contract Size (oz/lot)", minval=1, group="Position Settings")

// Display Settings
tradeDirection = input.string("Long", "Trade Direction", options=["Long", "Short"], group="Display Settings")
showPriceLabels = input.bool(true, "Show Price Labels", group="Display Settings")
showInfoBox = input.bool(true, "Show Info Box", group="Display Settings")
boxPosition = input.string("Top Right", "Box Position", options=["Top Right", "Top Left", "Bottom Right", "Bottom Left"], group="Display Settings")

// ================================
// CALCULATIONS
// ================================

currentPrice = close
pipValuePerLot = 1.0
pipToPrice = 0.01

// Calculate distances in pips
stopLossPips = math.abs(currentPrice - slPrice) / pipToPrice
takeProfitPips = math.abs(tpPrice - currentPrice) / pipToPrice

// Validate trade direction
validLong = tradeDirection == "Long" and slPrice < currentPrice and tpPrice > currentPrice
validShort = tradeDirection == "Short" and slPrice > currentPrice and tpPrice < currentPrice
validTrade = validLong or validShort

// Calculate lot size based on risk and SL distance
lotSize = validTrade and stopLossPips > 0 ? riskAmount / (stopLossPips * pipValuePerLot) : 0
pipValue = pipValuePerLot * lotSize

// Position calculations
marginRequired = (lotSize * currentPrice * contractSize) / leverage
maxLotSize = (accountBalance * leverage) / (currentPrice * contractSize)

// Profit calculations
commissionCost = lotSize * commission
grossProfit = pipValue * takeProfitPips
netProfit = grossProfit - commissionCost
riskRewardRatio = riskAmount > 0 ? netProfit / riskAmount : 0

// Balance projections
balanceAfterLoss = accountBalance - riskAmount
balanceAfterWin = accountBalance + netProfit

// Safety checks
marginSafe = marginRequired <= accountBalance
lotSizeSafe = lotSize <= maxLotSize
slValid = stopLossPips >= 10

// ================================
// DRAW LINES AND BOXES
// ================================

var line entryLine = na
var line slLine = na
var line tpLine = na
var box riskBox = na
var box profitBox = na
var label entryLabel = na
var label slLabel = na
var label tpLabel = na

if barstate.islast and validTrade
    // Delete old objects
    line.delete(entryLine)
    line.delete(slLine)
    line.delete(tpLine)
    box.delete(riskBox)
    box.delete(profitBox)
    label.delete(entryLabel)
    label.delete(slLabel)
    label.delete(tpLabel)
    
    // Line dimensions
    lineLeft = bar_index - 30
    lineRight = bar_index + 30
    boxLeft = bar_index - 30
    boxRight = bar_index + 30
    
    // Risk Box (between entry and SL)
    riskBoxTop = tradeDirection == "Long" ? currentPrice : slPrice
    riskBoxBottom = tradeDirection == "Long" ? slPrice : currentPrice
    riskBox := box.new(boxLeft, riskBoxTop, boxRight, riskBoxBottom, 
         border_color=color.new(#f44336, 0), bgcolor=color.new(#f44336, 92),
         border_width=1, border_style=line.style_dotted)
    
    // Profit Box (between entry and TP)
    profitBoxTop = tradeDirection == "Long" ? tpPrice : currentPrice
    profitBoxBottom = tradeDirection == "Long" ? currentPrice : tpPrice
    profitBox := box.new(boxLeft, profitBoxTop, boxRight, profitBoxBottom,
         border_color=color.new(#4CAF50, 0), bgcolor=color.new(#4CAF50, 92),
         border_width=1, border_style=line.style_dotted)
    
    // Entry Line (current price)
    entryLine := line.new(lineLeft, currentPrice, lineRight, currentPrice, 
         color=color.new(#2196F3, 0), width=3, style=line.style_solid)
    
    // Stop Loss Line
    slLine := line.new(lineLeft, slPrice, lineRight, slPrice, 
         color=color.new(#f44336, 0), width=2, style=line.style_solid)
    
    // Take Profit Line
    tpLine := line.new(lineLeft, tpPrice, lineRight, tpPrice, 
         color=color.new(#4CAF50, 0), width=2, style=line.style_solid)
    
    // Labels
    if showPriceLabels
        // Entry Label
        entryLabel := label.new(lineLeft - 2, currentPrice, 
             "ENTRY\n" + str.tostring(currentPrice, "#.##"), 
             style=label.style_label_right, color=color.new(#2196F3, 0), 
             textcolor=color.white, size=size.normal)
        
        // Stop Loss Label
        slLabel := label.new(lineLeft - 2, slPrice, 
             "SL\n" + str.tostring(slPrice, "#.##") + "\n" +
             str.tostring(stopLossPips, "#.#") + " pips", 
             style=label.style_label_right, color=color.new(#f44336, 0), 
             textcolor=color.white, size=size.small)
        
        // Take Profit Label
        tpLabel := label.new(lineLeft - 2, tpPrice, 
             "TP\n" + str.tostring(tpPrice, "#.##") + "\n" +
             str.tostring(takeProfitPips, "#.#") + " pips", 
             style=label.style_label_right, color=color.new(#4CAF50, 0), 
             textcolor=color.white, size=size.small)

// ================================
// INFO BOX
// ================================

var table infoBox = na
if barstate.islast and showInfoBox
    // Determine position
    posVert = boxPosition == "Top Right" or boxPosition == "Top Left" ? position.top_right : position.bottom_right
    if boxPosition == "Top Left" or boxPosition == "Bottom Left"
        posVert := boxPosition == "Top Left" ? position.top_left : position.bottom_left
    
    // Delete old table
    table.delete(infoBox)
    
    // Create compact info box
    infoBox := table.new(posVert, 2, 13, 
         bgcolor=color.new(#0d1117, 5), 
         frame_color=color.new(#30363d, 0),
         frame_width=1,
         border_width=1,
         border_color=color.new(#30363d, 0))
    
    // Header
    directionColor = tradeDirection == "Long" ? color.new(#4CAF50, 0) : color.new(#f44336, 0)
    directionIcon = tradeDirection == "Long" ? "▲" : "▼"
    headerBg = validTrade ? directionColor : color.new(#ffa500, 0)
    table.cell(infoBox, 0, 0, directionIcon + " " + tradeDirection, 
         text_color=color.white, bgcolor=headerBg, 
         text_size=size.normal, text_halign=text.align_center)
    table.cell(infoBox, 1, 0, validTrade ? str.tostring(lotSize, "#.####") + " lots" : "INVALID", 
         text_color=color.white, bgcolor=headerBg, 
         text_size=size.normal, text_halign=text.align_center)
    
    // Entry Price
    table.cell(infoBox, 0, 1, "Entry", text_color=color.new(#8b949e, 0), text_size=size.small)
    table.cell(infoBox, 1, 1, str.tostring(currentPrice, "#.##"), 
         text_color=color.new(#2196F3, 0), text_size=size.normal, text_halign=text.align_right)
    
    // Divider
    table.cell(infoBox, 0, 2, "───────────", text_color=color.new(#30363d, 0), text_size=size.tiny)
    table.merge_cells(infoBox, 0, 2, 1, 2)
    
    // Stop Loss
    table.cell(infoBox, 0, 3, "Stop Loss", text_color=color.new(#8b949e, 0), text_size=size.small)
    table.cell(infoBox, 1, 3, str.tostring(slPrice, "#.##"), 
         text_color=color.new(#f44336, 0), text_size=size.small, text_halign=text.align_right)
    
    table.cell(infoBox, 0, 4, "SL Distance", text_color=color.new(#8b949e, 0), text_size=size.tiny)
    table.cell(infoBox, 1, 4, str.tostring(stopLossPips, "#.#") + " pips", 
         text_color=color.new(#ff6b6b, 0), text_size=size.tiny, text_halign=text.align_right)
    
    table.cell(infoBox, 0, 5, "Risk", text_color=color.new(#8b949e, 0), text_size=size.small)
    table.cell(infoBox, 1, 5, "$" + str.tostring(riskAmount, "#.##"), 
         text_color=color.new(#f44336, 0), text_size=size.normal, text_halign=text.align_right)
    
    // Divider
    table.cell(infoBox, 0, 6, "───────────", text_color=color.new(#30363d, 0), text_size=size.tiny)
    table.merge_cells(infoBox, 0, 6, 1, 6)
    
    // Take Profit
    table.cell(infoBox, 0, 7, "Take Profit", text_color=color.new(#8b949e, 0), text_size=size.small)
    table.cell(infoBox, 1, 7, str.tostring(tpPrice, "#.##"), 
         text_color=color.new(#4CAF50, 0), text_size=size.small, text_halign=text.align_right)
    
    table.cell(infoBox, 0, 8, "TP Distance", text_color=color.new(#8b949e, 0), text_size=size.tiny)
    table.cell(infoBox, 1, 8, str.tostring(takeProfitPips, "#.#") + " pips", 
         text_color=color.new(#51cf66, 0), text_size=size.tiny, text_halign=text.align_right)
    
    table.cell(infoBox, 0, 9, "Profit", text_color=color.new(#8b949e, 0), text_size=size.small)
    table.cell(infoBox, 1, 9, "$" + str.tostring(netProfit, "#.##"), 
         text_color=color.new(#4CAF50, 0), text_size=size.normal, text_halign=text.align_right)
    
    // Divider
    table.cell(infoBox, 0, 10, "───────────", text_color=color.new(#30363d, 0), text_size=size.tiny)
    table.merge_cells(infoBox, 0, 10, 1, 10)
    
    // Risk/Reward Ratio
    table.cell(infoBox, 0, 11, "R:R", text_color=color.new(#8b949e, 0), text_size=size.small)
    rrColor = riskRewardRatio >= 2 ? color.new(#4CAF50, 0) : riskRewardRatio >= 1 ? color.new(#ffd93d, 0) : color.new(#f44336, 0)
    table.cell(infoBox, 1, 11, "1:" + str.tostring(riskRewardRatio, "#.##"), 
         text_color=rrColor, text_size=size.normal, text_halign=text.align_right)
    
    // Margin Required
    table.cell(infoBox, 0, 12, "Margin", text_color=color.new(#8b949e, 0), text_size=size.tiny)
    marginColor = marginSafe ? color.new(#4CAF50, 0) : color.new(#f44336, 0)
    table.cell(infoBox, 1, 12, "$" + str.tostring(marginRequired, "#.##"), 
         text_color=marginColor, text_size=size.tiny, text_halign=text.align_right)

// ================================
// VALIDATION WARNING
// ================================

var label warningLabel = na
if barstate.islast and not validTrade
    label.delete(warningLabel)
    warningMsg = tradeDirection == "Long" ? "⚠️ For LONG: SL must be < Entry < TP" : "⚠️ For SHORT: SL must be > Entry > TP"
    warningLabel := label.new(bar_index, currentPrice, warningMsg,
         style=label.style_label_center, color=color.new(#ffa500, 0),
         textcolor=color.white, size=size.normal)

// ================================
// DATA WINDOW
// ================================

plot(lotSize, "Lot Size", display=display.data_window)
plot(stopLossPips, "SL Pips", display=display.data_window)
plot(takeProfitPips, "TP Pips", display=display.data_window)
plot(riskAmount, "Risk $", display=display.data_window)
plot(netProfit, "Profit $", display=display.data_window)
plot(riskRewardRatio, "R:R Ratio", display=display.data_window)
plot(marginRequired, "Margin Required $", display=display.data_window)

// Alerts
alertcondition(not marginSafe, "Margin Alert", "Insufficient margin!")
alertcondition(not lotSizeSafe, "Lot Size Alert", "Lot size exceeds maximum!")
alertcondition(not validTrade, "Invalid Setup", "Check SL/TP placement!")
      `
        }
    ];

    const [cards, setCards] = useState<any[]>(defaultCards);
    const [showUpload, setShowUpload] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [newContent, setNewContent] = useState("");
    const [newImageBase64, setNewImageBase64] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const stored = localStorage.getItem("custom_scripts");
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setCards([...defaultCards, ...parsed]);
            } catch (e) { }
        }
    }, []);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            alert("Image too large. Please use < 2MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            setNewImageBase64(event.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleSaveUpload = () => {
        if (!newImageBase64 || !newTitle || !newContent) {
            alert("Please provide an image, title, and script content.");
            return;
        }

        const newScript = {
            id: "script-" + Date.now(),
            title: newTitle,
            description: newDesc,
            image: newImageBase64,
            content: newContent,
            isCustom: true,
        };

        const stored = localStorage.getItem("custom_scripts");
        let parsed: any[] = [];
        if (stored) {
            try {
                parsed = JSON.parse(stored);
            } catch (e) { }
        }

        parsed.push(newScript);
        localStorage.setItem("custom_scripts", JSON.stringify(parsed));

        setCards([...defaultCards, ...parsed]);

        setNewTitle("");
        setNewDesc("");
        setNewContent("");
        setNewImageBase64(null);
        setShowUpload(false);
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Delete this custom script?")) return;

        const stored = localStorage.getItem("custom_scripts");
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                const updated = parsed.filter((s: any) => s.id !== id);
                localStorage.setItem("custom_scripts", JSON.stringify(updated));
                setCards([...defaultCards, ...updated]);
            } catch (e) { }
        }
    };

    return (
        <main className="p-8 h-full">
            <div className="flex items-start justify-between mb-8">
                <div>
                    <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">
                        Script Library
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Browse built-in PineScripts or upload your own
                    </p>
                </div>
                <button
                    onClick={() => setShowUpload(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold transition-all shadow-[0_0_10px_rgba(59,130,246,0.3)] hover:shadow-[0_0_15px_rgba(59,130,246,0.5)] hover:bg-primary/90 active:scale-95"
                >
                    <Plus className="w-4 h-4" />
                    Add Script
                </button>
            </div>

            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {cards.map((card, index) => (
                    <Card
                        key={card.id || index}
                        id={card.id}
                        image={card.image}
                        title={card.title}
                        description={card.description}
                        content={card.content}
                        isCustom={card.isCustom}
                        onDelete={card.isCustom ? (e) => handleDelete(card.id, e) : undefined}
                    />
                ))}
            </div>

            {showUpload && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowUpload(false)} />

                    <div className="relative w-full max-w-2xl bg-card border border-border/50 shadow-2xl rounded-2xl p-6 animate-in zoom-in-95 duration-200 z-10 m-auto mt-[40px] max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <Upload className="text-primary w-6 h-6" />
                                Add Custom Script
                            </h2>
                            <button onClick={() => setShowUpload(false)} className="p-2 hover:bg-secondary rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Script Title</label>
                                <input
                                    type="text"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder="e.g. My Custom ICT Indicator"
                                    className="w-full bg-secondary/50 border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Short Description</label>
                                <input
                                    type="text"
                                    value={newDesc}
                                    onChange={(e) => setNewDesc(e.target.value)}
                                    placeholder="e.g. Detects FVG and draws Order Blocks"
                                    className="w-full bg-secondary/50 border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Pine Script Code</label>
                                <textarea
                                    value={newContent}
                                    onChange={(e) => setNewContent(e.target.value)}
                                    placeholder="//@version=5&#10;indicator('My Script', overlay=true)&#10;..."
                                    rows={8}
                                    className="w-full bg-secondary/50 font-mono border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-none custom-scrollbar"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Indicator Screenshot</label>
                                {newImageBase64 ? (
                                    <div className="relative rounded-xl overflow-hidden border border-border/50 aspect-video group w-full max-w-sm">
                                        <img src={newImageBase64} alt="Preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button
                                                onClick={() => setNewImageBase64(null)}
                                                className="bg-red-500 hover:bg-red-600 text-foreground px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-transform hover:scale-105"
                                            >
                                                <Trash2 className="w-4 h-4" /> Remove
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-border/60 bg-secondary/20 rounded-xl p-6 flex flex-col items-center justify-center text-muted-foreground hover:bg-secondary/40 hover:border-primary/50 transition-all cursor-pointer group"
                                    >
                                        <div className="bg-secondary p-3 rounded-full mb-2 group-hover:scale-110 transition-transform">
                                            <Upload className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                        </div>
                                        <p className="text-sm font-medium text-foreground">Click to upload screenshot</p>
                                    </div>
                                )}
                                <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleImageUpload} />
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button onClick={() => setShowUpload(false)} className="px-5 py-2.5 rounded-xl font-medium hover:bg-secondary transition-colors">
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveUpload}
                                    disabled={!newTitle || !newContent || !newImageBase64}
                                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold transition-all shadow-md shadow-primary/20 hover:shadow-primary/40 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                                >
                                    <Save className="w-4 h-4" />
                                    Save Script
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

function Card({
    id,
    image,
    title,
    description,
    content,
    isCustom,
    onDelete,
}: {
    id?: string;
    image: string;
    title: string;
    description: string;
    content: string;
    isCustom?: boolean;
    onDelete?: (e: React.MouseEvent) => void;
}) {
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            alert("Failed to copy!");
        }
    };
    const [isZoomed, setIsZoomed] = useState<string | null>(null);
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsZoomed(null);
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);
    return (
        <div className="border min-h-57 p-4 rounded-xl shadow-md bg-white transition-all duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                    <Image
                        src={image}
                        alt="displaytable"
                        width={1000}
                        height={1000}
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsZoomed(image);
                        }}
                        className="cursor-pointer"
                    ></Image>
                    {isZoomed && (
                        <div
                            className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50"
                            onClick={() => setIsZoomed(null)}
                        >
                            <Image
                                src={image}
                                alt="displaytable"
                                width={1000}
                                height={1000}
                                className="min-w-[80%] min-h-[60%] object-cover rounded-lg transition-transform duration-500 scale-100 cursor-pointer"
                            ></Image>
                        </div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                        <h2 className="text-lg font-semibold text-black">{title}</h2>
                        {isCustom && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">Custom</span>
                        )}
                    </div>
                    <p className="text-gray-600 text-sm mt-1">{description}</p>
                </div>

                <div className="flex gap-2 shrink-0">
                    {isCustom && onDelete && (
                        <button
                            onClick={onDelete}
                            className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="Delete Custom Script"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                    <button
                        onClick={() => setOpen(!open)}
                        className="text-blue-600 hover:underline font-medium"
                    >
                        {open ? "Hide" : "More"}
                    </button>

                    <button
                        onClick={handleCopy}
                        className={`font-medium px-3 py-1 rounded ${copied
                                ? "bg-green-500 text-foreground"
                                : "bg-gray-200 hover:bg-gray-300 hover:text-foreground"
                            } transition-colors duration-300`}
                    >
                        {copied ? "Copied!" : "Copy"}
                    </button>
                </div>
            </div>

            <div
                className={`transition-all duration-500 ease-in-out overflow-hidden ${open ? "max-h-full mt-2" : "max-h-0"
                    }`}
            >
                <pre className="bg-gray-100 text-black p-2 rounded text-sm overflow-x-auto whitespace-pre text-left">
                    <code>{content}</code>
                </pre>
            </div>
        </div>
    );
}
