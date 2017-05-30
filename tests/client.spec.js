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

describe('Client import', () => {
    describe('"SenderClient"', () => {
        it('should export a object', () => {
            expect(client.SenderClient).to.be.a('Object');
        });
    });
    describe('"ReceiverClient"', () => {
        it('should export a object', () => {
            expect(client.ReceiverClient).to.be.a('Object');
        });
    });
    describe('"ReceiverClient"', () => {
        it('should export a object', () => {
            expect(client.ReceiverClient).to.be.a('Object');
        });
    });
    describe('"ConnectorClient"', () => {
        it('should export a object', () => {
            expect(client.ConnectorClient).to.be.a('Object');
        });
    });
    describe('"Options"', () => {
        it('should export a object', () => {
            expect(client.Options).to.be.a('Object');
        });
    });
    describe('"SenderClient.Run"', () => {
        it('should export a function', () => {
            expect(client.SenderClient.Run).to.be.a('function');
        });
    });
    describe('"SenderClient.WebSocketRun"', () => {
        it('should export a function', () => {
            expect(client.SenderClient.WebSocketRun).to.be.a('function');
        });
    });
    describe('"ReceiverClient.Run"', () => {
        it('should export a function', () => {
            expect(client.ReceiverClient.Run).to.be.a('function');
        });
    });
    describe('"ReceiverClient.WebSocketRun"', () => {
        it('should export a function', () => {
            expect(client.ReceiverClient.WebSocketRun).to.be.a('function');
        });
    });
    describe('"ConnectorClient.Run"', () => {
        it('should export a function', () => {
            expect(client.ConnectorClient.Run).to.be.a('function');
        });
    });
    describe('"ConnectorClient.WebSocketRun"', () => {
        it('should export a function', () => {
            expect(client.ConnectorClient.WebSocketRun).to.be.a('function');
        });
    });
});
