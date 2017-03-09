﻿(function () {
    'use strict';

    angular
        .module('app.widgets')
        .directive('tmSidenav', sidenav);

    function sidenav() {
        var directive = {
            controller: sidenavController,
            controllerAs: 'vm',
            templateUrl: 'scripts/widgets/sidenav.html',
            restrict: 'A',
            scope: {
                'user': '=',
                'imagesPath': '=',
                'logOff': '&',
                'cancelAllNotifications': '&'
            }
        };

        function sidenavController($scope, device, cordovaPlugins, $location, $mdSidenav, $mdDialog, DAL, logger) {
            var vm = this;

            vm.imagesPath = $scope.imagesPath;
            vm.user = $scope.user;
            vm.logOff = $scope.logOff;
            vm.cancelAllNotifications = $scope.cancelAllNotifications;
            vm.appVersion = '';
            vm.showLogoffButton = false;
            
            document.addEventListener("deviceready", function () {
                device.getAppVersion().then(function (version) {
                    vm.appVersion = version;
                });
            }, false);

            vm.goToManagementPage = function () {
                //window.location = '#/management'
                $location.path('/management');
            }

            vm.goToRepeatTasksPage = function () {
                $location.path('/repeatsTasks');
            }

            vm.shareApp = function (platform) {
                cordovaPlugins.shareApp(platform);
            }

            vm.rateApp = function () {
                cordovaPlugins.rateApp();
            }

            vm.closeSidenav = function () {
                $mdSidenav("left").close();
            }

            vm.showAddCliqaDialog = function () {
                var confirm = $mdDialog.prompt()
                  .parent(angular.element(document.querySelector('#VerificationCodePromptContainer')))
                  .title('קליקה חדשה')
                  .placeholder('איך תרצה לקרוא לקליקה?')
                  .ariaLabel('cliqaName')
                  .ok('הוסף');

                $mdDialog.show(confirm).then(function (cliqaName) {
                    if (cliqaName !== undefined && cliqaName !== '') {                  
                        DAL.createNewCliqa(cliqaName).then(function () {
                            cordovaPlugins.showToast("הקליקה נוצרה בהצלחה!", 2000);
                        }, function (error) {
                            logger.error("error while trying to add new cliqa", error);
                        });
                    }
                });
            }

            vm.admin = [{
                link: '',
                title: 'רוקן משימות',
                icon: 'delete'
            }, {
                link: 'vm.showListBottomSheet($event)',
                title: 'הגדרות',
                icon: 'settings'
            }];
        }

        return directive;
    }
})();