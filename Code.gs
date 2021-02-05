var configId = "1saiF5RRjg3tLyEioRghMQDZHoJKNNbTh3nZqvZ--w4A";

function doGet(e) {
  return HtmlService.createTemplateFromFile("webapp").evaluate();
}

function sendForms(){
  generateStatementsAutomatically(loadConfig(), daysFromNow(0), [], 0);
}

function hasAccess(config) {
  return config["access"].includes(Session.getActiveUser().getEmail());
}

// Reads a Google Sheet and generates employer's statements for each of the employees in there
function generateStatementsAutomatically(config, date, locations, workerNum) {
  if(!("dataFile" in config)){
    config["dataFile"] = config["dataFiles"][0];
  }
  if(!("message" in config)){
    config["message"] = config["messages"][0];
  }

  // Load data from datasource
  const dataSheet = SpreadsheetApp.openById(config["dataFile"]);
  const sheet = dataSheet.getSheets()[0];
  dataSheet.setActiveSheet(sheet);
  const header = dataSheet.getSheetValues(1, 1,  1, sheet.getMaxColumns())[0];
  const toBeGenerated = dataSheet.getSheetValues(2, 1,  sheet.getMaxRows(), sheet.getMaxColumns());
  const dataObject = constructDataObject(config, header, toBeGenerated, date, locations);

  // Store logs and create a folder for the statements
  const runName = ("log" in config ? config["log"] + " " : "") + formatDateTime(new Date());
  const folder = DriveApp.createFolder(runName);
  const logs = SpreadsheetApp.openById(config["autoLog"]);
  const logSheet = logs.insertSheet(runName, {template: logs.getSheetByName("Template")});
  logs.setActiveSheet(logSheet);

  // Generate each statement sequentially
  let successful = 0;
  let failed = 0;
  for (p in dataObject) {
    const res = generateEmployeeStatement(dataObject[p], config, folder, logs, config["forms"][workerNum]);
    if (res.startsWith("Success")) {
      successful++;
    } else {
      failed++;
    }
  }
  sendRunResults(config, successful, failed, logs.getUrl(), runName);
}

// Convert two arrays into an object, using the "keys" as keys and "employee" as values
function populateKeys(keys, employee) {
  const res = {};
  for(let i = 0; i<keys.length; i++){
      res[keys[i]] = employee[i];
  }
  return res;
}

function hasAccess(config) {
  return config["access"].includes(Session.getActiveUser().getEmail());
}

// Function used by the webapp
function generateStatementWebapp(reason, name, start, end, birthdate, role, reqName) {
  const config = loadConfig();
  if (!hasAccess(config)) {
    return "You don't have access to this tool.";
  }

  const folderName = "Manual Statements";
  const employee = constructEmployee(reason, name, new Date(start), new Date(end), birthdate == "" ? "" : new Date(birthdate), role);
  const folders = DriveApp.getFoldersByName(folderName);
  const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
  const res = generateEmployeeStatement(employee, config, folder, null, config["forms"][0]);
  const log = SpreadsheetApp.openById(config["manualLog"]);
  log.appendRow([Session.getActiveUser().getEmail(), reqName, new Date(), JSON.stringify(employee), res]);
  return res;
}

// Constructs an object containing the data for a single employee
function constructEmployee(reason, name, start, end, birthdate, role){
  return {
    "Reason": reason,
    "Full name": name,
    "Shift start": start,
    "Shift end": end,
    "Birthdate": birthdate,
    "Role": role,
  }
}

// Generates the employer's statement for a single employee and informs the employee via the chosen communication channel(s)
function generateEmployeeStatement(employee, config, folder, logs, worker) {
  if (employee["Full name"] == "") {
    return logError(logs, employee, "Employee has no name!");
  } else if (employee["Slack ID"] == "") {
    return logError(logs, employee, "Employee has no Slack id!");
  }

  employee["Shift start"] = shiftDate(employee["Shift start"], -config["travelMorning"]);
  employee["Shift end"] = shiftDate(employee["Shift end"], config["travelEvening"]);

  const fileUrl = tryToCreatePdfFile(config, worker, `Werkgeversverklaring ${employee["Full name"]}  ${formatDate(employee["Shift start"])}`, folder, employee);

  if (fileUrl == null) {
    return logError(logs, employee, "Generate pdf failed!");
  }

  var res = sendCommunications(config, logs, fileUrl, employee);
  if(res != null){
    return res;
  }

  log(logs, fileUrl, employee, "");
  return `Successfully generated! Please share the following url with the employee: <a href="${fileUrl}" target="_blank">${fileUrl}</a>`;
}

// Sends the url of the generated statement to the employee, either via email or Slack
function sendCommunications(config, logs, fileUrl, employee){
  if ("slackId" in config && config["slackId"] != "" && "Slack ID" in employee && employee["Slack ID"] != "") {
    const res = constructAndSendSlack(config, logs, fileUrl, employee);
    if (res != null) return res;
  }
  if("employeeEmail" in config && config["employeeEmail"] != "" && "Email" in employee && employee["Email"] != ""){
    const res = constructAndSendEmail(config, logs, fileUrl, employee);
    if (res != null) return res;
  }
  return null;
}

// Filters employees that work at the chosen date, in the chosen locations, and have their shift in curfew time
function constructDataObject(config, header, data, date, locations) {
  let filteredShifts = data.map(employee => populateKeys(header, employee))
  .filter(employee => {
    const shiftStart = employee["Shift start"];
    const shiftEnd = employee["Shift end"];
    const employeeId = employee["PW ID"];
    const location = employee["Location"];

    if (employeeId == "" || (date != null && (shiftStart.getMonth() != date.getMonth() || shiftStart.getDate() != date.getDate()))) return false;

    if (locations.length > 0 && !locations.includes(location)) return false;

    // Check whether the employee actually needs a statement (working hours fall within curfew time)
    const startTime = shiftStart.getHours() + (shiftStart.getMinutes() / 60);
    const endTime = shiftEnd.getHours() + (shiftEnd.getMinutes() / 60);
    return startTime - config["travelMorning"] < 4.5 || endTime + config["travelEvening"] > 21 || endTime < 4.5;
  });
  return mergeShifts(filteredShifts);
}

// If an employee has multiple shifts within curfew time, we merge the shifts such that they receive one statement that works for all shifts
function mergeShifts(filteredShifts){
  const dataByPW = {};
  filteredShifts.forEach(employee => {
    const pw = employee["PW ID"];
    if (pw in dataByPW) {
      const existingRecord = dataByPW[pw];
      if (employee["Shift start"] < existingRecord["Shift start"]) {
        existingRecord["Shift start"] = employee["Shift start"];
      }
      if (employee["Shift end"] > existingRecord["Shift end"]) {
        existingRecord["Shift end"] = employee["Shift end"];
      }
    } else if (pw != "") {
      dataByPW[pw] = employee;
    }
  });
  console.log("Signing up " + Object.keys(dataByPW).length + " employees");
  return dataByPW;
}
