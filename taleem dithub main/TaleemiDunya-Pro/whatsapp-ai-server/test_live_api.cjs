async function testApi() {
  console.log('=== TESTING ALWAYSDATA API ENDPOINTS ===');
  try {
    const res1 = await fetch('https://umarhayat.alwaysdata.net/api/rules?schoolId=default_school');
    const data1 = await res1.json();
    console.log('Rules API status:', res1.status, data1);
  } catch (err) {
    console.error('Rules API error:', err.message);
  }

  try {
    const res2 = await fetch('https://umarhayat.alwaysdata.net/api/session/status?schoolId=default_school');
    const text2 = await res2.text();
    console.log('Session Status API response:', res2.status, text2);
  } catch (err) {
    console.error('Session Status API error:', err.message);
  }
}

testApi();
