// Adds a row to the logging sheet with the given info
function log(logs, fileUrl, employee, message) {
  if (logs != null) logs.appendRow([employee["PW ID"], fileUrl, message, JSON.stringify(employee), new Date()]);
  return message;
}

function logError(logs, employee, message) {
  return log(logs, "", employee, message);
}

// Communicates script success or failure to the operator of the system
function sendRunResults(config, successful, failed, url, name){
  const message = `Employer's statements were successfully sent for ${successful} employees. \n${failed === 0 ? "" : `Unfortunately, sending the documents for ${failed} employees failed, more info about the reason can be found in the logs. \n`}Here are the logs: `;

  if(config["slackHook"] != ""){
    sendToSlack(config["slackHook"], `${message}<${url}|${name}>`);
  }
  if(config["logEmail"] != "") {
    sendEmail(config["logEmail"], config["emailSubject"], message + url);
  }
}
