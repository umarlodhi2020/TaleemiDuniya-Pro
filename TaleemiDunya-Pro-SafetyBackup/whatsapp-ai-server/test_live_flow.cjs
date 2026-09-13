const fetch = require('node-fetch');

async function testFlow() {
  const schoolId = 'test_school_' + Date.now();
  console.log(`Starting test for ${schoolId}...`);
  
  // 1. Call status
  let res = await fetch(`https://umarhayat.alwaysdata.net/api/session/status?schoolId=${schoolId}&_t=${Date.now()}`);
  console.log('Status 1:', await res.text());

  // 2. Call start
  res = await fetch('https://umarhayat.alwaysdata.net/api/session/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schoolId })
  });
  console.log('Start:', await res.text());

  // 3. Poll for 10 seconds
  for (let i = 0; i < 5; i++) {
    await new Promise(r => setTimeout(r, 2000));
    res = await fetch(`https://umarhayat.alwaysdata.net/api/session/status?schoolId=${schoolId}&_t=${Date.now()}`);
    console.log(`Status poll ${i+1}:`, await res.text());
  }
}

testFlow().catch(console.error);
