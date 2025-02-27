﻿(function () {
    'use strict';

    angular
        .module('app.widgets')
        .controller('landingPageCtrl', landingPageCtrl);

    landingPageCtrl.$inject = ['$scope', 'datacontext', 'logger', 'pushNotifications',
        'device', 'DAL', '$location', '$timeout', '$q', 'contactsSync',
        '$interval'
    ];

    function landingPageCtrl($scope, datacontext, logger, pushNotifications,
        device, DAL, $location, $timeout, $q, contactsSync,
        $interval) {
        var vm = this;
        vm.isInLanding = true;

        vm.screenHeight = window.innerHeight;

        var login = function () {

            // register for push notifications
            if (device.isMobileDevice()) {
                document.addEventListener("deviceready", function () {


                    pushNotifications.startListening();
                    pushNotifications.onNotificationReceived();
                    
                    pushNotifications.testPushRegistration([vm.user._id])
                        .then(function (response) {
                                if (response.data.status !== 'ok') {
                                    registerForPushNotification();
                                }
                            },
                            function (error) {
                                logger.error("Error while try to test user for push notification", error);
                            });

                    device.getAppVersion().then(function (version) {
                        if (version !== vm.user.versionInstalled) {
                            DAL.updateUserDetails(vm.user._id, 'versionInstalled', version);
                            vm.user.versionInstalled = version;
                            datacontext.saveUserToLocalStorage(vm.user);
                            /*vm.loadingMode = 'syncing';
                            contactsSync.syncPhoneContactsWithServer().then(function () {
                                vm.loadingMode = 'loading';
                                datacontext.deleteTaskListFromLocalStorage();
                                datacontext.reloadAllTasks().then(function () {
                                    //$location.path('/tasksList');
                                });
                            }, function () {
                                datacontext.reloadAllTasks();
                                //$location.path('/tasksList');
                            });*/
                        } else {
                            $timeout(function () {
                                datacontext.reloadAllTasks(false);
                            }, 0);
                            //$location.path('/tasksList');
                        }
                    });
                }, false);
            } else {
                $timeout(function () {
                    datacontext.reloadAllTasks();
                }, 0);
                //$location.path('/tasksList');
            }

            logger.info("user is now connected", vm.user);
        };


        var registerForPushNotification = function () {
            registerUserForPushService().then(function (registrationId) {

                var fieldToUpdate = '';

                if (vm.user.device.platform === 'iOS') {
                    vm.user.ApnRegistrationId = registrationId;
                    fieldToUpdate = 'ApnRegistrationId';
                }
                if (vm.user.device.platform === 'Android') {
                    vm.user.GcmRegistrationId = registrationId;
                    fieldToUpdate = 'GcmRegistrationId';
                }

                DAL.updateUserDetails(vm.user._id, fieldToUpdate, registrationId);
            });
        }

        var registerUserForPushService = function () {
            var deferred = $q.defer();

            pushNotifications.initializePushV5().then(function () {
                pushNotifications.registerForPushNotifications().then(function (registrationId) {
                    deferred.resolve(registrationId);
                });
            }, function (error) {
                logger.error("error while trying to register user to app", error);
                deferred.reject();
            });

            return deferred.promise;
        };

        var setApplicationDirectory = function () {

            var deferred = $q.defer();

            if (device.isMobileDevice()) {
                document.addEventListener("deviceready", function () {

                    var deviceDetailes = datacontext.getDeviceDetailes();
                    var appDirectory = cordova.file.applicationDirectory;

                    if (angular.equals({}, deviceDetailes)) {
                        datacontext.setDeviceDetailes(deviceDetailes, appDirectory);
                    }

                    // set applicationDirectory               
                    if (deviceDetailes.applicationDirectory !== appDirectory) {
                        datacontext.setDeviceDetailes(deviceDetailes, appDirectory);
                    }
                    deferred.resolve();
                });
            } else {
                deferred.resolve();
            }

            return deferred.promise;
        };

        var checkIfUserSignIn = function () {

            var user = datacontext.getUserFromLocalStorage();
            var savedLoginStep = datacontext.getLoginStepToLocalStorage();

            if (user !== undefined && !savedLoginStep) {

                $timeout(function () {
                    setApplicationDirectory();
                }, 0);

                vm.user = user;

                $timeout(function () {
                    login();
                }, 10);


                vm.body.removeClass('background-white');
                $location.path('/tasksList');
                $interval.cancel(vm.interval);
            } else {

                $timeout(function () {
                    setApplicationDirectory().then(function () {
                        $location.path('/logIn');
                        $interval.cancel(vm.interval);
                        vm.body.removeClass('background-white');
                    });
                }, 0);
            }
        };

        $timeout(function () {
            checkIfUserSignIn();
            if (!device.isMobileDevice() && window.location.hostname.indexOf("algotodo.herokuapp.com") !== -1) {
                window.location = "http://app.asiti.net";
            }
        }, 0);

        var text = document.getElementById('mo-text');
        vm.body = angular.element(document.getElementsByTagName('body'));

        var burst = new mojs.Burst({
            radius: {
                40: 150
            },
            count: 20,
            fill: 'yellow',
            children: {
                fill: ['orange', 'deeppink', 'yellow', 'cyan', 'Aquamarine', 'DarkOrchid'],
                pathScale: 'rand(.5, 3)',
                radius: 100,
                swirlSize: 'rand(1, 10)',
                direction: [1, -1],
                duration: 1000,
                delay: 250,
                easing: 'quad.out',
                isSwirl: true
            }
        });

        vm.body.addClass('background-white');

        //burst.play();



        vm.interval = $interval(function () {
            burst.play();
        }, 5000);

    }
})();