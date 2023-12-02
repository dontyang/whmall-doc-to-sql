$(document).ready(function() {
  if (typeof(Storage) !== "undefined") {
    let inputString = localStorage.getItem("docTextArea");
    if (inputString != null && inputString != '') {
      $('#docTextArea').val(inputString);
      $('#docTextArea').trigger("input");
    }
    let sql_code = localStorage.getItem("sql_code");
    if (sql_code != null && sql_code != '') {
      $('#sql_code').attr("value", sql_code);
      $('#sql_code').html("\n" + sql_code);
      Prism.highlightAll();
    }
  }
});

$('#docConvertButton').on('click', function() {
  try {
    let inputString = $('#docTextArea').val();
    if (typeof(Storage) !== "undefined") {
      localStorage.setItem("docTextArea", inputString);
    }
    [table_str, data_str] = splitN(inputString, "\n字段\t类型\t索引\t默认\t描述\t其它\n", 2);
    [table_comment, table_name] = splitN(table_str, "：", 2);
    table_name = splitN(table_name, "\n", 2)[0].trim();
    [column_str, index_str] = splitN(data_str, "\n索引\n", 2);
    let table_data = column_str.split(/\t/);
    table_data = table_data.map(function(column, index) {
      if (index > 0 && index < (table_data.length - 1) && index % 5 == 0) {
        [a, b] = splitLast(column, "\n");
        return [a.replaceAll("\n", " ").trim(), b.trim()]
      } else {
        return [column.replaceAll("\n", " ")];
      }
    }).flat(Infinity);
    let ddl = "CREATE TABLE `" + table_name + "` (\n";
    let index_data = [];
    eachSlice(table_data, 6, function(slice) {
      [column, data_type, index_type, default_value, description, other] = slice;
      column = column?.trim();
      data_type = data_type?.trim();
      default_value = default_value?.trim();
      other = other?.trim();
      if (data_type.startsWith("unsigned")) {
        data_type = data_type.split(" ").reverse().join(" ");
      }
      ddl += "  `" + column + "` " + data_type;
      if (data_type.includes("char") || data_type.includes("text")) {
        ddl += " COLLATE utf8mb4_unicode_ci";
      }
      if (!data_type.includes("text")) {
        ddl += " NOT NULL";
      }
      if (default_value.includes("AUTO_INCREMENT")) {
        ddl += " AUTO_INCREMENT";
      }
      if (default_value != null && default_value != "" && !default_value.includes("AUTO_INCREMENT")) {
        ddl += " DEFAULT '" + default_value?.replaceAll("零值", "0").replaceAll("AUTO_INCREMENT", "0") + "'";
      }
      ddl += " COMMENT '" + description?.trim();
      if (other != null && other.trim != "") {
        ddl += "," + other;
      }
      ddl += "',\n";
      if (index_type.includes("主键")) {
        index_data.push("PRIMARY KEY (`" + column + "`)");
      } else if (index_type.includes("唯一")) {
        index_data.push("UNIQUE KEY `uk_" + column + "`(`" + column + "`)");
      } else if (index_type.includes("索引")) {
        index_data.push("KEY `idx_" + column + "`(`" + column + "`)");
      }
    });
    if (index_str != null && index_str != "") {
      index_str.split("\n").forEach((line, i) => {
        if (line != "") {
          index_columns = line.split("，");
          if (index_columns.pop().includes("唯一")) {
            index_data.push("UNIQUE KEY `uk_" + index_columns.join('_') + "`(`" + index_columns.join('`,`') + "`)");
          } else {
            index_data.push("KEY `idx_" + index_columns.join('_') + "`(`" + index_columns.join('`,`') + "`)");
          }
        }
      });
    }
    [...new Set(index_data)].forEach((index_info, i) => {
      ddl += "  " + index_info;
      ddl += ",\n";
    });
    ddl = ddl.slice(0, ddl.length - 2);
    ddl += "\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='" + table_comment + "';";
    $('#sql_code').attr("value", ddl);
    $('#sql_code').html("\n" + ddl);
    Prism.highlightAll();
    if (typeof(Storage) !== "undefined") {
      localStorage.setItem("sql_code", ddl);
    }
  } catch (e) {
    showNotification("转换失败", false);
  }
});

$('#copyResultButton').on('click', function() {
  copyToClipboard($('#sql_code').attr("value"));
  showNotification("复制成功", true);
});

function copyToClipboard(str) {
  const textArea = document.createElement('textarea');
  textArea.value = str;
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand('copy');
  document.body.removeChild(textArea);
}

function splitN(str, delimiter, length) {
  let arr = str.split(delimiter);
  if (arr.length <= length) {
    return arr;
  } else {
    return arr.slice(0, length - 1).concat([arr.slice(length - 1, arr.length).join(delimiter)]);
  }
}

function splitLast(str, delimiter) {
  let arr = str.split(delimiter);
  if (arr.length <= 2) {
    return arr;
  }
  return [arr.slice(0, arr.length - 1).join(delimiter), arr[arr.length - 1]];
}

function eachSlice(array, size, callback) {
  for (let i = 0; i < array.length; i += size) {
    let slice = array.slice(i, i + size);
    callback(slice);
  }
}

function showNotification(message, isSuccess) {
  $("#message").html(message);
  if (isSuccess) {
    $("#message").removeClass("negative")
    $("#message").addClass("success");
  } else {
    $("#message").removeClass("success")
    $("#message").addClass("negative");
  }
  $("#message").removeClass("hidden")

  setTimeout(function() {
    $("#message").addClass("hidden")
  }, 1500);
}


$('#docTextArea').on('input', function() {
  let height = $('#docTextArea')[0].scrollHeight;
  if (height > 400) {
    $('#docTextArea').attr("style", "max-height: none;resize: none;overflow-y: hidden;height:" + height + "px;");
  }
});
