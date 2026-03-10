const fs = require('fs');

const file = 'app/backtesting/page.tsx';
let text = fs.readFileSync(file, 'utf8');

const replacements = {
    'bg-gray-900': 'bg-background text-foreground',
    'bg-gray-800': 'bg-card border border-border shadow-sm text-card-foreground',
    'bg-gray-700': 'bg-muted border border-border/50 text-foreground',
    'text-gray-400': 'text-muted-foreground',
    'text-gray-300': 'text-foreground/80',
    'text-gray-200': 'text-foreground',
    'bg-yellow-500': 'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors',
    'text-gray-900': '',
    'hover:bg-yellow-600': '',
    'border-gray-700': 'border-border',
    'border-gray-800': 'border-border',
    'text-yellow-500': 'text-primary',
    'text-amber-400': 'text-primary',
    'text-white': 'text-foreground',
    'background: { color: "#1e1e1e" }': 'background: { color: "transparent" }',
    'textColor: "#d1d5db"': 'textColor: "hsl(var(--muted-foreground))"',
    'vertLines: { color: "#2a2a2a" }': 'vertLines: { color: "hsl(var(--border))" }',
    'horzLines: { color: "#2a2a2a" }': 'horzLines: { color: "hsl(var(--border))" }',
    'upColor: "#26a69a"': 'upColor: "hsl(var(--primary))"',
    'downColor: "#ef5350"': 'downColor: "hsl(var(--destructive))"',
    'wickUpColor: "#26a69a"': 'wickUpColor: "hsl(var(--primary))"',
    'wickDownColor: "#ef5350"': 'wickDownColor: "hsl(var(--destructive))"'
};

for (const [k, v] of Object.entries(replacements)) {
    text = text.split(k).join(v);
}

fs.writeFileSync(file, text);
console.log('✅ Updated backtesting page theme to match globals.css styling rules.');
