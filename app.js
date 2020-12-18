const {dialog} = require('electron').remote;
const fs = require('fs');

function find_target(filename) {
  for(var i = 0; i < rules.rules.length; i++) {
    var rule = rules.rules[i];
    try {
      if(filename.match(new RegExp(`^${rule.pattern}\$`))) {
        let fullpath = `${selected_path}/${filename}`;
        if(rule.division == "size") {
          if(!fs.statSync(fullpath).isDirectory()) {
            var size_in_bytes = fs.statSync(fullpath).size;
            // Less than 1M: Tiny
            if(size_in_bytes < 1024 * 1024) {
              return `${rule.target}/Tiny`;
            }
            // Less than 10M: Small
            if(size_in_bytes < 10 * 1024 * 1024) {
              return `${rule.target}/Small`;
            }
            // Less than 50M: Normal
            if(size_in_bytes < 50 * 1024 * 1024) {
              return `${rule.target}/Normal`;
            }
            // Less than 200M: Big
            if(size_in_bytes < 200 * 1024 * 1024) {
              return `${rule.target}/Big`;
            }
            // Less than 1G: Large
            if(size_in_bytes < 200 * 1024 * 1024) {
              return `${rule.target}/Large`;
            }
            // More than 1G: Huge
            return `${rule.target}/Huge`;
          }
        }
        return rule.target;
      }
    } catch (e) {
      console.error(e);
    }
  }
  return "";
}

function update_file_table_data() {
  to_renames = {}
  file_table_data = [];
  files = fs.readdirSync(selected_path);
  for (var i = 0; i < files.length; i++) {
    ignored = false;
    for(var j = 0; j < rules.ignores.length; j++) {
      try {
        if(files[i].match(new RegExp(`^${rules.ignores[j]}\$`))) {
          ignored = true;
          break;
        }
      } catch (e) {
        console.error(e);
      }
    }
    if(ignored) continue;
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

to_renames = {}

function file_entry_onchange(event) {
  entry = $(event.target);
  index = parseInt(entry.attr("index"));
  if(entry.val() != file_table_data[index].file) {
    entry.css("background-color", "red");
    if(entry.val().length > 0) {
      to_renames[file_table_data[index].file] = entry.val();
    } else {
      delete to_renames[file_table_data[index].file];
    }
  } else {
    entry.css("background-color", "");
    delete to_renames[file_table_data[index].file];
  }
}

function targets_entry_onchange(event) {
  entry = $(event.target);
  index = parseInt(entry.attr("index"));
  file_table_data[index].target = entry.val();

  if(!fs.existsSync(entry.val())) {
    entry.css("background-color", "red");
  } else if(entry.val() != find_target(file_table_data[index].file)) {
    entry.css("background-color", "lightgreen");
  } else {
    entry.css("background-color", "");
  }
}

function move_button_click(event) {
  button = $(event.target);
  index = parseInt(button.attr("index"));
  target = file_table_data[index].target;

  if(target == "") {
    return;
  }

  filename = file_table_data[index].file;
  if(filename == "") {
    return;
  }

  fullpath = `${selected_path}/${filename}`;

  if(!fs.existsSync(fullpath)) {
    alert("File does not exist!");
    return;
  }

  if(!fs.existsSync(target)) {
    if(confirm("Target directory does not exist! Make directory?")) {
      fs.mkdirSync(target, {recursive: true});
      if(!fs.existsSync(target)) {
        alert("Failed to create directory!")
        return;
      }
    } else {
      return;
    }
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
  to_renames = {}
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

    if(file_table_data[i].file != "") {
      if(!fs.existsSync(`${selected_path}/${file_table_data[i].file}`)) {
        file_entry.css("background-color", "red");
      }
    }

    if(file_table_data[i].target != "") {
      if(!fs.existsSync(file_table_data[i].target) ||
         !fs.statSync(file_table_data[i].target).isDirectory()) {
        target_entry.css("background-color", "red");
      }
    }

    file_entry.on('input', file_entry_onchange);
    target_entry.on('input', targets_entry_onchange);
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
  let index = parseInt(entry.attr("index"));
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
      entry.css("background-color", "none");
      try {
        RegExp(entry.val());
      } catch (e) {
        entry.css("background-color", "red");
      }
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

function division_select_change(event) {
  let entry = $(event.target);
  let index = parseInt(entry.attr("index"));
  rules.rules[index].division = entry.val();
  save_rules();
  update_file_table_data();
  update_file_table();
}

function up_button_click(event) {
  let button = $(event.currentTarget);
  let index = parseInt(button.attr("index"));
  if(index <= 0) {
    return;
  }
  tmp = rules.rules[index-1];
  rules.rules[index-1] = rules.rules[index];
  rules.rules[index] = tmp;
  save_rules();
  update_rules();
  update_file_table_data();
  update_file_table();
}

function down_button_click(event) {
  let button = $(event.currentTarget);
  let index = parseInt(button.attr("index"));
  if(index >= rules.rules.length - 1) {
    return;
  }
  tmp = rules.rules[index+1];
  rules.rules[index+1] = rules.rules[index];
  rules.rules[index] = tmp;
  save_rules();
  update_rules();
  update_file_table_data();
  update_file_table();
}

function top_button_click(event) {
  let button = $(event.currentTarget);
  let index = parseInt(button.attr("index"));
  if(index <= 0) {
    return;
  }
  tmp = rules.rules[0];
  rules.rules[0] = rules.rules[index];
  rules.rules[index] = tmp;
  save_rules();
  update_rules();
  update_file_table_data();
  update_file_table();
}

function bottom_button_click(event) {
  let button = $(event.currentTarget);
  let index = parseInt(button.attr("index"));
  if(index >= rules.rules.length - 1) {
    return;
  }
  tmp = rules.rules[rules.rules.length - 1];
  rules.rules[rules.rules.length - 1] = rules.rules[index];
  rules.rules[index] = tmp;
  save_rules();
  update_rules();
  update_file_table_data();
  update_file_table();
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
    pattern_entry = $("<input type='text'>").css("width", "25vw")
      .attr("index", i)
      .attr("entry_type", "pattern");
    pattern_entry.val(rule.pattern);
    pattern_entry.change(pattern_target_entry_change);
    pattern_col.html(pattern_entry);
    try {
      RegExp(rule.pattern);
    } catch (e) {
      pattern_entry.css("background-color", "red");
    }

    target_col = $("<td>");
    target_entry = $("<input type='text'>").css("width", "40vw")
      .attr("index", i)
      .attr("entry_type", "target");
    target_entry.val(rule.target);
    target_col.html(target_entry);
    target_entry.change(pattern_target_entry_change);

    row.append(pattern_col);
    row.append(target_col);

    if(i < rules.rules.length) {
      division_col = $("<td>");
      division_select = $("<select>").attr("index", i);
      division_select.append($("<option value='none'>").html("None"))
      division_select.append($("<option value='size'>").html("Size"))
      division_select.val(rule.division ? rule.division : "none");
      division_select.change(division_select_change);
      division_col.html(division_select);
      row.append(division_col);

      up_col = $("<td>");
      up_button = $("<button class='btn btn-outline-primary'>")
        .html("<i class='fa fa-angle-up'></i>")
        .attr("index", i)
        .css("padding", "2px 5px")
        .css("font-size", 10)
        .click(up_button_click);
      up_col.html(up_button);

      down_col = $("<td>");
      down_button = $("<button class='btn btn-outline-primary'>")
        .html("<i class='fa fa-angle-down'></i>")
        .attr("index", i)
        .css("padding", "2px 5px")
        .css("font-size", 10)
        .click(down_button_click);
      down_col.html(down_button);

      top_col = $("<td>");
      top_button = $("<button class='btn btn-outline-primary'>")
        .html("<i class='fa fa-angle-double-up'></i>")
        .attr("index", i)
        .css("padding", "2px 5px")
        .css("font-size", 10)
        .click(top_button_click);
      top_col.html(top_button);

      bottom_col = $("<td>");
      bottom_button = $("<button class='btn btn-outline-primary'>")
        .html("<i class='fa fa-angle-double-down'></i>")
        .attr("index", i)
        .css("padding", "2px 5px")
        .css("font-size", 10)
        .click(bottom_button_click);
      bottom_col.html(bottom_button);

      if(i == 0) {
        up_button.prop("disabled", true);
        top_button.prop("disabled", true);
      } else if(i == rules.rules.length - 1) {
        down_button.prop("disabled", true);
        bottom_button.prop("disabled", true);
      }

      row.append(top_col);
      row.append(up_col);
      row.append(down_col);
      row.append(bottom_col);
    }

    table.append(row);
  }
}

function ignore_entry_change(event) {
  entry = $(event.currentTarget);
  index = parseInt(entry.attr("index"));
  entry.css("background-color", "");
  if(index < rules.ignores.length) {
    if(entry.val().length > 0) {
      rules.ignores[index] = entry.val();
      try {
        RegExp(entry.val());
      } catch (e) {
        entry.css("background-color", "red");
      }
    } else {
      rules.ignores.splice(index, 1);
      update_ignores();
    }
    save_rules();
    update_file_table_data();
    update_file_table();
  } else {
    if(entry.val().length > 0) {
      rules.ignores.push(entry.val());
      save_rules();
      update_file_table_data();
      update_file_table();
      update_ignores();
    }
  }
}

async function update_ignores() {
  table = $("#ignore_table");
  table.html("");
  for (var i = 0; i <= rules.ignores.length; i++) {
    row = $("<tr>");

    pattern = i < rules.ignores.length
      ? rules.ignores[i]
      : "";

    pattern_col = $("<td>");
    pattern_entry = $("<input type='text'>").css("width", "50vw")
      .attr("index", i);
    pattern_entry.val(pattern);
    pattern_entry.change(ignore_entry_change);
    pattern_col.html(pattern_entry);
    try {
      RegExp(pattern);
    } catch (e) {
      pattern_entry.css("background-color", "red");
    }

    row.append(pattern_col);
    table.append(row);
  }
}

file_table_data = []

rules = {
  ignores: [],
  rules: [],
}

read_rules();
update_rules();
update_ignores();

set_path(`${process.env.HOME}/Downloads`);

$(".open").click(async (event) => {
  dir = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });
  if(!dir.canceled && dir.filePaths.length > 0) {
    set_path(dir.filePaths[0]);
  }
});

$("#renameall").click(async (event) => {
  console.log(to_renames);
  for (var filename in to_renames) {
    if(filename.length > 0) {
      target_name = to_renames[filename];
      from = `${selected_path}/${filename}`;
      to = `${selected_path}/${target_name}`;
      if(fs.existsSync(from) && target_name && !fs.existsSync(to)) {
        await new Promise((resolve) => {
          fs.rename(from, to, () => {
            resolve();
          })
        });
      }
    }
  }
  update_file_table_data();
  update_file_table();
})

$("#reset").click(async (event) => {
  update_file_table_data();
  update_file_table();
})