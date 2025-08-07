const { execSync } = require('child_process');

// Install dependencies
console.log('Installing dependencies...');
execSync('npm install --production=false', { stdio: 'inherit' });

// Run the Next.js build
console.log('Running Next.js build...');
execSync('npm run build', { stdio: 'inherit' });

console.log('Build completed successfully!');
