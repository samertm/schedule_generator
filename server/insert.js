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
}

function task_name_valid  (task_name) {
    if (task_name === undefined) {
        return false;
    } else if (task_name === "") {
        return false;
    } else {
        return true;
    }
}

function task_hours_valid (task_hours) {
    if (isNaN(task_hours)) {
        return false;
    } else if (task_hours === 0) {
        return false;
    } else {
        return true;
    }
}

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
}

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

function insert_task (name, hours, from, to, days, month, day, year, immutable, optional) {
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
}

function remove_task (obj_id) {
    Tasks.remove(obj_id);
}
