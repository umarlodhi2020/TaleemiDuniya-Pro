const https = require('https');

https.get('https://umarhayat.alwaysdata.net/api/session/status?schoolId=NNRuCtHxQNjISc9EPgMs', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log('Smart Angels Status:', data));
});

https.get('https://umarhayat.alwaysdata.net/api/session/status?schoolId=default_school', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log('Default School Status:', data));
});
