# HTTPS Setup for Local Development

This project uses HTTPS with self-signed certificates to avoid mixed content issues with Stripe iframes.

## 🔒 HTTPS Server

The server automatically starts with HTTPS using self-signed certificates:
- **Certificate**: `cert/localhost-cert.pem`
- **Private Key**: `cert/localhost-key.pem`
- **URL**: `https://localhost:3000`

## 🌐 Browser Certificate Trust

When you first visit `https://localhost:3000`, your browser will show a security warning because the certificate is self-signed.

### Chrome/Edge:
1. Click "Advanced"
2. Click "Proceed to localhost (unsafe)"
3. The site will load normally

### Firefox:
1. Click "Advanced"
2. Click "Accept the Risk and Continue"
3. The site will load normally

### Safari:
1. Click "Show Details"
2. Click "visit this website"
3. Click "Visit Website" in the popup

## 🔧 Troubleshooting

If HTTPS fails to start, the server will automatically fall back to HTTP with a warning message.

## 📋 Benefits

- ✅ Stripe iframes work without mixed content errors
- ✅ All HTTPS features available (service workers, etc.)
- ✅ Matches production environment more closely

## 🚀 Usage

Simply start the server as usual:
```bash
npm start
# or
node server.js
```

The server will automatically use HTTPS and display the URL in the console.
