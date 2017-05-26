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

var Utils = require('./utils.js');
var CoreClient = require('./coreClient.js').CoreClient;
var Options = require('./optionsParser.js').ReceiverOptions;

if (typeof window === 'undefined') {
    var options = new Options();
    options.ParseArguments();
    CoreClient.RegistryUnhandledError();
    CoreClient.logStats = options.logStats;
    Utils.SetUpClientLogging(options.logLib);
}

var container = require('rhea');

//class receiver
var Receiver = function () {
    this.received = 0;
    this.replyToSent = 0;
    this.expected = 0;
    this.defaultCredit = 0;
    this.batch = 0;
    this.ts;

    //handler function for on message
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
        if (!options.processReplyTo && context.container.received === context.container.expected) {
            context.container.received = 0;
            CoreClient.CancelTimeout();
            CoreClient.Close(context, options.closeSleep, options.recvListen);
        }

        //add credit for drain
        if ((context.container.expected === 0) && (context.container.received === context.container.batch)) {
            context.container.received = 0;
            context.receiver.add_credit(context.container.batch);
        }

        //reply to
        if(options.processReplyTo) {
            CoreClient.Reply(context);
        }
    }

    //event raised when receiver is opening
    this.on('receiver_open', function(context) {
        if(options.recvListen && context.receiver.target.address === options.address) {
            context.receiver.on('message', onMessageHandler);
        }else if (!options.recvListen && CoreClient.reconnectCount === 0) {
            context.receiver.on('message', onMessageHandler);
        }
        if(options.recvBrowse || options.count === 0) {
            context.receiver.flow(context.container.batch);
            if (options.timeout <= 0)
                context.receiver.drain = true;
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

    this.Init = function() {
        this.expected = options.count;
        this.defaultCredit = this.expected ? this.expected : 10;
        this.batch = (options.recvBrowse || options.count === 0) ? this.defaultCredit : options.capacity;
        this.ts = Utils.GetTime();
    };

    //public run method for receiver
    this.Run = function (opts) {
        if(opts !== undefined) {
            options = opts;
        }

        this.Init();

        try{
            if(!options.recvListen) {
                //run receiver
                this.connect(CoreClient.BuildConnectionOptionsDict(options))
                    .open_receiver(CoreClient.BuildReceiverOptionsDict(options));
            }else{
                //run local listener
                this.listen({port: options.recvListenPort});
                if(options.timeout > 0) {
                    CoreClient.TimeoutClose(null, options.timeout, options.recvListen);
                }
            }
        }catch(err) {
            Utils.PrintError(err);
            process.exit(Utils.ReturnCodes.Error);
        }
    };

    //public run method for browser running
    this.WebSocketRun = function(opts) {
        if(opts !== undefined) {
            options = opts;
        }
        this.Init();

        var ws = this.websocket_connect(WebSocket);
        this.connect(CoreClient.BuildWebSocketConnectionDict(ws, options))
          .open_receiver(options.address);
    };
};
Receiver.prototype = Object.create(container);
//////////////////////////////////////////////////////////////////////////////////
exports.Receiver = Receiver;
