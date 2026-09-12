const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function fixNewlines() {
    console.log('Fetching all school rules...');
    const snapshot = await db.collection('whatsapp_rules').get();
    
    for (const doc of snapshot.docs) {
        let changed = false;
        const data = doc.data();
        if (data.rules && Array.isArray(data.rules)) {
            const newRules = data.rules.map(rule => {
                if (rule.response && rule.response.includes('\\n')) {
                    // Replace literal \n string with actual newline character
                    rule.response = rule.response.replace(/\\n/g, '\n');
                    changed = true;
                }
                return rule;
            });

            if (changed) {
                console.log(`Fixing newlines for school: ${doc.id}`);
                await doc.ref.update({ rules: newRules });
            }
        }
    }
    console.log('Done!');
    process.exit(0);
}

fixNewlines().catch(console.error);
