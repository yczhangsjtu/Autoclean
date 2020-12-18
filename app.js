const {dialog} = require('electron').remote;
const fs = require('fs');

function find_target(filename) {
  for(var i = rules.rules.length-1; i >= 0; i--) {
    var rule = rules.rules[i];
    try {
      if(filename.match(new RegExp(rule.pattern))) {
        return rule.target;
      }
    } catch (e) {
      console.error(e);
    }
  }
  return "";
}

function update_file_table_data() {
  file_table_data = [];
  files = fs.readdirSync(selected_path);
  for (var i = 0; i < files.length; i++) {
    file_table_data.push(
      {
        "file": files[i],
        "target": find_target(files[i]),
      }
    );
  }
}

function set_path(p) {
  selected_path = p;
  $(".path").html(selected_path);
  update_file_table_data();
  update_file_table();
}

function file_entry_onchange(event) {
  entry = $(event.target);
  index = entry.attr("index");
  if(entry.val() != file_table_data[index].file) {
    entry.css("border-color", "red");
  } else {
    entry.css("border-color", "");
  }
}

function targets_entry_onchange(event) {

}

function move_button_click(event) {
  button = $(event.target);
  index = button.attr("index");
  target = file_table_data[index].target;
  console.log(`${index} ${target}`)
  if(target == "") {
    return;
  }

  filename = file_table_data[index].file;
  fullpath = `${selected_path}/${filename}`;

  if(!fs.existsSync(fullpath)) {
    alert("File does not exist!");
    return;
  }

  if(!fs.existsSync(target)) {
    alert("Target directory does not exist!");
    return;
  }

  if(!fs.statSync(target).isDirectory()) {
    alert("Target is not a directory!");
    return;
  }

  if(fs.existsSync(`${target}/${filename}`)) {
    alert("Target file exist, cannot overwrite!");
    return;
  }

  console.log(`Moving ${fullpath} to ${target}/${filename}`);
  fs.rename(fullpath, `${target}/${filename}`, (err) => {
    if(err) {
      console.error(err);
      return;
    }
    console.log("Moved file successfully!");
    update_file_table_data();
    update_file_table();
  });
}

function update_file_table() {
  table = $("#file_table");
  table.html("");
  for (var i = 0; i < file_table_data.length; i++) {
    row = $("<tr>");
    file_col = $("<td>");
    target_col = $("<td>");
    move_col = $("<td>")

    file_entry = $("<input type='text'>")
      .val(file_table_data[i].file)
      .css("width", "40vw")
      .attr("index", i);
    target_entry = $("<input type='text'>")
      .val(file_table_data[i].target)
      .css("width", "40vw")
      .attr("index", i);
    move_button = $("<button type='button' class='btn btn-primary'>")
      .html("Move")
      .css("padding", 2)
      .css("font-size", 8)
      .attr("index", i);

    file_entry.change(file_entry_onchange);
    target_entry.change(targets_entry_onchange);
    move_button.click(move_button_click);

    file_col.html(file_entry);
    target_col.html(target_entry);
    move_col.html(move_button);

    row.append(file_col);
    row.append(target_col);
    row.append(move_col);

    table.append(row);
  }
}

function read_rules() {
  try {
    data = fs.readFileSync("rules.json");
    obj = JSON.parse(data);
    if(!obj.ignores) {
      obj.ignores = [];
    }
    if(!obj.rules) {
      obj.rules = [];
    }
    rules = obj;
  } catch (e) {
    console.error(e);
  }
}

function save_rules() {
  fs.writeFileSync("rules.json", JSON.stringify(rules, null, 2));
}

function pattern_target_entry_change(event) {
  let entry = $(event.target);
  let index = entry.attr("index");
  let entry_type = entry.attr("entry_type");
  if(index == rules.rules.length) {
    if(entry.val().length > 0) {
      rules.rules.push(entry_type == "pattern"
        ? {
            pattern: entry.val(),
            target: "",
          }
        : {
            pattern: "",
            target: entry.val()
          });
      save_rules();
      update_file_table_data();
      update_file_table();
      update_rules();
    }
  } else {
    if(entry_type == "pattern") {
      rules.rules[index].pattern = entry.val();
    } else {
      rules.rules[index].target = entry.val();
    }
    if(rules.rules[index].pattern.length == 0 &&
       rules.rules[index].target.length == 0) {
      rules.rules.splice(index, 1);
      update_rules();
    }
    save_rules();
    update_file_table_data();
    update_file_table();
  }
}

async function update_rules() {
  table = $("#rule_table");
  table.html("");
  for (var i = 0; i <= rules.rules.length; i++) {
    rule = i < rules.rules.length
      ? rules.rules[i]
      : {pattern: "", target: ""};
    row = $("<tr>");
    pattern_col = $("<td>");
    target_col = $("<td>");
    pattern_entry = $("<input type='text'>").css("width", "40vw")
      .attr("index", i)
      .attr("entry_type", "pattern");
    pattern_entry.val(rule.pattern);
    pattern_col.html(pattern_entry);
    target_entry = $("<input type='text'>").css("width", "40vw")
      .attr("index", i)
      .attr("entry_type", "target");
    target_entry.val(rule.target);
    target_col.html(target_entry);
    pattern_entry.change(pattern_target_entry_change);
    target_entry.change(pattern_target_entry_change);
    row.append(pattern_col);
    row.append(target_col);
    table.append(row);
  }
}

file_table_data = []

rules = {
  ignores: [],
  rules: [],
}

read_rules();
console.log(rules);
update_rules();

set_path(`${process.env.HOME}/Downloads`);

$(".open").click(async (event) => {
  dir = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });
  console.log(dir.canceled);
  console.log(dir.filePaths);
  if(!dir.canceled && dir.filePaths.length > 0) {
    set_path(dir.filePaths[0]);
  }
});