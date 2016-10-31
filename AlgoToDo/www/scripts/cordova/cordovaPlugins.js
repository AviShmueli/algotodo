﻿(function () {
    'use strict';

    angular
        .module('TaskManeger.cordova')
        .service('cordovaPlugins', cordovaPlugins);

    cordovaPlugins.$inject = ['$rootScope', 'datacontext', 'appConfig', '$mdDialog',
                              '$cordovaLocalNotification', '$cordovaSms', '$window',
                              '$cordovaDialogs', '$cordovaToast', '$cordovaPushV5',
                              '$cordovaBadge', '$cordovaDevice', '$log'];

    function cordovaPlugins($rootScope, datacontext, appConfig, $mdDialog,
                            $cordovaLocalNotification, $cordovaSms, $window,
                            $cordovaDialogs, $cordovaToast, $cordovaPushV5,
                            $cordovaBadge, $cordovaDevice, $log) {

        var self = this;

        var isMobileDevice = function () {
            return document.URL.indexOf( 'http://' ) === -1 && document.URL.indexOf( 'https://' ) === -1;

        };

        var setLocalNotification = function () {
            if (!isMobileDevice()) return;
            var alarmTime = new Date();
            alarmTime.setMinutes(alarmTime.getSeconds() + 1);

            document.addEventListener("deviceready", function () {
                $cordovaLocalNotification.add({
                    id: "1234",
                    date: alarmTime,
                    message: "יש לך משימה אחת חדשה",
                    title: "משימה חדשה",
                    autoCancel: true,
                    sound: 'res://platform_default',
                    icon: 'res://icon'
                }).then(function () {
                    //logger.info("The notification has been set");
                });
            }, false);


        };

        var beep = function () {
            // beep 3 times
            document.addEventListener("deviceready", function () {
                $cordovaDialogs.beep(3);
            }, false);
        };

        var showToast = function (info, duration) {
            document.addEventListener("deviceready", function () {
                $cordovaToast.show(info, duration ? duration : 'short', 'center')
                .then(function (success) { });
            }, false);

        };

        var initializePushV5 = function () {
            var options = {
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

            return $cordovaPushV5.initialize(options);

        };

        var registerForPushNotifications = function () {
            // start listening for new notifications
            $cordovaPushV5.onNotification();

            // start listening for errors
            $cordovaPushV5.onError();

            // register to get registrationId
            return $cordovaPushV5.register();
        }

        var clearAppBadge = function () {
            document.addEventListener("deviceready", function () {
                $cordovaBadge.clear().then(function () {
                    // You have permission, badge cleared.
                }, function (err) {
                    // You do not have permission.
                });
            }, false);

        };

        var setBadge = function (num) {
            document.addEventListener("deviceready", function () {
                $cordovaBadge.set(num).then(function () {
                    //showToast(" You have permission, badge set.");
                }, function (err) {
                    //showToast(" You do not have permission");
                });
            }, false);
        }

        var getDeviceDetails = function () {
            return $cordovaDevice.getDevice();
        };

        // triggered every time notification received
        $rootScope.$on('$cordovaPushV5:notificationReceived', function (event, data) {
            $log.info('notificationReceived: ' + event, data);
            //$cordovaDialogs.alert("הודעת מערכת notificationReceived", data, 'OK');
            //showToast(data);
            if (event.event === registered) {
                showToast(data);
            }

            // data.message,
            // data.title,
            // data.count,
            // data.sound,
            // data.image,
            // data.additionalData
        });

        // triggered every time error occurs
        $rootScope.$on('$cordovaPushV5:errorOcurred', function (event, e) {
            $log.info('errorOcurred: ' + event, e);
            $cordovaDialogs.alert("שגיאה", e, 'OK');
            showToast("error");
            // e.message
        });

        /*document.addEventListener("resume", function () {
            clearAppBadge();
        }, false);*/

        var sendSmS = function (to) {
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
                  .send('+972542240608', 'אבי התותח', options)
                  .then(function () {
                      showToast("SMS was sent");
                  }, function (error) {
                      showToast("SMS wasent sent...");
                  });
            }, false);
        };

        var service = {
            setLocalNotification: setLocalNotification,
            beep: beep,
            showToast: showToast,
            registerForPushNotifications: registerForPushNotifications,
            sendSmS: sendSmS,
            clearAppBadge: clearAppBadge,
            getDeviceDetails: getDeviceDetails,
            setBadge: setBadge,
            isMobileDevice: isMobileDevice,
            initializePushV5: initializePushV5
        };

        return service;
    }
})();



/*
// use to schedule notifications to the user about tasks that not been get atention yet
$cordovaLocalNotification.schedule({
    id: 1,
    title: 'Title here',
    text: 'Text here',
    data: {
        customProperty: 'custom value'
    }
}).then(function (result) {
    // ...
});*/
