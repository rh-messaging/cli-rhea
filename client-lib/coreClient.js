/*
 * Copyright 2015 Red Hat Inc.
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

//static class Core client contains help method for clients
var CoreClient = function () {};

CoreClient.timeout;
CoreClient.timeoutFunction;
CoreClient.reconnectCount = 0;
CoreClient.arrHosts = [];
CoreClient.arrPorts = [];
CoreClient.logstats;

CoreClient.Close = function (context, closeSleep, isListener) {
    if(closeSleep) {
        CoreClient.TimeoutClose(context, closeSleep);
    }else{
        if (CoreClient.logStats === 'endpoints') {
            Utils.PrintStatistic(context);
        }

        if(isListener) {
            process.exit(Utils.ReturnCodes.OK);
        }
        context.sender && context.sender.detach();
        context.receiver && context.receiver.detach();
        context.connection.close();
    }
};

CoreClient.Reply = function (context) {
    var sender = context.connection.open_sender({target: {address: context.message['reply_to']},
        autosettle: false});
    sender.send(context.message);
    sender.set_drained(true);
};

CoreClient.TimeoutClose = function (context, timeout, isListener) {
    if(timeout > 0) {
        CoreClient.timeout = timeout;
        CoreClient.timeoutFunction = setTimeout(function(context, isListener) {
            CoreClient.Close(context, null, isListener);
        }, timeout,
        context, isListener);
    }
};

CoreClient.OnDisconnect = function (context) {
    CoreClient.CancelTimeout();
    CoreClient.reconnectCount++;
    if(CoreClient.reconnectCount === context.connection.options.reconnect_limit) {
        process.exit(Utils.ReturnCodes.Error);
    }
};

CoreClient.OnConnError = function (context) {
    if(context.connection.get_error().condition !== 'amqp:connection:forced') {
        Utils.PrintError(JSON.stringify(context.connection.get_error()));
        process.exit(Utils.ReturnCodes.Error);
    }
};

CoreClient.OnRejected = function (context) {
    Utils.PrintError(context.delivery.remote_state.error.value);
    context.connection.close();
    process.exit(Utils.ReturnCodes.Error);
};

CoreClient.OnReleased = function (context) {
    Utils.PrintError('Message released');
    context.connection.close();
    process.exit(Utils.ReturnCodes.Error);
};

CoreClient.OnProtocolError = function (context) {
    Utils.PrintError(JSON.stringify(context));
    process.exit(Utils.ReturnCodes.Error);
};

CoreClient.RegistryUnhandledError = function() {
    process.on('uncaughtException', function(err) {
        // handle the error safely
        Utils.PrintError(err);
        process.exit(Utils.ReturnCodes.Error);
    });
};

CoreClient.CancelTimeout = function () {
    clearTimeout(CoreClient.timeoutFunction);
};

CoreClient.ResetTimeout = function (context, isListener) {
    CoreClient.CancelTimeout();
    CoreClient.TimeoutClose(context, CoreClient.timeout, isListener);
};

CoreClient.SetUpSSL = function (options) {
    var sslDict = {};

    sslDict['transport'] = 'tls';
    if (options.sslPrivateKey) sslDict['key'] = fs.readFileSync(options.sslPrivateKey);
    if (options.sslCertificate) sslDict['cert'] = fs.readFileSync(options.sslCertificate);
    if (options.sslTrustStore) sslDict['ca'] = fs.readFileSync(options.sslTrustStore);
    if (options.sslPassword) sslDict['passphrase'] = options.sslPassword;

    return sslDict;
};

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
        Utils.PrintError('conn-urls has wrong format, try help fo show how use it');
        process.exit(Utils.ReturnCodes.Error_ARGS);
    }
};

//connection options
CoreClient.BuildConnectionOptionsDict = function(options) {
    var connectionDict = {};

    //destination setting
    if(options.connUrls) {
        //failover
        connectionDict['connection_details'] = CoreClient.BuildFailoverHandler(options);
    }else{
        //standart
        connectionDict['host'] = options.url;
        connectionDict['port'] = options.port;
    }

    //sasl
    connectionDict['username'] = options.username;
    connectionDict['password'] = options.password;

    //reconnect
    if(options.reconnect) {
        if (options.reconnectLimit) {
            connectionDict['reconnect_limit'] = options.reconnectLimit;
        }
        if(options.reconnectInterval) {
            connectionDict['initial_reconnect_delay'] = options.reconnectInterval;
            connectionDict['max_reconnect_delay'] = options.reconnectInterval;
        }
    }else if (!options.reconnect) {
        connectionDict['reconnect'] = false;
    }
    //max frame size
    connectionDict['max_frame_size'] = options.frameSize;
    //heartbeat
    if (options.heartbeat) {
        connectionDict['idle_time_out'] = options.heartbeat;
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

CoreClient.BuildReceiverOptionsDict = function(options) {
    var receiverOptions = {};
    var source = {};
    source['address'] = options.address;                                                            //address of queue
    source['distribution_mode'] = options.recvBrowse ? 'copy' : '';                                 //message browse options
    source['durable'] = options.durable;                                                            //durable subscription
    source['filter'] = (options.msgSelector) ? filters.selector(options.msgSelector) : '';          //message selector options

    if (options.action !== 'acknowledge') {
        receiverOptions['autoaccept'] = false;
    }
    receiverOptions['credit_window'] = (options.recvBrowse || options.count === 0) ? 0 : undefined;  //disable automatic credit windows for recv browse or read all messages from queue
    receiverOptions['source'] = source;

    return receiverOptions;
};

CoreClient.BuildSenderOptionsDict = function(options) {
    var senderOptions = {};
    var target = {};
    target['address'] = options.address;
    target['durable'] = options.durable;

    if (options.linkAtMostOnce) {
        senderOptions['snd_settle_mode'] = 1;
    } else if (options.linkAtLeastOnce) {
        senderOptions['snd_settle_mode'] = 0;
    }
    senderOptions['target'] = target;
    senderOptions['autosettle'] = !options.autoSettleOff;

    return senderOptions;
};

//===========================================================================
exports.CoreClient = CoreClient;
