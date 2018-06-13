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

const CoreClient = require('./coreClient.js').CoreClient;
const Options = require('./optionsParser.js').ConnectorOptions;

/**
 * @class Connector
 * Represet client that makes couple of connections, sessions, sender links and receiver links
 */
class Connector extends CoreClient {
    constructor() {
        super();
        this.containers = [];
        this.connections = [];
        this.senders = [];
        this.receivers = [];
        this.address = '';
        this.results = {
            'connections': {'open': 0, 'error': 0},
            'senders': {'open': 0, 'error': 0},
            'receivers': {'open': 0, 'error': 0},
            'sent': 0,
            'received': 0
        };
    }

    /**
     * Close all connection, sessions, senders and receiver
     * @method CloseObjects
     * @memberof Connector
     * @param {Object} connector
     */
    closeObjects(connector) {
        for (let i = 0; i < connector.options.count; i++) {
            if(connector.options.objCtrl.indexOf('R') > -1)
                connector.receivers[i] && connector.receivers[i].detach();
            if(connector.options.objCtrl.indexOf('S') > -1)
                connector.senders[i] && connector.senders[i].detach();
            if(connector.options.objCtrl.indexOf('C') > -1)
                connector.connections[i] && connector.connections[i].close();
        }
    }

    /**
     * print results
     * @method PrintOutput
     * @memberof Connector
     */
    printOutput() {
        console.log(JSON.stringify(this.results));
    }

    /**
     * run method of connector
     * @method RunConnector
     * @param {Object} opts
     * @memberof Connector
     */
    run(opts) {
        if(opts === undefined) {
            this.options = new Options();
            this.options.parseArguments();
        }else if(opts !== undefined && Array.isArray(opts)) {
            this.options.ParseArguments(opts);
        }else if(opts !== undefined && typeof opts === 'object') {
            this.options = opts;
        }

        // if running in browser setup websocket auto.
        if(typeof window !== 'undefined') {
            this.options.websocket = true;
        }

        this.address = this.options.address ? this.options.address : 'test_connection';

        //create connections and open
        for(let i = 0; i < this.options.count; i++) {
            try{
                const self = this;
                this.containers[i] = this.container.create_container({id: this.container.generate_uuid()});

                this.containers[i].on('connection_open', function() {
                    self.results.connections.open += 1;
                });

                this.containers[i].on('connection_error', function() {
                    self.results.connections.error += 1;
                });

                this.containers[i].on('receiver_open', function() {
                    self.results.receivers.open += 1;
                });

                this.containers[i].on('sender_open', function() {
                    self.results.senders.open += 1;
                });

                if (this.options.objCtrl && this.options.objCtrl.indexOf('S') && this.options.senderCount > 0) {
                    this.containers[i].on('sendable', function(context) {
                        const count = 1;
                        let sent = 0;
                        while(sent < count && context.sender.sendable()) {
                            context.sender.send({body: 'test message ' + sent});
                            sent++;
                            self.results.sent++;
                        }
                    });
                }

                if (this.options.objCtrl && this.options.objCtrl.indexOf('R') && this.options.receiverCount > 0) {
                    this.containers[i].on('message', function() {
                        self.results.received++;
                    });
                }

                let connectionParams;
                if(this.options.websocket) {
                    connectionParams = this.buildWebSocketConnectionDict(this.containers[i].websocket_connect(this.getWebSocketObject()));
                }else {
                    connectionParams = this.buildAmqpConnectionOptionsDict();
                }

                this.connections[i] = this.containers[i].connect(connectionParams);
            }catch(err) {
                this.results.connections.error += 1;
                console.error(err);
            }
        }


        //create sender
        if(this.options.objCtrl && this.options.objCtrl.indexOf('S') > -1) {
            for (let i = 0; i < this.options.count; i++) {
                for (let j = 0; j < this.options.senderCount; j++) {
                    try{
                        this.senders[j] = this.connections[i].open_sender(this.options.address);
                    }catch(err) {
                        this.results.senders.error += 1;
                        console.error(err);
                    }
                }
            }
        }

        //create receiver
        if(this.options.objCtrl && this.options.objCtrl.indexOf('R') > -1) {
            for (let i = 0; i < this.options.count; i++) {
                for (let j = 0; j < this.options.receiverCount; j++) {
                    try{
                        this.receivers[j] = this.connections[i].open_receiver(this.options.address);
                    }catch(err) {
                        this.results.receivers.error += 1;
                        console.error(err);
                    }
                }
            }
        }

        //set timeout for end connections
        setTimeout(function(connector) {
            connector.closeObjects(connector);
            connector.printOutput();
        }, this.options.timeout,
        this);
    }
}

//////////////////////////////////////////////////////////////////////////////////

/**
 * @module Connector
 * @description Connecto class
 */

/** Connector class */
exports.Connector = Connector;
