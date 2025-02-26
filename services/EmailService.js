require("dotenv").config({ silent: true });
var nodemailer = require("nodemailer");

// a class to handle sending email
function EmailService({ config }) {
  this.getTransporter = () => {
    // format the transporter object properly
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_SERVER,
      secure: true,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
      },
    });
    return transporter;
  };

  this.getMailOptions = (to, subject, text) => {
    // format the mail options object properly
    const mailOptions = {
      from: process.env.SMTP_FROM_ADDRESS,
      to: to,
      subject: subject,
      text: text,
      // html: html // causes getting flagged as spam!
    };
    return mailOptions;
  };

  // send the mail!
  this.send = (
    to,
    subject,
    text,
    unsubscribeLink = true,
    recipientUserId = false
  ) => {
    // add signature
    text += "\n\nSincerely,\nThe Wikistreets.io Team";
    // tack on unsubscribe info, if desired
    if (unsubscribeLink && recipientUserId) {
      text += `\n\n--\nWe aim to keep email notifications to a minimum, only sending email when we think it is of direct interest to your use of your maps.  If you wish to unsubscribe from all email notifications, first log in and then visit https://wikistreets.io/users/unsubscribe/email/${recipientUserId}.`;
    }

    const transporter = this.getTransporter();
    const mailOptions = this.getMailOptions(to, subject, text);

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(`Error sending email to ${to}: ${error}`);
      } else {
        console.log(`Email sent to ${to}: ${info}`);
      }
    });
  }; // send
} // EmailService

module.exports = {
  EmailService,
};
