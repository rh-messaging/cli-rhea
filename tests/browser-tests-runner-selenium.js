#!/usr/bin/env node
/*
 * Copyright 2017 Red Hat Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var webdriverio = require('webdriverio');
var selenium = require('selenium-standalone');
var optionsParser = require('../client-lib/optionsParser.js');
var Utils = require('../client-lib/utils.js');
var driver = null;

var args = require('yargs')
    .usage('$0 [args]')
    .options({
        'client-type':  { default: 'sender', describe: 'type of client', type: 'string', choices: ['sender', 'receiver', 'connector']},
    })
    .help('help')
    .argv;

var options;
if(args['client-type'] === 'sender') {
    options = new optionsParser.SenderOptions();
}else if(args['client-type'] === 'receiver') {
    options = new optionsParser.ReceiverOptions();
}else if(args['client-type'] === 'connector') {
    options = new optionsParser.ConnectorOptions();
}
options.ParseArguments(process.argv.slice(4));

/**
* @function killSelenium
* @static
* @description help function for schedule kill selenium process
* @param {object} process - process of selenoium standalone
*/
function killSelenium(process) {
    setTimeout(function(process) {
        process.kill();
    }, 500, process);
}

/**
 * @class BrowserTestsRunner
 * @description Class represents executor for browser base client using selenium
 */
var BrowserTestsRunner = function() {};

BrowserTestsRunner.errorMessage = undefined;

BrowserTestsRunner.prototype.constructor = BrowserTestsRunner;

/**
* @method PrintResults
* @static
* @description print output of html page to console output
* @param {object} res - object for print
* @memberof BrowserTestsRunner
*/
BrowserTestsRunner.PrintResults = function(res) {
    if(res === undefined) return;
    if(typeof res === 'string') {
        console.log(res);
    }else{
        res.forEach(function(elem) {
            console.log(elem);
        });
    }
};

/**
* @method RunnerScript
* @static
* @description script for run client in browser
* @param {string} clientType - type of client
* @param {string} args - arguments for client
* @memberof BrowserTestsRunner
*/
BrowserTestsRunner.RunnerScript = function(clientType ,args) {
    var client = require("cli-rhea");
    var cli = client.SenderClient;
    if(clientType === 'receiver') {
        cli = client.ReceiverClient;
    }else if (clientType === 'connector') {
        cli = client.ConnectorClient;
    }
    cli.Run(args);
};

/**
* @method LogsHandler
* @static
* @description handler for browser console logs mesages
* @param {object} messages - array of messages
* @memberof BrowserTestsRunner
*/
BrowserTestsRunner.LogsHandler = function(messages) {
    if(messages.value.length > 0) {
        BrowserTestsRunner.errorMessage = messages.value[0].message;
    }
};

/**
* @function Run
* @public
* @description Run client browser executor
* @memberof BrowserTestsRunner
*/
BrowserTestsRunner.prototype.Run = function() {
    var timeout = 3000;

    selenium.start({}, function(err, cp) {
        if (err) {
            console.log(err);
            return;
        }

        var htmlPath = __dirname + '/client.html';
        var seleniumOpts = {
            desiredCapabilities: {
                browserName: 'chrome',
                chromeOptions: {
                    args: ['--headless'],
                },
                loggingPrefs: {
                    'client': 'ALL',
                    'driver': 'ALL',
                    'browser': 'ALL'
                }
            }
        };
        driver = webdriverio.remote(seleniumOpts);

        driver.on('error', function(e) {
            throw new Utils.ErrorHandler(e.body.value.message);
        });

        driver
            .init()
            .url('file://' + htmlPath)
            .execute(BrowserTestsRunner.RunnerScript, args['client-type'], options)
            .pause(timeout)
            .log('browser') //get all console lofs from browser
            .then(BrowserTestsRunner.LogsHandler)
            .elements('div') //check if webpage return any message
            .then(function(elements) {
                if (elements.value.length === 0) {
                    killSelenium(cp);
                    driver.end();
                }else {
                    driver
                        .getText('div').then(BrowserTestsRunner.PrintResults)
                        .call(
                            function() {
                                killSelenium(cp);
                            }
                        )
                        .end();
                }
            });
    });
};

process.on('exit', function () {
    if(BrowserTestsRunner.errorMessage !== undefined) {
        throw new Utils.ErrorHandler(BrowserTestsRunner.errorMessage);
    }
});
///////////////////////////////////////////////////////////////////////////////////
/**
 * @module BrowserTestsRunner
 * @description BrowserTestsRunner class
 */

/** BrowserTestsRunner class */
exports.BrowserTestsRunner = BrowserTestsRunner;
