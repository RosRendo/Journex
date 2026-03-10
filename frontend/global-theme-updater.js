const fs = require('fs');
const path = require('path');

const replacements = {
    'bg-gray-900': 'bg-background hover:bg-muted text-foreground',
    'bg-gray-800': 'bg-card border border-border text-card-foreground shadow-sm',
    'bg-gray-700': 'bg-muted border border-border/50 text-foreground',
    'bg-gray-600': 'bg-muted/80',
    'text-gray-500': 'text-muted-foreground',
    'text-gray-400': 'text-muted-foreground',
    'text-gray-300': 'text-foreground/80',
    'text-gray-200': 'text-foreground',
    'border-gray-800': 'border-border',
    'border-gray-700': 'border-border',
    'border-gray-600': 'border-border/50',
    'text-white': 'text-foreground'
};

function processDirectory(directory) {
    fs.readdirSync(directory).forEach(file => {
        const fullPath = path.join(directory, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let originalContent = fs.readFileSync(fullPath, 'utf8');
            let newContent = originalContent;

            for (const [k, v] of Object.entries(replacements)) {
                newContent = newContent.split(k).join(v);
            }

            if (newContent !== originalContent) {
                fs.writeFileSync(fullPath, newContent);
                console.log(`Updated: ${fullPath}`);
            }
        }
    });
}

processDirectory('./app');
processDirectory('./components');
console.log('✅ Finished updating tailwind gray classes to global theme classes');
