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
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var yargs = require('yargs');
var utils = require('./utils.js');

/**
 * @function parse
 * @description help method for parsing
 * @param {Object} argsProcessor - yargs Processor for parsing
 * @param {String} data - arguments in string data type
 */
function parse(argsProcessor, data) {
    if(data) {
        return argsProcessor.parse(data);
    }
    return argsProcessor.argv;
}

/**
* @function ParseDataType
* @description Cast string data from cmd args to data type
* @param {string} data - string data
* @return typed data
*/
function ParseDataType (data) {
    if(data === undefined) {
        return data;
    }
    data = data.toString();
    //autocast
    if(data.charAt(0) === '~') {
        data = data.substr(1);

        if(data.toLowerCase() === 'false') {
            return false;
        }else if (data.toLowerCase() === 'true') {
            return true;
        }else{
            data = Number(data) || Number(data) === 0 ? Number(data) : data;
            return data;
        }
    }
    //return string
    return data;
}

/**
* @function ParseMapItem
* @description Parse string map item
* @param {string} data - map string item (e.g. 'key'='value')
* @return vaue of map item
*/
function ParseMapItem (data) {
    var listData = data.split('=');
    if(listData.length === 1) {
        listData = data.split('~');
        listData[1] = ParseDataType('~' + listData[1].toString());
    }else if (listData.length === 2) {
        listData[1] = ParseDataType(listData[1]);
    }
    return listData;
}

/**
 * @function castMapProperty
 * @description help method for parse property types
 * @param {Object} argument - argument for parsing
 */
function castMapProperty(argument) {
    var pair;
    var i;
    var properties = {};
    if ((typeof argument) === 'object') {
        for (i = 0; i < argument.length; i++) {
            pair = ParseMapItem(argument[i]);
            properties[pair[0]] = pair[1];
        }
    }else if ((typeof argument) === 'string') {
        pair = ParseMapItem(argument);
        properties[pair[0]] = pair[1];
    }
    return properties;
}

/**
 * @function castListProperty
 * @description help method for parse property types
 * @param {Object} argument - argument for parsing
 */
function castListProperty(argument) {
    var i;
    var properties = [];
    if((typeof argument) === 'object') {
        for(i = 0; i < argument.length; i++) {
            properties[i] = ParseDataType(argument[i]);
        }
    }else if ((typeof argument) === 'string') {
        properties[0] = ParseDataType(argument);
    }
    return properties;
}

/**
 * @function castBoolProperty
 * @description help method for parse property types
 * @param {Object} argument - argument for parsing
 */
function castBoolProperty(argument) {
    var returnValue = false;
    if (typeof argument === 'boolean') {
        returnValue = argument;
    }else{
        returnValue = argument.toUpperCase() === 'TRUE';
    }
    return returnValue;
}

/**
 * @class ConnectionOptions
 * @description Class to parse and store connection options
 */
var ConnectionOptions = function () {
    this.arrHosts = [];
    this.arrPorts = [];
    this.connProperties = {};
};

/**
 * @method ParseConnectionOptions
 * @description Parse connection options
 * @memberof ConnectionOptions
 */
ConnectionOptions.prototype.ParseConnectionOptions = function(listArgs) {
    var argsProcessor = yargs
        .usage('$0 [args]')
        .options({
            'conn-urls':                    { describe: 'broker adresses and ports for failover conection e.g. ["host1:port", "host2:port"]', type: 'string'},
            'conn-reconnect':               { default: true, describe: 'client reconnect settings', type: ['boolean', 'string']},
            'conn-reconnect-interval':      { describe: 'client reconnect interval (only supported with "custom" reconnect")', type: 'float'},
            'conn-reconnect-limit':         { describe: 'client reconnect limit (only supported with "custom" reconnect)', type: 'int'},
            'conn-reconnect-timeout':       { describe: 'client reconnect timeout (only supported with "custom" reconnect)', type: 'int'},
            'conn-heartbeat':               { deafult: 0, describe: 'heartbeat in second', type: 'uint'},
            'conn-ssl':                     { default: false, describe: 'enable tls connection', type: ['boolean', 'string']},
            'conn-ssl-certificate':         { describe: 'path to client certificate (PEM format), enables client authentication', type: 'string'},
            'conn-ssl-private-key':         { describe: 'path to client private key (PEM format), conn-ssl-certificate must be given', type: 'string'},
            'conn-ssl-password':            { describe: 'client\'s certificate database password', type: 'string' },
            'conn-ssl-trust-store':         { describe: 'path to client trust store (PEM format), conn-ssl-certificate must be given', type: 'string' },
            'conn-ssl-verify-peer':         { default: false, describe: 'verifies server certificate, conn-ssl-certificate and trusted db path needs to be specified (PEM format)', type: 'boolean'},
            'conn-ssl-verify-peer-name':    { default: false, describe: 'verifies connection url against server hostname', type: 'boolean'},
            'conn-max-frame-size':          { default: 4294967295, describe: 'defines max frame size for connection', type: 'uint'},
            'conn-web-socket':              { default: false, describe: 'use websocket as transport layer', type: ['boolean', 'string']},
            'conn-property':                { describe: 'Sets connection property map item'},
        })
        .strict()
        .help('help');

    var args = parse(argsProcessor, listArgs);

    this.connUrls = args['conn-urls'];
    this.reconnect = castBoolProperty(args['conn-reconnect']);
    this.reconnectInterval = args['conn-reconnect-interval'];
    this.reconnectLimit = args['conn-reconnect-limit'];
    this.reconnectTimeout = args['conn-reconnect-timeout'];
    this.heartbeat = args['conn-heartbeat'] * 1000;
    this.sslCertificate = args['conn-ssl-certificate'];
    this.sslPrivateKey = args['conn-ssl-private-key'];
    this.sslPassword = args['conn-ssl-password'];
    this.sslTrustStore = args['conn-ssl-trust-store'];
    this.sslVerifyPeer = args['conn-ssl-verify-peer'];
    this.sslVerifyPeerName = args['conn-ssl-verify-peer-name'];
    this.frameSize = args['conn-max-frame-size'];
    this.websocket = castBoolProperty(args['conn-web-socket']);
    this.connSsl = castBoolProperty(args['conn-ssl']);
    this.connProperties = castMapProperty(args['conn-property']);
};


/**
 * @class BasicOptions
 * @description Class to parse and store together options
 * @extends ConnectionOptions
 */
var BasicOptions = function () {};

BasicOptions.prototype = Object.create(ConnectionOptions.prototype);

/**
 * @method ParseBasic
 * @description Parse basic options
 * @memberof BasicOptions
 */
BasicOptions.prototype.ParseBasic = function(listArgs) {
    var argsProcessor = yargs
        .usage('$0 [args]')
        .options({
            'broker':               { alias: 'b', default: 'localhost:5672', describe: 'address of machine with broker (i.e. admin:admin@broker-address:5672)'},
            'address':              { alias: 'a', default: 'examples', describe: 'address of queue'},
            'count':                { alias: 'c', default: 1, describe: 'count of messages', type: 'uint'},
            'close-sleep':          { default: 0, describe: 'sleep before sender/receiver/session/connection.close()', type: 'uint'},
            'timeout':              { alias: 't', default: 0, describe: 'timeout berofe exiting'},
            'log-lib':              { describe: 'enable client library logging', choices: ['TRANSPORT_RAW', 'TRANSPORT_FRM', 'TRANSPORT_DRV']},
            'log-stats':            { describe: 'report various statistic/debug information', choices: ['endpoints']},
            'link-durable':         { default: false, describe: 'durable link subscription', type: 'boolean'},
        });
    var args = parse(argsProcessor, listArgs);
    this.ParseConnectionOptions(listArgs);

    this.address = args['address'];
    this.count = args['count'];
    this.closeSleep = args['close-sleep'] * 1000;
    this.timeout = parseInt(args['timeout'], 10) * 1000; //convert from sec to ms
    this.durable = args['link-durable'] ? 2 : 0;
    this.logLib = args['log-lib'];
    this.logStats = args['log-stats'];

    //parse connection information
    var add = args['broker'];
    var regex = /(\w+)(:*)(\w*)@/gi;
    var regexIpv6 = /\[(.*?)\]/gi;
    var res = regexIpv6.test(add) ? add.match(regexIpv6)[0].replace(/\[/, '').replace(/\]/,'') : null;
    var splitAdd;
    if(regex.test(add)) {
        splitAdd = add.split('@');
        this.username = splitAdd[0].split(':')[0] ? splitAdd[0].split(':')[0] : '';
        this.password = splitAdd[0].split(':')[1] ? splitAdd[0].split(':')[1] : '';
        this.url = res ? res : splitAdd[1].split(':')[0];
        this.port = splitAdd[1].split(':').pop();
    }else{
        splitAdd = add.split('@');
        if(splitAdd.length > 1) {
            this.url = res ? res : splitAdd[1].split(':')[0];
            this.port = (splitAdd[1].split(':').length > 1) ? splitAdd[1].split(':').pop() : 5672;
        }else{
            this.url = res ? res : splitAdd[0].split(':')[0];
            this.port = (splitAdd[0].split(':').length > 1) ? splitAdd[0].split(':').pop() : 5672;
        }
    }
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * @class SenderReceiverOptions
 * @description Class to parse and store together options for sender and receiver
 * @extends BasicOptions
 */
var SenderReceiverOptions = function () {};

SenderReceiverOptions.prototype = Object.create(BasicOptions.prototype);

/**
 * @method ParseSenderReceiverArguments
 * @description Parse sender and receiver together options
 * @memberof SenderReceiverOptions
 */
SenderReceiverOptions.prototype.ParseSenderReceiverArguments = function(listArgs) {
    var argsProcessor = yargs
        .usage('$0 [args]')
        .options({
            'duration':                 { default: 0, describe: 'duration of sending or receiving messages', type: 'uint'},
            'log-msgs':                 { describe: 'format of messages', choices: ['json', 'dict', 'interop', 'body', 'upstream']},
            'link-at-most-once':        { default: false, describe: 'best-effort delivery', type: 'boolean'},
            'link-at-least-once':       { default: false, describe: 'reliable delivery', type: 'boolean'},
        });
    var args = parse(argsProcessor, listArgs);
    this.ParseBasic(listArgs);

    this.linkAtMostOnce = args['link-at-most-once'];
    this.linkAtLeastOnce = args['link-at-least-once'];
    this.logMsgs = args['log-msgs'];
    this.duration = args['duration'] * 1000;
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * @class ConnectorOptions
 * @description Class to parse and store ConnectorClient options
 * @extends BasicOptions
 */
var ConnectorOptions = function () {};

ConnectorOptions.prototype = Object.create(BasicOptions.prototype);

/**
 * @method ParseArguments
 * @description Parse ConnectorClient options
 * @memberof ConnectorOptions
 */
ConnectorOptions.prototype.ParseArguments = function(listArgs) {
    var argsProcessor = yargs
        .usage('$0 [args]')
        .options({
            'obj-ctrl': { default: 'C', describe: 'Optional creation object control based on <object-ids>, syntax C/E/S/R stands for Connection, sEssion, Sender, Receiver'},
            'sender-count':                { default: 1, describe: 'count of senders', type: 'uint'},
            'receiver-count':                { default: 1, describe: 'count of receivers', type: 'uint'},
        });
    var args = parse(argsProcessor, listArgs);
    this.ParseBasic(listArgs);

    this.objCtrl = args['obj-ctrl'];
    this.senderCount = args['sender-count'];
    this.receiverCount = args['receiver-count'];
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * @class ReceiverOptions
 * @description Class to parse and store Receiverclient options
 * @extends SenderReceiverOptions
 */
var ReceiverOptions = function () {
    this.recvBrowse = false;
};

ReceiverOptions.prototype = Object.create(SenderReceiverOptions.prototype);

/**
 * @method ParseArguments
 * @description Parse ReceiverClient options
 * @memberof ReceiverOptions
 */
ReceiverOptions.prototype.ParseArguments = function(listArgs) {
    var argsProcessor = yargs
        .usage('$0 [args]')
        .options({
            'msg-selector':     { alias: 'recv-selector', describe: 'sql selector to broker'},
            'recv-browse':      { default: false, describe: 'browsing all messages without accept', choices: [true, false], type: 'boolean'},
            'action':           { default: 'acknowledge', describe: 'action on acquired message', choices: ['acknowledge', 'reject', 'release', 'noack']},
            'capacity':         { default: 0 ,describe: 'set sender capacity', type: 'uint'},
            'process-reply-to': { default: false ,describe: 'send message to reply-to address if enabled and message got reply-to address', type: 'boolean'},
            'recv-listen':      { default: false, describe: 'enable receiver listen (P2P)', type: ['boolean', 'string']},
            'recv-listen-port': { default: 5672, describe: 'define port for local listening', type: ['uint']},
        });
    var args = parse(argsProcessor, listArgs);

    this.ParseSenderReceiverArguments(listArgs);
    this.msgSelector = args['msg-selector'];
    this.recvBrowse = args['recv-browse'];
    this.action = args['action'];
    this.capacity = args['capacity'];
    this.processReplyTo = args['process-reply-to'];
    this.recvListen = castBoolProperty(args['recv-listen']);
    this.recvListenPort = args['recv-listen-port'];
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * @class SenderOptions
 * @description Class to parse and store SenderClient options
 * @extends SenderReceiverOptions
 */
var SenderOptions = function () {
    this.listContent = [];
    this.mapContent = {};
    this.application_properties = {};
    this.messageAnnotations={};
};

SenderOptions.prototype = Object.create(SenderReceiverOptions.prototype);

/**
 * @method ParseArguments
 * @description Parse Senderclient options
 * @memberof SenderOptions
 */
SenderOptions.prototype.ParseArguments = function(listArgs) {
    var argsProcessor = yargs
        .usage('$0 [args]')
        .options({
            'msg-id':                   { alias: 'i', describe: 'message id'},
            'msg-group-id':             { describe: 'message group id'},
            'msg-group-seq':            { describe: 'message group sequence'},
            'msg-reply-to-group-id':    { describe: 'message reply to group id'},
            'msg-subject':              { alias: 'S', describe: 'message subject'},
            'msg-reply-to':             { describe: 'string message reply to', type: 'string'},
            'msg-property':             { describe: 'specify message property'},
            'property-type':            { describe: 'specify message property type (overrides auto-cast feature)'},
            'msg-durable':              { default: false, describe: 'send durable messages yes/no', choices: [true, false], type: 'boolean'},
            'msg-ttl':                  { describe: 'message time-to-live in ms', type: 'uint'},
            'msg-priority':             { describe: 'message priority'},
            'msg-correlation-id':       { describe: 'message correlation id'},
            'msg-user-id':              { describe: 'message user id'},
            'msg-content-type':         { default: 'string', describe: 'message content type; values string, int, long, float'},
            'msg-content':              { describe: 'specify a content'},
            'msg-content-list-item':    { alias: 'L', describe: 'specify a multiple entries content', type: 'string'},
            'msg-content-map-item':     { alias: 'M', describe: 'specify a map content'},
            'msg-content-from-file':    { describe: 'specify file name to load the content from'},
            'msg-annotation':           { describe: 'specify amqp properties'},
            'content-type':             { describe: 'specify how the msg content will be treated/casted'},
            'capacity':                 { default: 0, describe: 'set sender capacity', type: 'uint'},
            'reactor-auto-settle-off':  { default: false, describe: 'disable auto settling', type: 'boolean'},
            'anonymous':                { default: false, describe: 'send message by connection level anonymous sender', type: 'boolean'},
        });
    var args = parse(argsProcessor, listArgs);

    this.ParseSenderReceiverArguments(listArgs);

    //fill properties with parsed arguments
    this.msgId = args['msg-id'];
    this.msgGroupId = args['msg-group-id'];
    this.msgGroupSeq = args['msg-group-seq'];
    this.msgReplyToGroupId = args['msg-reply-to-group-id'];
    this.msgSubject = args['msg-subject'];
    this.msgReplyTo = args['msg-reply-to'];
    this.msgDurable = args['msg-durable'];
    this.propertyType = args['property-type'];
    this.msgTtl = args['msg-ttl'];
    this.msgPriority = args['msg-priority'];
    this.msgCorrelationId = args['msg-correlation-id'];
    this.msgUserId = args['msg-user-id'];
    this.msgContentType = args['msg-content-type'];
    this.msgContent = args['msg-content'];
    this.autoSettleOff = args['reactor-auto-settle-off'];
    this.anonymous = args['anonymous'];

    if(args['msg-content-from-file']) {
        var ReadContentFromFile = utils.ReadContentFromFile;
        this.msgContentFromFile = ReadContentFromFile(args['msg-content-from-file']);
    }

    this.contentType = args['content-type'];
    this.capacity = args['capacity'];
    this.application_properties = castMapProperty(args['msg-property']);
    this.listContent = castListProperty(args['msg-content-list-item']);
    this.mapContent = castMapProperty(args['msg-content-map-item']);
    this.messageAnnotations = castMapProperty(args['msg-annotation']);
};

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * @module Options
 * @description Provides functionality for parsing cmd args
 */

exports.ReceiverOptions = ReceiverOptions;
exports.SenderOptions = SenderOptions;
exports.ConnectorOptions = ConnectorOptions;
