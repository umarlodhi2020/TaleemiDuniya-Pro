const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function restartViaApi() {
  console.log('=== CHECKING ALWAYSDATA REST API FOR SITES ===');
  try {
    // Try hitting alwaysdata API from inside or locally
    const auth = Buffer.from('umarhayat:umar9900').toString('base64');
    const res = await fetch('https://api.alwaysdata.com/v1/site/', {
      headers: { 'Authorization': `Basic ${auth}` }
    });
    console.log('API Status:', res.status);
    if (res.status === 200) {
      const sites = await res.json();
      console.log('Sites found:', JSON.stringify(sites, null, 2));
      for (const site of sites) {
        console.log(`Restarting site ${site.id} (${site.name})...`);
        const rRes = await fetch(`https://api.alwaysdata.com/v1/site/${site.id}/restart/`, {
          method: 'POST',
          headers: { 'Authorization': `Basic ${auth}` }
        });
        console.log(`Restart Status for ${site.id}: ${rRes.status}`);
      }
    } else {
      const txt = await res.text();
      console.log('API Error:', txt.substring(0, 200));
    }
  } catch (err) {
    console.error('API exception:', err.message);
  }
}

restartViaApi();
