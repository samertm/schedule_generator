Tasks = new Meteor.Collection("tasks")

Meteor.subscribe("users_tasks");

var optional_settings = false;
var optional_settings_dep = new Deps.Dependency;

function get_optional_settings () {
    optional_settings_dep.depend()
    return optional_settings;
};
function toggle_optional_settings () {
    optional_settings = !optional_settings;
    optional_settings_dep.changed();
};

var immutable_task = false;
var immutable_task_dep = new Deps.Dependency;

function get_immutable_task() {
    immutable_task_dep.depend();
    return immutable_task;
};
function toggle_immutable_task() {
    immutable_task = !immutable_task;
    immutable_task_dep.changed();
};

Accounts.ui.config({
    passwordSignupFields: 'USERNAME_ONLY'
});

var debug = false;

Template.listTasks.tasks = function () {
    return Tasks.find({user: Meteor.userId()});
};

Template.listSchedule.schedule = function () {
    return Tasks.find({user: Meteor.userId()});
};

Template.enterTask.rendered = function () {
    Session.setDefault("task_name_error", "");
    Session.setDefault("task_hours_error", "");
    Session.setDefault("end_date_error", "");
    Session.setDefault("task_from_to_error", "");
};
function check_task_name (name) {
    Meteor.call("task_name_valid", name, function (err, result) {
        if (err || result == false) {
            Session.set("task_name_error", "error!");
        } else {
            Session.set("task_name_error", "");
        }
    });
};
function check_task_hours (hours) {
    Meteor.call("task_hours_valid", hours, function (err, result) {
        if (err || result == false) {
            Session.set("task_hours_error", "error!");
        } else {
            Session.set("task_hours_error", "");
        }
    });
};

function check_date (month, day, year) {
    Meteor.call("end_date_valid", month, day, year, function (err, result) {
        if (err || result == false) {
            Session.set("end_date_error", "Your date is invalid");
        } else {
            Session.set("end_date_error", "");
        }
    });
};

function check_from_to (from, to, days) {
    Meteor.call("from_to_valid", from, to, days, function (err, result) {
        if (err || result == false) {
            Session.set("task_from_to_error", "error!");
        } else {
            Session.set("task_from_to_error", "");
        }
    });
};

function init_days (days) {
    days[0] = document.getElementById("ch_sun").checked;
    days[1] = document.getElementById("ch_mon").checked;
    days[2] = document.getElementById("ch_tue").checked;
    days[3] = document.getElementById("ch_wed").checked;
    days[4] = document.getElementById("ch_thu").checked;
    days[5] = document.getElementById("ch_fri").checked;
    days[6] = document.getElementById("ch_sat").checked;
};

Template.enterTask.events({
    "keyup input#task_name" : function () {
        var name = document.getElementById("task_name").value;
        check_task_name(name);
    },
    "keyup input#task_hours" : function () {
        var hours = parseFloat(document.getElementById("task_hours").value);
        check_task_hours(hours);
    },
    "click input#submitButton": function () {
        var name = document.getElementById("task_name").value;
        check_task_name(name);
        var from, to, hours, days, month, day, year;
        if (get_immutable_task()) {
            from = parseFloat(document.getElementById("task_from").value);
            to = parseFloat(document.getElementById("task_to").value);
            days = new Array(7);
            init_days(days);
            check_from_to(from, to, days);
        } else {
            hours = parseFloat(document.getElementById("task_hours").value);
            check_task_hours(hours);
        }
        
        if (get_optional_settings === true) {
            month = document.getElementById("month").value;
            day = document.getElementById("day").value;
            year = document.getElementById("year").value;
            
            check_date(month,day, year);
        }
        
        Meteor.call("insert_task", name, hours, from, to, days,
                    month, day, year, get_immutable_task(), get_optional_settings(),
                    function (err, result) {
                        if (err) {
                            console.log("whoops");
                        }
                        if (result) {
                            Meteor.call("generate_schedule", Meteor.userId(), function (err, result) {
                                if (err) {
                                    console.log(err);
                                }

                            });
                        }
                    });
    },
    "keyup input#day" : function () {
        var month = document.getElementById("month").value;
        var day = document.getElementById("day").value;
        var year = document.getElementById("year").value;
        check_date(month, day, year);
    },
    "click a#optional" : function (event) {
        event.preventDefault();
        toggle_optional_settings();
    },
    "click a#task_immutable_toggle": function (event) {
        event.preventDefault();
        toggle_immutable_task();
    },
    "keyup input#task_from": function () {
        var from = document.getElementById("task_from").value;
        var to = document.getElementById("task_to").value;
        var days = new Array(7);
        init_days(days);
        check_from_to(from, to, days);
    },
    "keyup input#task_to": function () {
        var from = document.getElementById("task_from").value;
        var to = document.getElementById("task_to").value;
        var days = new Array(7);
        init_days(days);
        check_from_to(from, to, days);
    },
    "click input.checkbox": function () {
        var from = document.getElementById("task_from").value;
        var to = document.getElementById("task_to").value;
        var days = new Array(7);
        init_days(days);
        check_from_to(from, to, days);
    }
});

Template.enterTask.helpers({
    debug: function () {
        return debug;
    },
    task_name_error: function () {
        return Session.get("task_name_error")
    },
    task_hours_error: function () {
        return Session.get("task_hours_error")
    },
    end_date_error: function () {
        return Session.get("end_date_error");
    },
    current_year: function () {
        return new Date().getFullYear();
    },
    display_optional_settings: function () {
        return get_optional_settings();
    },
    display_immutable_task: function () {
        return get_immutable_task();
    },
    task_from_to_error: function () {
        return Session.get("task_from_to_error");
    }
});

Template.tasks.events({
    "click input#removeTask": function () {
        Meteor.call("remove_task", this._id);
        Meteor.call("generate_schedule", Meteor.userId(), function(err, result) {
            if (err) {
                console.log(err);
            }
            
        });
    }
});
Template.listSchedule.events({
    "click input#generateSchedule": function () {
        Meteor.call("generate_schedule", Meteor.userId(), function(err, result) {
            if (err) {
                console.log(err);
            }
            if (result == false) {
                console.log("generate_schedule messed up");
            }
        });
    }
});
Template.listSchedule.helpers({
    debug: function() {
        return debug;
    },
    list: function(items, options) {
        var day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        var ret = "";
        for (var i = 0; i < items.length; i++) {
            ret += day[i] + options.fn(items[i]);
        }
        return ret;
    },
    schedule_table: function() {
        var schedule_html = "";
        var schedule = Tasks.find({user: Meteor.userId()});
        var to_row = function (t) {
            if (t < 8) {
                return 0;
            } else if (t > 21) {
                return 12;
            } else {
                return (t - 8);
            }
        };
        var to_time = function(t) {
            var str = "";
            if (t < 13) {
                str += t + " am";
            } else {
                str += (t - 12) + " pm";
            }
            return str;
        };
        var populate_task_schedule = function(task_schedule, schedule, time_start, time_end) {
            schedule.forEach(function(s) {
                for (var i = 0; i < 7; i++) {
                    if (s.task_times === undefined || s.task_times[i].length == 0) {
                        continue;
                    }
                    s.task_times[i].forEach(function(time) {
                        for (var t = time.start; t < time.end; t++) {
                            task_schedule[to_row(t)][i] = s.task_name;
                        }
                    });
                }
            });
        };
        var day_map = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
        var time_start = 8;
        var time_end = 21;
        var task_schedule = [];
        for (var i = 0; i < time_end - time_start; i++) {
            task_schedule.push([]);
            for (var j = 0; j < 7; j++) {
                task_schedule[i].push("");
            }
        }
        
        populate_task_schedule(task_schedule, schedule, time_start, time_end);
        schedule_html += "<tr><td></td><td>Sunday</td><td>Monday</td><td>Tuesday</td><td>Wednesday</td><td>Thursday</td><td>Friday</td><td>Saturday</td></tr>";
        
        for (var t = time_start; t < time_end; t++) {
            schedule_html += '<tr id="' + t + '"><td>' + to_time(t) + '</td>';
            for (var d = 0; d < 7; d++) {
                schedule_html += '<td id="' + day_map[d] + '">' +
                    task_schedule[to_row(t)][d] + '</td>';
            }
            schedule_html += '</tr>';
        }
        return schedule_html;
    }
});

// Template.listSchedule.rendered = function (){
//     var schedule = Tasks.find({user: Meteor.userId()});
//     var to_row = function (t) {
//         if (t < 8) {
//             return 1;
//         } else if (t > 21) {
//             return 13;
//         } else {
//             return (t - 7);
//         }
//     };
//     var to_cell = function(d) {
//         return d + 1;
//     };
//     var clear_cells = function() {
//         var s = document.getElementById("schedule");
//         var rows_len = s.rows.length;
//         var cells_len = s.rows[0].cells.length;
//         for (var i = 1; i < rows_len; i++) {
//             for (var j = 1; j < cells_len; j++) {
//                 s.rows[i].cells[j].innerHTML = "";
//             }
//         }
//     };
//     clear_cells();
//     schedule.forEach(function(s) {
//         for (var i = 0; i < 7; i++) {
//             if (s.task_times === undefined || s.task_times[i].length == 0) {
//                 continue;
//             }
//             s.task_times[i].forEach(function(time) {
//                 for (var t = time.start; t < time.end; t++) {
//                     document.getElementById("schedule").
//                         rows[to_row(t)].
//                         cells[to_cell(i)].
//                         innerHTML = s.task_name;
//                 }
//             });
//         }
//     });
// };


