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
var Options = require('./optionsParser.js').SenderOptions;
var options = new Options();
options.ParseArguments();
CoreClient.RegistryUnhandledError();
CoreClient.logStats = options.logStats;
Utils.SetUpClientLogging(options.logLib);
var container = require('rhea');

//function for build message
var createMessage = function(options, sentId) {
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
                message.body = options.msgContent.replace('%d', sentId);
        }
        if (options.listContent.length > 0) {
            message.body = options.listContent;
        }
        if (Object.keys(options.mapContent).length > 0) {
            message.body = options.mapContent;
        }
        if (options.msgContentFromFile) {
            message.body = options.msgContentFromFile;
        }

        return message;
    } catch (err) {
        Utils.PrintError(err);
        process.exit(Utils.ReturnCodes.Error);
    }
};

//class sender
var Sender = function() {

    var confirmed = 0;
    var sent = 0;
    var ts;
    var timer_task;

    var sendMessage = function(context) {
        if (options.duration > 0) {
            NextRequest(context);
        } else {
            while (sent < options.count) {
                sent++;
                var message = createMessage(options, sent - 1);

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
    };

    //scheduled sending messages
    var NextRequest = function(context) {
        sent++;
        var message = createMessage(options, confirmed);

        if (options.anonymous) {
            context.connection.send(message);
        } else {
            context.sender.send(message);
        }

        Utils.PrintMessage(message, options.logMsgs);

        if (options.logStats === 'endpoints') {
            Utils.PrintStatistic(context);
        }

        if (confirmed < options.count) {
            var timeout = Utils.CalculateDelay(options.count, options.duration);
            timer_task = setTimeout(NextRequest, timeout, context);
        } else {
            clearTimeout(timer_task);
        }
    };

    //send messages
    this.on('sendable', function(context) {
        sendMessage(context);
    });

    //on accept message
    this.on('accepted', function(context) {
        if (++confirmed === options.count && !options.autoSettleOff) {
            CoreClient.CancelTimeout();
            clearTimeout(timer_task);
            CoreClient.Close(context, options.closeSleep, false);
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
        clearTimeout(timer_task);
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
        if (confirmed === options.count && options.autoSettleOff) {
            CoreClient.CancelTimeout();
            clearTimeout(timer_task);
            CoreClient.Close(context, options.closeSleep, false);
        }
    });

    //on connection open
    this.on('connection_open', function(context) {
        if (options.anonymous) {
            sendMessage(context);
        }
    });

    //public run method execute send
    this.Run = function() {
        ts = Utils.GetTime();
        try {
            //run sender client
            var connection = this.connect(CoreClient.BuildConnectionOptionsDict(options))
            if (!options.anonymous) {
                connection.attach_sender(CoreClient.BuildSenderOptionsDict(options));
            }
        } catch (err) {
            Utils.PrintError(err);
            process.exit(Utils.ReturnCodes.Error);
        }
    };
};
Sender.prototype = Object.create(container);
///////////////////////////////////////////////////////////////////////////////////
exports.Sender = Sender;