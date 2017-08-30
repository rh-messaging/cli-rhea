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
var CoreClient = require('./coreClient.js').CoreClient;
var Options = require('./optionsParser.js').SenderOptions;
require('string-format-js');

if (typeof window === 'undefined') {
    var options = new Options();
    options.ParseArguments();
    CoreClient.RegistryUnhandledError();
    CoreClient.logStats = options.logStats;
    Utils.SetUpClientLogging(options.logLib);
}

var container = require('rhea');

/**
 * @class Sender
 * @description Class represents Sender client
 * @extends rhea.container
 */
var Sender = function() {
    this.confirmed = 0;
    this.sent = 0;
    this.ts;
    this.timer_task;

    /**
    * @method createMessage
    * @private
    * @description create message dict
    * @param {object} options - sender client options
    * @param {int} sentId - index of message
    * @return {object} Message dict
    * @memberof Sender
    */
    function createMessage(options, sentId) {
        //message initialization
        try {
            var message = {};
            message['body'] = {};
            message['application_properties'] = {};
            message['message_annotations'] = {};

            //properties
            message['message_id'] = options.msgId;
            message['user_id'] = options.msgUserId;
            message['group_id'] = options.msgGroupId;
            message['group_sequence'] = options.msgGroupSeq;
            message['reply_to_group_id'] = options.msgReplyToGroupId;
            message['subject'] = options.msgSubject;
            message['correlation_id'] = options.msgCorrelationId;
            message['content_type'] = options.msgContentType;
            message['reply_to'] = options.msgReplyTo;
            message['delivery_count'] = 0;

            message['to'] = options.address;

            //message header
            message['durable'] = options.msgDurable;
            message['priority'] = options.msgPriority;
            message['ttl'] = options.msgTtl;

            //application properties
            message.application_properties = options.application_properties;

            //message annotation
            message.message_annotations = options.messageAnnotations;

            //body
            if (options.msgContent) {
                message.body = options.msgContent;
                if (typeof options.msgContent === 'string')
                    message.body = options.msgContent.format(sentId);
            }
            if (options.listContent && options.listContent.length > 0) {
                message.body = options.listContent;
            }
            if (options.mapContent && Object.keys(options.mapContent).length > 0) {
                message.body = options.mapContent;
            }
            if (options.msgContentFromFile && options.msgContentFromFile) {
                message.body = options.msgContentFromFile;
            }

            return message;
        } catch (err) {
            Utils.PrintError(err);
            process.exit(Utils.ReturnCodes.Error);
        }
    }

    /**
    * @method sendMessage
    * @private
    * @description method send message
    * @param {object} context - event context
    * @memberof Sender
    */
    function sendMessage(context) {
        if (options.duration > 0) {
            nextRequest(context);
        } else {
            while (context.container.sent < options.count) {
                context.container.sent++;
                var message = createMessage(options, context.container.sent - 1);

                if (options.anonymous) {
                    context.connection.send(message);
                } else {
                    context.sender.send(message);
                }

                Utils.PrintMessage(message, options.logMsgs);

                if (options.logStats === 'endpoints') {
                    Utils.PrintStatistic(context);
                }
            }
        }
    }

    /**
    * @method nextRequest
    * @private
    * @description create message dict
    * @param {object} options - sender client options
    * @param {int} sentId - index of message
    * @memberof Sender
    */
    function nextRequest(context) {
        context.container.sent++;
        var message = createMessage(options, context.container.confirmed);

        if (options.anonymous) {
            context.connection.send(message);
        } else {
            context.sender.send(message);
        }

        Utils.PrintMessage(message, options.logMsgs);

        if (options.logStats === 'endpoints') {
            Utils.PrintStatistic(context);
        }
    }

    //send messages
    this.on('sendable', function(context) {
        sendMessage(context);
    });

    //on accept message
    this.on('accepted', function(context) {
        if (++context.container.confirmed === options.count && !options.autoSettleOff) {
            context.container.sent = context.container.confirmed = 0;
            CoreClient.CancelTimeout();
            clearTimeout(context.container.timer_task);
            CoreClient.Close(context, options.closeSleep, false);
        }else if (options.duration > 0) {
            if (context.container.confirmed < options.count) {
                var timeout = Utils.CalculateDelay(options.count, options.duration);
                context.container.timer_task = setTimeout(nextRequest, timeout, context);
            } else {
                clearTimeout(context.container.timer_task);
            }
        }
    });

    //event raised when sender is opening
    this.on('sender_open', function(context) {
        if (options.timeout > 0) {
            CoreClient.TimeoutClose(context, options.timeout, false);
        }
    });

    //on disconnected
    this.on('disconnected', function(context) {
        clearTimeout(context.container.timer_task);
        CoreClient.OnDisconnect(context);
    });

    //on connection problem
    this.on('connection_error', function(context) {
        CoreClient.OnConnError(context);
    });

    //reject message
    this.on('rejected', function(context) {
        CoreClient.OnRejected(context);
    });

    //release message
    this.on('released', function(context) {
        CoreClient.OnReleased(context);
    });

    //on protocol error
    this.on('protocol_error', function(context) {
        CoreClient.OnProtocolError(context);
    });

    //on settled
    this.on('settled', function(context) {
        if (context.container.confirmed === options.count && options.autoSettleOff) {
            CoreClient.CancelTimeout();
            clearTimeout(context.container.timer_task);
            CoreClient.Close(context, options.closeSleep, false);
        }
    });

    //on connection open
    this.on('connection_open', function(context) {
        if (options.anonymous) {
            sendMessage(context);
        }
    });

    /**
    * @function Run
    * @public
    * @description Run sender client
    * @param {object} opts - sender client options
    * @memberof Sender
    */
    this.Run = function(opts) {
        if(opts !== undefined) {
            options = opts;
        }
        this.ts = Utils.GetTime();

        // if running in browser setup websocket auto.
        if(typeof window !== 'undefined') {
            options.websocket = true;
        }

        try {
            //run sender client
            if(options.websocket) {
                var ws = this.websocket_connect(CoreClient.GetWebSocketObject());
                this.connect(CoreClient.BuildWebSocketConnectionDict(ws, options))
                    .open_sender(options.address);
            } else {
                var connection = this.connect(CoreClient.BuildConnectionOptionsDict(options));
                if (!options.anonymous) {
                    connection.attach_sender(CoreClient.BuildSenderOptionsDict(options));
                }
            }
        } catch (err) {
            Utils.PrintError(err);
            process.exit(Utils.ReturnCodes.Error);
        }
    };
};
Sender.prototype = Object.create(container);
///////////////////////////////////////////////////////////////////////////////////
/**
 * @module Sender
 * @description Sender client class
 */

/** sender class */
exports.Sender = Sender;
