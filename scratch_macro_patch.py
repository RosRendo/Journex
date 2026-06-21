import re

file_path = r"d:\Forex\journex\frontend\app\macro\[pair]\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Fix retail sentiment fallback
content = content.replace("Math.floor(Math.random() * 40) + 30", "50")

# 2. Fix useMT5ChartData fallback
mock_fallback_mt5 = """        let base = pair.includes("JPY") ? 150 : (pair.includes("USD") ? 1.05 : 24000);
        setData(Array.from({ length: 48 }).map((_, i) => {
          base += (Math.sin(i / 5) + (Math.random() - 0.5)) * (base * 0.005);
          return { time: `${Math.floor(i/2)}:00`, price: Number(base.toFixed(5)) };
        }));"""

clean_fallback_mt5 = """        setData([]);"""
content = content.replace(mock_fallback_mt5, clean_fallback_mt5)

# 3. Fix useRelativeStrength fallback
mock_fallback_rs = """        const hash = pair.charCodeAt(0);
        let pairVal = 0.025, basketVal = 0.01;
        setData(Array.from({ length: 60 }).map((_, i) => {
          pairVal += Math.sin(i / 6 + hash) * 0.002 + (Math.random() - 0.5) * 0.001;
          basketVal += Math.sin(i / 10 + hash + 3) * 0.0005 + (Math.random() - 0.5) * 0.0004;
          return { i, pair: +pairVal.toFixed(5), basket: +basketVal.toFixed(5) };
        }));"""

clean_fallback_rs = """        setData([]);"""
content = content.replace(mock_fallback_rs, clean_fallback_rs)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Patched macro/[pair]/page.tsx")
