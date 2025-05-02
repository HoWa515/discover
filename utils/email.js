const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // 1) create a transporter(mailtrap in this case)
  const transporter = nodemailer.createTransport({
    // service: 'Gmail',
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  // 2) define the email option
  const mailOptions = {
    from: 'Hong Wang <user@hong.io>',
    to: options.email,
    subject: options.subject,
    text: options.message,
    // html comes later
  };

  // 3) send email
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
