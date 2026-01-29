const nodemailer = require('nodemailer');

// Check if email credentials are configured
const EMAIL_USER = process.env.EMAIL_USER || 'kjayeshrao@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASS || 'wnysxyskvlvsuqvv';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  }
});

async function sendOTP(email, otp, type = 'login') {
  // Email credentials configured and ready to use
  
  const subjects = {
    login: 'Login OTP',
    registration: 'Email Verification OTP'
  };
  
  const messages = {
    login: `Your login OTP is ${otp}. Valid for 2 minutes.`,
    registration: `Your email verification OTP is ${otp}. Valid for 10 minutes. Please use this to verify your account.`
  };

  try {
    await transporter.sendMail({
      from: `"Secure System" <${EMAIL_USER}>`,
      to: email,
      subject: subjects[type] || subjects.login,
      text: messages[type] || messages.login
    });
    console.log(`✅ OTP sent successfully to ${email}`);
  } catch (error) {
    console.error(`\n❌ Failed to send email to ${email}:`);
    console.error(`   Error: ${error.message}`);
    if (error.code === 'EAUTH') {
      console.error('\n   Gmail authentication failed. Please check:');
      console.error('   1. Your Gmail address is correct');
      console.error('   2. You\'re using an App Password (not your regular password)');
      console.error('   3. 2-Step Verification is enabled on your Google account');
      console.error('   Get App Password: https://myaccount.google.com/apppasswords\n');
    }
    console.error(`   OTP for ${email}: ${otp}\n`);
  }
}

module.exports = sendOTP;
