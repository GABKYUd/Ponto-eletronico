const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const replaceInFile = (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    const regex1 = /'http:\/\/localhost:3001([^']+)'/g;
    let newContent = content.replace(regex1, "`\\${import.meta.env.VITE_API_URL || 'http://localhost:3001'}$1`");

    // Replace template literals: `http://localhost:3001/api/...` -> `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/...`
    const regex2 = /`http:\/\/localhost:3001([^`]+)`/g;
    newContent = newContent.replace(regex2, "`\\${import.meta.env.VITE_API_URL || 'http://localhost:3001'}$1`");

    // Special case for io('http://localhost:3001')
    const regex3 = /io\('http:\/\/localhost:3001'\)/g;
    newContent = newContent.replace(regex3, "io(import.meta.env.VITE_API_URL || 'http://localhost:3001')");

    if (content !== newContent) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`Updated: ${filePath}`);
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
