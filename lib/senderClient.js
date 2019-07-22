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
const Options = require('./optionsParser.js').SenderOptions;
require('string-format-js');
const CoreClient = require('./coreClient.js').CoreClient;

/**
 * @class Sender
 * @description Class represents Sender client
 * @extends CoreClient
 */
class Sender extends CoreClient {
    constructor() {
        super();
        this.confirmed = 0;
        this.sent = 0;
        this.ts;
        this.timer_task;
        this._setUpHandlers();
    }

    /**
    * @method _createMessage
    * @private
    * @description create message dict
    * @param {int} sentId - index of message
    * @return {object} Message dict
    * @memberof Sender
    */
    _createMessage(sentId) {
        //message initialization
        try {
            const message = {};
            message.body = {};
            message.application_properties = {};
            message.message_annotations = {};

            //properties
            message.message_id = this.options.msgId;
            message.user_id = this.options.msgUserId;
            message.group_id = this.options.msgGroupId;
            message.group_sequence = this.options.msgGroupSeq;
            message.reply_to_group_id = this.options.msgReplyToGroupId;
            message.subject = this.options.msgSubject;
            message.correlation_id = this.options.msgCorrelationId;
            message.content_type = this.options.msgContentType;
            message.reply_to = this.options.msgReplyTo;
            message.delivery_count = 0;

            message.to = this.options.address;

            //message header
            message.durable = this.options.msgDurable;
            message.priority = this.options.msgPriority;
            message.ttl = this.options.msgTtl;

            //application properties
            message.application_properties = this.options.application_properties;

            //message annotation
            message.message_annotations = this.options.messageAnnotations;

            //body
            if (this.options.msgContent) {
                message.body = this.options.msgContent;
                if (typeof this.options.msgContent === 'string') {
                    message.body = this.options.msgContent.format(sentId);
                }
            }
            if (this.options.listContent && this.options.listContent.length > 0) {
                message.body = this.options.listContent;
            }
            if (this.options.mapContent && Object.keys(this.options.mapContent).length > 0) {
                message.body = this.options.mapContent;
            }
            if (this.options.msgContentFromFile && this.options.msgContentFromFile) {
                message.body = this.options.msgContentFromFile;
            }

            return message;
        } catch (err) {
            throw new ErrorHandler(err);
        }
    }

    /**
    * @method _sendMessage
    * @private
    * @description method send message
    * @param {object} context - event context
    * @memberof Sender
    */
    _sendMessage(context) {
        if (this.options.duration > 0) {
            this._nextRequest(context, this);
        } else {
            let message = undefined;
            while ((this.options.anonymous || (context.sender && context.sender.sendable())) && this.sent < this.options.count) {
                this.sent++;
                message = this._createMessage(this.sent - 1);

                if (this.options.anonymous) {
                    context.connection.send(message);
                } else {
                    context.sender.send(message);
                }

                Utils.printMessage(message, this.options);

                if (this.options.timeout > 0) {
                    this.resetTimeout(context, false);
                }

                if (this.options.logStats === 'endpoints') {
                    Utils.printStatistic(context);
                }
            }
        }
    }

    /**
    * @method _nextRequest
    * @private
    * @description create message dict
    * @param {int} sentId - index of message
    * @memberof Sender
    */
    _nextRequest(context, self) {
        self.sent++;
        const message = self._createMessage(self.confirmed);

        if (self.options.anonymous) {
            context.connection.send(message);
        } else {
            context.sender.send(message);
        }

        if (self.options.timeout > 0) {
            self.resetTimeout(context, false);
        }

        Utils.printMessage(message, self.options);

        if (self.options.logStats === 'endpoints') {
            Utils.printStatistic(context);
        }
    }

    _setUpHandlers() {
        const self = this;
        //send messages
        this.container.on('sendable', function (context) {
            self._sendMessage(context);
        });

        //on accept message
        this.container.on('accepted', function (context) {
            if (++self.confirmed === self.options.count && !self.options.autoSettleOff) {
                self.sent = self.confirmed = 0;
                self.cancelTimeout();
                clearTimeout(self.timer_task);
                self.close(context, self.options.closeSleep);
            } else if (self.options.duration > 0) {
                if (self.confirmed < self.options.count) {
                    const timeout = Utils.calculateDelay(self.options.count, self.options.duration);
                    self.timer_task = setTimeout(self._nextRequest, timeout, context, self);
                } else {
                    clearTimeout(self.timer_task);
                }
            }
        });

        //event raised when sender is opening
        this.container.on('sender_open', function (context) {
            if (self.options.timeout > 0) {
                self.timeoutClose(context, self.options.timeout);
            }
        });

        //on disconnected
        this.container.on('disconnected', function (context) {
            clearTimeout(self.timer_task);
            self.onDisconnect(context);
        });

        //on connection problem
        this.container.on('connection_error', function (context) {
            self.onConnError(context);
        });

        //reject message
        this.container.on('rejected', function (context) {
            self.onRejected(context);
        });

        //release message
        this.container.on('released', function (context) {
            self.onReleased(context);
            if (self.options.releaseAction === 'retry') {
                context.sender.send(context.delivery);
            }
        });

        //on protocol error
        this.container.on('protocol_error', function (context) {
            self.onProtocolError(context);
        });

        //on settled
        this.container.on('settled', function (context) {
            if (self.confirmed === self.options.count && self.options.autoSettleOff) {
                self.cancelTimeout();
                clearTimeout(context.container.timer_task);
                self.close(context, self.options.closeSleep);
            }
        });

        //on connection open
        this.container.on('connection_open', function (context) {
            if (self.options.anonymous) {
                self._sendMessage(context);
            }
        });
    }

    /**
    * @function run
    * @public
    * @description Run sender client
    * @param {object} opts - sender client options
    * @memberof Sender
    */
    run(opts) {
        //if sender run as api
        if(opts === undefined) {
            this.options = new Options();
            this.options.parseArguments();
        }else if(opts !== undefined && Array.isArray(opts)) {
            this.options = new Options();
            this.options.parseArguments(opts);
        }else if(opts !== undefined && typeof opts === 'object') {
            this.options = opts;
        }

        this.ts = Utils.getTime();

        // if running in browser setup websocket auto
        if(typeof window !== 'undefined') {
            this.options.websocket = true;
        }

        try {
            //run sender client
            if (this.options.websocket) {
                const ws = this.container.websocket_connect(this.getWebSocketObject());
                this.container.connect(this.buildWebSocketConnectionDict(ws))
                    .open_sender(this.buildSenderOptionsDict());
            } else {
                let connectionParams = null;
                if(!this.options.useConfigFile) {
                    connectionParams = this.buildAmqpConnectionOptionsDict();
                }

                const connection = this.container.connect(connectionParams);
                if (!this.options.anonymous) {
                    connection.attach_sender(this.buildSenderOptionsDict());
                }
            }
        } catch (err) {
            console.log(err);
            throw new ErrorHandler(err);
        }
    }
}
///////////////////////////////////////////////////////////////////////////////////
/**
 * @module Sender
 * @description Sender client class
 */

/** sender class */
module.exports = {
    Sender: Sender
};
