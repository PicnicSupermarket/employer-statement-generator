// Constructs a message then sends it as an email
function constructAndSendEmail(config, logs, fileUrl, person) {
  try {
    const message = config["message"].split("[drive_url]").join(fileUrl);
    sendEmail(placeholder(config["employeeEmail"], person, config), placeholder(config["emailSubject"], person, config), message);
    return null;
  } catch (e) {
    return log(logs, fileUrl, person, "Failed to send Email message");
  }
}

function sendEmail(recipient, subject, message){
  MailApp.sendEmail({
    to: recipient,
    subject: subject,
    htmlBody: message
  });
}
