import nodeMailer from "nodemailer";

const sendEmail = async (configurations, options) => {
  const port = Number(configurations.port);
  const transporter = nodeMailer.createTransport({
    host: configurations.host,
    port,
    secure: port === 465,
    auth: {
      user: configurations.user,
      pass: configurations.pass,
    },
  });
  const mailOption = {
    from: configurations.from,
    to: options.to,
    cc: options.cc,
    bcc: options.bcc,
    subject: options.subject,
    html: options.html,
  };

  await transporter.sendMail(mailOption);
};

export default sendEmail;
