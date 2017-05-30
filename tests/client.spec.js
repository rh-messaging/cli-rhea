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

var client = require('../client-lib/client.js');
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
    describe('"SenderClient.WebSocketRun"', function() {
        it('should export a function', function() {
            expect(client.SenderClient.WebSocketRun).to.be.a('function');
        });
    });
    describe('"ReceiverClient.Run"', function() {
        it('should export a function', function() {
            expect(client.ReceiverClient.Run).to.be.a('function');
        });
    });
    describe('"ReceiverClient.WebSocketRun"', function() {
        it('should export a function', function() {
            expect(client.ReceiverClient.WebSocketRun).to.be.a('function');
        });
    });
    describe('"ConnectorClient.Run"', function() {
        it('should export a function', function() {
            expect(client.ConnectorClient.Run).to.be.a('function');
        });
    });
    describe('"ConnectorClient.WebSocketRun"', function() {
        it('should export a function', function() {
            expect(client.ConnectorClient.WebSocketRun).to.be.a('function');
        });
    });
});
