Tasks = new Meteor.Collection("tasks")

Meteor.publish("users_tasks", function () {
    return Tasks.find({user: this.userId});
});
