const FormData = require('form-data');
const fs = require('fs');
const https = require('https');

const form = new FormData();
const testFile = './uploads/1751617951012-0623 (3).mp4';

if (!fs.existsSync(testFile)) {
  console.error('Test file not found:', testFile);
  process.exit(1);
}

form.append('video', fs.createReadStream(testFile));
form.append('caption', 'Test caption from script');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/upload',
  method: 'POST',
  headers: form.getHeaders(),
  rejectUnauthorized: false,
  timeout: 60000
};

console.log('Sending upload request...');
const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('\n=== RESPONSE ===');
    console.log('Status:', res.statusCode);
    console.log('Response:', data.substring(0, 1000));
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
  process.exit(1);
});

req.on('timeout', () => {
  console.error('Request timeout');
  req.destroy();
  process.exit(1);
});

form.pipe(req);
