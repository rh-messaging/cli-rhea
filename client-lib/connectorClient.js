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

var Utils = require('./utils.js');
var Options = require('./optionsParser.js').ConnectorOptions;
var options = new Options();
if (typeof window === 'undefined') {
    options.ParseArguments();
    Utils.SetUpClientLogging(options.logLib);
}

var CoreClient = require('./coreClient.js').CoreClient;
if (typeof window === 'undefined') {
    CoreClient.logStats = options.logStats;
}

var container = require('rhea');

/**
 * Dict for results
 */
var results = {
    'connections': {'open': 0, 'error': 0},
    'sessions': {'open': 0, 'error' : 0},
    'senders': {'open': 0, 'error': 0},
    'receivers': {'open': 0, 'error': 0},
};

/**
 * @class Connector
 * Represet client that makes couple of connections, sessions, sender links and receiver links
 */
var Connector = function() {
    this.containers = [];
    this.connections = [];
    this.sessions = [];
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
    for (var i = 0; i < options.count; i++) {
        if(options.objCtrl.indexOf('R') > -1)
            connector.receivers[i] && connector.receivers[i].detach();
        if(options.objCtrl.indexOf('S') > -1)
            connector.senders[i] && connector.senders[i].detach();
        if(options.objCtrl.indexOf('CE') > -1)
            connector.sessions[i] && connector.sessions[i].close();
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
    for(var i = 0; i < options.count; i++) {
        try{
            this.containers[i] = container.create_container();

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

            var connectionParams;
            if(options.websocket) {
                connectionParams = CoreClient.BuildWebSocketConnectionDict(this.containers[i].websocket_connect(CoreClient.GetWebSocketObject()), options);
            }else {
                connectionParams = CoreClient.BuildConnectionOptionsDict(options);
            }

            this.connections[i] = this.containers[i].connect(connectionParams);
        }catch(err) {
            results.connections.error += 1;
        }
    }

    //check and create sessions receivers senders
    if(options.objCtrl && options.objCtrl.indexOf('ESR') > -1) {
        //create and open sessions
        for(i = 0; i < options.count; i++) {
            try{
                this.sessions[i] = this.connections[i].create_session();
                this.sessions[i].begin();
                results.sessions.open += 1;
            }catch(err) {
                results.sessions.error += 1;
            }

            //create sender
            if(options.objCtrl && options.objCtrl.indexOf('S') > -1) {
                try{
                    this.senders[i] = this.sessions[i].attach_sender(this.address);
                }catch(err) {
                    results.senders.error += 1;
                }
            }

            //create receiver
            if(options.objCtrl && options.objCtrl.indexOf('R') > -1) {
                try{
                    this.receivers[i] = this.sessions[i].attach_receiver(this.address);
                }catch(err) {
                    results.receivers.error += 1;
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
