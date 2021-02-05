// Populates all fields of a google slides template
function genPdf(config, workerId, employee) {
  const doc = SlidesApp.openById(workerId);
  doc.getSlides().flatMap(page => page.getShapes()).forEach(input => populateField(config, input.getText(), input.getTitle(), employee));
  doc.saveAndClose();
}

// Populates a single field in a google slides template
function populateField(config, text, alt, employee) {
  const fields = config["inputField"];
  const cells = config["inputCell"];
  const type = config["inputType"];
  for(let i = 0; i<fields.length; i++){
    if(alt == fields[i] && cells[i] != ""){
      text.setText(replacePlaceholders(cells[i], employee, config, type[i] == "Date", type[i] == "Date-time range"));
    }
  }
}

// Populates google slide template, then converts it to PDF
function createPdfFile(config, workerId, fileName, folder, employee) {
  if (workerId == config["forms"][0]){
    LockService.getScriptLock().waitLock(120000);
  }
  genPdf(config, workerId, employee);
  const blob = DriveApp.getFileById(workerId).getBlob();
  const file = DriveApp.createFile(blob);
  file.setName(fileName);
  file.moveTo(folder);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  if (workerId == config["forms"][0]){
    LockService.getScriptLock().waitLock(120000);
  }
  return file.getUrl();
}

// Tries trice to generate the PDF file
function tryToCreatePdfFile(config, workerId, fileName, folder, person){
  for(let i = 0; i<3; i++){
    try {
      return createPdfFile(config, workerId, fileName, folder, person);
    } catch(e){
      console.log(e);
    }
  }
  return null;
}
