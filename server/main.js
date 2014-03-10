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
    insert_task: insert_task,
    remove_task: remove_task,
    generate_schedule: generate_schedule
});
