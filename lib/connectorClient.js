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

const Utils = require('./utils.js');
const Options = require('./optionsParser.js').ConnectorOptions;
let options = new Options();
if (typeof window === 'undefined') {
    options.ParseArguments();
    Utils.SetUpClientLogging(options.logLib);
}

const CoreClient = require('./coreClient.js').CoreClient;
if (typeof window === 'undefined') {
    CoreClient.logStats = options.logStats;
}

const container = require('rhea');

/**
 * Dict for results
 */
const results = {
    'connections': {'open': 0, 'error': 0},
    'senders': {'open': 0, 'error': 0},
    'receivers': {'open': 0, 'error': 0},
    'sent': 0,
    'received': 0
};

/**
 * @class Connector
 * Represet client that makes couple of connections, sessions, sender links and receiver links
 */
const Connector = function() {
    this.containers = [];
    this.connections = [];
    this.senders = [];
    this.receivers = [];
    this.address = '';
};

/**
 * Close all connection, sessions, senders and receiver
 * @method CloseObjects
 * @memberof Connector
 * @param {Object} connector
 * @static
 */
Connector.CloseObjects = function(connector) {
    for (let i = 0; i < options.count; i++) {
        if(options.objCtrl.indexOf('R') > -1)
            connector.receivers[i] && connector.receivers[i].detach();
        if(options.objCtrl.indexOf('S') > -1)
            connector.senders[i] && connector.senders[i].detach();
        if(options.objCtrl.indexOf('C') > -1)
            connector.connections[i] && connector.connections[i].close();
    }
};


/**
 * print results
 * @method PrintOutput
 * @memberof Connector
 * @static
 */
Connector.PrintOutput = function() {
    console.log(JSON.stringify(results));
};

/**
 * run method of connector
 * @method RunConnector
 * @param {Object} opts
 * @memberof Connector
 */
Connector.prototype.Run = function(opts) {
    if(opts !== undefined && Array.isArray(opts)) {
        options.ParseArguments(opts);
    }else if(opts !== undefined && typeof opts === 'object') {
        options = opts;
    }

    // if running in browser setup websocket auto.
    if(typeof window !== 'undefined') {
        options.websocket = true;
    }

    this.address = options.address ? options.address : 'test_connection';

    //create connections and open
    for(let i = 0; i < options.count; i++) {
        try{
            this.containers[i] = container.create_container({id: container.generate_uuid()});

            this.containers[i].on('connection_open', function() {
                results.connections.open += 1;
            });

            this.containers[i].on('connection_error', function() {
                results.connections.error += 1;
            });

            this.containers[i].on('receiver_open', function() {
                results.receivers.open += 1;
            });

            this.containers[i].on('sender_open', function() {
                results.senders.open += 1;
            });

            if (options.objCtrl && options.objCtrl.indexOf('S') && options.senderCount > 0) {
                this.containers[i].on('sendable', function(context) {
                    const count = 1;
                    let sent = 0;
                    while(sent < count && context.sender.sendable()) {
                        context.sender.send({body: 'test message ' + sent});
                        sent++;
                        results.sent++;
                    }
                });
            }

            if (options.objCtrl && options.objCtrl.indexOf('R') && options.receiverCount > 0) {
                this.containers[i].on('message', function() {
                    results.received++;
                });
            }

            let connectionParams;
            if(options.websocket) {
                connectionParams = CoreClient.BuildWebSocketConnectionDict(this.containers[i].websocket_connect(CoreClient.GetWebSocketObject()), options);
            }else {
                connectionParams = CoreClient.BuildAmqpConnectionOptionsDict(options);
            }

            this.connections[i] = this.containers[i].connect(connectionParams);
        }catch(err) {
            results.connections.error += 1;
            console.error(err);
        }
    }


    //create sender
    if(options.objCtrl && options.objCtrl.indexOf('S') > -1) {
        for (let i = 0; i < options.count; i++) {
            for (let j = 0; j < options.senderCount; j++) {
                try{
                    this.senders[j] = this.connections[i].open_sender(options.address);
                }catch(err) {
                    results.senders.error += 1;
                    console.error(err);
                }
            }
        }
    }

    //create receiver
    if(options.objCtrl && options.objCtrl.indexOf('R') > -1) {
        for (let i = 0; i < options.count; i++) {
            for (let j = 0; j < options.receiverCount; j++) {
                try{
                    this.receivers[j] = this.connections[i].open_receiver(options.address);
                }catch(err) {
                    results.receivers.error += 1;
                    console.error(err);
                }
            }
        }
    }

    //set timeout for end connections
    setTimeout(function(connector) {
        Connector.CloseObjects(connector);
        Connector.PrintOutput();
    }, options.timeout,
    this);
};

//////////////////////////////////////////////////////////////////////////////////

/**
 * @module Connector
 * @description Connecto class
 */

/** Connector class */
exports.Connector = Connector;
