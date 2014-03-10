Tasks = new Meteor.Collection("tasks")

Meteor.publish("users_tasks", function () {
    return Tasks.find({user: this.userId});
});

function no_conflict(time, arr_time) {
    var arr_time_len = arr_time.length;
    if (arr_time_len == 0) {
        return true;
    }
    
    for (var i = 0; i < arr_time_len; i++) {
        var other_time = arr_time[i];
        if (time.start == other_time.start) {
            return false;
        } else if (time.start < other_time.start) {
            if (time.end > other_time.start) {
                return false;
            }
        } else { // other_time.start < time.start
            if (other_time.end > time.start) {
                return false;
            }
        }
    }
    return true;
};

function TimePair (start, end) {
    function toString() {
        return "("+this.start+", "+this.end+")";
    }
    function length() {
        return this.end - this.start;
    }
    return { start: start, end: end, toString: toString};
};

function task_name_valid  (task_name) {
    if (task_name === undefined) {
        return false;
    } else if (task_name === "") {
        return false;
    } else {
        return true;
    }
};
function task_hours_valid (task_hours) {
    if (isNaN(task_hours)) {
        return false;
    } else if (task_hours === 0) {
        return false;
    } else {
        return true;
    }
};

function end_date_valid (month, day, year) {
    month = parseInt(month);
    day = parseInt(day);
    year = parseInt(year);
    if (month == NaN ||
        day == NaN   ||
        year == NaN) {
        return false;
    }
    var date = new Date(year, month, day);
    if (date.getMonth() == month &&
        date.getDate() == day     &&
        date.getFullYear() == year) {
        return true;
    } else {
        return false;
    }
};

function gen_time_totals (tasks) {
    var tasks_len = tasks.length;
    var max_daily_load = 9;
    var max_daily_task_load = 2;
    var min_daily_task_load = 1;
    var day_load = new Array(7);

    for (var i = 0; i < 7; i++) {
        day_load[i] = 0;
    }

    for (var i = 0; i < tasks_len; i++) {
        if (tasks[i].immutable) {
            for (var j = 0; j < 7; j++) {
                var t = 0;
                tasks[i].task_times[j].forEach(function (this_time) {
                    t += this_time;
                });
                day_load[j] += t;
            }
        } else {
            var task_total_load = 0;
            var task_daily_load = new Array(7);
            for (var j = 0; j < 7; j++) {
                task_daily_load[j] = 0;
            }
            
            for (var j = 1; j < 6; j++) {
                if (tasks[i].task_hours <= task_total_load) {
                    break;
                }
                if (day_load[j] >= max_daily_load) {
                    continue;
                }
                var task_load;
                if ((tasks[i].task_hours - task_total_load) < max_daily_task_load) {
                    task_load = tasks[i].task_hours - task_total_load;
                } else {
                    task_load = max_daily_task_load;
                }
                var load_remaining = max_daily_load - day_load[j];
                
                if (load_remaining < task_load) {
                    if (load_remaining >= min_daily_task_load) {
                        task_daily_load[j] += load_remaining;
                        day_load[j] += load_remaining;
                        task_total_load += load_remaining;
                    }
                } else { // load_remaining >= task_load
                    task_daily_load[j] += task_load;
                    day_load[j] += task_load;
                    task_total_load += task_load;
                }
            }
            
            tasks[i].task_times_totals = task_daily_load;
        }
    }
};

function gen_schedule_times(tasks) {
    var tasks_len = tasks.length;
    var day_times = new Array(7);
    for (var i = 0; i < 7; i++) {
        day_times[i] = [];
    }
    var day_start = 10;
    var day_end = 21;
    for (var i = 0; i < tasks_len; i++) {
        if (tasks[i].immutable) {
            for (var day = 0; day < 7; day++) {
                tasks[i].task_times[day].forEach(function (this_time) {
                    if (no_conflict(this_time, day_times[day])) {
                        day_times[day].push(this_time);
                    }
                });
            }
        } else {
            var task_times = new Array(7);
            for (var j = 0; j < 7; j++) {
                task_times[j] = [];
            }
            
            for (var day = 1; day < 6; day++) {
                var task_length = tasks[i].task_times_totals[day];
                if (task_length <= 0) {
                    continue;
                }
                for (var j = day_start; j <= day_end - task_length; j++) {
                    var time = new TimePair(j, j + task_length);
                    if (no_conflict(time, day_times[day])) {
                        day_times[day].push(time);
                        task_times[day].push(time);
                        break;
                    }
                }
                
            }
            tasks[i].task_times = task_times;
        }
    }
    
};

function from_to_valid(from, to, days) {
    if (to != parseInt(to) || from != parseInt(from)) {
        return false;
    }
    to = parseInt(to);
    from = parseInt(from);
    if (isNaN(from) || isNaN(to) || ! _.isArray(days) ||
        to <= from ||
        to > 24 || from > 24 || to < 0 || from < 0 ||
        days.length != 7
       ) {
        return false;
    }
    
    var days_len = 7;
    for (var i = 0; i < days_len; i++) {
        if (days[i] === true) {
            return true;
        }
    }
    return false;
}

Meteor.startup(function () {
    // code to run on server at startup
});
Meteor.methods({
    remove_everything: function () {
        Tasks.remove({});
    },
    task_name_valid: task_name_valid,
    task_hours_valid: task_hours_valid,
    end_date_valid: end_date_valid,
    from_to_valid: from_to_valid,
    insert_task: function(name, hours, from, to, days, month, day, year, immutable, optional) {
        var task_insert = {}
        if (!task_name_valid(name)) {
            return false;
        }


        if (immutable) {
            if (!from_to_valid(from, to, days)) {
                return false;
            }
            task_insert.immutable = true;
            
            var days_len = 7;
            var task_times = new Array(7);
            for (var i = 0; i < 7; i++) {
                task_times[i] = [];
            }
            for (var i = 0; i < days_len; i++) {
                if (days[i]) {
                    task_times[i].push(new TimePair(from, to));
                }
            }
            task_insert.task_times = task_times;
        } else {
            if (!task_hours_valid(hours)) {
                return false;
            }
            task_insert.immutable = false;
            task_insert.task_hours = hours;
        }
        
        task_insert.user = Meteor.userId();
        task_insert.task_name = name;

        if (optional === true) {
            if (end_date_valid(month, day, year)) {
                var date = new Date(year, month, day);
                task_insert.end_date = date;
            }
        }

        Tasks.insert(task_insert);
        return true;
    },
    remove_task: function(obj_id) {
        Tasks.remove(obj_id);
    },
    generate_schedule: function(user_id) {
        Tasks.update({user: user_id, immutable: false},
                     {$unset: {task_times_totals: "", task_times: ""}},
                     {multi: true});
        
        var tasks = Tasks.find({user: user_id, immutable: true}).fetch().
            concat(Tasks.find({user: user_id, immutable: false}).fetch());
        gen_time_totals(tasks);
        gen_schedule_times(tasks);

        tasks.forEach(function (this_task) {
            Tasks.update({_id: this_task._id},
                         {$set: {task_times_totals: this_task.task_times_totals,
                                 task_times: this_task.task_times}},
                         {multi: true});
        });
    }
});
