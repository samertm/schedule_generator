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
}

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
    
}

function generate_schedule (user_id) {
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


