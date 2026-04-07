const { execSync } = require('child_process');

try {
  console.log("Removing cached modules...");
  execSync('git rm -r --cached Backend', { stdio: 'ignore' });
  execSync('git rm -r --cached tsss-frontend-main', { stdio: 'ignore' });
} catch (e) {}

try {
  console.log("Adding directories...");
  execSync('git add Backend tsss-frontend-main .', { stdio: 'inherit' });
  
  console.log("Committing...");
  execSync('git commit -m "Ultimate tracking fix"', { stdio: 'inherit' });
} catch (e) {
  console.log("Commit already exists or nothing to commit.");
}

console.log("Done.");
