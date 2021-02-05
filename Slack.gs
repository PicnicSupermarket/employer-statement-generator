// Posts a message to a specific Slack channel or user. Requires a Slack app with chat.postMessage permission.
function postToSlack(auth, channel, text) {
  const url = "https://slack.com/api/chat.postMessage";
  const options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(constructSlackPayload(auth, channel, text))
  }
  options.headers = { "Authorization": "Bearer " + auth }
  return JSON.parse(UrlFetchApp.fetch(url, options));
}

function constructSlackPayload(auth, channel, text){
  return {
    token: auth,
    channel: channel,
    as_user: true,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: text
        }
      }
    ]
  };
}

// Constructs a message and sends it to a Slack user
function constructAndSendSlack(config, logs, fileUrl, employee) {
  try {
    const message = config["message"].split("[drive_url]").join(fileUrl);
    const res = postToSlack(config["slackAuth"], placeholder(config["slackId"], employee, config), message);
    if (!res.ok) {
      return log(logs, fileUrl, employee, "Invalid response from Slack: " + res);
    } else {
      return null;
    }
  } catch (e) {
    return log(logs, fileUrl, employee, "Failed to send Slack message");
  }
}

// Sends a message via a Slack hook
function sendToSlack(hook, message) {
  const slackUrl = hook;
  const payload = `{ "text": ${JSON.stringify(message)} }`;
  const options = {
    method: "post",
    payload: payload
  };
  try {
    UrlFetchApp.fetch(slackUrl, options);
  } catch (e) {
    console.log(e);
  }
}
