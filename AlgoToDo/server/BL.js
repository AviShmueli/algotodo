/*jshint esversion: 6 */

(function (BL) {

    BL.addNewTasks = addNewTasks;
    BL.addNewComment = addNewComment;
    BL.addNewComments = addNewComments;
    BL.updateTaskStatus = updateTaskStatus;
    BL.updateTasksStatus = updateTasksStatus;
    BL.updateUserDetails = updateUserDetails;
    BL.registerUser = registerUser;
    BL.checkIfUserExist = checkIfUserExist;
    BL.getAllUserTasks = getAllUserTasks;
    BL.searchUsers = searchUsers;
    BL.getAllCliqot = getAllCliqot;
    BL.getAllTasks = getAllTasks;
    BL.getAllTasksCount = getAllTasksCount;
    BL.getAllUsers = getAllUsers;
    BL.getAllUsersCount = getAllUsersCount;
    BL.getAllVersionInstalled = getAllVersionInstalled;
    BL.checkIfVerificationCodeMatch = checkIfVerificationCodeMatch;
    BL.addNewRepeatsTasks = addNewRepeatsTasks;
    BL.getUsersRepeatsTasks = getUsersRepeatsTasks;
    BL.updateRepeatsTasks = updateRepeatsTasks;
    BL.deleteRepeatsTasks = deleteRepeatsTasks;
    BL.getTasksInProgress = getTasksInProgress;
    BL.getDoneTasks = getDoneTasks;
    BL.createNewCliqa = createNewCliqa;
    BL.reSendVerificationCodeToUser = reSendVerificationCodeToUser;
    BL.sendBroadcastUpdateAlert = sendBroadcastUpdateAlert;
    BL.sendReminderForTasks = sendReminderForTasks;
    BL.getUsersByPhoneNumbers = getUsersByPhoneNumbers;
    BL.addNewGroup = addNewGroup;
    BL.deleteGroups = deleteGroups;
    BL.getUsersInCliqa = getUsersInCliqa;
    BL.addUsersToCliqa = addUsersToCliqa;
    BL.generateReport = generateReport;
    BL.testPushRegistration = testPushRegistration;

    var ObjectID = require('mongodb').ObjectID;
    var deferred = require('deferred');
    var PNF = require('google-libphonenumber').PhoneNumberFormat;
    var phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
    var Moment = require('moment-timezone');

    var DAL = require('./DAL');
    var winston = require('./logger');
    var pushNotifications = require('./push-notifications/push-notifications');
    var sms = require('./sms');
    var excelHandler = require('./excelHandler');


    var MAIN_CLIQA_ID = '585c1e28ee630b29fc4b2d3d';

    function addNewTasks(tempTask, pushToSenderAnyway) {

        var d = deferred();

        var tasks;
        // handel the old version
        if (Array.isArray(tempTask)) {
            tasks = tempTask;
        } else {
            tasks = [tempTask];
        }

        var groupMainTask;
        var groupMainTaskIndex;
        var recipientsIds = [];

        if (pushToSenderAnyway) {
            recipientsIds.push(new ObjectID(tasks[0].from._id));
        }

        for (var i = 0, len = tasks.length; i < len; i++) {
            var task = tasks[i];
            if (task._id !== undefined && task._id.indexOf('tempId') !== -1) {
                task.offlineId = task._id;
                delete task._id;
            }
            if (task.offlineMode !== undefined) {
                delete task.offlineMode;
            }
            if (task.comments.length > 0) {
                for (var index = 0; index < task.comments.length; index++) {
                    var comment = task.comments[index];
                    if (comment.offlineMode !== undefined) {
                        delete comment.offlineMode;
                    }

                    comment.createTime = new Date();
                    comment.from._id = new ObjectID(comment.from._id);
                    comment._id = new ObjectID();
                }
            }

            task.createTime = new Date();
            task.lastModified = new Date();
            task.from._id = new ObjectID(task.from._id);

            if (task.type === 'group-main') {
                groupMainTask = task;
                groupMainTaskIndex = i;
            } else {
                task.to._id = new ObjectID(task.to._id);
                recipientsIds.push(task.to._id);
            }

        }

        // if this is a group task
        if (groupMainTask !== undefined && groupMainTaskIndex !== undefined) {
            // remove the main task from the list
            tasks.splice(groupMainTaskIndex, 1);

            // insert the main task, then set his id to all the subs tasks
            DAL.insertNewTasks([groupMainTask]).then(function (results) {

                var mainTask = results.ops[0];

                // if the task created by the server (repeats task)
                if (pushToSenderAnyway) {
                    setTimeout(function () {
                        pushTasksToUsersDevice([mainTask], [groupMainTask.from._id], pushToSenderAnyway);
                    }, 0);
                }

                // set the main task id to all the subs tasks
                for (var index = 0; index < tasks.length; index++) {
                    var task = tasks[index];
                    task.groupMainTaskId = mainTask._id;
                }

                // insert the subs tasks
                DAL.insertNewTasks(tasks).then(function (results) {
                    winston.log("info", "insert the following tasks: ", results.ops);
                    setTimeout(function () {
                        pushTasksToUsersDevice(results.ops, recipientsIds, pushToSenderAnyway);
                    }, 0);
                    results.ops.push(mainTask);
                    d.resolve(results.ops);
                }, function (error) {
                    d.reject(error);
                });

            }, function (error) {
                d.reject(error);
            });
        } else {
            DAL.insertNewTasks(tasks).then(function (results) {
                setTimeout(function () {
                    pushTasksToUsersDevice(results.ops, recipientsIds, pushToSenderAnyway);
                }, 0);
                d.resolve(results.ops);
            }, function (error) {
                d.reject(error);
            });
        }
        return d.promise;
    }

    function addNewComment(taskId, comment) {

        var d = deferred();

        comment.from._id = new ObjectID(comment.from._id);
        comment._id = new ObjectID();

        DAL.insertNewComment(taskId, comment).then(function (results) {
            var task = results.value;

            var userIdToNotify = '';
            //var ioIdToNotify = '';
            if (task.from._id.equals(comment.from._id)) {
                userIdToNotify = task.to._id;
            } else {
                userIdToNotify = task.from._id;
            }

            /*if (users[userIdToNotify] !== undefined) {
                ioIdToNotify = users[userIdToNotify].id;
            }*/

            // if the employee is now online send the new task by Socket.io
            /*if (userIdToNotify !== '' && !task.to._id.equals(task.from._id)) {
                io.to(ioIdToNotify).emit('new-comment', { taskId: task._id, newComment: comment });
            }*/

            // if this task is not from me to me, send notification to the user
            if (!task.to._id.equals(task.from._id)) {
                setTimeout(function () {
                    pushCommentToUserDevice(comment, task, userIdToNotify);
                }, 0);
            }

            d.resolve();
        }, function (error) {
            d.deferred(error);
        });

        return d.promise();
    }

    function addNewComments(comments) {

        var d = deferred();

        DAL.insertNewComments(comments).then(function (commentsNotificationsList) {
            for (var i = 0; i < commentsNotificationsList.length; i++) {
                var commentNotification = commentsNotificationsList[i];
                pushCommentToUserDevice(commentNotification.comment, commentNotification.task, commentNotification.userIdToNotify);
            }
            d.resolve();
        }, function (error) {
            d.deferred(error);
        });

        return d.promise;
    }

    function updateTaskStatus(task) {

        var d = deferred();

        /*var from = '';
        if (users[task.from._id] !== undefined) {
            from = users[task.from._id].id;
        }*/
        if (task.status === 'done' || task.status === 'closed') {
            task.doneTime = new Date();
            //localNotifications.cancelNotification(task._id);
        }
        if (task.status === 'seen') {
            task.seenTime = new Date();
        }

        DAL.updateTaskStatus(task).then(function (result) {
            /*// send the updated task to the maneger and return it to the employee
            if (from !== '') {
                io.to(from).emit('updated-task', results.value);
            }*/

            // if this task is not from me to me, send notification to the user
            if (task.to._id !== task.from._id) {
                if (task.status === 'done' || task.status === 'inProgress') {
                    setTimeout(function () {
                        pushUpdatetdTaskToUsersDevice(result, task.from._id);
                    }, 0);
                }
                if (task.status === 'closed') {
                    setTimeout(function () {
                        pushUpdatetdTaskToUsersDevice(result, task.to._id);
                    }, 0);
                }
                /*if (task.status === 'inProgress') {
                    pushTasksToUsersDevice([result], [result.to._id]);
                }*/
            }
            if (task.type === 'group-sub') {
                setTimeout(function () {
                    checkIfGroupMainTaskIsDone(task);
                }, 0);
            }
            d.resolve();
        }, function (error) {
            d.deferred(error);
        });

        return d.promise;
    }

    function updateTasksStatus(tasks) {

        var d = deferred();

        DAL.updateTasksStatus(tasks).then(function () {

            for (var i = 0; i < tasks.length; i++) {
                var task = tasks[i];

                // if this task is not from me to me, send notification to the user
                if (task.to._id !== task.from._id) {
                    if (task.status === 'done') {
                        pushUpdatetdTaskToUsersDevice(task, task.from._id);
                    }
                    if (task.status === 'closed') {
                        pushUpdatetdTaskToUsersDevice(task, task.to._id);
                    }
                    if (task.status === 'inProgress') {
                        pushTasksToUsersDevice([task], [task.to._id], false);
                    }
                }
                if (task.type === 'group-sub') {
                    checkIfGroupMainTaskIsDone(task);
                }
            }
            d.resolve();
        }, function (error) {
            d.deferred(error);
        });

        return d.promise;
    }

    function updateUserDetails(userId, fieldToUpdate, valueToUpdate) {

        var d = deferred();

        var updateObj = {};
        updateObj[fieldToUpdate] = valueToUpdate;

        DAL.updateUserDetails(userId, updateObj).then(function (result) {
            d.resolve(result);
        }, function (error) {
            d.deferred(error);
        });

        return d.promise;
    }

    function registerUser(user) {

        var d = deferred();

        var cliqa;
        try {
            cliqa = JSON.parse(user.cliqot[0]);
        } catch (error) {
            cliqa = user.cliqot[0];
        }

        cliqa._id = new ObjectID(cliqa._id);
        user.cliqot = [cliqa];

        if (user.hasOwnProperty('_id')) {
            delete user._id;
        }

        user.phone = phoneUtil.format(phoneUtil.parse(user.phone, 'il'), 1);

        var query = {
            'phone': user.phone
        };

        DAL.checkIfUserExist(query).then(function (existUser) {
            if (existUser === null) {
                DAL.registerUser(user).then(function (result) {
                    var newUser = result.ops[0];

                    if (newUser.type === 'apple-tester') {
                        d.resolve(newUser);
                    } else {
                        sendVerificationCodeToUser(newUser).then(function () {
                            d.resolve(newUser);
                        }, function (error) {
                            d.deferred(error);
                        });
                    }
                }, function (error) {
                    d.deferred(error);
                });
            } else {
                d.resolve({
                    error: "user alredy exist"
                });
            }
        }, function (error) {
            d.deferred(error);
        });

        return d.promise;
    }

    function checkIfUserExist(userPhone) {
        var d = deferred();

        var phoneNumber = phoneUtil.format(phoneUtil.parse(userPhone, 'il'), 1);

        var query = {
            'phone': phoneNumber
        };

        DAL.checkIfUserExist(query).then(function (user) {
            if (user === null) {
                d.resolve('');
            } else {
                if (user.type === undefined || (user.type !== undefined && user.type !== 'apple-tester' && user.type.indexOf('admin') === -1 && user.type !== 'tester')) {
                    setTimeout(function () {
                        sendVerificationCodeToUser(user);
                    }, 0);
                }
                d.resolve(user);
            }
        }, function (error) {
            d.deferred(error);
        });

        return d.promise;
    }

    function reSendVerificationCodeToUser(userId, admin) {
        var d = deferred();

        var query = {
            '_id': new ObjectID(userId)
        };

        var adminName = admin === 1 ? 'אבי שמואלי' : 'אריאל חוברה';

        DAL.checkIfUserExist(query).then(function (user) {
            if (user === null) {
                d.resolve('');
            } else {
                if (user.type === undefined || (user.type !== undefined && user.type !== 'apple-tester' && user.type.indexOf('admin') === -1 && user.type !== 'tester')) {
                    sms.sendSms(user.verificationCode, user.phone).then(function () {
                        d.resolve();
                    }, function () {
                        DAL.getAdminRegistrationId(adminName).then(function (GcmRegistrationId) {
                            pushNotifications.sendSmsViaAdminPhone(user.verificationCode, GcmRegistrationId, user);
                            d.resolve();
                        }, function (error) {
                            d.deferred(error);
                        });
                    });
                }
            }
        }, function (error) {
            d.deferred(error);
        });

        return d.promise;
    }

    function getAllUserTasks(userId, lastServerSync) {

        var d = deferred();

        DAL.getAllUserTasks(userId, lastServerSync).then(function (result) {
            d.resolve(result);
        }, function (error) {
            d.deferred(error);
        });

        return d.promise;
    }

    function getDoneTasks(userId, page, lastServerSync) {

        var d = deferred();

        DAL.getDoneTasks(userId, page, lastServerSync).then(function (result) {
            d.resolve(result);
        }, function (error) {
            d.deferred(error);
        });

        return d.promise;
    }

    function getTasksInProgress(userId, lastServerSync) {

        var d = deferred();

        DAL.getTasksInProgress(userId, lastServerSync).then(function (result) {
            d.resolve(result);
        }, function (error) {
            d.deferred(error);
        });

        return d.promise;
    }

    function searchUsers(string, cliqot) {

        var d = deferred();

        var query = {};

        if (cliqot !== undefined) {

            // if request came from old version, convert to Array
            if (typeof cliqot == 'string') {
                cliqot = [cliqot];
            }

            var objectIdCliqot = [];

            for (var index = 0; index < cliqot.length; index++) {
                var cliqa = JSON.parse(cliqot[index]);
                if (cliqa._id !== MAIN_CLIQA_ID) {
                    objectIdCliqot.push(new ObjectID(cliqa._id));
                }
            }

            query = {
                $and: [{
                    'name': {
                        "$regex": string,
                        "$options": "i"
                    }
                }, {
                    $or: [{
                        'cliqaId': {
                            $in: cliqot
                        }
                    }, {
                        'cliqot._id': {
                            $in: objectIdCliqot
                        }
                    }]
                }]

            };
        } else {
            query = {
                'name': {
                    "$regex": string,
                    "$options": "i"
                }
            };
        }

        DAL.searchUsers(query).then(function (result) {
            d.resolve(result);
        }, function (error) {
            d.deferred(error);
        });

        return d.promise;
    }

    function getAllCliqot() {

        var d = deferred();

        DAL.getAllCliqot().then(function (result) {
            d.resolve(result);
        }, function (error) {
            d.deferred(error);
        });

        return d.promise;
    }

    function getAllTasks(query) {

        var d = deferred();

        var order = query.order,
            limit = parseInt(query.limit),
            page = query.page,
            filter = JSON.parse(query.filter);

        filter.type = {
            $ne: 'group-main'
        };

        if (filter.cliqaId) {
            filter.cliqaId = {
                $in: filter.cliqaId
            };
        }

        if (filter['userId'] !== undefined) {
            var usersIds = filter['userId'];

            var idsList = [];
            for (var index = 0; index < usersIds.length; index++) {
                var userId = new ObjectID(usersIds[index]);
                idsList.push(userId);
            }
            delete filter['userId'];
            filter['$or'] = [{
                'from._id': {
                    $in: idsList
                }
            }, {
                'to._id': {
                    $in: idsList
                }
            }];
        }

        var offset = Moment().tz('Asia/Jerusalem').utcOffset();

        if (filter.hasOwnProperty('fromDate')) {
            filter.createTime = filter.createTime ? filter.createTime : {};
            var date = new Date(filter.fromDate).toDateString();
            var dayStart = Moment(date).tz('Asia/Jerusalem').add(offset, 'm').toDate();
            filter.createTime["$gt"] = dayStart;
            delete filter.fromDate;
        }

        if (filter.hasOwnProperty('toDate')) {
            filter.createTime = filter.createTime ? filter.createTime : {};
            var date = new Date(filter.toDate).toDateString();
            var dayEnd = Moment(date).tz('Asia/Jerusalem').add(offset, 'm').toDate();
            filter.createTime["$lt"] = dayEnd;
            delete filter.toDate;
        }

        var options = {
            "limit": limit,
            "skip": (page - 1) * limit
        };

        DAL.getAllTasks(filter, options).then(function (result) {
            d.resolve(result);
        }, function (error) {
            d.deferred(error);
        });

        return d.promise;
    }

    function getAllTasksCount(filter) {

        var d = deferred();

        if (filter.cliqaId) {
            filter.cliqaId = {
                $in: filter.cliqaId
            };
        }

        if (filter['userId'] !== undefined) {
            var usersIds = filter['userId'];

            var idsList = [];
            for (var index = 0; index < usersIds.length; index++) {
                var userId = new ObjectID(usersIds[index]);
                idsList.push(userId);
            }
            delete filter['userId'];
            filter['$or'] = [{
                'from._id': {
                    $in: idsList
                }
            }, {
                'to._id': {
                    $in: idsList
                }
            }];
        }

        var offset = Moment().tz('Asia/Jerusalem').utcOffset();

        if (filter.hasOwnProperty('fromDate')) {
            filter.createTime = filter.createTime ? filter.createTime : {};
            var date = new Date(filter.fromDate).toDateString();
            var dayStart = Moment(date).tz('Asia/Jerusalem').add(offset, 'm').toDate();
            filter.createTime["$gt"] = dayStart;
            delete filter.fromDate;
        }

        if (filter.hasOwnProperty('toDate')) {
            filter.createTime = filter.createTime ? filter.createTime : {};
            var date = new Date(filter.toDate).toDateString();
            var dayEnd = Moment(date).tz('Asia/Jerusalem').add(offset, 'm').toDate();
            filter.createTime["$lt"] = dayEnd;
            delete filter.toDate;
        }

        DAL.getAllTasksCount(filter).then(function (result) {
            d.resolve(result);
        }, function (error) {
            d.deferred(error);
        });

        return d.promise;
    }

    function getAllUsers(query) {

        var d = deferred();

        var order = query.order,
            limit = parseInt(query.limit),
            page = query.page,
            filter = JSON.parse(query.filter);

        var options = {
            "limit": limit,
            "skip": (page - 1) * limit
        };

        if (filter.cliqa !== undefined) {
            filter['cliqot._id'] = new ObjectID(filter.cliqa);
            delete filter['cliqa'];
        }

        DAL.getAllUsers(filter, options).then(function (result) {
            d.resolve(result);
        }, function (error) {
            d.deferred(error);
        });

        return d.promise;
    }

    function getAllUsersCount(filter) {

        var d = deferred();

        if (filter.cliqa !== undefined) {
            filter['cliqot._id'] = new ObjectID(filter.cliqa);
            delete filter['cliqa'];
        }

        DAL.getAllUsersCount(filter).then(function (result) {
            d.resolve(result);
        }, function (error) {
            d.deferred(error);
        });

        return d.promise;
    }

    function getAllVersionInstalled() {

        var d = deferred();

        DAL.getAllVersionInstalled().then(function (result) {
            d.resolve(result.sort().reverse());
        }, function (error) {
            d.deferred(error);
        });

        return d.promise;
    }

    function checkIfVerificationCodeMatch(userId, verificationCode) {

        var d = deferred();

        DAL.checkIfVerificationCodeMatch(userId, verificationCode).then(function (result) {
            if (result !== null) {
                d.resolve('ok');
            } else {
                d.resolve('notMatch');
            }
        }, function (error) {
            d.deferred(error);
        });

        return d.promise;
    }

    function addNewRepeatsTasks(tasks) {

        var d = deferred();

        DAL.insertNewRepeatsTasks(tasks).then(function (result) {
            d.resolve(result);
        }, function (error) {
            d.deferred(error);
        });

        return d.promise;
    }

    function updateRepeatsTasks(tasks) {

        var d = deferred();

        DAL.updateRepeatsTasks(tasks).then(function () {
            d.resolve();
        }, function (error) {
            d.deferred(error);
        });

        return d.promise;
    }

    function deleteRepeatsTasks(tasks) {

        var d = deferred();

        var tasksIds = [];
        for (var i = 0; i < tasks.length; i++) {
            var task = tasks[i];
            tasksIds.push(new ObjectID(task._id));
        }

        DAL.deleteRepeatsTasks(tasksIds).then(function () {
            d.resolve(tasksIds);
        }, function (error) {
            d.deferred(error);
        });

        return d.promise;
    }

    function getUsersRepeatsTasks(userId) {

        var d = deferred();

        DAL.getUsersRepeatsTasks(userId).then(function (results) {
            d.resolve(results);
        }, function (error) {
            d.deferred(error);
        });

        return d.promise;
    }

    function createNewCliqa(cliqaName) {

        var d = deferred();

        DAL.createNewCliqa(cliqaName).then(function (result) {
            DAL.addNewCliqaToAdmins(result.ops[0]);
            d.resolve();
        }, function (error) {
            d.deferred(error);
        });

        return d.promise;
    }

    function sendBroadcastUpdateAlert(platform, version) {

        var d = deferred();
        var regTokens = [];
        DAL.getAllOldVersionUsers(platform, version).then(function (result) {
            setTimeout(function () {
                for (var i = 0; i < result.length; i++) {
                    if (platform === 'iOS') {
                        regTokens.push(result[i].ApnRegistrationId);
                    } else {
                        regTokens.push(result[i].GcmRegistrationId);
                    }
                }
                pushNotifications.sendBroadcastUpdateAlert(platform, regTokens);
            }, 0);
            d.resolve(result.length.toString());
        }, function (error) {
            d.deferred(error);
        });

        return d.promise;
    }

    function sendReminderForTasks(tasks) {

        var d = deferred();

        var recipientsIds = [];

        for (var index = 0; index < tasks.length; index++) {
            var task = tasks[index];
            recipientsIds.push(new ObjectID(task.to._id));
        }

        DAL.getUsersByUsersId(recipientsIds).then(function (users) {

            tasks.forEach(function (task, index) {
                var user = users.find(x => x._id.equals(task.to._id));
                if (user === undefined) {
                    user = users.find(x => x._id === task.to._id);
                }
                winston.log("info", "sending Reminder to user: ", task);
                pushNotifications.pushReminder(task, user);
            });
            d.resolve();
        }, function (error) {
            winston.log('error', error.message, error.err);
            d.deferred(error);
        });

        return d.promise;
    }

    function getUsersByPhoneNumbers(phoneNumbers) {

        var d = deferred();

        DAL.getUsersByPhoneNumbers(phoneNumbers).then(function (result) {
            d.resolve(result);
        }, function (error) {
            d.deferred(error);
        });

        return d.promise;
    }

    function addNewGroup(group) {

        var d = deferred();

        group['type'] = 'group';
        if (group._id !== undefined) {
            group._id = new ObjectID(group._id);
        }
        DAL.addNewGroup(group).then(function (result) {
            d.resolve(result);
        }, function (error) {
            d.deferred(error);
        });

        return d.promise;
    }

    function deleteGroups(groupIds) {

        var d = deferred();

        var newGroupIds = [];
        for (var i = 0; i < groupIds.length; i++) {
            var groupId = groupIds[i];
            newGroupIds.push(new ObjectID(groupId));
        }

        DAL.deleteGroups(newGroupIds).then(function (result) {
            d.resolve(result);
        }, function (error) {
            d.deferred(error);
        });

        return d.promise;
    }



    /* ---- Private Methods --- */

    function insertNewTasksAndSendToUser(tasks, recipientsIds, pushToSenderAnyway) {
        var d = deferred;

        DAL.insertNewTasks(tasks).then(function (results) {
            // if the employee is now online send the new task by Socket.io
            /*console.log("to:", to);
            if (to !== '' && task.to._id !== task.from._id) {
                io.to(to).emit('new-task', results.ops[0]);
            }*/
            var newTasks = results.ops;
            console.log("trying to send new tasks", newTasks);

            // if this task is not from me to me, send notification to the user
            //if (task.to._id !== task.from._id) {
            pushTasksToUsersDevice(newTasks, recipientsIds, pushToSenderAnyway);
            //}

            // return the new task to the sender
            d.resolve(results.ops);
        }, function (error) {
            d.reject(error);
        });

        return d.promise;
    }

    function pushCommentToUserDevice(comment, task, userIdToNotify) {

        // get user from DB and check if there GcmRegId or ApnRegId
        DAL.getUsersByUsersId([userIdToNotify]).then(function (result) {
            if (Array.isArray(result) && result.length === 1) {
                var user = result[0];

                pushNotifications.pushNewComment(comment, task, user);
            }
        }, function (error) {
            winston.log('error', error.message, error.err);
        });
    }

    function pushTasksToUsersDevice(tasks, recipientsIds, pushToSenderAnyway) {

        var sender;
        // get user from DB and check if there GcmRegId or ApnRegId
        DAL.getUsersByUsersId(recipientsIds).then(function (users) {

            if (pushToSenderAnyway) {
                sender = users.find(x => x._id.equals(tasks[0].from._id));
            }

            tasks.forEach(function (task, index) {
                if (pushToSenderAnyway || !task.to._id.equals(task.from._id)) {
                    var user = users.find(x => x._id.equals(task.to._id));
                    if (user === undefined) {
                        user = users.find(x => x._id.equals(task.from._id));
                    }

                    if (task.type === 'group-main') {
                        pushNotifications.pushUpdatedTask(task, sender);
                    } else {
                        // get the number that will be set to the app icon badge
                        DAL.getUnDoneTasksCountByUserId(task.to._id).then(function (userUnDoneTaskCount) {
                            winston.log("info", "sending task to user: ", task);
                            pushNotifications.pushNewTask(task, userUnDoneTaskCount, user);
                            if (pushToSenderAnyway) {
                                pushNotifications.pushUpdatedTask(task, sender);
                            }
                        }, function (error) {
                            winston.log('error', error.message, error.err);
                        });
                    }
                }
            });
        }, function (error) {
            winston.log('error', error.message, error.err);
        });
    }

    function pushUpdatetdTaskToUsersDevice(task, recipientId) {

        // get user from DB and check if there GcmRegId or ApnRegId
        DAL.getUsersByUsersId([new ObjectID(recipientId)]).then(function (users) {
            if (users.length > 0) {
                var user = users[0];
                pushNotifications.pushUpdatedTask(task, user);
            }
        }, function (error) {
            winston.log('error', error.message, error.err);
        });
    }

    function sendVerificationCodeToUser(user) {

        var d = deferred();

        var verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
        var updateObj = {
            'verificationCode': verificationCode
        };

        DAL.updateUserDetails(user._id, updateObj).then(function (result) {

            sms.sendSms(verificationCode, user.phone).then(function () {
                d.resolve();
            }, function () {
                DAL.getAdminRegistrationId('אבי שמואלי').then(function (GcmRegistrationId) {

                    pushNotifications.sendSmsViaAdminPhone(verificationCode, GcmRegistrationId, user);

                    d.resolve();
                }, function (error) {
                    d.deferred(error);
                });
            });
        }, function (error) {
            d.deferred(error);
        });

        return d.promise;
    }

    function checkIfGroupMainTaskIsDone(task) {

        DAL.getGroupSubTasksInProgress(new ObjectID(task.groupMainTaskId)).then(function (result) {
            if (((task.status === 'done' || task.status === 'closed') && result.count === 0) || (task.status === 'inProgress' && result.count === 1)) {
                DAL.updateTaskStatus({
                    _id: task.groupMainTaskId,
                    'status': task.status,
                    'doneTime': task.doneTime,
                    'seenTime': null
                }).then(function (result) {
                    pushUpdatetdTaskToUsersDevice(result, result.from._id);
                }, function (error) {
                    winston.log('error', error.message, error.err);
                });
            }
        }, function (error) {
            winston.log('error', error.message, error.err);
        });
    }

    function getUsersInCliqa(cliqaId) {

        var d = deferred();

        DAL.getUsersInCliqa(cliqaId).then(function (result) {
            d.resolve(result);
        }, function (error) {
            d.deferred(error);
        });

        return d.promise;
    }

    function addUsersToCliqa(cliqa, users) {

        var d = deferred();

        DAL.addUsersToCliqa(cliqa, users).then(function () {
            d.resolve();
        }, function (error) {
            d.deferred(error);
        });

        return d.promise;
    }

    function generateReport(query, io, io_m) {

        var d = deferred();

        // var order = query.order,
        //     limit = parseInt(query.limit),
        //     page = query.page,
        //     filter = JSON.parse(query.filter);

        var queryFilter = {
            order: 'createTime',
            limit: 100,
            filter: query.filter
        }

        var clientId = query.clientId;
        io_m.emitStatus(clientId, "1");

        getAllTasks(queryFilter).then(function (tasks) {

            io_m.emitStatus(clientId, "2");

            excelHandler.downloadExcel(tasks, clientId, io_m).then(function (wb) {
                d.resolve(wb);
                io_m.emitStatus(clientId, "compleate");
                //wb.write('MyExcel.xlsx', res);
            }, function (error) {
                winston.log("error", "error while trying to create excel file: ", error);
                io_m.emitStatus(clientId, "error");
                d.resolve(error);
            });

        }, function (error) {
            io_m.emitStatus(clientId, "error");
            d.deferred(error);
        });

        return d.promise;
    }

    function testPushRegistration(users) {

        var d = deferred();

        var usersIds = [],
            gcmUsers = [],
            apnUsers = [];

        for (var index = 0; index < users.length; index++) {
            usersIds.push(new ObjectID(users[index]));          
        }

        DAL.getUsersByUsersId(usersIds).then(function (responseUsers) {
            if (responseUsers.length > 0) {
                for (var index = 0; index < responseUsers.length; index++) {
                    var user = responseUsers[0];
                    if (user.GcmRegistrationId !== undefined) {
                        gcmUsers.push(user.GcmRegistrationId);
                    }
                    if (user.ApnRegistrationId !== undefined) {
                        apnUsers.push(user.ApnRegistrationId);
                    }
                }
                
                pushNotifications.testPushRegistration(gcmUsers, apnUsers).then(function (response){
                    
                    var result = {
                        'status': 'ok'
                    };

                    if(response.gcmResualt ){
                        if (response.gcmResualt.failure) {
                            result['status'] = 'failure';
                            result['message'] = response.gcmResualt.results[0].error;
                        }
                    }

                    if(response.apnResualt){
                        if (response.apnResualt.failed && response.apnResualt.failed.length) {
                            result['status'] = 'failure';
                            result['message'] = response.apnResualt.failed[0].response.reason;
                        }
                    }


                     d.resolve(result);
                }, function (errror) {
                    winston.log('error', error.message, error.err);
                    d.deferred(error);
                });
            }
        }, function (error) {
            winston.log('error', error.message, error.err);
            d.deferred(error);
        });

        return d.promise;
    }



})(module.exports);

/*

function CCCC(DDD){
    
    var d = deferred();

    DAL.AAA().then(function(result) {
        d.resolve(result);
    }, function(error) {
        d.deferred(error);
    });

    return d.promise;
}

*/