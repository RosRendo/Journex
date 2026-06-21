import re

file_path = r"d:\Forex\journex\frontend\app\sentiment\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace mock compliant data
content = content.replace("compliant: Math.random() > 0.3", "compliant: true")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Patched sentiment/page.tsx")
