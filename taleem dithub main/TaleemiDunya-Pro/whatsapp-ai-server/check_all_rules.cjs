const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkAllRules() {
    console.log('Checking all documents in whatsapp_rules...');
    const snapshot = await db.collection('whatsapp_rules').get();
    if (snapshot.empty) {
        console.log('whatsapp_rules collection is completely EMPTY!');
    } else {
        snapshot.docs.forEach(doc => {
            console.log(`Document ID: ${doc.id}`);
            const data = doc.data();
            data.rules.forEach(r => {
                if(r.id === 'menu_main') console.log('menu:', JSON.stringify(r.response));
            });
        });
    }
    process.exit(0);
}
checkAllRules();
