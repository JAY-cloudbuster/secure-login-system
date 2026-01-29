const QRCode = require('qrcode');

// Generate QR code for OTP
async function generateOTPQR(otp, username) {
  try {
    const data = JSON.stringify({
      otp: otp,
      username: username,
      timestamp: Date.now()
    });
    
    // Generate QR code as data URL (base64 encoded)
    const qrDataURL = await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 300,
      margin: 2
    });
    
    return qrDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
}

// Generate QR code as base64 string
async function generateQRBase64(data) {
  try {
    const qrBuffer = await QRCode.toBuffer(data, {
      errorCorrectionLevel: 'M',
      width: 300
    });
    
    return qrBuffer.toString('base64');
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
}

// Decode QR code data (for demonstration - in real app, use QR scanner)
function decodeQRData(qrData) {
  try {
    // Extract base64 data from data URL
    const base64Data = qrData.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    // In real implementation, you would use a QR decoder library
    // This is just for demonstration
    return buffer.toString('utf8');
  } catch (error) {
    console.error('Error decoding QR code:', error);
    throw error;
  }
}

module.exports = { generateOTPQR, generateQRBase64, decodeQRData };
