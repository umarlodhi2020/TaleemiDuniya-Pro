import admin from 'firebase-admin';
admin.initializeApp({ projectId: 'taleemidunya-pro-ed44e' });
const db = admin.firestore();

async function fix() {
  try {
    await db.collection('schools').doc('default_school').set({
      allowedFeatures: {
        'whatsapp-automation': true,
        'sms-bot': true,
        'ai-copilot': true,
        'sms': true
      }
    }, { merge: true });
    
    await db.collection('schools').doc('saas_demo_school').set({
      allowedFeatures: {
        'whatsapp-automation': true,
        'sms-bot': true,
        'ai-copilot': true,
        'sms': true
      }
    }, { merge: true });

    console.log('Fixed allowedFeatures in Firestore!');
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

fix();
