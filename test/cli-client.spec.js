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

Program.prototype.run = function(done) {
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
            prog.run(done);
        } else {
            if (signal === null && !process.version.match(/v0\.10\.\d+/)) {
                assert.equal(code, 0);
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

function verify(done, programs) {
    var expectations = new Expectations(done);
    programs.map(function (p) {
        var completion_fn = expectations.next();
        return function () {
            p.run(completion_fn);
        };
    } ).forEach(function (f) { f(); } );
}

function while_running(done, background) {
    var expectations = new Expectations(done);
    var running = background.map(function (p) {
        var fn = expectations.next();
        return {
            start: function () {
                p.run(fn);
            },
            stop: function () {
                p.stop();
            }
        };
    } );
    running.forEach(function (o) { o.start(); } );
    var foreground_done = function () {
        running.forEach(function (o) { o.stop(); } );
    };
    return {
        'verify' : function (programs) {
            var f = function () {
                verify(foreground_done, programs);
            };
            setTimeout(f, 1000);
        }
    };
}


function lines(a) {
    return a.join('\n') + '\n';
}

function times(count, f) {
    var a = [count];
    for (var i = 0; i < count; i++) a[i] = f(i);
    return lines(a);
}

function chain() {
    var args = Array.prototype.slice.apply(arguments);
    return args.reduceRight(function(a, b) { return b.bind(null, a); });
}

describe('Running bin cmd client', function() {
    this.slow(600);

    it('Sender client help', function(done) {
        verify(done, [example('../bin/sender-client.js', ['--help'])]);
    });
    it('Receiver client help', function(done) {
        verify(done, [example('../bin/receiver-client.js', ['--help'])]);
    });
    it('Connector client help', function(done) {
        verify(done, [example('../bin/connector-client.js', ['--help'])]);
    });
    it('Send bare messages', function(done) {
        verify(done, [example('../bin/sender-client.js', ['--count', 10, '--msg-content', 'msg no.%d', '--log-msgs', 'interop'])]);
    });
    it('Receive three messages', function(done) {
        verify(done, [example('../bin/receiver-client.js', ['--count', 3, '--log-msgs', 'interop'])]);
    });
    it('Browse rest messages', function(done) {
        verify(done, [example('../bin/receiver-client.js', ['--count', 0, '--recv-browse', '--log-msgs', 'interop'])]);
    });
    it('Receive rest messages', function(done) {
        verify(done, [example('../bin/receiver-client.js', ['--count', 0, '--log-msgs', 'interop'])]);
    });
    it('Websocket sent messages', function(done) {
        verify(done, [example('../bin/sender-client.js', ['--count', 10, '--msg-content', 'msg no.%d', '--log-msgs', 'interop', '--conn-web-socket'])]);
    });
    it('Websocket receive messages', function(done) {
        verify(done, [example('../bin/receiver-client.js', ['--count', 10, '--log-msgs', 'interop', '--conn-web-socket'])]);
    });
    it('Send messages sasl', function(done) {
        verify(done, [example('../bin/sender-client.js', ['--broker', 'admin:admin@127.0.0.1:5672', '--count', 10, '--msg-content', 'msg no.%d', '--log-msgs', 'interop'])]);
    });
    it('P2P test', function(done) {
        verify(done, [example('../bin/receiver-client.js', ['--count', 10, '--log-msgs', 'interop', '--recv-listen', 'true', '--recv-listen-port', '8888'])]);
        verify(done, [example('../bin/sender-client.js', ['--broker', '127.0.0.1:8888', '--count', 10, '--msg-content', 'msg no.%d', '--log-msgs', 'interop'])]);
    });
    it('Connector client stay connected', function(done) {
        verify(done, [example('../bin/connector-client.js', ['--broker', 'admin:admin@127.0.0.1:5672', '--count', 5, '--timeout', 1, '--obj-ctrl', 'CESR'])]);
    });
    it('Send map messages', function(done) {
        verify(done, [example('../bin/sender-client.js', ['--count', 10, '--msg-content-map-item', 'a~true', '--msg-content-map-item', 'b~false', '--msg-content-map-item', 'c~30','--log-msgs', 'interop'])]);
    });
    it('Send list messages', function(done) {
        verify(done, [example('../bin/sender-client.js', ['--count', 10, '--msg-content-list-item', 'true', '--msg-content-list-item', 'string', '--msg-content-list-item', 15,'--log-msgs', 'interop'])]);
    });
    it('Message selector', function(done) {
        verify(done, [example('../bin/sender-client.js', ['--address', 'selector_queue', '--count', 5, '--msg-content', 'msg no.%d', '--log-msgs', 'interop', '--msg-property', 'colour~red'])]);
        verify(done, [example('../bin/receiver-client.js', ['--count', 5, '--log-msgs', 'interop', '--address', 'selector_queue', '--msg-selector', 'colour=red'])]);
    });
    it('Test message logging frames', function(done) {
        verify(done, [example('../bin/sender-client.js', ['--address', 'log_queue', '--count', 1, '--msg-content', 'msg no.%d', '--log-lib', 'TRANSPORT_FRM'])]);
    });
    it('Test message logging raw', function(done) {
        verify(done, [example('../bin/sender-client.js', ['--address', 'log_queue', '--count', 1, '--msg-content', 'msg no.%d', '--log-lib', 'TRANSPORT_RAW'])]);
    });
    it('Test message logging events', function(done) {
        verify(done, [example('../bin/sender-client.js', ['--address', 'log_queue', '--count', 1, '--msg-content', 'msg no.%d', '--log-lib', 'TRANSPORT_DRV'])]);
    });
    it('Send message with disabled reconnect', function(done) {
        verify(done, [example('../bin/sender-client.js', ['--address', 'disabled_reconnect_queue', '--count', 1, '--msg-content', 'msg no.%d', '--conn-reconnect', false])]);
    });
});
