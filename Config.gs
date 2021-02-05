// Loads the config sheet into a JavaScript object
function loadConfig(){
  const config = SpreadsheetApp.openById(configId).getRange("A:P").getValues();
  return {
    forms: columnToList(config, 1, 2),
    manualLog: config[2][1],
    autoLog: config[2][2],
    dataFiles: columnToList(config, 4, 3),
    dataFile: config[2][3],
    messages: columnToList(config, 5, 3),
    message: config[2][4],
    slackHook: config[3][5],
    slackAuth: config[3][6],
    slackId: config[3][7],
    logEmail: config[7][5],
    employeeEmail: config[7][6],
    emailSubject: config[7][7],
    inputField: columnToList(config, 9, 3),
    inputCell: columnToList(config, 10, 3, 11),
    inputLabel: columnToList(config, 11, 3),
    inputType: columnToList(config, 12, 3),
    inputEnabled: columnToList(config, 13, 3),
    travelMorning: config[2][13],
    travelEvening: config[2][14],
    access: columnToList(config, 16, 2),
    "Today": new Date()
  }
}

// Converts a column to a list, capped at empty values or if valuesToLoad items are loaded
function columnToList(sheet, column, row, valuesToLoad){
  const res = [];
  for(let i = row - 1; i<sheet.length; i++){
    const val = sheet[i][column - 1];
    if(valuesToLoad != null){
      if(i - row + 1 >= valuesToLoad && val == "") break;
    } else if(val == "") break;
     res.push(val);
  }
   return res;
}
