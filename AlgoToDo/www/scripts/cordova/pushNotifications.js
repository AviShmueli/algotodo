﻿(function () {
    'use strict';

    angular
        .module('app.cordova')
        .service('pushNotifications', pushNotifications);

    pushNotifications.$inject = ['$rootScope', 'datacontext', '$cordovaPushV5',
                              '$log', '$mdToast', '$cordovaVibration', '$q',
                              'dropbox', 'storage', 'device', '$cordovaSms',
                              '$location', 'cordovaPlugins', '$mdDialog', '$toast',
                              'DAL'];

    function pushNotifications($rootScope, datacontext, $cordovaPushV5,
                             $log, $mdToast, $cordovaVibration, $q,
                             dropbox, storage, device, $cordovaSms,
                             $location, cordovaPlugins, $mdDialog, $toast,
                             DAL) {

        var self = this;
        self.push = {};
        self.downloadTryCount = 0;

        var PushOptions = {
            android: {
                senderID: "874351794059",
                sound: "true",
                vibration: "true"
            },
            ios: {
                alert: "true",
                badge: "true",
                sound: "true"
            },
            windows: {}
        };

        var initializePushV5 = function () {
            var deferred = $q.defer();

            $cordovaPushV5.initialize(PushOptions).then(function(push){
                self.push = push;
                deferred.resolve();
            });
            
            return deferred.promise;
        };

        var registerForPushNotifications = function () {

            // start listening for new notifications
            $cordovaPushV5.onNotification();

            // start listening for errors
            $cordovaPushV5.onError();

            // register to get registrationId
            return $cordovaPushV5.register();
        }

        var startListening = function () {
            initializePushV5().then(function () {
                // start listening for new notifications
                $cordovaPushV5.onNotification();

                // start listening for errors
                $cordovaPushV5.onError();
            });
        }

        var cancelEventListner_notificationReceived = null;

        var cancelEventListner_errorOcurred = null;

        var onNotificationReceived = function () {

            document.addEventListener("deviceready", function () {
                // triggered every time notification received
                if (cancelEventListner_notificationReceived !== null) {
                    cancelEventListner_notificationReceived();
                }
                cancelEventListner_notificationReceived = $rootScope.$on('$cordovaPushV5:notificationReceived', handleNotificationRecive);

                // triggered every time error occurs
                if (cancelEventListner_errorOcurred !== null) {
                    cancelEventListner_errorOcurred();
                }
                cancelEventListner_errorOcurred = $rootScope.$on('$cordovaPushV5:errorOcurred', handleErrorOcurred);

            }, false);
        };

        onNotificationReceived();

        var handleNotificationRecive = function (event, data) {
            $log.info('notificationReceived: ' + event, data);
            var dataFromServer = data.additionalData.additionalData;
            var taskId = dataFromServer.taskId;

            if (dataFromServer.type === "task") {
                handelNewTaskRecived(dataFromServer.object, data.count);
            }
            if (dataFromServer.type === "task-update") {
                datacontext.updateLocalTasks([dataFromServer.object]);
                //$rootScope.$apply();
            }
            if (dataFromServer.type === "comment") {
                handelNewCommentRecived(taskId, dataFromServer.object);
            }
            if (dataFromServer.type === "verificationCode") {
                sendSmS(dataFromServer.object.phoneNumaber, dataFromServer.object.verificationCode);
            }
            if (dataFromServer.type === "updateVersionAlert") {
                promptForAppUpdate();
            }
            if (dataFromServer.type === "task-reminder") {
                handelTaskReminderRecived(taskId, dataFromServer.object);
            }
        };

        var handelNewTaskRecived = function (task, taskCount) {
            if (task.comments.length > 0) {
                var comment = task.comments[0];

                comment.fileLocalPath = device.getImagesPath() + "/images/upload-empty.png";
                downloadImage(task._id, comment);
                datacontext.addTaskToTaskList(task);

                $rootScope.taskcount = taskCount;
                cordovaPlugins.setBadge(taskCount);
                showNewTaskToast(task._id, task.from.name);
            }
            else {
                datacontext.addTaskToTaskList(task);
                $rootScope.taskcount = taskCount;
                cordovaPlugins.setBadge(taskCount);
                //$rootScope.$apply();

                showNewTaskToast(task._id, task.from.name);
            }
        }

        var handelNewCommentRecived = function (taskId, comment) {
            if (comment.fileName !== undefined) {
                comment.fileLocalPath = device.getImagesPath() + "/images/upload-empty.png";
                downloadImage(taskId, comment);
            }

            datacontext.addCommentToTask(taskId, comment);
            navigateToTaskPage(taskId, comment);
        }

        var downloadImage = function (taskId, comment) {
            dropbox.getThumbnail(comment.fileName, 'w128h128')
            .then(function (response) {
                var url = URL.createObjectURL(response.fileBlob);
                comment.fileLocalPath = url;
                comment.errorDownloadFile = false;
            })
            .catch(function (error) {
                $log.error("error while trying to get file Thumbnail", error);
                comment.errorDownloadFile = true;
            });

            self.downloadTryCount++;
            dropbox.downloadFile(comment.fileName)
            .then(function (response) {
                storage.saveFileToStorage(taskId, comment.fileName, response.url).then(function (storageFilePath) {
                    comment.fileLocalPath = storageFilePath;
                    comment.errorDownloadFile = false;
                    //dropbox.deleteFile(comment.fileName);
                });
            })
            .catch(function (error) {
                if (error.error.toString().indexOf('path/not_found/') !== -1 && self.downloadTryCount < 4) {
                    downloadImage(taskId, comment);                   
                }
                else {
                    logger.error("error while trying to download file from dropbox", error);
                    comment.errorDownloadFile = true;
                }
            });
        }

        var navigateToTaskPage = function (taskId, task) {
            if (self.appState === 'background') {
                //$location.path('/task/' + taskId);
            }
            else {
                if ($location.path().indexOf(taskId) === -1) {
                    showNewCommentToast(taskId, task.from.name);
                }
                document.addEventListener("deviceready", function () {
                    $cordovaVibration.vibrate(300);
                }, false);
            }
        }

        var handelTaskReminderRecived = function (taskId, task) {
            if (self.appState === 'background') {
                $location.path('/task/' + taskId);
            }
            else {
                if ($location.path().indexOf(taskId) === -1) {
                    showTaskReminderToast(taskId, task.from.name);
                    document.addEventListener("deviceready", function () {
                        $cordovaVibration.vibrate(300);
                    }, false);
                }
            }
        }

        var showNewCommentToast = function (taskId, name) {

            /*var NewCommentToast = $mdToast.build({
                hideDelay: 2500,
                position: 'top',
                template: '<md-toast class="md-capsule" id="message-toast" md-swipe-left="$root.hideToast(\'message-toast\')" md-swipe-right="$root.hideToast(\'message-toast\')">' +
                             '<div layout="row" class="md-toast-content message-toast" dir="rtl" ng-click="$root.redirectToTaskPage(\'' + taskId + '\')"> ' +
                                '<span flex="66" layout-padding>' +
                                    'תגובה חדשה מ' + name +
                                    '<br/>הקש/י כדי לראות את התגובה' +
                                '</span>' +
                                '<span layout="row" flex="33" layout-align="center center">' +
                                    '<ng-md-icon icon="new_releases" size="48" style="fill:rgb(3, 87, 95)"></ng-md-icon>' +
                                '</span>' +
                             '</div>' +
                          '</md-toast>'
            });
            $mdToast.show(NewCommentToast);*/

            $toast.showActionToast("התקבלה תגובה חדשה", "הצג", 3000).then(function (response) {
                if (response === 'ok') {
                    $location.path('/task/' + taskId);
                }
            });
        };

        var showTaskReminderToast = function (taskId, name) {

            var TaskReminderToast = $mdToast.build({
                hideDelay: 2500,
                position: 'top',
                template: '<md-toast class="md-capsule" id="message-toast" md-swipe-left="$root.hideToast(\'message-toast\')" md-swipe-right="$root.hideToast(\'message-toast\')">' +
                             '<div layout="row" class="md-toast-content message-toast" dir="rtl" ng-click="$root.redirectToTaskPage(\'' + taskId + '\')"> ' +
                                '<span flex="66" layout-padding>' +
                                    name + ' שלח לך תזכורת לביצוע משימה ' +
                                    '<br/>הקש/י כדי לעבור למשימה' +
                                '</span>' +
                                '<span layout="row" flex="33" layout-align="center center">' +
                                    '<ng-md-icon icon="notifications" size="48" style="fill:rgb(3, 87, 95)"></ng-md-icon>' +
                                '</span>' +
                             '</div>' +
                          '</md-toast>'
            });
            $mdToast.show(TaskReminderToast);
        };

        var showNewTaskToast = function (taskId, name) {

            document.addEventListener("deviceready", function () {
                $cordovaVibration.vibrate(300);
            }, false);

            /*var NewCommentToast = $mdToast.build({
                hideDelay: 2500,
                position: 'top',
                template: '<md-toast class="md-capsule" id="message-toast" md-swipe-left="$root.hideToast(\'message-toast\')" md-swipe-right="$root.hideToast(\'message-toast\')">' +
                             '<div layout="row" class="md-toast-content message-toast" dir="rtl" ng-click="$root.redirectToTaskPage(\'' + taskId + '\')"> ' +
                                '<span flex="66" layout-padding>' +
                                    'משימה חדשה מ' + name +
                                    '<br/>הקש/י כדי לראות את המשימה' +
                                '</span>' +
                                '<span layout="row" flex="33" layout-align="center center">' +
                                    '<ng-md-icon icon="new_releases" size="48" style="fill:rgb(3, 87, 95)"></ng-md-icon>' +
                                '</span>' +
                             '</div>' +
                          '</md-toast>'
            });
            $mdToast.show(NewCommentToast);*/

            $toast.showActionToast("התקבלה משימה חדשה", "הצג", 3000).then(function (response) {
                if (response === 'ok') {
                    $location.path('/task/' + taskId);
                }
            });
        };

        var handleErrorOcurred = function (event, e) {
            $log.error('errorOcurred: ' + event, e);
        };

        var clearAllNotifications = function () {
            self.push.clearAllNotifications(function () {
            }, function (error) {
                $log.error("error while trying to clear All Notifications", error);
            });
        }

        /* ---- App State ----- */

        document.addEventListener("deviceready", function () {
            document.addEventListener('pause', onPause.bind(this), false);
            document.addEventListener('resume', onResume.bind(this), false);
        }, false);

        function onPause() {
            self.appState = 'background';
        };

        function onResume() {
            self.appState = 'foreground';
        };

        var sendSmS = function (to, message) {
            var verificationMessage = 'קוד הזיהוי שלך הוא ' + message;
            //CONFIGURATION
            var options = {
                replaceLineBreaks: false, // true to replace \n by a new line, false by default
                android: {
                    //intent: 'INTENT'  // send SMS with the native android SMS messaging
                    intent: '' // send SMS without open any other app
                }
            };

            document.addEventListener("deviceready", function () {
                $cordovaSms
                  .send(to, verificationMessage, options)
                  .then(function () {
                      //showToast("SMS was sent");
                  }, function (error) {
                      //showToast("SMS wasent sent...");
                  });
            }, false);
        };

        /* ------ update app ---- */
        
        var promptForAppUpdate = function () {
            $mdDialog.show(
                  $mdDialog.confirm()
                    .parent(angular.element(document.querySelector('#CliqaAlertContainer')))
                    .clickOutsideToClose(true)
                    .title('קיימת גירסה חדשה של האפליקציה בחנות')
                    .textContent('כדי להינות מהאפליקציה כנס עכשיו לחנות ועדכן אותה לגירסה החדשה')
                    .ariaLabel('Alert Dialog Demo')
                    .ok('עדכן עכשיו')
                    .cancel('לא תודה')
                ).then(function (version) {
                    cordovaPlugins.navigateToAppStore();
                });
        }

        /* ------- test push registration ------ */
        var testPushRegistration = function (usersIds) {
            // this function gets ids of users and call the server to push fake notification to those users
            return DAL.testPushRegistration(usersIds);
        }

        var service = {
            registerForPushNotifications: registerForPushNotifications,
            initializePushV5: initializePushV5,
            onNotificationReceived: onNotificationReceived,
            startListening: startListening,
            clearAllNotifications: clearAllNotifications,
            testPushRegistration: testPushRegistration 
        };

        return service;
    }
})();

