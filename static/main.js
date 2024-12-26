// Ensure URL has a trailing slash
var url = document.URL.split("#")[0];
url += url.endsWith("/") ? "" : "/";
console.log(url);

var auto_refresh = setInterval(checkLogin, 30000);

// https://stackoverflow.com/a/37096512
const secondsToHms = (d) => {
  const h = Math.floor(d / 3600);
  const m = Math.floor((d % 3600) / 60);
  const s = Math.floor((d % 3600) % 60);
  const hDisplay = h > 0 ? `${h}h ` : "";
  const mDisplay = m > 0 ? `${m}m ` : "";
  const sDisplay = s > 0 ? `${s}s ` : "";
  return hDisplay + mDisplay + sDisplay;
};

const hmsToSeconds = (input) => {
  const re = /(\d+h)?\s*(\d+m)?\s*(\d+s)?/;
  const [, h, m, s] = re.exec(input) || [];
  return (
    // seconds
    (s ? parseInt(s) : 0) +
    // minutes
    60 *
      ((m ? parseInt(m) : 0) +
        // hours
        60 * (h ? parseInt(h) : 0))
  );
};

function createRow(row) {
  var exp_date = new Date(row.expiry * 1000);
  var exp = moment(exp_date).fromNow();
  var interval = secondsToHms(row.interval);
  var progress = "";
  var state = "";

  switch (row.state) {
    case "new":
      progress =
        '<div class="progress"><div class="progress-bar bg-warning" style="width: 100%">NEW</div></div>';
      state = "";
      break;

    case "running":
      var left = (exp_date - Date.now()) / 1000;
      var percentage = Math.round(100.0 - (100.0 * left) / row.interval);
      progress =
        '<div class="progress"><div class="progress-bar bg-success" style="width: ' +
        percentage +
        '%"></div></div>';
      state =
        '<span title="' +
        exp_date +
        '"><small>Expires ' +
        exp +
        "</small></span>";
      break;

    case "expired":
      progress =
        '<div class="progress"><div class="progress-bar bg-danger" style="width: 100%">EXPIRED</div></div>';
      state =
        '<span title="' +
        exp_date +
        '"><small>Expired ' +
        exp +
        "</small></span>";
      break;

    default:
      state = row.state + exp;
  }

  var tr = "";
  tr += "<td>#" + row.timerid + " " + row.name + "</td>";
  tr += "<td>" + interval + "</td>";
  tr += "<td>" + progress + state + "</td>";

  var menu = "";
  menu += '<a class="dropdown-item buttonShow" href="#">Show</a>';
  if (row.state == "new")
    menu += '<a class="dropdown-item buttonKick" href="#">Start</a>';
  else menu += '<a class="dropdown-item buttonKick" href="#">Restart</a>';
  menu += '<a class="dropdown-item buttonDelete" href="#">Delete</a>';

  var options =
    '<div class="dropdown"><a class="btn btn-sm btn-secondary dropdown-toggle" href="#" role="button" id="dropdown' +
    row.timerid +
    '" data-toggle="dropdown">Options</a><div class="dropdown-menu" aria-labelledby="dropdown' +
    row.timerid +
    '">' +
    menu +
    "</div></div>";
  tr += "<td>" + options + "</td>";

  return '<tr id="timerid-' + row.timerid + '">' + tr + "</tr>";
}

function updateTable() {
  $.ajax({
    url: url + "api/timer",
    dataType: "json",
    success: function (data) {
      var tbody = "";
      $.each(data, function (i, row) {
        tbody += createRow(row);
      });

      if (tbody == "") {
        // No rows
        tbody = '<tr><td span="4">No timers</td></tr>';
      }

      $("#timers > tbody").html(tbody);
    },
    error: function (data) {
      console.log("error", data);
      showalert("Timer table update failed", "alert-danger");
      userLoggedOut();
    },
  });
}

function showalert(message, alerttype) {
  $("#alertPlaceholder").append(
    '<div id="alertdiv" class="alert ' +
      alerttype +
      '"><a class="close" data-dismiss="alert">×</a><span>' +
      message +
      "</span></div>",
  );
}

function userLoggedIn() {
  // Probably logged in
  updateTable();
  $(".myLoggedOut").addClass("d-none");
  $(".myLoggedIn").removeClass("d-none");
}

function userLoggedOut() {
  document.cookie =
    "Authorization=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  $(".myLoggedOut").removeClass("d-none");
  $(".myLoggedIn").addClass("d-none");
}

function checkLogin() {
  if (document.cookie.includes("Authorization=")) {
    userLoggedIn();
  } else {
    userLoggedOut();
  }
}

$(document).ready(function () {
  checkLogin();

  // Login
  $("#buttonSubmit").click(function (event) {
    event.preventDefault();
    var form = $("#formLogin");
    $.ajax({
      type: "POST",
      url: url + "login",
      data: form.serialize(),
      success: function (data) {
        $("#formKey").removeClass("is-invalid").addClass("is-valid");
        checkLogin();
      },
      error: function (data) {
        $("#formKey").removeClass("is-valid").addClass("is-invalid");
      },
    });
  });

  // Logout
  $(document).on("click", "#buttonLogout", function (event) {
    e.preventDefault();
    userLoggedOut();
  });

  // Kick timer (e.g. start/restart)
  $(document).on("click", ".buttonKick", function (event) {
    event.preventDefault();
    var row = $(this).closest("tr");
    var timerid = parseInt(row.attr("id").replace("timerid-", ""));
    $.ajax({
      type: "GET",
      url: url + "api/timer/" + timerid + "/kick",
      success: function (data) {
        console.log("kicked");
        updateTable(); // TODO: refresh only the row
      },
      error: function (data) {
        console.log("Start failed", data);
        showalert("Timer start failed", "alert-danger");
      },
    });
  });

  // Delete timer
  $(document).on("click", ".buttonDelete", function (event) {
    event.preventDefault();
    var row = $(this).closest("tr");
    var timerid = parseInt(row.attr("id").replace("timerid-", ""));
    row.toggleClass("danger");

    var d = $("#myModalDeleteConfirmation");
    var d2 = d.find(".modal-title");
    d2.html("Delete timer " + timerid);
    d.data("id", timerid);
    d.data("row", row);
    d.modal("show");
  });

  // Delete timer confirmation
  $(document).on("click", ".btnConfirmDelete", function (event) {
    event.preventDefault();
    var d = $("#myModalDeleteConfirmation");
    var timerid = d.data("id");
    var row = d.data("row");
    d.modal("hide");
    $.ajax({
      type: "DELETE",
      url: url + "api/timer/" + timerid,
      success: function (data) {
        row.remove();
      },
      error: function (data) {
        console.log("Delete failed", data);
        showalert("Timer delete failed", "alert-danger");
      },
    });
  });

  // Show timer
  $(document).on("click", ".buttonShow", function (event) {
    event.preventDefault();
    var row = $(this).closest("tr");
    var timerid = parseInt(row.attr("id").replace("timerid-", ""));
    //row.toggleClass('danger');

    var d = $("#myModalTimer");
    console.log(d);
    var d2 = d.find(".modal-title");
    d2.html("Timer " + timerid);
    d.data("id", timerid);
    d.data("row", row);
    d.modal("show");

    // Get token
    $.ajax({
      url: url + "api/timer/" + timerid + "/token",
      success: function (data) {
        var a = '<a href="' + url + "kick/" + data + '">Link to kick timer</a>';
        d.find(".modal-body").append(a);
      },
      error: function (data) {
        showalert("Timer token get failed", "alert-danger");
      },
    });
  });

  // Create timer
  $(document).on("click", "#buttonNew", function (event) {
    event.preventDefault();

    var data = {
      name: $("#formName").val(),
      interval: hmsToSeconds($("#formInterval").val()),
    };

    if (data.interval == 0) {
      // Invalid interval
      $("#formInterval").removeClass("is-valid").addClass("is-invalid");
      return;
    }

    $("#formInterval").removeClass("is-invalid").addClass("is-valid");

    var btn = $(this);
    var bntHtml = btn.html();
    btn.prop("disabled", true);
    btn.html(
      '<span class="spinner-border" role="status" aria-hidden="true"></span>Saving...',
    );

    $("#formInterval").removeClass("is-invalid").addClass("is-valid");

    $.ajax({
      type: "POST",
      url: url + "api/timer",
      data: JSON.stringify(data),
      dataType: "json",
      contentType: "application/json",
      success: function (data) {
        var row = createRow(data);
        $("#timers").append(row);
        btn.html(bntHtml);
        btn.prop("disabled", false);
        $("#dropdownMenuLink").dropdown("toggle");
      },
      error: function (data) {
        showalert("Timer create failed", "alert-danger");
        $("#dropdownMenuLink").dropdown("toggle");
      },
    });
  });
});
