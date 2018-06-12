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

var client = require('../lib/client.js');
var expect = require('chai').expect;

describe('Client import', function() {
    describe('"SenderClient"', function() {
        it('should export a object', function() {
            expect(client.SenderClient).to.be.a('Object');
        });
    });
    describe('"ReceiverClient"', function() {
        it('should export a object', function() {
            expect(client.ReceiverClient).to.be.a('Object');
        });
    });
    describe('"ConnectorClient"', function() {
        it('should export a object', function() {
            expect(client.ConnectorClient).to.be.a('Object');
        });
    });
    describe('"Options"', function() {
        it('should export a object', function() {
            expect(client.Options).to.be.a('Object');
        });
    });
    describe('"SenderClient.Run"', function() {
        it('should export a function', function() {
            expect(client.SenderClient.Run).to.be.a('function');
        });
    });
    describe('"ReceiverClient.Run"', function() {
        it('should export a function', function() {
            expect(client.ReceiverClient.Run).to.be.a('function');
        });
    });
    describe('"ConnectorClient.Run"', function() {
        it('should export a function', function() {
            expect(client.ConnectorClient.Run).to.be.a('function');
        });
    });
    describe('"Using node mode for sending/receiving"', function() {
        it('Send by imported client', function(done) {
            var cliRhea = require('../lib/client.js');
            cliRhea.Options.msgContent = 'simple text message';
            cliRhea.Options.broker('localhost');
            cliRhea.Options.msgGroupId = 'group-1';
            cliRhea.Options.address = 'test_queue';
            cliRhea.Options.msgPriority = 2;
            cliRhea.Options.msgReplyTo = 'reply_to_queue';
            cliRhea.Options.msgId = 'message id';
            cliRhea.Options.count = 1;
            cliRhea.Options.logMsgs = 'upstream';
            cliRhea.SenderClient.Run(client.Options);
            setTimeout(done, 1500);
        });
        it('Receive by imported client', function(done) {
            var cliRhea = require('../lib/client.js');
            cliRhea.Options.broker('admin:admin@localhost:5672');
            cliRhea.Options.address = 'test_queue';
            cliRhea.Options.logMsgs = 'interop';
            cliRhea.Options.count = 1;
            cliRhea.Options.logStats = 'endpoints';
            cliRhea.ReceiverClient.Run(client.Options);
            setTimeout(done, 1500);
        });
        it('Reply to', function(done) {
            var cliRhea = require('../lib/client.js');
            cliRhea.Options.broker('admin:admin@localhost:5672');
            cliRhea.Options.address = 'test_reply_to_queue';
            cliRhea.Options.logMsgs = 'dict';
            cliRhea.Options.logStats = undefined;
            cliRhea.Options.count = 2;
            cliRhea.Options.msgReplyTo = 'reply_to_queue';
            cliRhea.SenderClient.Run(client.Options);
            cliRhea.Options.processReplyTo = true;
            cliRhea.ReceiverClient.Run(client.Options);
            setTimeout(done, 1900);
        });
    });
});
