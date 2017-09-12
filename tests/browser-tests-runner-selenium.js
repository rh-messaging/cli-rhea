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
var args = require('yargs')
    .usage('$0 [args]')
    .options({
        'client-type':  { default: 'SenderClient', describe: 'type of client', type: 'string', choices: ['SenderClient', 'ReceiverClient', 'ConnectorClient']},
    })
    .help('help')
    .argv;

var BrowserTestsRunner = function() {};

BrowserTestsRunner.prototype.constructor = BrowserTestsRunner;

BrowserTestsRunner.prototype.Run = function() {
    var options = { };
    selenium.start(options, function(err, cp) {
        if (err) {
            console.log(err);
            return;
        }

        var htmlPath = __dirname + '/client.html';
        var options = { desiredCapabilities: { browserName: 'chrome' } };
        var driver = webdriverio.remote(options);

        driver.on('error', function(e) {
            console.log(e.body.value.class);
            console.log(e.body.value.message);
        });

        driver
            .init()
            .url('file://' + htmlPath)
            .execute(function(args) {
                var client = require("cli-rhea");
                try{
                    client.SenderClient.Run(['--count','0']); //hack for error for first parse with yargs TODO: replace yargs with minimist
                }catch(err) {}
                client.SenderClient.Run(args);
            }, process.argv.slice(4))
            .pause(5000)
            .end();

        setTimeout(function(cp) {
            cp.kill();
        }, 8000, cp);
    });
};

exports.BrowserTestsRunner = BrowserTestsRunner;
