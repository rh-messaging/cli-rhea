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

const Utils = require('./utils.js').Utils;
const ErrorHandler = require('./utils.js').ErrorHandler;
const fs = require('fs');
const loggingOpt = require('./optionsParser.js').LoggingOpt;
if (typeof window === 'undefined') {
    Utils.setUpClientLogging(loggingOpt.logLib());
}
const filters = require('rhea').filter;
const rhea = require('rhea');

/**
 * @class CoreClient
 * @description Support methods for all client types
 */
class CoreClient {
    constructor() {
        this.container = rhea;
        this.server = null;
        this.timeout;
        this.timeoutFunction;
        this.reconnectCount = 0;
        this.logstats;
        this.options = {};
        this.endState = false;
    }

    /**
     * @method close
     * @description Close connection, sender link or receiver link, or schedule closing
     * @param {object} context - event context
     * @param {integer} closeSleep - time in ms for scheduling closing, undefined = close now
     */
    close(context, closeSleep) {
        this.endState = true;
        if(closeSleep) {
            this.timeoutClose(context, closeSleep);
        }else{
            if (CoreClient.logStats === 'endpoints') {
                Utils.PrintStatistic(context);
            }

            context && context.sender && context.sender.detach();
            context && context.receiver && context.receiver.detach();
            context && context.connection.close();

            if(this.server) {
                this.server.close();
            }
        }
    }

    /**
     * @method _reply
     * @description Reply to address in reply-to
     * @param {object} context - event context
     */
    reply(context) {
        const sender = context.connection.open_sender({target: {address: context.message.reply_to},
            autosettle: false});
        sender.send(context.message);
        sender.set_drained(true);
    }

    /**
     * @method CoreClient.TimeoutClose
     * @description Schedule closing connection, sender link or receiver link
     * @param {object} context - event context
     * @param {integer} timeout - time in ms for scheduling closing
     */
    timeoutClose(context, timeout) {
        this.cancelTimeout();
        if(timeout > 0) {
            this.timeout = timeout;
            this.timeoutFunction = setTimeout(function(context, self) {
                self.close(context, null);
            }, timeout,
            context, this);
        }
    }

    /**
     * @method CoreClient.CancelTimeout
     * @static
     * @description cancel scheduled closing
     */
    cancelTimeout() {
        clearTimeout(this.timeoutFunction);
    }

    /**
     * @method _resetTimeout
     * @description reschedule closing of client
     * @param {object} context - event context
     */
    resetTimeout(context) {
        if(!this.endState) {
            this.cancelTimeout();
            this.timeoutClose(context, this.timeout);
        }
    }

    /**
     * @method onDisconnect
     * @description handler for Disconnect event
     */
    onDisconnect() {
        this.cancelTimeout();
        this.reconnectCount++;
        if(this.reconnectCount === this.options.reconnect_limit) {
            throw new ErrorHandler('Disconnect');
        }
    }

    /**
     * @method onConnError
     * @description handler for ConnectionError event
     * @param {object} context - event context
     */
    onConnError(context) {
        if(context.connection.get_error().condition !== 'amqp:connection:forced') {
            throw new ErrorHandler(JSON.stringify(context.connection.get_error));
        }
    }

    /**
     * @method onRejected
     * @description handler for Rejected event
     * @param {object} context - event context
     */
    onRejected(context) {
        context.connection.close();
        throw new ErrorHandler(context.delivery.remote_state.error.value);
    }

    /**
     * @method onReleased
     * @description handler for Released event
     * @param {object} context - event context
     */
    onReleased(context) {
        if(this.options.releaseAction === 'fail') {
            context.connection.close();
            throw new ErrorHandler('Message released');
        }
    }

    /**
     * @method onProtocolError
     * @description handler for ProtocolError event
     * @param {object} context - event context
     */
    onProtocolError(context) {
        throw new ErrorHandler(JSON.stringify(context));
    }

    /**
     * @method _setUpSSL
     * @description set up sll conection options
     */
    _setUpSSL() {
        const sslDict = {};
        sslDict.transport = 'tls';
        if (this.options.sslPrivateKey) sslDict.key = fs.readFileSync(this.options.sslPrivateKey);
        if (this.options.sslCertificate) sslDict.cert = fs.readFileSync(this.options.sslCertificate);
        if (this.options.sslTrustStore) sslDict.ca = fs.readFileSync(this.options.sslTrustStore);
        if (this.options.sslPassword) sslDict.passphrase = this.options.sslPassword;

        return sslDict;
    }

    /**
     * @method _buildFailoverHandler
     * @description set up failover connection options
     */
    _buildFailoverHandler() {
        var self = this;
        return function() {
            return {
                host: self.options.arrHosts[self.reconnectCount % self.options.arrHosts.length],
                port: self.options.arrPorts[self.reconnectCount % self.options.arrPorts.length]
            };
        };
    }

    /**
     * @method BuildAmqpConnectionOptionsDict
     * @description set up connection options
     */
    buildAmqpConnectionOptionsDict() {
        return this._buildConnectionDict(undefined);
    }

    /**
     * @method BuildWebSocketConnectionDict
     * @description set up websocker connection options
     * @param {object} ws - instance of websocket
     */
    buildWebSocketConnectionDict(ws) {
        return this._buildConnectionDict(ws);
    }

    /**
     * @method _buildConnectionDict
     * @description set up connection options
     * @param {object} ws - instance of websocket
     */
    _buildConnectionDict(ws) {
        const connectionDict = {};
        //destination setting
        if(ws) {
            const ws_opts = {};
            if (this.options.connSsl) {
                ws_opts.rejectUnauthorized = false;
            }
            connectionDict.connection_details = ws(this._buildWebSocketConnString(), this.options.WSProtocols, ws_opts);
        } else if(this.options.arrHosts.length > 0) {
            //failover
            connectionDict.connection_details = this._buildFailoverHandler();
        }else{
            //standart
            connectionDict.host = this.options.url;
            connectionDict.port = this.options.port;
        }

        //sasl
        connectionDict.username = this.options.username;
        connectionDict.password = this.options.password;

        //reconnect
        if(this.options.reconnect) {
            if (this.options.reconnectLimit) {
                connectionDict.reconnect_limit = this.options.reconnectLimit;
            }
            if(this.options.reconnectInterval) {
                connectionDict.initial_reconnect_delay = this.options.reconnectInterval;
                connectionDict.max_reconnect_delay = this.options.reconnectInterval;
            }
        }else if (!this.options.reconnect) {
            connectionDict.reconnect = false;
        }
        //max frame size
        if (this.options.max_frame_size) {
            connectionDict.max_frame_size = this.options.frameSize;
        }
        //heartbeat
        if (this.options.heartbeat) {
            connectionDict.idle_time_out = this.options.heartbeat;
        }

        //set unauthorized tls
        if (this.options.connSsl && !this.options.sslCertificate && !this.options.sslTrustStore) {
            connectionDict.transport = 'tls';
            connectionDict.rejectUnauthorized = false;
        }

        //ssl setting
        if (this.options.sslCertificate || this.options.sslTrustStore) {
            connectionDict.rejectUnauthorized = this.options.sslVerifyPeerName;
            connectionDict.enable_sasl_external = true;
            const sslOptions = this._setUpSSL();
            for (const opt in sslOptions) {
                connectionDict[opt] = sslOptions[opt];
            }
        }

        //connection properties
        if (this.options.connProperties) {
            connectionDict.properties = this.options.connProperties;
        }

        return connectionDict;
    }

    /**
     * @method BuildReceiverOptionsDict
     * @description set up receiver link options
     */
    buildReceiverOptionsDict() {
        const receiverOptions = {};
        const source = {};
        source.address = this.options.address; //address of queue
        source.distribution_mode = this.options.recvBrowse ? 'copy' : ''; //message browse options
        source.durable = this.options.durable; //durable subscription
        source.filter = (this.options.msgSelector) ? filters.selector(this.options.msgSelector) : ''; //message selector options

        receiverOptions.autoaccept = false;
        receiverOptions.credit_window = (this.options.recvBrowse || this.options.count === 0 || this.options.duration > 0) ? 0 : undefined;
        receiverOptions.source = source;

        return receiverOptions;
    }

    /**
     * @method BuildSenderOptionsDict
     * @description set up sender link options
     */
    buildSenderOptionsDict() {
        const senderOptions = {};
        const target = {};
        target.address = this.options.address;
        target.durable = this.options.durable;

        if (this.options.linkAtMostOnce) {
            senderOptions.snd_settle_mode = 1;
        } else if (this.options.linkAtLeastOnce) {
            senderOptions.snd_settle_mode = 0;
        }
        senderOptions.target = target;
        senderOptions.autosettle = !this.options.autoSettleOff;

        return senderOptions;
    }

    /**
     * @method _buildWebSocketConnString
     * @description create websocker connection string
     */
    _buildWebSocketConnString() {
        let connTemplate = '%PROTOCOL://%BROKER:%PORT';
        connTemplate = this.options.connSsl ? connTemplate.replace('%PROTOCOL', 'wss') : connTemplate.replace('%PROTOCOL', 'ws');
        return connTemplate.replace('%BROKER', this.options.url).replace('%PORT', this.options.port);
    }

    /**
     * @method GetWebSocketObject
     * @description return websocket object for connection for browser of nodejs
     */
    getWebSocketObject() {
        if(typeof window === 'undefined') {
            /* eslint-disable global-require */
            return require('ws');
        }
        return window.WebSocket;
    }
}

//===========================================================================

/**
 * @module CoreClient
 * @description CoreClient namespace with client functions
 */

/** CoreClient namespace */
exports.CoreClient = CoreClient;
