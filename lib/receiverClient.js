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
const Options = require('./optionsParser.js').ReceiverOptions;
const CoreClient = require('./coreClient.js').CoreClient;

/**
 * @class Receiver
 * @description Class represents Receiver client
 * @extends rhea.container
 */
class Receiver extends CoreClient {
    constructor() {
        super();
        this.received = 0;
        this.replyToSent = 0;
        this.expected = 0;
        this.defaultCredit = 0;
        this.batch = 0;
        this.receiverOpened = false;
        this.ts;
        this._setUpHandlers();
    }

    /**
    * @method nextRequest
    * @private
    * @description advance flow control of receiving messages
    * @param {object} context - event context
    * @memberof Receiver
    */
    _nextRequest(context, self) {
        if (self.received < self.options.count) {
            const timeout = Utils.calculateDelay(self.options.count, self.options.duration);
            self.timer_task = setTimeout(
                function(context) {
                    context.receiver.add_credit(1);
                }, timeout,
                context);
        } else {
            clearTimeout(self.timer_task);
        }
    }

    _setUpHandlers() {
        const self = this;

        this.container.on('message', function(context) {
            self.received++;

            //log message
            Utils.printMessage(context.message, self.options);

            //log stats
            if (self.options.logStats === 'endpoints') {
                Utils.printStatistic(context);
            }

            //reset timer (simulaton of fetch)
            self.resetTimeout(context, self.options.recvListen);

            //react action on message
            if(self.options.action === 'reject') {
                context.delivery.reject({condition:'rhea:oops:string',description:'reject message'});
            }else if (self.options.action === 'release') {
                context.delivery.release();
            }

            //if received all expected messages and timeout is 0 close connection
            if (((!self.options.processReplyTo) || self.options.recvListen) && self.received === self.expected) {
                self.received = 0;
                self.cancelTimeout();
                self.close(context, self.options.closeSleep, self.options.recvListen);
            }

            //add credit for drain
            if (!(self.options.duration > 0) &&
                    (self.expected === 0) &&
                    (self.received === self.batch)) {
                self.received = 0;
                context.receiver.add_credit(self.batch);
            }

            //set up frow credit 1 when receiver is in duration mode
            if(self.options.duration > 0) {
                self._nextRequest(context, self);
            }

            //reply to
            if(self.options.processReplyTo) {
                self.reply(context);
            }
        });

        this.container.on('receiver_open', function(context) {
            if(self.options.recvBrowse || self.options.count === 0) {
                context.receiver.flow(self.batch);
                if (self.options.timeout <= 0)
                    context.receiver.drain = true;
            }

            //add credit 1 for receive first message when receiver is in duration mode
            if(self.options.duration > 0) {
                context.receiver.add_credit(1);
            }

            //if timeout is set close connection after timeout
            if(self.options.timeout > 0 && !self.options.recvListen) {
                self.timeoutClose(context, self.options.timeout, self.options.recvListen);
            }
        });

        //event raised when receiver has no messages to read from queue or if credit is 0
        this.container.on('receiver_drained', function(context) {
            if (!self.options.processReplyTo && self.options.timeout <= 0) {
                self.received = 0;
                self.cancelTimeout();
                self.close(context, self.options.closeSleep, self.options.recvListen);
            }
        });

        //on disconnected
        this.container.on('disconnected', function(context) {
            self.onDisconnect(context);
        });

        //on connection problem
        this.container.on('connection_error', function (context) {
            self.onConnError(context);
        });

        //on protocol error
        this.container.on('protocol_error', function(context) {
            self.onProtocolError(context);
        });

        //on connection settled
        this.container.on('settled', function (context) {
            if (++self.replyToSent === self.received && self.options.processReplyTo) {
                self.cancelTimeout();
                self.close(context);
            }
        });
    }

    /**
    * @method Init
    * @description init receiver base params
    * @memberof Receiver
    */
    init() {
        this.expected = this.options.count;
        this.defaultCredit = this.expected ? this.expected : 10;
        this.batch = (this.options.recvBrowse || this.options.count === 0) ? this.defaultCredit : this.options.capacity;
        this.ts = Utils.getTime();
    }

    /**
    * @method Run
    * @description public method for run receiver client
    * @param {object} opts - options dict
    * @memberof Receiver
    */
    run(opts) {
        if (opts === undefined) {
            this.options = new Options();
            this.options.parseArguments();
        }
        if(opts !== undefined && Array.isArray(opts)) {
            this.options.parseArguments(opts);
        }else if(opts !== undefined && typeof opts === 'object') {
            this.options = opts;
        }

        // if running in browser setup websocket auto.
        if(typeof window !== 'undefined') {
            this.options.websocket = true;
        }

        this.init();

        try{
            if(this.options.websocket) {
                const ws = this.container.websocket_connect(this.getWebSocketObject());
                this.container.connect(this.buildWebSocketConnectionDict(ws))
                    .open_receiver(this.buildReceiverOptionsDict());
            }else {
                if(!this.options.recvListen) {
                    //run receiver
                    this.container.connect(this.buildAmqpConnectionOptionsDict())
                        .open_receiver(this.buildReceiverOptionsDict());
                }else {
                    //run local listener
                    this.options.closeSleep = 1000; //add here 1000ms wait for accept last message
                    this.container.listen({port: this.options.recvListenPort});
                    if(this.options.timeout > 0) {
                        this.timeoutClose(null, this.options.timeout, this.options.recvListen);
                    }
                }
            }
        }catch(err) {
            console.log(err);
            throw new ErrorHandler(err);
        }
    }
}
//////////////////////////////////////////////////////////////////////////////////
/**
 * @module Receiver
 * @description Receiver client class
 */

/** Receiver class */
exports.Receiver = Receiver;
