function daysFromNow(days){
  return shiftDate(new Date(), 24 * days);
}

function shiftDate(date, hoursShifted){
  return new Date(date.getTime() + hours(hoursShifted));
}

function hours(num) {
  return parseInt(num * 60 * 60 * 1000);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function formatDate(date) {
  return Utilities.formatDate(new Date(date), "Europe/Amsterdam", "dd-MM-yyyy");
}

function formatDateTime(date) {
  return Utilities.formatDate(new Date(date), "Europe/Amsterdam", "dd-MM-yyyy HH:mm");
}

// Replaces text placeholders in a string
function placeholder(text, person, config){
  return replacePlaceholders(text, person, config, false, false);
}

// Replaces placeholders in a string by their keys in the config or employee object
function replacePlaceholders(text, employee, config, isDate, hasTime){
  while(text.includes("[")){
    const begin = text.indexOf("[");
    const end = text.indexOf("]");
    const name = text.substring(begin+1, end);
    if(name in employee){
      text = replacePlaceholder(text, name, employee[name], isDate, hasTime);
    } else if(name in config){
      text = replacePlaceholder(text, name, config[name], isDate, hasTime);
    } else {
      throw new Error("Placeholder not found! "+name+" between "+begin+" and "+end);
    }
  }
  return text;
}

// Replaces a single placeholder
function replacePlaceholder(text, name, replacement, isDate, hasTime){
  const placeholder = "[" + name + "]";
  if(hasTime){
    return text.replace(placeholder, formatDateTime(replacement));
  } else if(isDate){
    return text.replace(placeholder, formatDate(replacement));
  }
  return text.replace(placeholder, replacement);
}
