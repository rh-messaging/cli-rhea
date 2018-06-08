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

var assert = require('assert');
var child_process = require('child_process');
var assert = require('chai').assert;
var path = require('path');

function Expectations(done) {
    this.expectations = [];
    this.size = 0;
    this.done = done;
}

Expectations.prototype.complete = function(i) {
    this.expectations[i] = true;
    if (this.expectations.every(function(o) { return o; })) {
        this.done();
    }
};

Expectations.prototype.next = function() {
    var i = this.size++;
    this.expectations[i] = false;
    var obj = this;
    return function () {
        obj.complete(i);
    };
};

function Program(name, args) {
    this.name = name;
    this.args = args || [];
    this.expected_output = undefined;
    this.actual_output = '';
    this.stopped = false;
    this.restart = false;
    this.verifier = undefined;
}

Program.prototype.produces = function(text) {
    this.expected_output = text;
    return this;
};

Program.prototype.run = function(done, expectCode) {
    var prog = this;
    var name = this.name;
    var p = child_process.fork(path.resolve(__dirname, this.name), this.args, {silent:true});
    p.stdout.on('data', function (data) {
        prog.actual_output += data;
    });
    p.stderr.on('data', function (data) {
        console.log('stderr[' + name + ']: ' + data);
    });
    p.on('exit', function (code, signal) {
        prog.process = undefined;
        if (prog.restart && !prog.stopped) {
            prog.run(done, expectCode);
        } else {
            if (signal === null && !process.version.match(/v0\.10\.\d+/)) {
                assert.equal(code, expectCode);
            }
            if (prog.verifier) {
                prog.verifier(prog.actual_output);
            } else if (prog.expected_output) {
                assert.equal(prog.actual_output, prog.expected_output);
            }
            done();
        }
    });
    this.process = p;
};

Program.prototype.stop = function() {
    this.stopped = true;
    this.kill();
};

Program.prototype.kill = function() {
    if (this.process) {
        this.process.kill();
    }
};

function example(example, args) {
    return new Program(example, args);
}

function verify(done, programs, expectCode) {
    var expectations = new Expectations(done);
    programs.map(function (p) {
        var completion_fn = expectations.next();
        return function () {
            p.run(completion_fn, expectCode);
        };
    } ).forEach(function (f) { f(); } );
}

describe('Running bin cmd client', function() {
    this.slow(600);

    it('Test sender wrong argument', function(done) {
        verify(done, [example('../bin/sender-client.js', ['--foo'])], 1);
    });
    it('Test Receiver wrong argument', function(done) {
        verify(done, [example('../bin/receiver-client.js', ['--foo'])], 1);
    });
    it('Test Connector wrong argument', function(done) {
        verify(done, [example('../bin/connector-client.js', ['--foo'])], 1);
    });
    it('Sender client help', function(done) {
        verify(done, [example('../bin/sender-client.js', ['--help'])], 0);
    });
    it('Receiver client help', function(done) {
        verify(done, [example('../bin/receiver-client.js', ['--help'])], 0);
    });
    it('Connector client help', function(done) {
        verify(done, [example('../bin/connector-client.js', ['--help'])], 0);
    });
    it('Send empty messages', function(done) {
        verify(done, [example('../bin/sender-client.js', ['--count', 10])], 0);
    });
    it('Receive three messages', function(done) {
        verify(done, [example('../bin/receiver-client.js', ['--count', 3])], 0);
    });
    it('Browse rest messages', function(done) {
        verify(done, [example('../bin/receiver-client.js', ['--count', 0, '--recv-browse'])], 0);
    });
    it('Reject rest messages', function(done) {
        verify(done, [example('../bin/receiver-client.js', ['--count', 0, '--action', 'reject'])], 0);
    });
    it('Receive rest messages', function(done) {
        verify(done, [example('../bin/receiver-client.js', ['--count', 0])], 0);
    });
    it('Websocket sent messages', function(done) {
        verify(done, [example('../bin/sender-client.js', ['--count', 10, '--msg-content', 'msg no.%d', '--conn-web-socket'])], 0);
    });
    it('Websocket receive messages', function(done) {
        verify(done, [example('../bin/receiver-client.js', ['--count', 10, '--conn-web-socket'])], 0);
    });
    it('Send messages sasl', function(done) {
        verify(done, [example('../bin/sender-client.js', ['--broker', 'admin:admin@127.0.0.1:5672', '--count', 10, '--msg-content', 'msg no.%d'])], 0);
    });
    it('P2P test', function(done) {
        verify(done, [example('../bin/receiver-client.js', ['--count', 10, '--recv-listen', '--recv-listen-port', '8888'])], 0);
        verify(done, [example('../bin/sender-client.js', ['--broker', '127.0.0.1:8888', '--count', 10, '--msg-content', 'msg no.%d'])], 0);
    });
    it('Connector client stay connected', function(done) {
        verify(done, [example('../bin/connector-client.js', ['--broker', 'admin:admin@127.0.0.1:5672', '--count', 5, '--timeout', 1, '--obj-ctrl', 'CESR'])], 0);
    });
    it('Connector client stay connected without sender/receiver', function(done) {
        verify(done, [example('../bin/connector-client.js', ['--broker', 'admin:admin@127.0.0.1:5672', '--count', 5, '--timeout', 1, '--obj-ctrl', 'CESR', '--sender-count', '0', '--receiver-count', '0'])], 0);
    });
    it('Send map messages', function(done) {
        verify(done, [example('../bin/sender-client.js', ['--count', 10, '--msg-content-map-item', 'a~true', '--msg-content-map-item', 'b~false', '--msg-content-map-item', 'c~30'])], 0);
    });
    it('Send list messages', function(done) {
        verify(done, [example('../bin/sender-client.js', ['--count', 10, '--msg-content-list-item', 'true', '--msg-content-list-item', 'string', '--msg-content-list-item', 15])], 0);
    });
    it('Message selector', function(done) {
        verify(done, [example('../bin/sender-client.js', ['--address', 'selector_queue', '--count', 5, '--msg-content', 'msg no.%d', '--msg-property', 'colour~red'])], 0);
        verify(done, [example('../bin/receiver-client.js', ['--count', 5, '--address', 'selector_queue', '--msg-selector', 'colour=red'])], 0);
    });
    it('Send message with disabled reconnect', function(done) {
        verify(done, [example('../bin/sender-client.js', ['--address', 'disabled_reconnect_queue', '--count', 1, '--msg-content', 'msg no.%d', '--conn-reconnect', false])], 0);
    });
    it('Send message with disabled reconnect over websocket', function(done) {
        verify(done, [example('../bin/sender-client.js', ['--address', 'disabled_reconnect_queue', '--count', 1, '--conn-web-socket', true, '--conn-reconnect', false])], 0);
    });
    it('Send message with failover enabled', function(done) {
        verify(done, [example('../bin/sender-client.js', ['--address', 'falover_queue', '--count', 5, '--conn-urls', '[\"localhost:61616\", \"localhost:5673\"]', '--conn-reconnect-limit', 10])], 0);
    });
    it('Send message with reconnect enabled', function(done) {
        verify(done, [example('../bin/sender-client.js', ['--address', 'reconnect_queue', '--count', 5, '--conn-reconnect', true, '--conn-reconnect-limit', 10, '--conn-reconnect-interval', '1'])], 0);
    });
    it('Send message with reconnect enabled over websocket', function(done) {
        verify(done, [example('../bin/sender-client.js', ['--address', 'reconnect_queue', '--count', 5, '--conn-reconnect', '--conn-web-socket', '--conn-reconnect-limit', 10, '--conn-reconnect-interval', '1', '--conn-heartbeat', '1'])], 0);
    });
    it('Send message with reconnect enabled over websocket with specified protocol', function(done) {
        verify(done, [example('../bin/sender-client.js', ['--address', 'reconnect_queue', '--count', 5, '--conn-reconnect', '--conn-web-socket', '--conn-reconnect-limit', 10, '--conn-reconnect-interval', '1', '--conn-heartbeat', '1', '--conn-ws-protocols', 'binary', 'amqp'])], 0);
    });
    it('Send with timeout', function(done) {
        verify(done, [example('../bin/sender-client.js', ['--address', 'timeout_queue', '--count', 5, '--timeout', 1])], 0);
    });
    it('Receive with timeout (mesages received)', function(done) {
        verify(done, [example('../bin/receiver-client.js', ['--address', 'timeout_queue', '--count', 5, '--timeout', 1])], 0);
    });
    it('Receive with timeout (without messages)', function(done) {
        verify(done, [example('../bin/receiver-client.js', ['--address', 'timeout_queue', '--count', 5, '--timeout', 1])], 0);
    });
    it('Send empty messages (duration enabled)', function(done) {
        verify(done, [example('../bin/sender-client.js', ['--duration', 1, '--address', 'duration_queue'])], 0);
    });
    it('Receive messages (duration enabled)', function(done) {
        verify(done, [example('../bin/receiver-client.js', ['--duration', 1, '--address', 'duration_queue'])], 0);
    });
    it('Test message logging frames', function(done) {
        verify(done, [example('../bin/sender-client.js', ['--address', 'log_queue', '--count', 1, '--msg-content', 'msg no.%d', '--log-lib', 'TRANSPORT_FRM', '--link-at-least-once'])], 0);
    });
    it('Test message logging raw', function(done) {
        verify(done, [example('../bin/sender-client.js', ['--address', 'log_queue', '--count', 1, '--msg-content', 'msg no.%d', '--log-lib', 'TRANSPORT_RAW'])], 0);
    });
    it('Test message logging events', function(done) {
        verify(done, [example('../bin/sender-client.js', ['--address', 'log_queue', '--count', 1, '--msg-content', 'msg no.%d', '--log-lib', 'TRANSPORT_DRV'])], 0);
    });
});
