const https = require('https');
https.get('https://umarhayat.alwaysdata.net/api/check-db', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log(data));
});
