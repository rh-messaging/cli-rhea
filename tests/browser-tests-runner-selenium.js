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

var BrowserTestsRunner = function() {};

BrowserTestsRunner.prototype.constructor = BrowserTestsRunner;

BrowserTestsRunner.prototype.Run = function() {
    var timeout = args['timeout'] ? args['timeout'] * args['count'] : 3000;

    selenium.start({}, function(err, cp) {
        if (err) {
            console.log(err);
            return;
        }

        var htmlPath = __dirname + '/client.html';
        var seleniumOpts = { desiredCapabilities: { browserName: 'chrome' } };
        var driver = webdriverio.remote(seleniumOpts);

        driver.on('error', function(e) {
            console.log(e.body.value.class);
            console.log(e.body.value.message);
        });

        driver
            .init()
            .url('file://' + htmlPath)
            .execute(function(clientType ,args) {
                var client = require("cli-rhea");
                var cli = client.SenderClient;
                if(clientType === 'receiver') {
                    cli = client.ReceiverClient;
                }else if (clientType === 'connector') {
                    cli = client.ConnectorClient;
                }
                cli.Run(args);
            }, args['client-type'], options)
            .pause(1000)
            .getText('div').then(function(res) {
                res.forEach(function(elem) {
                    console.log(elem);
                });
            })
            .pause(timeout)
            .end();

        setTimeout(function(cp) {
            cp.kill();
        }, timeout + 5000, cp);
    });
};

exports.BrowserTestsRunner = BrowserTestsRunner;
