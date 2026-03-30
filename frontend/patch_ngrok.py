import os
import re

FRONTEND_DIR = r"d:\Forex\dashboardkiller\frontend"

# Regex patterns to match typical fetch calls to the bridge.
# We look for: fetch(something) or fetch(something, { ... })
# where 'something' contains words like BRIDGE, bridge, bridgeUrl, MT5_API, serverUrl, BACKEND_URL, process.env

fetch_regex = re.compile(r'(await\s+)?fetch(?:WithRetry)?\s*\(\s*([^,]+?)(\s*,\s*\{.*?\})?\s*\)', re.DOTALL)

bridge_vars = [
    'BRIDGE', 'bridge', 'bridgeUrl', 'MT5_API', 'serverUrl', 'BACKEND_URL', 'API_BASE', 'process.env', 'API'
]

def process_file(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    original_content = content
    offset = 0

    # We will iterate manually to avoid infinite recursion with sub-replacements.
    def replacement_func(match):
        full_match = match.group(0)
        await_mod = match.group(1) or ""
        url_arg = match.group(2)
        options_arg = match.group(3)

        # Check if the URL relates to our bridge endpoints
        if not any(b in url_arg for b in bridge_vars):
            return full_match
            
        # Check if it already has ngrok headers
        if options_arg and "ngrok-skip" in options_arg:
            return full_match
        
        # If it doesn't have an options arg, we just append one
        if not options_arg:
            new_call = f'{await_mod}fetch({url_arg}, {{ headers: {{ "ngrok-skip-browser-warning": "true" }} }})'
            # Hack: preserve fetchWithRetry if needed
            if "fetchWithRetry" in full_match:
                new_call = new_call.replace("fetch(", "fetchWithRetry(")
            return new_call
        else:
            # It already has options. We must inject headers safely.
            # Example: fetch(url, { method: "POST" })
            # If headers exist, we don't dare parse JSON with regex easily, but we can try simple string replacement.
            if "headers:" in options_arg or "headers :" in options_arg:
                return full_match  # skip complex ones for manual review, or inject into empty dict.
            else:
                # Add headers to existing options block
                mod_options = options_arg.replace('{', '{ headers: { "ngrok-skip-browser-warning": "true" }, ', 1)
                new_call = f'{await_mod}fetch({url_arg}{mod_options})'
                if "fetchWithRetry" in full_match:
                    new_call = new_call.replace("fetch(", "fetchWithRetry(")
                return new_call

    new_content = fetch_regex.sub(replacement_func, content)
    
    # Custom fix for nested string templates fetching URL separately if any...
    
    if new_content != original_content:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Updated {file_path}")

for root, dirs, files in os.walk(FRONTEND_DIR):
    if "node_modules" in root or ".next" in root:
        continue
    for file in files:
        if file.endswith((".tsx", ".ts")):
            process_file(os.path.join(root, file))

print("DONE")
