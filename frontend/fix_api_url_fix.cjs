const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const replaceInFile = (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace \${import.meta.env.VITE_API_URL or similar with ${import.meta.env.VITE_API_URL
    const regex = /\\\$\{import\.meta\.env\.VITE_API_URL/g;
    let newContent = content.replace(regex, "${import.meta.env.VITE_API_URL");

    if (content !== newContent) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`Fixed: ${filePath}`);
    }
};

const walkSync = (dir) => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            walkSync(filePath);
        } else if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
            replaceInFile(filePath);
        }
    }
};

walkSync(srcDir);
console.log('Done!');
