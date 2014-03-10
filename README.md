# Schedule Generator

This is a schedule generator written in Javascript using the Meteor.js
framework. I built this because I wanted to be able to create schedules for the
things I want to get done regularly. I also wanted to try out the Meteor.js
framework.

## TODO

* Export to google calendar/some universal calendar format
* Check for conflicting times when adding a task
* Improve the naive scheduling algorithm
* Make the site more pretty

## Algorithms

Here are some of the algorithms used in the program described with a python-like
sytanx.

### Time Generating Algorithm

Definitions:

* tasks - an array of task objects with the following ordering:
  * all immutable tasks, then
  * all mutable tasks in descending order (largest to smallest)
* task - an object with the following fields:
  * weekly_hours - the number of hours a week the task should be scheduled
  * daily_totals - an array of numbers and of length 7 that represents the
                 number of hours a task should be scheduled each day
  * immutable    - a boolean that represents whether or not a task is subject to
                 the scheduling algorithm. If true, the task object has no
                 weekly_hours or daily_totals fields, and times is defined.
  * times        - an array of pairs and of length 7 that represents the start
                 an end time a task is scheduled for each day. Only applicable
                 to immutable tasks in this algorithm.
* max_daily_task_load - the maximum number of hours a task should have each day.
                      Tasks can have more than the max_daily_task_load on a day.
* min_daily_task_load - the minimum number of hours a task can be assigned each
                      day. If a task is scheduled for a day, it cannot have
                      fewer than min_daily_task_load hours.
* total_daily_load    - an array of numbers and of length 7 that represents the
                      total number of hours that have been scheduled for each day
* three_day_threshold - a number which represents how large weekly_hours must
                      be before a task is assigned for three days in a row,
                      i.e. Monday, Wednesday, and Friday
* week_threshold      - a number which represents how large weekly_hours must
                      be before a task is assigned for a full work week, i.e.
                      Monday to Friday
* weekend_threshold   - a number which represents how large weekly_hours must
                      be before a task is assigned for a full week, i.e. Sunday
                      to Saturday

all ranges (1..4) exclude the last number. For instance, 1..4 is the numbers 1, 2, 3
/_ indicates a lamba. Usage:
/x : x plus 3 is equivalent to function(x) { return x + 3 }
/x,y : x plus y plus 3 is equivalent to function(x,y) { return x + y + 3 };

def Calculate_Range_Offset (day_indicies, total_daily_load, offset_range):
    min_offset <- 0
    min_num_hours <- sum total_daily_load at indicies day_indicies
    for offset in day_indicies:
        temp_day_indicies <- map (/x : add offset to x) to day_indicies
        num_hours <- sum total_daily_load at indicies temp_day_indicies
        if num_hours is less than min_num_hours:
            min_offset <- offset
            min_num_hours <- num_hours
    return map (/x : add min_offset to x) to day_indicies
    
def Add_To_Arrays (array1, array2, index, amount):
    array1[index] <- array1[index] + amount
    array2[index] <- array2[index] + amount

def Time_Generation_Algorithm (tasks):
    max_daily_task_load <- 2
    min_daily_task_load <- 1
    total_daily_load initialized to Array[7] of zeros
    three_day_threshold <- max_daily_task_load * 2
    week_threshold <- max_daily_task_load * 3
    weekend_threshold <- max_daily_task_load * 5
    for t in tasks:
        # Remember, all immutable tasks come first
        if t.immutable is true:
            add the lengths of t.times to total_daily_load
        else: # t is mutable
            if t.weekly_hours > weekend_threshold:
                day_indicies <- 0..7 # day_indicies.length is 7
            else if t.weekly_hours > week_threshold:
                day_indicies <- 1..6 # day_indicies.length is 5
            else if t.weekly_hours > three_day_threshold:
                day_indicies <- Calculate_Range_Offset([1, 3, 5], total_daily_load, -1..2)
            else:
                day_indicies <- Calculate_Range_Offset([2, 4], total_daily_load, -2..3)
            total_extra_hours <- t.weekly_hours - (day_indicies.length * max_daily_task_load)
            daily_extra_hours <- total_extra_hours / day_indicies.length
            for day in day_indicies: #excluding 7
                hours_left <- t.weekly_hours - sum(t.daily_totals)
                if hours_left is less than or equal to max_daily_task_load:
                    if hours_left is greater than 0:
                        if hours_left is greater than min_daily_task_load:
                            Add_To_Arrays(t.daily_totals, total_daily_load, day, hours_left)
                        else:
                            Add_To_Arrays(t.daily_totals, total_daily_load, day, min_daily_task_load)
                else:
                    Add_To_Arrays(t.daily_totals, total_daily_load, day, max_daily_task_load)
                    if total_extra_hours is greater than 0:
                        if daily_extra_hours is greater than min_daily_task_load:
                            Add_To_Arrays(t.daily_totals, total_daily_load, day, daily_extra_hours)
                            total_extra_hours <- total_extra_hours - daily_extra_hours
                        else:
                            Add_To_Arrays(t.daily_totals, total_daily_load, day, min_daily_task_load)
                            total_extra_hours <- total_extra_hours - min_daily_task_load


## License

This work is licensed under the GNU Affero General Public License. That means,
if you wish to distribute the code or run it on your servers, you must provide a
way for your users to download it. The license can be found in the LICENSE file.
