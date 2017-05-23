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

/////////////////////////////////////////////////////////////////////
// Help functions
var Replacer = function(k, v) {
    if (v === undefined) {
        return null;
    }
    return v;
};

var BinToString = function(binArray) {
    return String.fromCharCode.apply(String, binArray);
};

var CastUserId = function(userID) {
    if(typeof userID === 'string') {
        return userID;
    }else if (typeof userID === 'object') {
        return BinToString(userID);
    }
    return null;
};

var RemoveIDPrefix = function(idString) {
    if (idString)
        return idString.replace('ID:', '');
    return idString;
};

var RenameKeysInDictInterop = function (dict) {
    var workDict = {};
    //amqp header
    workDict['durable'] = dict['durable'];
    workDict['priority'] = dict['priority'];
    workDict['ttl'] = dict['ttl'];
    workDict['first-acquirer'] = dict['first_acquirer'];
    workDict['delivery-count'] = dict['delivery_count'];

    //amqp properties
    workDict['id'] = RemoveIDPrefix(dict['message_id']);
    workDict['user-id'] = CastUserId(dict['user_id']);
    workDict['address'] = dict['to'];
    workDict['subject'] = dict['subject'];
    workDict['reply-to'] = dict['reply_to'];
    workDict['correlation-id'] = RemoveIDPrefix(dict['correlation_id']);
    workDict['content-type'] = dict['content_type'];
    workDict['content-encoding'] = dict['content_encoding'];
    workDict['absolute-expiry-time'] = dict['absolute_expiry_time'];
    workDict['creation-time'] = dict['creation_time'];
    workDict['group-id'] = dict['group_id'];
    workDict['group-sequence'] = dict['group_sequence'];
    workDict['reply-to-group-id'] = dict['reply_to_group_id'];

    //application properties
    workDict['properties'] = dict['application_properties'];

    //application data
    workDict['content'] = dict['body'];

    //message anotations
    //workDict['message-annotations'] = dict['message_annotations'];

    //remove native message id
    if(workDict !== null && workDict['properties'] !== undefined)
        delete workDict['properties']['NATIVE_MESSAGE_ID'];

    return workDict;
};

var RenameKeysInDictStandard = function (dict) {

    var workDict = {};
    //amqp header
    workDict['durable'] = dict['durable'];
    workDict['priority'] = dict['priority'];
    workDict['ttl'] = dict['ttl'];
    workDict['first_acquirer'] = dict['first_acquirer'];
    workDict['delivery_count'] = dict['delivery_count'];

    //amqp properties
    workDict['id'] = dict['message_id'];
    workDict['user_id'] = CastUserId(dict['user_id']);
    workDict['to'] = dict['to'];
    workDict['subject'] = dict['subject'];
    workDict['reply_to'] = dict['reply_to'];
    workDict['correlation_id'] = dict['correlation_id'];
    workDict['content_type'] = dict['content_type'];
    workDict['content_encoding'] = dict['content_encoding'];
    workDict['absolute-expiry-time'] = dict['absolute_expiry_time'];
    workDict['creation_time'] = dict['creation_time'];
    workDict['group-id'] = dict['group_id'];
    workDict['group-sequence'] = dict['group_sequence'];
    workDict['reply-to-group-id'] = dict['reply_to_group_id'];

    //application properties
    workDict['properties'] = dict['application_properties'];

    //application data
    workDict['content'] = dict['body'];

    //message anotations
    workDict['message-annotations'] = dict['message_annotations'];

    //remove native message id
    if(workDict !== null && workDict['properties'] !== undefined)
        delete workDict['properties']['NATIVE_MESSAGE_ID'];

    return workDict;
};

var ReplaceWithPythonType = function (strMessage) {
    return strMessage.replace(/null/g, 'None').replace(/true/g, 'True').replace(/false/g, 'False').replace(/undefined/g, 'None').replace(/\{\}/g, 'None');
};

/////////////////////////////////////////////////////////////////////
// Main functions
var FormatBody = function (message) {
    return ReplaceWithPythonType(JSON.stringify(message.body, Replacer));
};

var FormatAsDict = function (message) {
    return ReplaceWithPythonType(JSON.stringify(RenameKeysInDictStandard(message), Replacer));
};

var FormatAsInteropDict = function (message) {
    return ReplaceWithPythonType(JSON.stringify(RenameKeysInDictInterop(message), Replacer));
};

var FormatAsUpstream = function (message) {
    var strResult = '';
    var messageDict = RenameKeysInDictStandard(message);
    for (var key in messageDict) {
        strResult += key + ': ' + JSON.stringify(messageDict[key]) + ', ';
    }
    strResult = strResult.substring(0, strResult.length-1);
    return ReplaceWithPythonType(strResult);
};

var FormatError = function (errMsg) {
    return 'ERROR {\'cause\': \'%s\'}'.replace('%s', errMsg);
};

var FormatStats = function (message) {
    return 'STATS \'%s\''.replace('%s', ReplaceWithPythonType(message));
};

/////////////////////////////////////////////////////////////////////
// Export
exports.FormatBody = FormatBody;
exports.FormatAsDict = FormatAsDict;
exports.FormatAsInteropDict = FormatAsInteropDict;
exports.FormatAsUpstream = FormatAsUpstream;
exports.FormatError = FormatError;
exports.FormatStats = FormatStats;
