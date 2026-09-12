const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkRules() {
    const snapshot = await db.collection('whatsapp_rules').get();
    
    for (const doc of snapshot.docs) {
        console.log(`School: ${doc.id}`);
        const data = doc.data();
        if (data.rules && Array.isArray(data.rules)) {
            data.rules.forEach(rule => {
                if (rule.id === 'menu_main') {
                    console.log('--- menu_main ---');
                    console.log(JSON.stringify(rule.response));
                }
            });
        }
    }
    process.exit(0);
}

checkRules().catch(console.error);
