﻿(function () {
    'use strict';

    angular
        .module('app.widgets')
        .controller('signUpCtrl', signUpCtrl);

    signUpCtrl.$inject = ['$scope', 'datacontext', 'logger', 'cordovaPlugins', '$q', 'pushNotifications',
        'device', '$mdDialog', 'DAL', '$location', 'contactsSync', '$timeout', '$interval', 'storage'
    ];

    function signUpCtrl($scope, datacontext, logger, cordovaPlugins, $q, pushNotifications,
        device, $mdDialog, DAL, $location, contactsSync, $timeout, $interval, storage) {

        angular.element(document.querySelectorAll('html')).addClass("hight-auto");
        angular.element(document.getElementsByTagName('body')).removeClass('background-white');
        
        var vm = this;
        vm.inProgress = false;
        vm.user = {};
        vm.AllCliqot = [];
        vm.selectedCliqa;
        vm.progress = 0;
        vm.imagesPath = device.getImagesPath();
        vm.womanAvatar = '/images/woman-' + Math.floor((Math.random() * 15) + 1) + '.svg';
        vm.manAvatar = '/images/man-' + Math.floor((Math.random() * 9) + 1) + '.svg';

        DAL.getAllCliqot().then(function (allCliqot) {
            vm.AllCliqot = allCliqot.data;
        });

        var user = datacontext.getUserFromLocalStorage();
        if (user !== undefined) {
            datacontext.reloadAllTasks();
            $location.path('/tasksList');
        }
        
        vm.signMeUp = function () {
            if (vm.inProgress === false) {
                vm.inProgress = true;

                vm.user.cliqot = vm.selectedCliqa || vm.AllCliqot[1] || {};
                vm.user.cliqot = [vm.user.cliqot];

                registerUser();
            }
        };

        var registerUser = function () {
            vm.user.phone = vm.userPhone;
            if (vm.user.sex === undefined) {
                if (vm.user.avatarUrl !== undefined) {
                    vm.user.sex = (vm.user.avatarUrl.indexOf('woman') === -1) ? 'man' : 'woman';
                } else {
                    vm.user.sex = 'man';
                    vm.user.avatarUrl = vm.manAvatar;
                }
            }
            if (vm.user.sex === 'man') {
                vm.user.avatarUrl = vm.manAvatar;
            }
            if (vm.user.sex === 'woman') {
                vm.user.avatarUrl = vm.womanAvatar;
            }

            document.addEventListener("deviceready", function () {

                vm.user.device = device.getDeviceDetails();
                datacontext.setDeviceDetailes(vm.user.device, cordova.file.applicationDirectory);
              
                    DAL.registerUser(vm.user).then(function (response) {

                        if (response.data.error) {
                            vm.inProgress = false;
                            showRegistrationFailedAlert('מספר הטלפון שהוזן רשום כבר לאפליקציה, נסה להיכנס שוב במסך הקודם.');
                        } else {
                            vm.user = response.data;
                            verifyUser();
                        }
                    }, function (error) {
                        vm.inProgress = false;
                        angular.element(document.getElementsByTagName('body')).removeClass('background-white');
                        logger.error("error while trying to register user to app: ", error.data || error);
                        showRegistrationFailedAlert();
                    });
                
            }, false);

        };

        var verifyUser = function () {
            // check here if reg-code recived by sms match reg-code in server
            showVerificationCodePrompt(vm.user._id).then(function (verificationCode) {

                DAL.checkIfVerificationCodeMatch(vm.user, verificationCode).then(function (result) {
                    if (result.data === 'ok') {

                        datacontext.saveUserToLocalStorage(vm.user);

                        $timeout(function(){
                            datacontext.saveLoginStepToLocalStorage(2); 
                            
                            $location.path('/logIn');
                        }, 500);
                        
                    } else {
                        showVerificationFailedAlert();
                        vm.inProgress = false;
                        angular.element(document.getElementsByTagName('body')).removeClass('background-white');
                    }
                }, function (error) {
                    vm.inProgress = false;
                    angular.element(document.getElementsByTagName('body')).removeClass('background-white');
                    logger.error("error while trying to check If VerificationCode Match", error);
                    showRegistrationFailedAlert();
                });
            }, function () {
                DAL.reSendVerificationCodeToUser(vm.user._id);
            });
        }

        vm.showCliqaAlert = function (ev) {
            $mdDialog.show(
                $mdDialog.alert()
                .parent(angular.element(document.querySelector('#CliqaAlertContainer')))
                .clickOutsideToClose(true)
                .title('קליקה')
                .textContent('קליקה היא קבוצת האנשים (הארגון) איתו אתה עובד ומקבל משימות.' + '\n' +
                    'בעתיד הקמת קליקות תהיה באופן חופשי ועצמאי,' + '\n' +
                    'כרגע חובה לבחור קליקה מתוך הרשימה.' + '\n\n' +
                    'אם אתה נסיין של המערכת אנא בחר "נסייני מערכת" מתוך הרשימה')
                .ariaLabel('Alert Dialog Demo')
                .ok('הבנתי!')
                .targetEvent(ev)
            );
        };

        vm.showTermsOfServiceAlert = function myfunction(ev) {
            $mdDialog.show(
                $mdDialog.alert()
                .parent(angular.element(document.querySelector('#TermsOfServiceAlertContainer')))
                .clickOutsideToClose(true)
                .title('תנאי השירות')
                .textContent('האפליקציה פועלת בתחום המשימות, במטרה לסייע לכל אחד לבצע את המשימות האישיות והחברתיות שלו.ניתן לנהל משימות אישיות, לשלוח לנמענים, לעקוב אחר ביצוע ולנהל שיחה על כל משימה ומשימה.האפליקציה מיועדת לאנשים פרטיים, חברות וארגונים, בתי ספר, משפחות וכל אחד שרוצה לבצע את המשימות שלו בצורה קלה ונוחה** האפליקציה נמצאת בגרסת אלפא. לא מיועדת עדיין לשימוש. בנוסף, בשלב הרצת האפליקציה כלל האפשרויות המוצעות באפליקציה הינם חינם לשימוש לאנשים פרטייים וכן לאירגונים, משתהפוך האפליקציה לרישמית ייתכן ואפשרויות מסוימות באפליקציה יהיו בתשלום .')
                .ariaLabel('TermsOfServiceAlert')
                .ok('סגור')
                .targetEvent(ev)
            );
        };

        var showVerificationCodePrompt = function (userId) {
            return $mdDialog.show({
                controller: 'verificationCodeCtrl',
                templateUrl: 'scripts/widgets/verificationCodeDialog.tmpl.html',
                parent: angular.element(document.querySelector('#VerificationCodePromptContainer')),
                clickOutsideToClose: false,
                locals: {
                    userId: userId
                }
            });
        };

        var showVerificationFailedAlert = function () {
            $mdDialog.show(
                $mdDialog.alert()
                .parent(angular.element(document.querySelector('#VerificationFailedAlertContainer')))
                .clickOutsideToClose(true)
                .title('שגיאה')
                .textContent('תהליך הזיהוי נכשל, הקוד שהוכנס לא תואם למספר הטלפון שהוקש, אנא נסה שנית.')
                .ariaLabel('Alert Dialog Demo')
                .ok('המשך')
            );
        };

        var showRegistrationFailedAlert = function (text) {
            $mdDialog.show(
                $mdDialog.alert()
                .parent(angular.element(document.querySelector('#RegistrationFailedAlertContainer')))
                .clickOutsideToClose(true)
                .title('שגיאה')
                .textContent(text || 'מצטערים!   תהליך ההרשמה נכשל , תנו לנו עוד הזדמנות ונסו שוב להירשם. אם הבעיה נמשכת נשמח אם תפנו אלינו במייל או בטלפון.')
                .ariaLabel('Alert Dialog Demo')
                .ok('המשך')
            );
        };

        vm.showMoreAvatars = function (ev) {
            $mdDialog.show({
                    controller: pickAvatarCtrl,
                    templateUrl: 'scripts/widgets/pickAvatarDialog.tmpl.html',
                    parent: angular.element(document.body),
                    targetEvent: ev,
                    clickOutsideToClose: true,
                    locals: {
                        imagesPath: vm.imagesPath
                    }
                })
                .then(function (answer) {
                    vm.user.avatarUrl = answer;
                }, function () {

                });

        };

        function pickAvatarCtrl($scope, $mdDialog, imagesPath) {
            $scope.imagesPath = imagesPath;
            $scope.manAvatars = [];
            for (var i = 1; i < 10; i++) {
                $scope.manAvatars.push('/images/man-' + i + '.svg');
            }

            $scope.womanAvatars = [];
            for (var j = 1; j < 16; j++) {
                $scope.womanAvatars.push('/images/woman-' + j + '.svg');
            }


            $scope.hide = function () {
                $mdDialog.hide();
            };

            $scope.cancel = function () {
                $mdDialog.cancel();
            };

            $scope.answer = function (answer) {
                $mdDialog.hide(answer);
            };
        }

        vm.exitApp = false;

        var backbuttonClick_allways_Callback = function (e) {

            if ($location.path() === '/signUp') {
                e.preventDefault();
                if (!vm.exitApp) {
                    vm.exitApp = true;
                    cordovaPlugins.showToast("הקש שוב ליציאה", 1000);
                    $timeout(function () {
                        vm.exitApp = false;
                    }, 1000);
                } else {
                    window.plugins.toast.hide();
                    navigator.app.exitApp();
                }
            }
        };

        document.addEventListener("deviceready", function () {
            document.addEventListener("backbutton", backbuttonClick_allways_Callback, false);
        }, false);
    }

})();