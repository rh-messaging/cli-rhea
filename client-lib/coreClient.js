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

var filters = require('rhea/lib/filter.js');
var Utils = require('./utils.js');
var fs = require('fs');
var newFilters = require('rhea').filter;

if(!filters) {
    filters = newFilters;
}

/**
 * @namespace CoreClient
 * @description Support methods for all client types
 */
var CoreClient = function () {};

CoreClient.timeout;
CoreClient.timeoutFunction;
CoreClient.reconnectCount = 0;
CoreClient.arrHosts = [];
CoreClient.arrPorts = [];
CoreClient.logstats;

/**
 * @method CoreClient.Close
 * @static
 * @description Close connection, sender link or receiver link, or schedule closing
 * @param {object} context - event context
 * @param {integer} closeSleep - time in ms for scheduling closing, undefined = close now
 * @param {boolean} isListener - true if container running as listener
 */
CoreClient.Close = function (context, closeSleep, isListener) {
    if(closeSleep) {
        CoreClient.TimeoutClose(context, closeSleep, isListener);
    }else{
        if (CoreClient.logStats === 'endpoints') {
            Utils.PrintStatistic(context);
        }

        clearTimeout(context.container.timer_task);
        context.sender && context.sender.detach();
        context.receiver && context.receiver.detach();
        context.connection.close();

        if(isListener) {
            return;
        }
    }
};

/**
 * @method CoreClient.Reply
 * @static
 * @description Reply to address in reply-to
 * @param {object} context - event context
 */
CoreClient.Reply = function (context) {
    var sender = context.connection.open_sender({target: {address: context.message.reply_to},
        autosettle: false});
    sender.send(context.message);
    sender.set_drained(true);
};

/**
 * @method CoreClient.TimeoutClose
 * @static
 * @description Schedule closing connection, sender link or receiver link
 * @param {object} context - event context
 * @param {integer} timeout - time in ms for scheduling closing
 * @param {boolean} isListener - true if container running as listener
 */
CoreClient.TimeoutClose = function (context, timeout, isListener) {
    if(timeout > 0) {
        CoreClient.timeout = timeout;
        CoreClient.timeoutFunction = setTimeout(function(context, isListener) {
            CoreClient.Close(context, null, isListener);
        }, timeout,
        context, isListener);
    }
};

/**
 * @method CoreClient.OnDisconnect
 * @static
 * @description handler for Disconnect event
 * @param {object} context - event context
 */
CoreClient.OnDisconnect = function (context) {
    CoreClient.CancelTimeout();
    CoreClient.reconnectCount++;
    if(CoreClient.reconnectCount === context.connection.options.reconnect_limit) {
        throw new Utils.ErrorHandler('Disconnect');
    }
};

/**
 * @method CoreClient.OnConnError
 * @static
 * @description handler for ConnectionError event
 * @param {object} context - event context
 */
CoreClient.OnConnError = function (context) {
    if(context.connection.get_error().condition !== 'amqp:connection:forced') {
        throw new Utils.ErrorHandler(JSON.stringify(context.connection.get_error));
    }
};

/**
 * @method CoreClient.OnRejected
 * @static
 * @description handler for Rejected event
 * @param {object} context - event context
 */
CoreClient.OnRejected = function (context) {
    context.connection.close();
    throw new Utils.ErrorHandler(context.delivery.remote_state.error.value);
};

/**
 * @method CoreClient.OnReleased
 * @static
 * @description handler for Released event
 * @param {object} context - event context
 */
CoreClient.OnReleased = function (context) {
    context.connection.close();
    throw new Utils.ErrorHandler('Message released');
};

/**
 * @method CoreClient.OnProtocolError
 * @static
 * @description handler for ProtocolError event
 * @param {object} context - event context
 */
CoreClient.OnProtocolError = function (context) {
    throw new Utils.ErrorHandler(JSON.stringify(context));
};

/**
 * @method CoreClient.CancelTimeout
 * @static
 * @description cancel scheduled closing
 */
CoreClient.CancelTimeout = function () {
    clearTimeout(CoreClient.timeoutFunction);
};

/**
 * @method CoreClient.ResetTimeout
 * @static
 * @description reschedule closing of client
 * @param {object} context - event context
 * @param {boolean} isListener - true if container is in listener mode
 */
CoreClient.ResetTimeout = function (context, isListener) {
    CoreClient.CancelTimeout();
    CoreClient.TimeoutClose(context, CoreClient.timeout, isListener);
};

/**
 * @method CoreClient.SetUpSSL
 * @static
 * @description set up sll conection options
 * @param {object} options - dict with client options
 */
CoreClient.SetUpSSL = function (options) {
    var sslDict = {};

    sslDict.transport = 'tls';
    if (options.sslPrivateKey) sslDict.key = fs.readFileSync(options.sslPrivateKey);
    if (options.sslCertificate) sslDict.cert = fs.readFileSync(options.sslCertificate);
    if (options.sslTrustStore) sslDict.ca = fs.readFileSync(options.sslTrustStore);
    if (options.sslPassword) sslDict.passphrase = options.sslPassword;

    return sslDict;
};

/**
 * @method CoreClient.BuildFailoverHandler
 * @static
 * @description set up failover connection options
 * @param {object} options - dict with client options
 */
CoreClient.BuildFailoverHandler = function(options) {
    CoreClient.arrHosts.push(options.url);
    CoreClient.arrPorts.push(options.port);

    try{
        var connUrls = JSON.parse(options.connUrls);
        for(var i = 0; i < connUrls.length; i++) {
            var splitUrl = connUrls[i].split(':');
            CoreClient.arrHosts.push(splitUrl[0]);
            CoreClient.arrPorts.push(splitUrl[1]);
        }

        return function() {
            return {host: CoreClient.arrHosts[CoreClient.reconnectCount % CoreClient.arrHosts.length],
                port: CoreClient.arrPorts[CoreClient.reconnectCount % CoreClient.arrPorts.length]};
        };
    }catch(err) {
        throw new Utils.ErrorHandler('conn-urls has wrong format, try help fo show how use it');
    }
};

/**
 * @method CoreClient.BuildConnectionOptionsDict
 * @static
 * @description set up connection options
 * @param {object} options - dict with client options
 */
CoreClient.BuildConnectionOptionsDict = function(options) {
    var connectionDict = {};

    //destination setting
    if(options.connUrls) {
        //failover
        connectionDict.connection_details = CoreClient.BuildFailoverHandler(options);
    }else{
        //standart
        connectionDict.host = options.url;
        connectionDict.port = options.port;
    }

    //sasl
    connectionDict.username = options.username;
    connectionDict.password = options.password;

    //reconnect
    if(options.reconnect) {
        if (options.reconnectLimit) {
            connectionDict.reconnect_limit = options.reconnectLimit;
        }
        if(options.reconnectInterval) {
            connectionDict.initial_reconnect_delay = options.reconnectInterval;
            connectionDict.max_reconnect_delay = options.reconnectInterval;
        }
    }else if (!options.reconnect) {
        connectionDict.reconnect = false;
    }
    //max frame size
    connectionDict.max_frame_size = options.frameSize;
    //heartbeat
    if (options.heartbeat) {
        connectionDict.idle_time_out = options.heartbeat;
    }

    //set unauthorized tls
    if (options.connSsl) {
        connectionDict.transport = 'tls';
        connectionDict.rejectUnauthorized = false;
    }

    //ssl setting
    if (options.sslCertificate || options.sslTrustStore) {
        var sslOptions = CoreClient.SetUpSSL(options);
        for (var opt in sslOptions) {
            connectionDict[opt] = sslOptions[opt];
        }
    }
    return connectionDict;
};

/**
 * @method CoreClient.BuildReceiverOptionsDict
 * @static
 * @description set up receiver link options
 * @param {object} options - dict with client options
 */
CoreClient.BuildReceiverOptionsDict = function(options) {
    var receiverOptions = {};
    var source = {};
    source.address = options.address; //address of queue
    source.distribution_mode = options.recvBrowse ? 'copy' : ''; //message browse options
    source.durable = options.durable; //durable subscription
    source.filter = (options.msgSelector) ? filters.selector(options.msgSelector) : ''; //message selector options

    if (options.action !== 'acknowledge') {
        receiverOptions.autoaccept = false;
    }
    receiverOptions.credit_window = (options.recvBrowse || options.count === 0 || options.duration > 0) ? 0 : undefined; //disable automatic credit windows for recv browse or read all messages from queue
    receiverOptions.source = source;

    return receiverOptions;
};

/**
 * @method CoreClient.BuildSenderOptionsDict
 * @static
 * @description set up sender link options
 * @param {object} options - dict with client options
 */
CoreClient.BuildSenderOptionsDict = function(options) {
    var senderOptions = {};
    var target = {};
    target.address = options.address;
    target.durable = options.durable;

    if (options.linkAtMostOnce) {
        senderOptions.snd_settle_mode = 1;
    } else if (options.linkAtLeastOnce) {
        senderOptions.snd_settle_mode = 0;
    }
    senderOptions.target = target;
    senderOptions.autosettle = !options.autoSettleOff;

    return senderOptions;
};

/**
 * @method CoreClient.BuildWebSocketConnString
 * @static
 * @description create websocker connection string
 * @param {object} options - dict with client options
 */
CoreClient.BuildWebSocketConnString = function(options) {
    var connTemplate = 'ws://%BROKER:%PORT';
    return connTemplate.replace('%BROKER', options.url).replace('%PORT', options.port);
};

/**
 * @method CoreClient.GetWebSocketObject
 * @static
 * @description return websocket obejct for connection for browser of nodejs
 */
CoreClient.GetWebSocketObject = function () {
    if(typeof window === 'undefined') {
        /* eslint-disable global-require */
        return require('ws');
    }
    return window.WebSocket;
};

/**
 * @method CoreClient.BuildWebSocketConnectionDict
 * @static
 * @description set up websocker connection options
 * @param {object} ws - instance of websocket
 * @param {object} options - dict with client options
 */
CoreClient.BuildWebSocketConnectionDict = function(ws, options) {
    var connectionDict = {};

    //destination setting
    connectionDict.connection_details = ws(CoreClient.BuildWebSocketConnString(options), ['binary', 'AMQPWSB10', 'amqp']);

    //sasl
    connectionDict.username = options.username;
    connectionDict.password = options.password;

    //reconnect
    if(options.reconnect) {
        if (options.reconnectLimit) {
            connectionDict.reconnect_limit = options.reconnectLimit;
        }
        if(options.reconnectInterval) {
            connectionDict.initial_reconnect_delay = options.reconnectInterval;
            connectionDict.max_reconnect_delay = options.reconnectInterval;
        }
    }else if (!options.reconnect) {
        connectionDict.reconnect = false;
    }
    //max frame size
    connectionDict.max_frame_size = options.frameSize;
    //heartbeat
    if (options.heartbeat) {
        connectionDict.idle_time_out = options.heartbeat;
    }

    return connectionDict;
};

//===========================================================================

/**
 * @module CoreClient
 * @description CoreClient namespace with client functions
 */

/** CoreClient namespace */
exports.CoreClient = CoreClient;
