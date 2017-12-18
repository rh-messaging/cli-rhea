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
var Options = require('./optionsParser.js').ReceiverOptions;
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
 * @class Receiver
 * @description Class represents Receiver client
 * @extends rhea.container
 */
var Receiver = function () {
    this.received = 0;
    this.replyToSent = 0;
    this.expected = 0;
    this.defaultCredit = 0;
    this.batch = 0;
    this.receiverOpened = false;
    this.ts;

    /**
    * @method onMessageHandler
    * @private
    * @description handler function for handle message event
    * @param {object} context - event context
    * @memberof Receiver
    */
    function onMessageHandler(context) {
        context.container.received++;

        //log message
        Utils.PrintMessage(context.message, options.logMsgs);

        //log stats
        if (options.logStats === 'endpoints') {
            Utils.PrintStatistic(context);
        }

        //reset timer (simulaton of fetch)
        CoreClient.ResetTimeout(context, options.recvListen);

        //react action on message
        if(options.action === 'reject') {
            context.delivery.reject({condition:'rhea:oops:string',description:'reject message'});
        }else if (options.action === 'release') {
            context.delivery.release();
        }

        //if received all expected messages and timeout is 0 close connection
        if (((!options.processReplyTo) || options.recvListen) && context.container.received === context.container.expected) {
            context.container.received = 0;
            CoreClient.CancelTimeout();
            CoreClient.Close(context, options.closeSleep, options.recvListen);
        }

        //add credit for drain
        if (!(options.duration > 0) &&
                (context.container.expected === 0) &&
                (context.container.received === context.container.batch)) {
            context.container.received = 0;
            context.receiver.add_credit(context.container.batch);
        }

        //set up frow credit 1 when receiver is in duration mode
        if(options.duration > 0) {
            nextRequest(context);
        }

        //reply to
        if(options.processReplyTo) {
            CoreClient.Reply(context);
        }
    }

    /**
    * @method nextRequest
    * @private
    * @description advance flow control of receiving messages
    * @param {object} context - event context
    * @memberof Receiver
    */
    function nextRequest(context) {
        if (context.container.received < options.count) {
            var timeout = Utils.CalculateDelay(options.count, options.duration);
            context.container.timer_task = setTimeout(
                function(context) {
                    context.receiver.add_credit(1);
                }, timeout,
                context);
        } else {
            clearTimeout(context.container.timer_task);
        }
    }

    this.on('receiver_open', function(context) {
        if(options.recvListen && context.receiver.target.address === options.address) {
            context.receiver.on('message', onMessageHandler);
        }else if (!options.recvListen && !context.container.receiverOpened) {
            context.receiver.on('message', onMessageHandler);
            context.container.receiverOpened = true;
        }
        if(options.recvBrowse || options.count === 0) {
            context.receiver.flow(context.container.batch);
            if (options.timeout <= 0)
                context.receiver.drain = true;
        }

        //add credit 1 for receive first message when receiver is in duration mode
        if(options.duration > 0) {
            context.receiver.add_credit(1);
        }

        //if timeout is set close connection after timeout
        if(options.timeout > 0 && !options.recvListen) {
            CoreClient.TimeoutClose(context, options.timeout, options.recvListen);
        }
    });

    //event raised when receiver has no messages to read from queue or if credit is 0
    this.on('receiver_drained', function(context) {
        if (!options.processReplyTo && options.timeout <= 0) {
            context.container.received = 0;
            CoreClient.CancelTimeout();
            CoreClient.Close(context, options.closeSleep, options.recvListen);
        }
    });

    //on disconnected
    this.on('disconnected', function(context) {
        CoreClient.OnDisconnect(context);
    });

    //on connection problem
    this.on('connection_error', function (context) {
        CoreClient.OnConnError(context);
    });

    //on protocol error
    this.on('protocol_error', function(context) {
        CoreClient.OnProtocolError(context);
    });

    //on connection settled
    this.on('settled', function (context) {
        if (++context.container.replyToSent === context.container.received && options.processReplyTo) {
            CoreClient.CancelTimeout();
            CoreClient.Close(context);
        }
    });

    /**
    * @method Init
    * @description init receiver base params
    * @memberof Receiver
    */
    this.Init = function() {
        this.expected = options.count;
        this.defaultCredit = this.expected ? this.expected : 10;
        this.batch = (options.recvBrowse || options.count === 0) ? this.defaultCredit : options.capacity;
        this.ts = Utils.GetTime();
    };

    /**
    * @method Run
    * @description public method for run receiver client
    * @param {object} opts - options dict
    * @memberof Receiver
    */
    this.Run = function (opts) {
        if(opts !== undefined && Array.isArray(opts)) {
            options.ParseArguments(opts);
        }else if(opts !== undefined && typeof opts === 'object') {
            options = opts;
        }

        // if running in browser setup websocket auto.
        if(typeof window !== 'undefined') {
            options.websocket = true;
        }

        this.Init();

        try{
            if(options.websocket) {
                var ws = this.websocket_connect(CoreClient.GetWebSocketObject());
                this.connect(CoreClient.BuildWebSocketConnectionDict(ws, options))
                    .open_receiver(CoreClient.BuildReceiverOptionsDict(options));
            }else {
                if(!options.recvListen) {
                    //run receiver
                    this.connect(CoreClient.BuildAmqpConnectionOptionsDict(options))
                        .open_receiver(CoreClient.BuildReceiverOptionsDict(options));
                }else {
                    //run local listener
                    options.closeSleep = 1000; //add here 1000ms wait for accept last message
                    this.listen({port: options.recvListenPort});
                    if(options.timeout > 0) {
                        CoreClient.TimeoutClose(null, options.timeout, options.recvListen);
                    }
                }
            }
        }catch(err) {
            throw new Utils.ErrorHandler(err);
        }
    };
};
Receiver.prototype = Object.create(container);
//////////////////////////////////////////////////////////////////////////////////
/**
 * @module Receiver
 * @description Receiver client class
 */

/** Receiver class */
exports.Receiver = Receiver;
