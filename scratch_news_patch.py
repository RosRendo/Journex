import re

file_path = r"d:\Forex\journex\frontend\app\news\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace heat score
content = content.replace("Math.floor(Math.random() * 4) + 6", "8")

# Replace drift
mock_drift = """           setFearGreed(prev => {
             const drift = Math.floor(Math.random() * 5) - 2;
             return Math.min(100, Math.max(0, prev + drift));
           });"""
clean_drift = """           setFearGreed(prev => prev);"""
content = content.replace(mock_drift, clean_drift)

mock_drift2 = """          setFearGreed(prev => {
            const drift = Math.floor(Math.random() * 5) - 2;
            return Math.min(100, Math.max(0, prev + drift));
          });"""
clean_drift2 = """          setFearGreed(prev => prev);"""
content = content.replace(mock_drift2, clean_drift2)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Patched news/page.tsx")
