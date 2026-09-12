const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkSchools() {
    const schools = await db.collection('schools').get();
    for (const school of schools.docs) {
        console.log(`School: ${school.id}`);
        const rules = await db.collection('whatsapp_rules').doc(school.id).get();
        if (rules.exists) {
            console.log(`- Rules exist!`);
            const data = rules.data();
            data.rules.forEach(r => {
                if(r.id === 'menu_main') console.log('menu:', JSON.stringify(r.response));
            });
        }
    }
    process.exit(0);
}
checkSchools();
