gen_time_totals = function gen_time_totals (tasks) {
    var Range = function (start, end) {
        var length = function () {
            return this.end - this.start;
        };
        return { start: start, end: end, length: length };
    };
    var sum_at_indicies = function (array, indicies) {
        var sum = 0;
        for (var i = 0; i < indicies.length; i++) {
            sum += array[indicies[i]];
        }
        return sum;
    };
    var calculate_range_offset = function (day_indicies, total_daily_load, offset_range) {
        var min_offset = 0;
        var min_num_hours = sum_at_indicies(total_daily_load, day_indicies);
        for (var offset = offset_range.start; offset < offset_range.end; offset++) {
            var temp_day_indicies = day_indicies.map(
                function(x) {
                    return offset + x;
                }
            );
            var num_hours = sum_at_indicies(total_daily_load, temp_day_indicies);
            if (num_hours < min_num_hours) {
                min_offset = offset;
                min_num_hours = num_hours;
            }
        }
        return day_indicies.map(function(x) { return min_offset + x });
    };
    var add_to_arrays = function (arrays, index, amount) {
        for (var i = 0; i < arrays.length; i++) {
            arrays[i][index] += amount;
        }
    };

    var max_daily_task_load = 2;
    var min_daily_task_load = 1;
    var total_daily_load = new Array(7);
    for (var i = 0; i < total_daily_load.length; i++) {
        total_daily_load[i] = 0;
    }
    var three_day_threshold = max_daily_task_load * 2;
    var week_threshold = max_daily_task_load * 3;
    var weekend_threshold = max_daily_task_load * 5;

    for (var t = 0; t < tasks.length; t++) {
        var task = tasks[t];
        if (task.immutable) {
            for (var i = 0; i < total_daily_load.length; i++) {
                var time_accumulator = 0;
                var task_times_len = task.task_times[i].length;
                for (var j = 0; j < task_times_len; j++) {
                    time_accumulator += task.task_times[i][j].length;
                }
                total_daily_load[i] += time_accumulator;
            }
        } else { // task.immutable == false
            var day_indicies;
            if (task.task_hours > weekend_threshold) {
                day_indicies = [0, 1, 2, 3, 4, 5, 6]; // full week
            } else if (task.task_hours > week_threshold) {
                day_indicies = [1, 2, 3, 4, 5]; // work week
            } else if (task.task_hours > three_day_threshold) {
                day_indicies = calculate_range_offset([1, 3, 5], total_daily_load, new Range(-1, 2));
            } else {
                day_indicies = calculate_range_offset([2, 4], total_daily_load, new Range(-2, 3));
            }

            var total_extra_hours = task.task_hours - (max_daily_task_load * day_indicies.length);
            var daily_extra_hours = total_extra_hours / day_indicies.length;
            var task_daily_load = new Array(7);
            for (var j = 0; j < task_daily_load.length; j++) {
                task_daily_load[j] = 0;
            };

            for (var i = 0; i < day_indicies.length; i++) {
                var day = day_indicies[i];
                var hours_left = task.task_hours - task_daily_load.reduce(
                    function(prev, curr) { return prev + curr; }, 0);
                if (hours_left <= max_daily_task_load) {
                    if (hours_left > 0) {
                        if (hours_left > min_daily_task_load) {
                            add_to_arrays([task_daily_load, total_daily_load], day, hours_left);
                        } else {
                            add_to_arrays([task_daily_load, total_daily_load], day, min_daily_task_load);
                        }
                    }
                } else { // hours_left > max_daily_task_load
                    add_to_arrays([task_daily_load, total_daily_load], day, max_daily_task_load);
                    if (total_extra_hours> 0) {
                        if (daily_extra_hours > min_daily_task_load) {
                            add_to_arrays([task_daily_load, total_daily_load],
                                          day, Math.ceil(daily_extra_hours));
                            total_extra_hours -= Math.ceil(daily_extra_hours);
                        } else {
                            add_to_arrays([task_daily_load, total_daily_load], day, min_daily_task_load);
                            total_extra_hours -= min_daily_task_load;
                        }
                    }
                }
            }
        }
        task.task_times_totals = task_daily_load;
    }
}

gen_schedule_times = function gen_schedule_times (tasks) {
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

generate_schedule = function generate_schedule (user_id) {
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


