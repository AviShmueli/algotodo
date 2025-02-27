﻿(function() {
    'use strict';

    angular
        .module('app.data')
        .service('$offlineHandler', offlineHandler);

    offlineHandler.$inject = ['$http', 'logger', 'appConfig', '$rootScope',
                              '$localStorage', '$q', 'DAL', 'datacontext', '$cordovaNetwork',
                              'cordovaPlugins', 'dropbox', 'common'];

    function offlineHandler($http, logger, appConfig, $rootScope,
                            $localStorage, $q, DAL, datacontext, $cordovaNetwork,
                            cordovaPlugins, dropbox, common) {

        
        var self = this;
        
        self.$storage = $localStorage;

        var goOnline = function () {
            if (self.$storage.cachedNewTasksList !== undefined && self.$storage.cachedNewTasksList.length > 0) {
                DAL.saveNewTasks(self.$storage.cachedNewTasksList).then(function (response) {
                    replaceAllTempTasksInLocalStorage(response.data);
                    delete self.$storage.cachedNewTasksList;
                });
            }

            if (self.$storage.cachedTasksToUpdateList !== undefined && self.$storage.cachedTasksToUpdateList.length > 0) {
                DAL.updateTasks(self.$storage.cachedTasksToUpdateList).then(function (response) {
                    delete self.$storage.cachedTasksToUpdateList;
                });
            }

            if (self.$storage.cachedNewCommentsList !== undefined && self.$storage.cachedNewCommentsList.length > 0) {
                DAL.AddNewComments(self.$storage.cachedNewCommentsList).then(function (response) {
                    markCommentsAsOnline(self.$storage.cachedNewCommentsList);
                    delete self.$storage.cachedNewCommentsList;
                });
            }

            if (self.$storage.cachedNewRepeatsTasksList !== undefined && self.$storage.cachedNewRepeatsTasksList.length > 0) {
                DAL.addNewRepeatsTasks(self.$storage.cachedNewRepeatsTasksList).then(function (response) {
                    delete self.$storage.cachedNewRepeatsTasksList;
                });
            }

            if (self.$storage.cachedUpdateRepeatsTasksList !== undefined && self.$storage.cachedUpdateRepeatsTasksList.length > 0) {
                DAL.updateRepeatsTasks(self.$storage.cachedUpdateRepeatsTasksList).then(function (response) {
                    datacontext.replaceRepeatsTasks(response.data);
                    delete self.$storage.cachedUpdateRepeatsTasksList;
                });
            }

            if (self.$storage.cachedDeleteRepeatsTasksList !== undefined && self.$storage.cachedDeleteRepeatsTasksList.length > 0) {
                DAL.deleteRepeatsTasks(self.$storage.cachedDeleteRepeatsTasksList).then(function (response) {
                    delete self.$storage.cachedDeleteRepeatsTasksList;
                });
            }

            if (self.$storage.cachedImagesList !== undefined && self.$storage.cachedImagesList.length > 0) {
                for (var i = 0; i < self.$storage.cachedImagesList.length; i++) {
                    var image = self.$storage.cachedImagesList[i];

                    var splitedPath = image.nativeUrl.split('/');
                    var fileName = splitedPath[splitedPath.length - 1];
                    var path = image.nativeUrl.substring(0, image.nativeUrl.indexOf(fileName));

                    dropbox.uploadNewImageToDropbox(path, fileName, image.fileName)
                        .then(function (fileName) {
                            var index = common.arrayObjectIndexOf(self.$storage.cachedImagesList, 'fileName', fileName);
                            self.$storage.cachedImagesList.splice(index, 1);
                    });
                }
            }
        }

        var addTasksToCachedNewTasksList = function (tasks) {
            
            if (self.$storage.cachedNewTasksList === undefined) {
                self.$storage.cachedNewTasksList = [];
            }

            if (Array.isArray(tasks)) {
                self.$storage.cachedNewTasksList = self.$storage.cachedNewTasksList.concat(tasks);
            }
            else {
                self.$storage.cachedNewTasksList.push(tasks);
            }

            if (self.networkState === 'offline') {
                cordovaPlugins.showToast('אתה במצב לא מקוון, המשימה תשלח כשתתחבר לרשת', 2000);
            }
        }

        var replaceAllTempTasksInLocalStorage = function (newTasks) {
            var allTasks = self.$storage.tasksList;
            for (var i = 0; i < newTasks.length; i++) {
                var index = common.arrayObjectIndexOf(allTasks, '_id', newTasks[i].offlineId);
                if (index !== -1) {
                    self.$storage.tasksList[index] = newTasks[i];
                }
            }
        }

        var addTaskToCachedTasksToUpdateList = function (task) {
            if (self.$storage.cachedTasksToUpdateList === undefined) {
                self.$storage.cachedTasksToUpdateList = [];
            }

            if (self.$storage.cachedNewTasksList !== undefined) {       
                var index = common.arrayObjectIndexOf(self.$storage.cachedNewTasksList, '_id', task._id);
                if (index !== -1) {
                    self.$storage.cachedNewTasksList[index] = task;
                }
            }
            else {
                self.$storage.cachedTasksToUpdateList.push(task);
            }

            if (self.networkState === 'offline') {
                cordovaPlugins.showToast('אתה במצב לא מקוון, המשימה תתעדכן כשתתחבר לרשת', 2000);
            }
        }

        var removeTaskFromCachedTasksToUpdateList = function (task) {
            if (self.$storage.cachedTasksToUpdateList !== undefined) {
                var index = common.arrayObjectIndexOf(self.$storage.cachedTasksToUpdateList, '_id', task._id);
                if (index !== -1) {
                    self.$storage.cachedTasksToUpdateList.splice(index, 1);
                }
            }
        }

        var addCommentToCachedNewCommentsList = function (taskId, comment, userIdToNotify) {
            if (self.$storage.cachedNewCommentsList === undefined) {
                self.$storage.cachedNewCommentsList = [];
            }

            // prevent pushing the same comment twice
            var index = common.arrayObjectIndexOf(self.$storage.cachedNewCommentsList, 'taskId', taskId);
            if (index !== -1) {
                if (self.$storage.cachedNewCommentsList[index].comment.createTime.getTime() !== comment.createTime.getTime()) {
                    self.$storage.cachedNewCommentsList.push({ taskId: taskId, comment: comment, userIdToNotify: userIdToNotify });

                    if (self.networkState === 'offline') {
                        cordovaPlugins.showToast('אתה במצב לא מקוון, התגובה תשלח כשתתחבר לרשת', 2000);
                    }
                }
            }
            else {
                self.$storage.cachedNewCommentsList.push({ taskId: taskId, comment: comment, userIdToNotify: userIdToNotify });

                if (self.networkState === 'offline') {
                    cordovaPlugins.showToast('אתה במצב לא מקוון, התגובה תשלח כשתתחבר לרשת', 2000);
                }
            }
        }

        var addTasksToCachedNewRepeatsTasksList = function (task) {
            if (self.$storage.cachedNewRepeatsTasksList === undefined) {
                self.$storage.cachedNewRepeatsTasksList = [];
            }

            self.$storage.cachedNewRepeatsTasksList.push(task);

            if (self.networkState === 'offline') {
                cordovaPlugins.showToast('אתה במצב לא מקוון, המשימה תישמר כשתתחבר לרשת', 2000);
            }
        }

        var addTasksToCachedUpdateRepeatsTasksList = function (task) {
            if (self.$storage.cachedUpdateRepeatsTasksList === undefined) {
                self.$storage.cachedUpdateRepeatsTasksList = [];
            }

            self.$storage.cachedUpdateRepeatsTasksList.push(task);

            if (self.networkState === 'offline') {
                cordovaPlugins.showToast('אתה במצב לא מקוון, המשימה תישמר כשתתחבר לרשת', 2000);
            }
        }

        var addTasksToCachedDeleteRepeatsTasksList = function (task) {
            if (self.$storage.cachedDeleteRepeatsTasksList === undefined) {
                self.$storage.cachedDeleteRepeatsTasksList = [];
            }

            self.$storage.cachedDeleteRepeatsTasksList.push(task);

            if (self.networkState === 'offline') {
                cordovaPlugins.showToast('אתה במצב לא מקוון, המשימה תימחק כשתתחבר לרשת', 2000);
            }
        }

        var addTasksToCachedImagesList = function (image) {
            if (self.$storage.cachedImagesList === undefined) {
                self.$storage.cachedImagesList = [];
            }

            self.$storage.cachedImagesList.push(image);

            if (self.networkState === 'offline') {
                cordovaPlugins.showToast('אתה במצב לא מקוון, התמונה תישלח כשתתחבר לרשת', 2000);
            }
        }

        var markCommentsAsOnline = function (comments) {
            for (var i = 0; i < comments.length; i++) {
                comments[i].comment.offlineMode = false;
            }
        }

        document.addEventListener("deviceready", function () {
            // listen for Online event
            $rootScope.$on('$cordovaNetwork:online', function (event, networkState) {
                goOnline();
                self.networkState = 'online';
            });

            // listen for Offline event
            $rootScope.$on('$cordovaNetwork:offline', function (event, networkState) {
                self.networkState = 'offline';
            });

            document.addEventListener('resume', goOnline.bind(this), false);
        }, false);

        var service = {
            goOnline: goOnline,
            addTasksToCachedNewTasksList: addTasksToCachedNewTasksList,
            addTaskToCachedTasksToUpdateList: addTaskToCachedTasksToUpdateList,
            addCommentToCachedNewCommentsList: addCommentToCachedNewCommentsList,
            addTasksToCachedNewRepeatsTasksList: addTasksToCachedNewRepeatsTasksList,
            addTasksToCachedUpdateRepeatsTasksList: addTasksToCachedUpdateRepeatsTasksList,
            addTasksToCachedDeleteRepeatsTasksList: addTasksToCachedDeleteRepeatsTasksList,
            addTasksToCachedImagesList: addTasksToCachedImagesList,
            removeTaskFromCachedTasksToUpdateList: removeTaskFromCachedTasksToUpdateList
        };

        return service;
    }
})();