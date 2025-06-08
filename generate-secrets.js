// Generate secure secrets for Railway deployment
const crypto = require('crypto');

console.log('🔐 Generated Secure Secrets for Railway:');
console.log('');
console.log('Copy these into your Railway environment variables:');
console.log('');
console.log('JWT_SECRET=' + crypto.randomBytes(32).toString('hex'));
console.log('SESSION_SECRET=' + crypto.randomBytes(32).toString('hex'));
console.log('');
console.log('✅ Each secret is 64 characters long (32 bytes in hex)');
console.log('💡 These are cryptographically secure random strings');
console.log('');
console.log('🚀 Next steps:');
console.log('1. Copy the JWT_SECRET value');  
console.log('2. Paste it in Railway → Variables → JWT_SECRET');
console.log('3. Copy the SESSION_SECRET value');
console.log('4. Paste it in Railway → Variables → SESSION_SECRET'); 