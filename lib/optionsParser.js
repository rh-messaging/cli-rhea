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
const yargs = require('yargs');
const Utils = require('./utils.js').Utils;

class LoggingOpt {
    static logLib() {
        const args = yargs
            .options({'log-lib': {}})
            .argv;
        return args['log-lib'];
    }
}

/**
 * @class ConnectionOptions
 * @description Class to parse and store connection options
 */
class ConnectionOptions {
    constructor() {
        this.arrHosts = [];
        this.arrPorts = [];
        this.url;
        this.port;
        this.username;
        this.password;
        this.connProperties = {};
        this.reconnect;
        this.reconnectInterval;
        this.reconnectLimit;
        this.reconnectTimeout;
        this.heartbeat;
        this.sslCertificate;
        this.sslPrivateKey;
        this.sslPassword;
        this.sslTrustStore;
        this.sslVerifyPeer;
        this.sslVerifyPeerName;
        this.frameSize;
        this.websocket;
        this.connSsl;
        this.WSProtocols;
        this.connProperties;
    }

    /**
     * @method ParseConnectionOptions
     * @description Parse connection options
     * @memberof ConnectionOptions
     */
    parseConnectionOptions(listArgs) {
        const argsProcessor = yargs
            .usage('$0 [args]')
            .options({
                'conn-urls':                    { describe: 'broker adresses and ports for failover conection e.g. "host1:port,host2:port"]', type: 'string'},
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
                'conn-max-frame-size':          { default: undefined, describe: 'defines max frame size for connection', type: 'uint'},
                'conn-web-socket':              { alias: 'conn-ws', default: false, describe: 'use websocket as transport layer', type: ['boolean', 'string']},
                'conn-web-socket-protocols':    { alias: 'conn-ws-protocols', describe: 'protocol for ws connection', type: 'array', deafult: ['binary', 'AMQPWSB10', 'amqp']},
                'conn-property':                { describe: 'Sets connection property map item'},
                'broker':                       { alias: 'b', default: 'localhost:5672', describe: 'address of machine with broker (i.e. admin:admin@broker-address:5672)'},
            })
            .strict()
            .help('help');

        const args = this.parse(argsProcessor, listArgs);

        this.reconnect = this.castBoolProperty(args['conn-reconnect']);
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
        this.websocket = this.castBoolProperty(args['conn-web-socket']);
        this.connSsl = this.castBoolProperty(args['conn-ssl']);
        this.WSProtocols = args['conn-ws-protocols'];
        this.connProperties = this.castMapProperty(args['conn-property']);
        const parsedUrl = this.parseUrlString(args['broker']);
        this.url = parsedUrl.url;
        this.port = parsedUrl.port;
        this.username = parsedUrl.username;
        this.password = parsedUrl.password;
        this.parseConnUrls(args['conn-urls']);
    }

    /**
     * @method parse
     * @description help method for parsing
     * @param {Object} argsProcessor - yargs Processor for parsing
     * @param {String} data - arguments in string data type
     */
    parse(argsProcessor, data) {
        if(data) {
            return argsProcessor.parse(data);
        }
        return argsProcessor.argv;
    }

    /**
    * @method ParseDataType
    * @description Cast string data from cmd args to data type
    * @param {string} data - string data
    * @return typed data
    */
    parseDataType (data) {
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
    * @method ParseMapItem
    * @description Parse string map item
    * @param {string} data - map string item (e.g. 'key'='value')
    * @return vaue of map item
    */
    parseMapItem (data) {
        let listData = data.split('=');
        if(listData.length === 1) {
            listData = data.split('~');
            listData[1] =this.parseDataType('~' + listData[1].toString());
        }else if (listData.length === 2) {
            listData[1] = this.parseDataType(listData[1]);
        }
        return listData;
    }

    /**
     * @method castMapProperty
     * @description help method for parse property types
     * @param {Object} argument - argument for parsing
     */
    castMapProperty(argument) {
        let pair;
        const properties = {};
        if ((typeof argument) === 'object') {
            for (let i = 0; i < argument.length; i++) {
                pair = this.parseMapItem(argument[i]);
                properties[pair[0]] = pair[1];
            }
        }else if ((typeof argument) === 'string') {
            pair = this.parseMapItem(argument);
            properties[pair[0]] = pair[1];
        }
        return properties;
    }

    /**
     * @method castListProperty
     * @description help method for parse property types
     * @param {Object} argument - argument for parsing
     */
    castListProperty(argument) {
        const properties = [];
        if((typeof argument) === 'object') {
            for(let i = 0; i < argument.length; i++) {
                properties[i] = this.parseDataType(argument[i]);
            }
        }else if ((typeof argument) === 'string') {
            properties[0] = this.parseDataType(argument);
        }
        return properties;
    }

    /**
     * @method castBoolProperty
     * @description help method for parse property types
     * @param {Object} argument - argument for parsing
     */
    castBoolProperty(argument) {
        let returnValue = false;
        if (typeof argument === 'boolean') {
            returnValue = argument;
        }else{
            returnValue = argument.toUpperCase() === 'TRUE';
        }
        return returnValue;
    }

    removeProtocolPrefix(url) {
        return url.replace('amqp://', '').replace('amqps://', '').replace('ws://', '').replace('wss://', '');
    }

    parseUrlString(urlString) {
        const parsedData = {
            url: undefined,
            port: undefined,
            username: undefined,
            password: undefined,
        };
        //parse connection information
        const add = this.removeProtocolPrefix(urlString);
        const regex = /(\w+)(:*)(\w*)@/gi;
        const regexIpv6 = /\[(.*?)\]/gi;
        const res = regexIpv6.test(add) ? add.match(regexIpv6)[0].replace(/\[/, '').replace(/\]/,'') : null;
        let splitAdd;
        if(regex.test(add)) {
            splitAdd = add.split('@');
            parsedData.username = splitAdd[0].split(':')[0] ? splitAdd[0].split(':')[0] : '';
            parsedData.password = splitAdd[0].split(':')[1] ? splitAdd[0].split(':')[1] : '';
            parsedData.url = res ? res : splitAdd[1].split(':')[0];
            parsedData.port = splitAdd[1].split(':').pop();
        }else{
            splitAdd = add.split('@');
            if(splitAdd.length > 1) {
                parsedData.url = res ? res : splitAdd[1].split(':')[0];
                parsedData.port = (splitAdd[1].split(':').length > 1) ? splitAdd[1].split(':').pop() : 5672;
            }else{
                parsedData.url = res ? res : splitAdd[0].split(':')[0];
                parsedData.port = (splitAdd[0].split(':').length > 1) ? splitAdd[0].split(':').pop() : 5672;
            }
        }
        return parsedData;
    }

    parseConnUrls(urlsString) {
        if (urlsString) {
            this.arrHosts.push(this.url);
            this.arrPorts.push(this.port);
            let urls = this.removeProtocolPrefix(urlsString);
            urls = urls.split(',');
            for (let i = 0; i < urls.length; i++) {
                const parsedUrl = this.parseUrlString(urls[i]);
                this.arrHosts.push(parsedUrl.url);
                this.arrPorts.push(parsedUrl.port);
            }
        }
    }
}


/**
 * @class BasicOptions
 * @description Class to parse and store together options
 * @extends ConnectionOptions
 */
class BasicOptions extends ConnectionOptions {
    constructor() {
        super();
        this.address;
        this.count;
        this.closeSleep;
        this.timeout;
        this.durable;
        this.logLib;
        this.logStats;
    }

    /**
     * @method ParseBasic
     * @description Parse basic options
     * @memberof BasicOptions
     */
    parseBasic(listArgs) {
        const argsProcessor = yargs
            .usage('$0 [args]')
            .options({
                'address':              { alias: 'a', default: 'examples', describe: 'address of queue'},
                'count':                { alias: 'c', default: 1, describe: 'count of messages', type: 'uint'},
                'close-sleep':          { default: 0, describe: 'sleep before sender/receiver/session/connection.close()', type: 'uint'},
                'timeout':              { alias: 't', default: 0, describe: 'timeout berofe exiting'},
                'log-lib':              { describe: 'enable client library logging', choices: ['TRANSPORT_RAW', 'TRANSPORT_FRM', 'TRANSPORT_DRV', 'ALL']},
                'log-stats':            { describe: 'report various statistic/debug information', choices: ['endpoints']},
                'link-durable':         { default: false, describe: 'durable link subscription', type: 'boolean'},
            });
        const args = this.parse(argsProcessor, listArgs);
        this.parseConnectionOptions(listArgs);

        this.address = args['address'];
        this.count = args['count'];
        this.closeSleep = args['close-sleep'] * 1000;
        this.timeout = parseInt(args['timeout'], 10) * 1000; //convert from sec to ms
        this.durable = args['link-durable'] ? 2 : 0;
        this.logLib = args['log-lib'];
        this.logStats = args['log-stats'];
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * @class SenderReceiverOptions
 * @description Class to parse and store together options for sender and receiver
 * @extends BasicOptions
 */
class SenderReceiverOptions extends BasicOptions {
    constructor() {
        super();
        this.linkAtMostOnce;
        this.linkAtLeastOnce;
        this.logMsgs;
        this.duration;
        this.contentHashed;
    }

    /**
     * @method ParseSenderReceiverArguments
     * @description Parse sender and receiver together options
     * @memberof SenderReceiverOptions
     */
    parseSenderReceiverArguments(listArgs) {
        const argsProcessor = yargs
            .usage('$0 [args]')
            .options({
                'duration':                 { default: 0, describe: 'duration of sending or receiving messages', type: 'uint'},
                'log-msgs':                 { describe: 'format of messages', choices: ['json', 'dict', 'interop', 'body', 'upstream']},
                'link-at-most-once':        { default: false, describe: 'best-effort delivery', type: 'boolean'},
                'link-at-least-once':       { default: false, describe: 'reliable delivery', type: 'boolean'},
                'msg-content-hashed':       { default: false, description: 'Display SHA-1 hash of message content in logged messages', type: 'boolean'},
            });
        const args = this.parse(argsProcessor, listArgs);
        this.parseBasic(listArgs);

        this.linkAtMostOnce = args['link-at-most-once'];
        this.linkAtLeastOnce = args['link-at-least-once'];
        this.logMsgs = args['log-msgs'];
        this.duration = args['duration'] * 1000;
        this.contentHashed = args['msg-content-hashed'];
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * @class ConnectorOptions
 * @description Class to parse and store ConnectorClient options
 * @extends BasicOptions
 */
class ConnectorOptions extends BasicOptions {
    constructor() {
        super();
        this.objCtrl;
        this.senderCount;
        this.receiverCount;
    }

    /**
     * @method ParseArguments
     * @description Parse ConnectorClient options
     * @memberof ConnectorOptions
     */
    parseArguments(listArgs) {
        const argsProcessor = yargs
            .usage('$0 [args]')
            .options({
                'obj-ctrl':             { default: 'C', describe: 'Optional creation object control based on <object-ids>, syntax C/E/S/R stands for Connection, sEssion, Sender, Receiver'},
                'sender-count':         { default: 1, describe: 'count of senders', type: 'uint'},
                'receiver-count':       { default: 1, describe: 'count of receivers', type: 'uint'},
            });
        const args = this.parse(argsProcessor, listArgs);
        this.parseBasic(listArgs);

        this.objCtrl = args['obj-ctrl'];
        this.senderCount = args['sender-count'];
        this.receiverCount = args['receiver-count'];
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * @class ReceiverOptions
 * @description Class to parse and store Receiverclient options
 * @extends SenderReceiverOptions
 */
class ReceiverOptions extends SenderReceiverOptions {
    constructor() {
        super();
        this.recvBrowse = false;
        this.msgSelector;
        this.recvBrowse;
        this.action;
        this.capacity;
        this.processReplyTo;
        this.recvListen;
        this.recvListenPort;
    }

    /**
     * @method ParseArguments
     * @description Parse ReceiverClient options
     * @memberof ReceiverOptions
     */
    parseArguments(listArgs) {
        const argsProcessor = yargs
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
        const args = this.parse(argsProcessor, listArgs);

        this.parseSenderReceiverArguments(listArgs);
        this.msgSelector = args['msg-selector'];
        this.recvBrowse = args['recv-browse'];
        this.action = args['action'];
        this.capacity = args['capacity'];
        this.processReplyTo = args['process-reply-to'];
        this.recvListen = this.castBoolProperty(args['recv-listen']);
        this.recvListenPort = args['recv-listen-port'];
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * @class SenderOptions
 * @description Class to parse and store SenderClient options
 * @extends SenderReceiverOptions
 */
class SenderOptions extends SenderReceiverOptions {
    constructor() {
        super();
        this.listContent = [];
        this.mapContent = {};
        this.application_properties = {};
        this.messageAnnotations={};
        this.msgId;
        this.msgGroupId;
        this.msgGroupSeq;
        this.msgReplyToGroupId;
        this.msgSubject;
        this.msgReplyTo;
        this.msgDurable;
        this.propertyType;
        this.msgTtl;
        this.msgPriority;
        this.msgCorrelationId;
        this.msgUserId;
        this.msgContentType;
        this.msgContent;
        this.autoSettleOff;
        this.anonymous;
        this.contentType;
        this.capacity;
        this.msgContentFromFile;
    }

    /**
     * @method ParseArguments
     * @description Parse Senderclient options
     * @memberof SenderOptions
     */
    parseArguments(listArgs) {
        const argsProcessor = yargs
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
        const args = this.parse(argsProcessor, listArgs);

        this.parseSenderReceiverArguments(listArgs);

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
            this.msgContentFromFile = Utils.readContentFromFile(args['msg-content-from-file']);
        }

        this.contentType = args['content-type'];
        this.capacity = args['capacity'];
        this.application_properties = this.castMapProperty(args['msg-property']);
        this.listContent = this.castListProperty(args['msg-content-list-item']);
        this.mapContent = this.castMapProperty(args['msg-content-map-item']);
        this.messageAnnotations = this.castMapProperty(args['msg-annotation']);
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * @module Options
 * @description Provides functionality for parsing cmd args
 */

exports.LoggingOpt = LoggingOpt;
exports.ReceiverOptions = ReceiverOptions;
exports.SenderOptions = SenderOptions;
exports.ConnectorOptions = ConnectorOptions;
