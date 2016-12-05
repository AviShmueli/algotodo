﻿(function () {
    'use strict';

    angular
        .module('app.widgets')
        .controller('AddTaskDialogController', AddTaskDialogController);

    AddTaskDialogController.$inject = [
        '$scope', '$mdDialog', 'datacontext', '$mdMedia', '$q', 'logger', 'cordovaPlugins'
    ];

    function AddTaskDialogController($scope, $mdDialog, datacontext, $mdMedia, $q, logger, cordovaPlugins) {

        var vm = this;
        
        vm.isSmallScrean = $mdMedia('sm');
        vm.task = {};

        vm.imagesPath = cordovaPlugins.getImagesPath();
        vm.selectedItem = null;
        vm.searchText = null;
        vm.querySearch = querySearch;
        vm.selectedRecipients = [];
        vm.showNoRecipientsSelectedError = false;
        vm.submitInProcess = false;
        
        function querySearch(query) {
            vm.showNoRecipientsSelectedError = false;
            /*
            var matchesUsersFromCache = [];

            // get all users stored in the cache
            var cachedUsers = datacontext.getAllCachedUsers().values();
            
            // search for match user
            //for (var user of cachedUsers) {
                //if (user.name.includes(query)) {
                    //matchesUsersFromCache.push(user);
                //}
            //}

            for (i = 0; i < cachedUsers.length; i++) {
                if (cachedUsers[i].name.includes(query)) {
                    matchesUsersFromCache.push(cachedUsers[i]);
                }
            }
            
            // if found, return it
            if (matchesUsersFromCache.length > 0) {
                return matchesUsersFromCache;
            }
            */
            // if no users found in the cache, search in DB
            var deferred = $q.defer();
            datacontext.searchUsers(query).then(function (response) {
                logger.success("search result: ", response.data);
                //datacontext.addUsersToUsersCache(response.data);
                angular.forEach(response.data, function (user) {
                    user['avatarFullUrl'] = vm.imagesPath + user.avatarUrl;
                });
                deferred.resolve(response.data);
            });
            return deferred.promise;
        }
        
        function createFilterFor(query) {
            var lowercaseQuery = angular.lowercase(query);

            return function filterFn(user) {
                return (user.fullName.indexOf(lowercaseQuery) === 0);
            };
        }
        
        vm.hide = function () {
            $mdDialog.hide();
        };
        vm.cancel = function () {
            vm.task = {};
            $mdDialog.cancel();
        };
        vm.save = function () {
            if (vm.submitInProcess === false) {
                vm.submitInProcess = true;
                if (vm.selectedRecipients.length !== 0) {

                    var user = datacontext.getUserFromLocalStorage();
                    vm.task.from = { '_id': user._id, 'name': user.name, 'avatarUrl': user.avatarUrl};
                    vm.task.status = 'inProgress';
                    vm.task.createTime = new Date();
                    vm.task.comments = [];

                    var taskListToAdd = createTasksList(vm.task, vm.selectedRecipients);

                    datacontext.saveNewTasks(taskListToAdd).then(function (response) {
                        logger.toast('המשימה נשלחה בהצלחה!', response.data, 2000);
                        logger.info('task added sucsessfuly', response.data);
                        datacontext.pushTasksToTasksList(response.data);
                        var count = datacontext.setMyTaskCount();
                        cordovaPlugins.setBadge(count);
                        $mdDialog.hide();

                        // clean the form
                        vm.task = {};
                        vm.submitInProcess = false;
                    }, function (error) {
                        logger.error('Error while tring to add new task ', error);
                    });                  
                }
                else {
                    vm.showNoRecipientsSelectedError = true;
                    vm.submitInProcess = false;
                } 
            }
        };


        var createTasksList = function (task, recipients) {
            var listToReturn = [];
            var tempTask;
            angular.forEach(recipients, function (value, key) {
                // if the user select group, 
                // loop over the users in the group and create for each user his task
                if (value.type === 'group') {
                    angular.forEach(value.usersInGroup, function (userInGroup, key) {
                        tempTask = angular.copy(task);
                        tempTask.to = { 'name': userInGroup.name, '_id': userInGroup._id, 'avatarUrl': userInGroup.avatarUrl };
                        listToReturn.push(tempTask);
                    });
                }
                else {
                    tempTask = angular.copy(task);
                    tempTask.to = { 'name': value.name, '_id': value._id, 'avatarUrl': value.avatarUrl };
                    listToReturn.push(tempTask);
                }
            });
            return listToReturn;
        };
        
    }

})();