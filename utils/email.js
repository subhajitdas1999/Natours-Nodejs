const nodemailer = require("nodemailer");
const pug = require("pug");
const dotenv = require("dotenv");
const htmlToText = require("html-to-text");

dotenv.config({ path: "../config.env" });

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(" ")[0];
    this.url = url;
    this.from = `${process.env.EMAIL_FROM}`;
  }

  // return Nodemailer transport
  newTransport() {
    // if (process.env.NODE_ENV === "production") {
    //   // Sendgrid
    //   return 1;
    // }

    return nodemailer.createTransport({
      service:'SendGrid',
      auth: {
        user: process.env.SENDGRID_USERNAME,
        pass: process.env.SENDGRID_PASSWORD,
      },
    });

    // return nodemailer.createTransport({
    //   host: process.env.EMAIL_HOST,
    //   port: process.env.EMAIL_PORT,

    //   auth: {
    //     user: process.env.EMAIL_USERNAME,
    //     pass: process.env.EMAIL_PASSWORD,
    //   },
    // });
  }

  //Send the actual email

  async send(template, subject) {
    // 1) Render HTML based on pug template
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`,{
      firstName: this.firstName,
      url:this.url,
      subject
    });

    // 2) Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText.convert(html,{
        wordwrap: 130
      }),
    };

    // 3) Create a transport and send email
    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send("welcome", "Welcome to Natours");
  }
  async sendPasswordResetToken() {
    await this.send("passwordReset", "Your password reset token (valid for 10 minutes)");
  }
};

// const sendEmail = async (options) => {
//   // 1) Create a transporter

//   const transporter = nodemailer.createTransport({
//     host: process.env.EMAIL_HOST,
//     port: process.env.EMAIL_PORT,

//     auth: {
//       user: process.env.EMAIL_USERNAME,
//       pass: process.env.EMAIL_PASSWORD,
//     },
//   });

//   // 2) Define the email options
//   const mailOptions = {
//     from: "Subhajit Das <subhajitgodo@gmail.com>",
//     to: options.email,
//     subject: options.subject,
//     text: options.message,
//   };

//   // 3) Actually send the email

//   await transporter.sendMail(mailOptions);
// };

// module.exports = sendEmail;
