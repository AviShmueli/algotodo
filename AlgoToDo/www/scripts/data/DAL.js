﻿(function () {
    'use strict';

    angular
        .module('app.data')
        .service('DAL', DAL);

    DAL.$inject = ['$http', '$q', 'appConfig', 'logger'];

    function DAL($http, $q, appConfig, logger) {


        var self = this;
        self.admin = 1;
        
        var saveNewTasks = function (tasks) {

            var req = {
                method: 'POST',
                url: appConfig.appDomain() + '/TaskManeger/newTask',
                data: {
                    task: tasks
                }
            };

            return $http(req);
        };

        var getTasks = function (user) {
            var req = {
                method: 'GET',
                url: appConfig.appDomain() + '/TaskManeger/getTasks',
                params: {
                    userId: user._id,
                    lastServerSync: user.lastServerSync
                }
            };

            return $http(req);
        };

        var getTasksInProgress = function (user) {

            var req = {
                method: 'GET',
                url: appConfig.appDomain() + '/TaskManeger/getTasksInProgress',
                params: {
                    userId: user._id,
                    lastServerSync: user.lastServerSync
                }
            };

            return $http(req);
        };

        var getDoneTasks = function (page, user) {

            var req = {
                method: 'GET',
                url: appConfig.appDomain() + '/TaskManeger/getDoneTasks',
                params: {
                    userId: user._id,
                    page: page,
                    lastServerSync: user.lastServerSync
                }
            };

            return $http(req);
        };

        var updateTask = function (task) {

            var req = {
                method: 'POST',
                url: appConfig.appDomain() + '/TaskManeger/updateTaskStatus',
                data: {
                    task: task
                }
            };

            return $http(req);
        };

        var updateTasks = function (tasks) {

            var req = {
                method: 'POST',
                url: appConfig.appDomain() + '/TaskManeger/updateTasksStatus',
                data: {
                    tasks: tasks
                }
            };

            return $http(req);
        };

        var registerUser = function (user) {
            var req = {
                method: 'POST',
                url: appConfig.appDomain() + '/TaskManeger/registerUser',
                data: {
                    user: user
                }
            };

            return $http(req);
        };

        var searchUsers = function (string, user) {
            var params = {};
            if (user.type !== undefined && user.type === 'system-admin') {
                params = {
                    queryString: string
                };
            }
            else {
                if (user.cliqot !== undefined && user.cliqot.length > 0) {
                    params = {
                        queryString: string,
                        userCliqaId: user.cliqot
                    };
                }
                else {
                    params = {
                        queryString: string
                    };
                }
            }
            var req = {
                method: 'GET',
                url: appConfig.appDomain() + '/TaskManeger/searchUsers',
                params: params
            };

            return $http(req);
        };

        var checkIfUserExist = function (userPhone) {

            var req = {
                method: 'GET',
                url: appConfig.appDomain() + '/TaskManeger/isUserExist',
                params: {
                    userPhone: userPhone
                }
            };

            return $http(req);
        };

        var checkIfVerificationCodeMatch = function (user, verificationCode) {
            var req = {
                method: 'GET',
                url: appConfig.appDomain() + '/TaskManeger/checkIfVerificationCodeMatch',
                params: {
                    userId: user._id,
                    verificationCode: verificationCode
                }
            };

            return $http(req);
        };

        var newComment = function (taskId, comment) {
            var req = {
                method: 'POST',
                url: appConfig.appDomain() + '/TaskManeger/newComment',
                data: {
                    taskId: taskId,
                    comment: comment
                }
            };

            return $http(req);
        };

        var AddNewComments = function (comments) {
            var req = {
                method: 'POST',
                url: appConfig.appDomain() + '/TaskManeger/AddNewComments',
                data: {
                    comments: comments
                }
            };

            return $http(req);
        };

        var updateUserDetails = function (userId, fieldToUpdate, valueToUpdate) {
            var req = {
                method: 'POST',
                url: appConfig.appDomain() + '/TaskManeger/updateUserDetails',
                data: {
                    userId: userId,
                    fieldToUpdate: fieldToUpdate,
                    valueToUpdate: valueToUpdate
                }
            };

            return $http(req);
        };

        var saveUsersNewRegistrationId = function (registrationId, user) {
            var filedToUpdate = '';
            if (user.device !== undefined && user.device.platform === 'iOS') {
                user.ApnRegistrationId = registrationId;
                filedToUpdate = 'ApnRegistrationId';
            }
            if (user.device !== undefined && user.device.platform === 'Android') {
                user.GcmRegistrationId = registrationId;
                filedToUpdate = 'GcmRegistrationId';
            }
            if (filedToUpdate !== '') {
                updateUserDetails(user._id, filedToUpdate, registrationId);
            }
        };

        var getAllCliqot = function () {

            var req = {
                method: 'GET',
                url: appConfig.appDomain() + '/TaskManeger/getAllCliqot'
            };

            return $http(req);
        };

        var getAllTasks = function (query, filter, user) {
            if (user.type !== undefined && user.type.indexOf('admin') !== -1) {

                var req = {
                        method: 'GET',
                        url: appConfig.appDomain() + '/TaskManeger/getAllTasks',
                        params: {
                                order: query.order,
                                limit: query.limit,
                                page: query.page,
                                filter: filter
                }
            };

                return $http(req);
        }
    };

        var getAllTasksCount = function (filter) {
            var req = {
                method: 'GET',
                url: appConfig.appDomain() + '/TaskManeger/getAllTasksCount',
                params: {
                    filter: filter
                }
            };

            return $http(req);
        };

        var getAllUsers = function (query, filter, user) {
            if (user.type !== undefined && user.type.indexOf('admin') !== -1) {

                var req = {
                    method: 'GET',
                    url: appConfig.appDomain() + '/TaskManeger/getAllUsers',
                    params: {
                        order: query.order,
                        limit: query.limit,
                        page: query.page,
                        filter: filter
                    }
                };

                return $http(req);
            }
        };

        var getAllUsersCount = function (filter) {
            var req = {
                method: 'GET',
                url: appConfig.appDomain() + '/TaskManeger/getAllUsersCount',
                params: {
                    filter: filter
                }
            };

            return $http(req);
        };

        var getAllVersionInstalled = function () {
            var req = {
                method: 'GET',
                url: appConfig.appDomain() + '/TaskManeger/getAllVersionInstalled'
            };

            return $http(req);
        };

        var addNewRepeatsTasks = function (tasks) {

            var req = {
                method: 'POST',
                url: appConfig.appDomain() + '/TaskManeger/addNewRepeatsTasks',
                data: {
                    tasks: tasks
                }
            };

            return $http(req);
        };

        var getUsersRepeatsTasks = function (userId) {
            var req = {
                method: 'GET',
                url: appConfig.appDomain() + '/TaskManeger/getUsersRepeatsTasks',
                params: {
                    userId: userId
                }
            };

            return $http(req);
        };

        var updateRepeatsTasks = function (tasks) {

            var req = {
                method: 'POST',
                url: appConfig.appDomain() + '/TaskManeger/updateRepeatsTasks',
                data: {
                    tasks: tasks
                }
            };

            return $http(req);
        };

        var deleteRepeatsTasks = function (tasks) {

            var req = {
                method: 'POST',
                url: appConfig.appDomain() + '/TaskManeger/deleteRepeatsTasks',
                data: {
                    tasks: tasks
                }
            };

            return $http(req);
        };

        var createNewCliqa = function (cliqaName) {
            var req = {
                method: 'POST',
                url: appConfig.appDomain() + '/TaskManeger/createNewCliqa',
                data: {
                    cliqaName: cliqaName
                }
            };

            return $http(req);
        };

        var reSendVerificationCodeToUser = function (userId) {
            self.admin = self.admin === 1 ? 2 : 1;
            var req = {
                method: 'POST',
                url: appConfig.appDomain() + '/TaskManeger/reSendVerificationCodeToUser',
                data: {
                    userId: userId,
                    admin: self.admin
                }
            };

            return $http(req);
        };

        var sendBroadcastUpdateAlert = function (paltform, version) {
            var req = {
                method: 'POST',
                url: appConfig.appDomain() + '/TaskManeger/sendBroadcastUpdateAlert',
                data: {
                    paltform: paltform,
                    version: version
                }
            };

            return $http(req);
        };

        var sendReminderForTasks = function (tasks) {
            var req = {
                method: 'POST',
                url: appConfig.appDomain() + '/TaskManeger/sendReminderForTasks',
                data: {
                    tasks: tasks
                }
            };

            return $http(req);
        };

        var getUsersByPhoneNumbers = function (phoneNumbers) {
            var req = {
                method: 'POST',
                url: appConfig.appDomain() + '/TaskManeger/getUsersByPhoneNumbers',
                data: {
                    phoneNumbers: phoneNumbers
                }
            };

            return $http(req);
        };

        var addNewGroup = function (group) {
            var req = {
                method: 'POST',
                url: appConfig.appDomain() + '/TaskManeger/addNewGroup',
                data: {
                    group: group
                }
            };

            return $http(req);
        };

        var deleteGroups = function (groupIds) {
            var req = {
                method: 'POST',
                url: appConfig.appDomain() + '/TaskManeger/deleteGroups',
                data: {
                    groupIds: groupIds
                }
            };

            return $http(req);
        };

        var getUsersInCliqa = function (cliqaId) {
            var req = {
                method: 'GET',
                url: appConfig.appDomain() + '/TaskManeger/getUsersInCliqa',
                params: {
                    cliqaId: cliqaId
                }
            };

            return $http(req);
        }

        var addUsersToCliqa = function (cliqa, users) {
            var req = {
                method: 'POST',
                url: appConfig.appDomain() + '/TaskManeger/addUsersToCliqa',
                data: {
                    cliqa: cliqa,
                    users: users
                }
            };

            return $http(req);
        };

        var generateReport = function (query, filter, user) {
            var req = {
                method: 'GET',
                url: appConfig.appDomain() + '/TaskManeger/generateReport',
                params: {
                    query: query,
                    filter: filter
                }
            };

            return req;
        };

        var testPushRegistration = function (users) {
            var req = {
                method: 'POST',
                url: appConfig.appDomain() + '/TaskManeger/testPushRegistration',
                data: {
                    users: users
                }
            };

            return $http(req);
        };

        var service = {
            saveNewTasks: saveNewTasks,
            getTasks: getTasks,
            registerUser: registerUser,
            updateTask: updateTask,
            updateTasks: updateTasks,
            searchUsers: searchUsers,
            checkIfUserExist: checkIfUserExist,
            checkIfVerificationCodeMatch: checkIfVerificationCodeMatch,
            newComment: newComment,
            AddNewComments: AddNewComments,
            updateUserDetails: updateUserDetails,
            saveUsersNewRegistrationId: saveUsersNewRegistrationId,
            getAllCliqot: getAllCliqot,
            getAllTasks: getAllTasks,
            getAllTasksCount: getAllTasksCount,
            getAllUsers: getAllUsers,
            getAllUsersCount: getAllUsersCount,
            getAllVersionInstalled: getAllVersionInstalled,
            addNewRepeatsTasks: addNewRepeatsTasks,
            getUsersRepeatsTasks: getUsersRepeatsTasks,
            updateRepeatsTasks: updateRepeatsTasks,
            deleteRepeatsTasks: deleteRepeatsTasks,
            getDoneTasks: getDoneTasks,
            getTasksInProgress: getTasksInProgress,
            createNewCliqa: createNewCliqa,
            reSendVerificationCodeToUser: reSendVerificationCodeToUser,
            sendBroadcastUpdateAlert: sendBroadcastUpdateAlert,
            sendReminderForTasks: sendReminderForTasks,
            getUsersByPhoneNumbers: getUsersByPhoneNumbers,
            addNewGroup: addNewGroup,
            deleteGroups: deleteGroups,
            getUsersInCliqa: getUsersInCliqa,
            addUsersToCliqa: addUsersToCliqa,
            generateReport: generateReport,
            testPushRegistration: testPushRegistration
        };

        return service;
    }
})();