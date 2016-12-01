(function() {
    'use strict';

    angular.module('app', [
        /*
         * Order is not important. Angular makes a
         * pass to register all of the modules listed
         * and then when app.dashboard tries to use app.data,
         * it's components are available.
         */
        'ngMaterial',
        'ngMdIcons',
        'ngCookies',
        'ngStorage',
        'ngLodash',
        'ngCordova',
        'ngMessages',
        'ngAnimate',
        'angularMoment',
        'ngSanitize',
        'logglyLogger',
        'infomofo.angularMdPullToRefresh',
        'ngRoute',
        'cmanaha.angular-elasticsearch-logger',

        /*
         * Everybody has access to these.
         * We could place these under every feature area,
         * but this is easier to maintain.
         */
        'app.widgets',
        'app.core',
        'app.data',
        'app.logger',
        'app.cordova',
        'app.tasks'
        /*
         * Feature areas
         */

    ]);
})();