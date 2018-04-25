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

/////////////////////////////////////////////////////////////////////
/**
 * @function Replacer
 * @description return null instead of undefined
 * @param {string} key
 * @param {object} value
 * @return {object} replaced value
 * @memberof formatter
 */
const Replacer = function(key, value) {
    if (value === undefined) {
        return null;
    }
    return value;
};

/**
 * @function BinToString
 * @description conver binArray to string
 * @param {object} binArray - binary array
 * @return {string} converted string from bin array
 * @memberof formatter
 */
const BinToString = function(binArray) {
    return String.fromCharCode.apply(String, binArray);
};

/**
 * @function CastUserId
 * @description check userid type and return string
 * @param {object} userID
 * @return {string} user id in string format
 * @memberof formatter
 */
const CastUserId = function(userID) {
    if(typeof userID === 'string') {
        return userID;
    }else if (typeof userID === 'object') {
        return BinToString(userID);
    }
    return null;
};

/**
 * @function RemoveIDPrefix
 * @description remove ID: prefix
 * @param {string} idString - string to remove prefix
 * @return {string} idString without ID: prefix
 * @memberof formatter
 */
const RemoveIDPrefix = function(idString) {
    if (idString)
        return idString.replace('ID:', '');
    return idString;
};

/**
 * @function RemoveTopicPrefix
 * @description remove topic:// prefix
 * @param {string} address - string to remove prefix
 * @return {string} address without topic:// prefix
 * @memberof formatter
 */
const RemoveTopicPrefix = function(address) {
    if (address)
        return address.replace('topic://', '');
    return address;
};

/**
 * @function RoundFloatNumber
 * @description Round float number
 * @param {number} number - number for rounding
 * @return {number} roundet value
 * @memberof formatter
 */
const RoundFloatNumber = function(number) {
    return Math.round(number*100000)/100000;
};

/**
 * @function FixInteropValues
 * @description fix values for interop output print
 * @param {Object} values - object for fixing (Dict, Array, Number, String)
 * @return {Object} fixed object
 * @memberof formatter
 */
const FixInteropValues = function(values) {
    if(Array.isArray(values)) {
        for(let i = 0; i < values.length; i++) {
            values[i] = FixInteropValues(values[i]);
        }
        return values;
    }else if(values instanceof Object) {
        for (const key in values) {
            if (values.hasOwnProperty(key)) {
                values[key] = FixInteropValues(values[key]);
            }
        }
        return values;
    }else if(typeof values === 'number') {
        return RoundFloatNumber(values);
    }else if(typeof values === 'boolean') {
        return values;
    }else{
        return values;
    }
};

/**
 * @function RenameKeysInDictInterop
 * @description format message dict for interop
 * @param {object} dict - message dict from context.message
 * @return {object} formated dict
 * @memberof formatter
 */
const RenameKeysInDictInterop = function (dict) {
    const workDict = {};
    //amqp header
    workDict['durable'] = dict['durable'];
    workDict['priority'] = dict['priority'];
    workDict['ttl'] = dict['ttl'];
    workDict['first-acquirer'] = dict['first_acquirer'];
    workDict['delivery-count'] = dict['delivery_count'];

    //amqp properties
    workDict['id'] = RemoveIDPrefix(dict['message_id']);
    workDict['user-id'] = CastUserId(dict['user_id']);
    workDict['address'] = RemoveTopicPrefix(dict['to']);
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
    workDict['properties'] = FixInteropValues(dict['application_properties']);

    //application data
    workDict['content'] = FixInteropValues(dict['body']);

    //message anotations
    //workDict['message-annotations'] = dict['message_annotations'];

    //remove native message id
    if(workDict !== null && workDict['properties'] !== undefined)
        delete workDict['properties']['NATIVE_MESSAGE_ID'];

    return workDict;
};

/**
 * @function RenameKeysInDictStandard
 * @description format message as dict
 * @param {object} dict - message dict from context.message
 * @return {object} formated dict
 * @memberof formatter
 */
const RenameKeysInDictStandard = function (dict) {

    const workDict = {};
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

/**
 * @function ReplaceWithPythonTypes
 * @description format message as python dict
 * @param {string} dict - stringified object
 * @return {string} string with replaced python types
 * @memberof formatter
 */
const ReplaceWithPythonType = function (strMessage) {
    return strMessage.replace(/null/g, 'None').replace(/true/g, 'True').replace(/false/g, 'False').replace(/undefined/g, 'None').replace(/\{\}/g, 'None');
};

/////////////////////////////////////////////////////////////////////
// Main functions

/**
 * @function FormatBody
 * @description format message body
 * @param {object} message - message object
 * @return {string} formated message dict
 * @memberof formatter
 */
const FormatBody = function (message) {
    return ReplaceWithPythonType(JSON.stringify(message.body, Replacer));
};

/**
 * @function FormatAsDict
 * @description format message as dict
 * @param {object} message - message object
 * @return {string} formated message dict
 * @memberof formatter
 */
const FormatAsDict = function (message) {
    return ReplaceWithPythonType(JSON.stringify(RenameKeysInDictStandard(message), Replacer));
};

/**
 * @function FormatAsInteropDict
 * @description format message as interop dict
 * @param {object} message - message object
 * @return {string} formated message dict
 * @memberof formatter
 */
const FormatAsInteropDict = function (message) {
    return ReplaceWithPythonType(JSON.stringify(RenameKeysInDictInterop(message), Replacer));
};

/**
 * @function FormatAsJson
 * @description format message as json
 * @param {object} message - message object
 * @return {string} formated message dict
 * @memberof formatter
 */
const FormatAsJson = function (message) {
    return JSON.stringify(RenameKeysInDictInterop(message), Replacer);
};

/**
 * @function FormatAsUpstream
 * @description format message as upstream
 * @param {object} message - message object
 * @return {string} formated message dict
 * @memberof formatter
 */
const FormatAsUpstream = function (message) {
    let strResult = '';
    const messageDict = RenameKeysInDictStandard(message);
    for (const key in messageDict) {
        strResult += key + ': ' + JSON.stringify(messageDict[key]) + ', ';
    }
    strResult = strResult.substring(0, strResult.length-1);
    return ReplaceWithPythonType(strResult);
};

/**
 * @function FormatError
 * @description format error message
 * @param {string} errMsg - error message
 * @return {string} formated err as string
 * @memberof formatter
 */
const FormatError = function (errMsg) {
    return '{\'cause\': \'%s\'}'.replace('%s', errMsg);
};

/**
 * @function FormatStats
 * @description format stats message
 * @param {string} errMsg - stats message
 * @return {string} formated stats as string
 * @memberof formatter
 */
const FormatStats = function (message) {
    return 'STATS \'%s\''.replace('%s', ReplaceWithPythonType(message));
};

/////////////////////////////////////////////////////////////////////
/**
 * @module formatter
 * @description Provides funstion for formatting message on stdout or stderr
 */

/** function format only msg body */
exports.FormatBody = FormatBody;
/** function format as dict */
exports.FormatAsDict = FormatAsDict;
/** function format as interop */
exports.FormatAsInteropDict = FormatAsInteropDict;
/** function format as json */
exports.FormatAsJson = FormatAsJson;
/** function format as upstream */
exports.FormatAsUpstream = FormatAsUpstream;
/** function format err */
exports.FormatError = FormatError;
/** function format stats */
exports.FormatStats = FormatStats;
