const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'taleemiduniyapro@gmail.com',
    pass: 'bqrbydwkpbmtjdpg'
  }
});

transporter.sendMail({
  from: 'taleemiduniyapro@gmail.com',
  to: 'hayatlodhi25@gmail.com',
  subject: 'Test',
  text: 'Test'
}).then(info => {
  console.log('SUCCESS: ' + info.response);
  process.exit(0);
}).catch(err => {
  console.error('ERROR: ' + err.message);
  process.exit(1);
});
