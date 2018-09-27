var nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'unacloudemails@gmail.com',
    pass: 'unacloud123'
  }
});

exports.sendEmail = function (message) {
    var mailOptions = {
        from: 'unacloudemails@gmail.com',
        to: 'unacloudemails@gmail.com',
        subject: 'Failure at unacloud environment',
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