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
'use strict'
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//connection options
var ConnectionOptions = function () {
    this.connUrls;
    this.reconnect;
    this.heartbeat;
    this.frameSize;
    this.reconnectInterval;
    this.reconnectLimit;
    this.reconnectTimeout;
    this.sslCertificate;
    this.sslPrivateKey;
    this.sslPassword;
    this.sslTrustStore;
    this.sslVerifyPeer;
    this.sslVerifyPeerName;
    this.arrHosts = [];
    this.arrPorts = [];
}

ConnectionOptions.prototype.ParseConnectionOptions = function() {
    var args = require('yargs')
        .usage('$0 [args]')
        .options({
            'conn-urls':                    { describe: 'broker adresses and ports for failover conection e.g. ["host1:port", "host2:port"]', type: "string"},
            'conn-reconnect':               { default: true, describe: 'client reconnect settings', type: ['boolean', 'string']},
            'conn-reconnect-interval':      { describe: 'client reconnect interval (only supported with "custom" reconnect")', type: 'float'},
            'conn-reconnect-limit':         { describe: 'client reconnect limit (only supported with "custom" reconnect)', type: 'int'},
            'conn-reconnect-timeout':       { describe: 'client reconnect timeout (only supported with "custom" reconnect)', type: 'int'},
            'conn-heartbeat':               { deafult: 0, describe: 'heartbeat in second', type: 'uint'},
            'conn-ssl-certificate':         { describe: 'path to client certificate (PEM format), enables client authentication', type: 'string'},
            'conn-ssl-private-key':         { describe: 'path to client private key (PEM format), conn-ssl-certificate must be given', type: 'string'},
            'conn-ssl-password':            { describe: "client's certificate database password", type: 'string' },
            'conn-ssl-trust-store':         { describe: 'path to client trust store (PEM format), conn-ssl-certificate must be given', type: 'string' },
            'conn-ssl-verify-peer':         { default: false, describe: 'verifies server certificate, conn-ssl-certificate and trusted db path needs to be specified (PEM format)', type: 'boolean'},
            'conn-ssl-verify-peer-name':    { default: false, describe: 'verifies connection url against server hostname', type: 'boolean'},
            'conn-max-frame-size':          { default: 4294967295, describe: 'defines max frame size for connection', type: 'uint'},
        })
        .strict()
        .help('help')
        .argv;

    this.connUrls = args['conn-urls'];
    if (typeof args['conn-reconnect'] == 'boolean'){
        this.reconnect = args['conn-reconnect'];
    }else{
        this.reconnect = args['conn-reconnect'].toUpperCase() == 'TRUE' ? true : false;
    }
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
}


//class for parse and store basic arguments for clients
var BasicOptions = function () {
    this.username;
    this.password;
    this.url;
    this.port;
    this.count;
    this.closeSleep;
    this.address;
    this.timeout;
    this.durable;
    this.logLib;
    this.logStats;
}

BasicOptions.prototype = Object.create(ConnectionOptions.prototype);
//method for parse basic arguments
BasicOptions.prototype.ParseBasic = function() {
    var args = require('yargs')
        .usage('$0 [args]')
        .options({
            'broker':               { alias: 'b', default: "localhost:5672", describe: 'address of machine with broker (i.e. admin:admin@broker-address:5672)'},
            'address':              { alias: 'a', describe: 'address of queue'},
            'count':                { alias: 'c', default: 1, describe: 'count of messages', type: 'uint'},
            'close-sleep':          { default: 0, describe: 'sleep before sender/receiver/session/connection.close()', type: 'uint'},
            'timeout':              { alias: 't', default: 0, describe: 'timeout berofe exiting'},
            'log-lib':              { describe: 'enable client library logging', choices: ['TRANSPORT_RAW', 'TRANSPORT_FRM', 'TRANSPORT_DRV']},
            'log-stats':            { describe: "report various statistic/debug information", choices: ['endpoints']},

            'link-durable':         { default: false, describe: 'durable link subscription', type: 'boolean'},
        })
        .argv;
    this.ParseConnectionOptions();

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
    if(regex.test(add)){
        var splitAdd = add.split('@');
        this.username = splitAdd[0].split(':')[0] ? splitAdd[0].split(':')[0] : "";
        this.password = splitAdd[0].split(':')[1] ? splitAdd[0].split(':')[1] : "";
        this.url = res ? res : splitAdd[1].split(':')[0];
        this.port = splitAdd[1].split(':').pop();
    }else{
        var splitAdd = add.split('@');
        if(splitAdd.length > 1){
            this.url = res ? res : splitAdd[1].split(':')[0];
            this.port = (splitAdd[1].split(':').length > 1) ? splitAdd[1].split(':').pop() : 5672;
        }else{
            this.url = res ? res : splitAdd[0].split(':')[0];
            this.port = (splitAdd[0].split(':').length > 1) ? splitAdd[0].split(':').pop() : 5672;
        }
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var SenderReceiverOptions = function () {
    this.duration;
    this.linkAtMostOnce;
    this.linkAtLeastOnce;
    this.logMsgs;
}

SenderReceiverOptions.prototype = Object.create(BasicOptions.prototype);
SenderReceiverOptions.prototype.ParseSenderReceiverArguments = function() {
    var args = require('yargs')
        .usage('$0 [args]')
        .options({
            'duration':                 { default: 0, describe: 'duration of sending or receiving messages', type: 'uint'},
            'log-msgs':                 { describe: 'format of messages', choices: ['dict', 'interop', 'body', 'upstream']},
            'link-at-most-once':        { default: false, describe: 'best-effort delivery', type: 'boolean'},
            'link-at-least-once':       { default: false, describe: 'reliable delivery', type: 'boolean'},
        })
        .argv;
    this.ParseBasic();

    this.linkAtMostOnce = args['link-at-most-once'];
    this.linkAtLeastOnce = args['link-at-least-once'];
    this.logMsgs = args['log-msgs'];
    this.duration = args['duration'] * 1000;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var ConnectorOptions = function () {
    //conector options
    this.objCtrl;
}

ConnectorOptions.prototype = Object.create(BasicOptions.prototype);
ConnectorOptions.prototype.ParseArguments = function() {
    var args = require('yargs')
        .usage('$0 [args]')
        .options({
            'obj-ctrl': { default: "C", describe: 'Optional creation object control based on <object-ids>, syntax C/E/S/R stands for Connection, sEssion, Sender, Receiver'},
        })
        .argv;
    this.ParseBasic();

    this.objCtrl = args['obj-ctrl'];
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var ReceiverOptions = function () {
    //receiver options
    this.msgSelector;
    this.recvBrowse = false;
    this.action
    this.capacity;
    this.processReplyTo;
    this.recvListen;
    this.recvListenPort;
}

ReceiverOptions.prototype = Object.create(SenderReceiverOptions.prototype);
ReceiverOptions.prototype.ParseArguments = function() {
    var args = require('yargs')
        .usage('$0 [args]')
        .options({
            'msg-selector':     { alias: 'recv-selector', describe: 'sql selector to broker'},
            'recv-browse':      { default: false, describe: 'browsing all messages without accept', choices: [true, false], type: 'boolean'},
            'action':           { default: 'acknowledge', describe: 'action on acquired message', choices: ['acknowledge', 'reject', 'release', 'noack']},
            'capacity':         { default: 0 ,describe: 'set sender capacity', type: 'uint'},
            'process-reply-to': { default: false ,describe: 'send message to reply-to address if enabled and message got reply-to address', type: 'boolean'},
            'recv-listen':      { default: false, describe: 'enable receiver listen (P2P)', type: ['boolean', 'string']},
            'recv-listen-port': { default: 5672, describe: 'define port for local listening', type: ['uint']},
        })
        .argv;

    this.ParseSenderReceiverArguments();
    this.msgSelector = args['msg-selector'];
    this.recvBrowse = args['recv-browse'];
    this.action = args['action'];
    this.capacity = args['capacity'];
    this.processReplyTo = args['process-reply-to'];
    if (typeof args['recv-listen'] == 'boolean'){
        this.recvListen = args['recv-listen'];
    }else{
        this.recvListen = args['recv-listen'].toUpperCase() == 'TRUE' ? true : false;
    }
    this.recvListenPort = args['recv-listen-port'];
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Options class for sender, parse and store options from command line
var SenderOptions = function () {
    //sender options
    this.msgId;
    this.msgGroupId;
    this.msgGroupSeq;
    this.msgReplyToGroupId;
    this.msgSubject;
    this.msgReplyTo;
    this.msgDurable;
    this.msgTtl;
    this.msgPriority;
    this.msgCorrelationId;
    this.msgUserId;
    this.msgContentFromFile;
    this.msgContent;
    this.msgContentType;
    this.contentType;
    this.propertyType;
    this.capacity;
    this.autoSettleOff;

    this.listContent = [];
    this.mapContent = {};
    this.application_properties = {};
    this.messageAnnotations={};

    this.ParseDataType = function (data) {
        if(data == undefined){
            return data;
        }
        data = data.toString();
        //autocast
        if(data.charAt(0) == '~'){
            data = data.substr(1);

            if(data.toLowerCase() == 'false'){
                return false;
            }else if (data.toLowerCase() == 'true'){
                return true;
            }else{
                data = Number(data) || Number(data) == 0 ? Number(data) : data;
                return data;
            }
        }
        //return string
        return data;
    }

    this.ParseMapItem = function (data) {
        var listData = data.split('=');
        if(listData.length == 1){
            listData = data.split('~');
            listData[1] = this.ParseDataType('~' + listData[1].toString());
        }else if (listData.length == 2){
            listData[1] = this.ParseDataType(listData[1]);
        }
        return listData;
    }
}

SenderOptions.prototype = Object.create(SenderReceiverOptions.prototype);
SenderOptions.prototype.ParseArguments = function() {
    var args = require('yargs')
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
            'msg-content-type':         { default: "string", describe: 'message content type; values string, int, long, float'},
            'msg-content':              { describe: 'specify a content'},
            'msg-content-list-item':    { alias: 'L', describe: 'specify a multiple entries content', type: 'string'},
            'msg-content-map-item':     { alias: 'M', describe: 'specify a map content'},
            'msg-content-from-file':    { describe: 'specify file name to load the content from'},
            'msg-annotation':           { describe: 'specify amqp properties'},
            'content-type':             { describe: 'specify how the msg content will be treated/casted'},
            'capacity':                 { default: 0, describe: 'set sender capacity', type: 'uint'},
            'reactor-auto-settle-off':  { default: false, describe: 'disable auto settling', type: 'boolean'},
            'anonymous':                { fefault: false, describe: 'send message by connection level anonymous sender', type: 'boolean'},
        })
        .argv;

    this.ParseSenderReceiverArguments();

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

    if(args['msg-content-from-file']){
        var ReadContentFromFile = require("./utils.js").ReadContentFromFile;
        this.msgContentFromFile = ReadContentFromFile(args['msg-content-from-file']);
    }

    this.contentType = args['content-type'];
    this.capacity = args['capacity'];

    if((typeof args['msg-property']) == 'object'){
        for(var i = 0; i < args['msg-property'].length; i++){
            var pair = this.ParseMapItem(args['msg-property'][i]);
            this.application_properties[pair[0]] = pair[1];
        }
    }else if ((typeof args['msg-property']) == 'string'){
        var pair = this.ParseMapItem(args['msg-property']);
        this.application_properties[pair[0]] = pair[1];
    }

    if((typeof args['msg-content-list-item']) == 'object'){
        for(var i = 0; i < args['msg-content-list-item'].length; i++){
            this.listContent[i] = this.ParseDataType(args['msg-content-list-item'][i]);
        }
    }else if ((typeof args['msg-content-list-item']) == 'string'){
        this.listContent[0] = this.ParseDataType(args['msg-content-list-item']);
    }

    if((typeof args['msg-content-map-item']) == 'object'){
        for(var i = 0; i < args['msg-content-map-item'].length; i++){
            var pair = this.ParseMapItem(args['msg-content-map-item'][i]);
            this.mapContent[pair[0]] = pair[1];
        }
    }else if ((typeof args['msg-content-map-item']) == 'string'){
        var pair = this.ParseMapItem(args['msg-content-map-item']);
        this.mapContent[pair[0]] = pair[1];
    }

    if((typeof args['msg-annotation']) == 'object'){
        for(var i = 0; i < args['msg-annotation'].length; i++){
            var pair = this.ParseMapItem(args['msg-annotation'][i]);
            this.messageAnnotations[pair[0]] = pair[1];
        }
    }else if ((typeof args['msg-annotation']) == 'string'){
        var pair = this.ParseMapItem(args['msg-annotation']);
        this.messageAnnotations[pair[0]] = pair[1];
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//export classes
exports.ReceiverOptions = ReceiverOptions
exports.SenderOptions = SenderOptions
exports.ConnectorOptions = ConnectorOptions