const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function searchAll() {
    console.log('Searching all of Firestore...');
    const collections = await db.listCollections();
    for (const col of collections) {
        console.log(`Checking collection: ${col.id}`);
        const snapshot = await col.limit(10).get();
        snapshot.forEach(doc => {
            const data = JSON.stringify(doc.data());
            if (data.includes('challan') || data.includes('attendance check')) {
                console.log(`FOUND IN ${col.id} -> ${doc.id}`);
                console.log(data);
            }
        });
    }
    process.exit(0);
}
searchAll();
