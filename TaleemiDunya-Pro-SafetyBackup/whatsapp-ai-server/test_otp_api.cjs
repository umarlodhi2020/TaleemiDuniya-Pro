const fetch = require('node-fetch');

async function testOtp() {
  console.log("Testing OTP Endpoint on AlwaysData...");
  try {
    const res = await fetch('https://umarhayat.alwaysdata.net/api/mobile/auth/request-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cnic: "32304-1234567-1",
        phone: "03001234567"
      })
    });
    
    const text = await res.text();
    console.log(`Status: ${res.status}`);
    console.log(`Response: ${text}`);
  } catch (err) {
    console.error("Error:", err);
  }
}

testOtp();
