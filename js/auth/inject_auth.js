const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes('Auth.js')) {
        content = content.replace('</body>', '<script src="Auth.js"></script>\n</body>');
        fs.writeFileSync(filePath, content);
        console.log(`Injected Auth.js into ${file}`);
    } else {
        console.log(`${file} already has Auth.js`);
    }
});
