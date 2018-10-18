var nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'unacloudemails@gmail.com',
    pass: ''
  }
});

exports.sendEmail = function (message, subjectP) {
    var mailOptions = {
        from: 'unacloudemails@gmail.com',
        to: 'unacloudemails@gmail.com',
        subject: subjectP,
        text: message
      };
      
      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
        }
      });
}