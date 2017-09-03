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

var ConnectorClient = require('../client-lib/connectorClient.js').Connector;
var ReceiverClient = require('../client-lib/receiverClient.js').Receiver;
var SenderClient = require('../client-lib/senderClient.js').Sender;

/**
 * @member {object} Options
 * @memberof client
 * Options dict for all client types
 */
var Options = {
    //connection opts
    connUrls: undefined,
    reconnect: true,
    reconnectInterval: undefined,
    reconnectLimit: undefined,
    reconnectTimeout: undefined,
    heartbeat: 0,
    sslCertificate: undefined,
    sslPrivateKey: undefined,
    sslPassword: undefined,
    sslTrustStore: undefined,
    frameSize: 4294967295,
    arrHosts: [],
    arrPorts: [],
    url: 'localhost',
    port: 5672,

    //base opts
    'broker': function(brokerUrl) {
        var regex = /(\w+)(:*)(\w*)@/gi;
        var regexIpv6 = /\[(.*?)\]/gi;
        var res = regexIpv6.test(brokerUrl) ? brokerUrl.match(regexIpv6)[0].replace(/\[/, '').replace(/\]/,'') : null;
        var splitAdd;
        if(regex.test(brokerUrl)) {
            splitAdd = brokerUrl.split('@');
            this.username = splitAdd[0].split(':')[0] ? splitAdd[0].split(':')[0] : '';
            this.password = splitAdd[0].split(':')[1] ? splitAdd[0].split(':')[1] : '';
            this.url = res ? res : splitAdd[1].split(':')[0];
            this.port = splitAdd[1].split(':').pop();
        }else{
            splitAdd = brokerUrl.split('@');
            if(splitAdd.length > 1) {
                this.url = res ? res : splitAdd[1].split(':')[0];
                this.port = (splitAdd[1].split(':').length > 1) ? splitAdd[1].split(':').pop() : 5672;
            }else{
                this.url = res ? res : splitAdd[0].split(':')[0];
                this.port = (splitAdd[0].split(':').length > 1) ? splitAdd[0].split(':').pop() : 5672;
            }
        }
        return this;
    },
    address: 'examples',
    count: 1,
    closeSleep: 0,
    timeout: 0,
    logLib: undefined,
    logStats: undefined,
    durable: false,

    //sender receiver opts
    duration: 0,
    logMsgs: undefined,
    linkAtMostOnce: false,
    linkAtLeastOnce: false,

    //connector opts
    objCtrl: 'C',

    //recv opts
    msgSelector: undefined,
    recvBrowse: false,
    action: 'acknowledge',
    capacity: 0,
    processReplyTo: false,
    recvListen: false,
    recvListenPort: 5672,

    //sender opts
    msgId: undefined,
    msgGroupId: undefined,
    msgGroupSeq: undefined,
    msgReplyToGroupId: undefined,
    msgSubject: undefined,
    msgReplyTo: undefined,
    msgProperties: undefined,
    msgDurable: false,
    msgTtl: undefined,
    msgPriority: undefined,
    msgCorrelationId: undefined,
    msgUserId: undefined,
    msgContentType: 'string',
    msgContent: undefined,
    msgAnnotations: undefined,
    autoSettleOff: false,
    anonymous: false
};

/**
 * @module client
 * @description Client types and options
 */

/** sender client instance*/
exports.SenderClient = new SenderClient();
/** receiver client instance */
exports.ReceiverClient = new ReceiverClient();
/** connector client instance */
exports.ConnectorClient = new ConnectorClient();
/** options dict */
exports.Options = Options;

