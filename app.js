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
  files = fs.readdirSync(selected_path);
  update_file_table_data();
  update_file_table();
}

function update_file_table() {
  table = $("#file_table");
  table.html("");
  for (var i = 0; i < file_table_data.length; i++) {
    row = $("<tr>");
    check_col = $("<td>");
    file_col = $("<td>");
    target_col = $("<td>");
    checkbox = $("<input type='checkbox'>");
    check_col.html(checkbox);
    file_col.html(file_table_data[i].file);
    target_col.html(file_table_data[i].target);
    row.append(check_col);
    row.append(file_col);
    row.append(target_col);
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
    let on_entry_change = (event) => {
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
    pattern_entry.change(on_entry_change);
    target_entry.change(on_entry_change);
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