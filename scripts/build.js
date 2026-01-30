const less = require('less');
const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '../src/main.less');
const outputFile = path.join(__dirname, '../dist/main.css');

const lessContent = fs.readFileSync(inputFile, 'utf8');

less.render(lessContent, {
    paths: [path.join(__dirname, '../src')],
    filename: 'main.less'
})
.then(output => {
    fs.writeFileSync(outputFile, output.css);
    console.log('Build successful: dist/main.css');
})
.catch(error => {
    console.error('Build failed:', error);
    process.exit(1);
});
