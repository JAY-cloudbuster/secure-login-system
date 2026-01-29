# Email Configuration Guide

## Setting up Gmail SMTP for OTP Emails

### Option 1: Environment Variables (Recommended)

1. Create a `.env` file in the `backend` folder:
```
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-char-app-password
```

2. Install dotenv package:
```bash
npm install dotenv
```

3. Add to the top of `mailer.js`:
```javascript
require('dotenv').config();
```

### Option 2: Direct Configuration

Edit `backend/mailer.js` and replace:
- `YOUR_GMAIL@gmail.com` with your Gmail address
- `YOUR_16_CHAR_APP_PASSWORD` with your Gmail App Password

## Getting a Gmail App Password

1. Go to your Google Account: https://myaccount.google.com/
2. Enable **2-Step Verification** (if not already enabled)
3. Go to **App Passwords**: https://myaccount.google.com/apppasswords
4. Select **Mail** and **Other (Custom name)**
5. Enter "Secure Login System" as the name
6. Click **Generate**
7. Copy the 16-character password (no spaces)
8. Use this password in your configuration

## Testing

After configuration, the server will:
- Send OTP emails successfully
- Display OTP in console if email fails (for testing)
- Show helpful error messages if authentication fails

## Troubleshooting

**Error: Invalid login / BadCredentials**
- Make sure you're using an App Password, not your regular Gmail password
- Verify 2-Step Verification is enabled
- Check that the email and password are correct

**Error: EADDRINUSE (Port already in use)**
- Run `node kill-port.ps1` in PowerShell (Windows)
- Or manually kill: `netstat -ano | findstr :3000` then `taskkill /PID <pid> /F`
- Or use a different port: `PORT=3001 node server.js`
