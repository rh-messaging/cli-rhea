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
const shasum = require('crypto').createHash('sha1');

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
 * @class Formatter
 * @description static methods for formatting errors and messages
 */
class Formatter {

    /**
     * @function BinToString
     * @description conver binArray to string
     * @param {object} binArray - binary array
     * @return {string} converted string from bin array
     * @memberof formatter
     */
    static binToString(binArray) {
        return String.fromCharCode.apply(String, binArray);
    }

    /**
     * @function CastUserId
     * @description check userid type and return string
     * @param {object} userID
     * @return {string} user id in string format
     * @memberof formatter
     */
    static castUserId(userID) {
        if(typeof userID === 'string') {
            return userID;
        }else if (typeof userID === 'object') {
            return Formatter.binToString(userID);
        }
        return null;
    }

    /**
     * @function RemoveIDPrefix
     * @description remove ID: prefix
     * @param {string} idString - string to remove prefix
     * @return {string} idString without ID: prefix
     * @memberof formatter
     */
    static removeIDPrefix(idString) {
        if (idString)
            return idString.toString().replace('ID:', '');
        return idString;
    }

    /**
     * @function RemoveTopicPrefix
     * @description remove topic:// prefix
     * @param {string} address - string to remove prefix
     * @return {string} address without topic:// prefix
     * @memberof formatter
     */
    static removeTopicPrefix(address) {
        if (address)
            return address.replace('topic://', '');
        return address;
    }

    /**
     * @function RoundFloatNumber
     * @description Round float number
     * @param {number} number - number for rounding
     * @return {number} roundet value
     * @memberof formatter
     */
    static roundFloatNumber(number) {
        return Math.round(number*100000)/100000;
    }

    /**
     * @function FixInteropValues
     * @description fix values for interop output print
     * @param {Object} values - object for fixing (Dict, Array, Number, String)
     * @return {Object} fixed object
     * @memberof formatter
     */
    static fixInteropValues(values) {
        if(Array.isArray(values)) {
            for(let i = 0; i < values.length; i++) {
                values[i] = Formatter.fixInteropValues(values[i]);
            }
            return values;
        }else if(values instanceof Object) {
            for (const key in values) {
                if (values.hasOwnProperty(key)) {
                    values[key] = Formatter.fixInteropValues(values[key]);
                }
            }
            return values;
        }else if(typeof values === 'number') {
            return Formatter.roundFloatNumber(values);
        }else if(typeof values === 'boolean') {
            return values;
        }else{
            return values;
        }
    }

    /**
     * @function RenameKeysInDictInterop
     * @description format message dict for interop
     * @param {object} dict - message dict from context.message
     * @return {object} formated dict
     * @memberof formatter
     */
    static renameKeysInDictInterop(dict, contentHashed) {
        const workDict = {};
        //amqp header
        workDict['durable'] = dict['durable'];
        workDict['priority'] = dict['priority'] == null ? 4 : dict['priority'];
        workDict['ttl'] = dict['ttl'];
        workDict['first-acquirer'] = dict['first_acquirer'];
        workDict['delivery-count'] = dict['delivery_count'];

        //amqp properties
        workDict['id'] = Formatter.removeIDPrefix(dict['message_id']);
        workDict['user-id'] = Formatter.castUserId(dict['user_id']);
        workDict['address'] = Formatter.removeTopicPrefix(dict['to']);
        workDict['subject'] = dict['subject'];
        workDict['reply-to'] = dict['reply_to'];
        workDict['correlation-id'] = Formatter.removeIDPrefix(dict['correlation_id']);
        workDict['content-type'] = dict['content_type'];
        workDict['content-encoding'] = dict['content_encoding'];
        workDict['absolute-expiry-time'] = dict['absolute_expiry_time'];
        workDict['creation-time'] = dict['creation_time'].getTime();
        workDict['group-id'] = dict['group_id'];
        workDict['group-sequence'] = dict['group_sequence'];
        workDict['reply-to-group-id'] = dict['reply_to_group_id'];

        //application properties
        workDict['properties'] = Formatter.fixInteropValues(dict['application_properties']);

        //message content
        if (contentHashed) {
            shasum.update(dict['body']);
            workDict['content'] = shasum.digest('hex');
        }else {
            workDict['content'] = Formatter.fixInteropValues(dict['body']);
        }

        //message anotations
        //workDict['message-annotations'] = dict['message_annotations'];

        //remove native message id
        if(workDict !== null && workDict['properties'] !== undefined)
            delete workDict['properties']['NATIVE_MESSAGE_ID'];

        return workDict;
    }

    /**
     * @function RenameKeysInDictStandard
     * @description format message as dict
     * @param {object} dict - message dict from context.message
     * @return {object} formated dict
     * @memberof formatter
     */
    static renameKeysInDictStandard(dict, contentHashed) {

        const workDict = {};
        //amqp header
        workDict['durable'] = dict['durable'];
        workDict['priority'] = dict['priority'] == null ? 4 : dict['priority'];
        workDict['ttl'] = dict['ttl'];
        workDict['first_acquirer'] = dict['first_acquirer'];
        workDict['delivery_count'] = dict['delivery_count'];

        //amqp properties
        workDict['id'] = dict['message_id'];
        workDict['user-id'] = Formatter.castUserId(dict['user_id']);
        workDict['to'] = dict['to'];
        workDict['subject'] = dict['subject'];
        workDict['reply-to'] = dict['reply_to'];
        workDict['correlation-id'] = dict['correlation_id'];
        workDict['content-type'] = dict['content_type'];
        workDict['content-encoding'] = dict['content_encoding'];
        workDict['absolute-expiry-time'] = dict['absolute_expiry_time'];
        workDict['creation-time'] = dict['creation_time'].getTime();
        workDict['group-id'] = dict['group_id'];
        workDict['group-sequence'] = dict['group_sequence'];
        workDict['reply-to-group-id'] = dict['reply_to_group_id'];

        //application properties
        workDict['properties'] = dict['application_properties'];

        //message content
        if (contentHashed) {
            shasum.update(dict['body']);
            workDict['content'] = shasum.digest('hex');
        }else {
            workDict['content'] = Formatter.fixInteropValues(dict['body']);
        }

        //message anotations
        workDict['message-annotations'] = dict['message_annotations'];

        //remove native message id
        if(workDict !== null && workDict['properties'] !== undefined)
            delete workDict['properties']['NATIVE_MESSAGE_ID'];

        return workDict;
    }

    /**
     * @function ReplaceWithPythonTypes
     * @description format message as python dict
     * @param {string} dict - stringified object
     * @return {string} string with replaced python types
     * @memberof formatter
     */
    static replaceWithPythonType(strMessage) {
        return strMessage.replace(/null/g, 'None').replace(/true/g, 'True').replace(/false/g, 'False').replace(/undefined/g, 'None').replace(/\{\}/g, 'None');
    }

    /////////////////////////////////////////////////////////////////////
    // Main functions

    /**
     * @function FormatBody
     * @description format message body
     * @param {object} message - message object
     * @return {string} formated message dict
     * @memberof formatter
     */
    static formatBody(message) {
        return Formatter.replaceWithPythonType(JSON.stringify(message.body, Replacer));
    }

    /**
     * @function FormatAsDict
     * @description format message as dict
     * @param {object} message - message object
     * @return {string} formated message dict
     * @memberof formatter
     */
    static formatAsDict(message, contentHashed) {
        return Formatter.replaceWithPythonType(JSON.stringify(Formatter.renameKeysInDictStandard(message, contentHashed), Replacer));
    }

    /**
     * @function FormatAsInteropDict
     * @description format message as interop dict
     * @param {object} message - message object
     * @return {string} formated message dict
     * @memberof formatter
     */
    static formatAsInteropDict(message, contentHashed) {
        return Formatter.replaceWithPythonType(JSON.stringify(Formatter.renameKeysInDictInterop(message, contentHashed), Replacer));
    }

    /**
     * @function FormatAsJson
     * @description format message as json
     * @param {object} message - message object
     * @return {string} formated message dict
     * @memberof formatter
     */
    static formatAsJson(message, contentHashed) {
        return JSON.stringify(Formatter.renameKeysInDictInterop(message, contentHashed), Replacer);
    }

    /**
     * @function FormatAsUpstream
     * @description format message as upstream
     * @param {object} message - message object
     * @return {string} formated message dict
     * @memberof formatter
     */
    static formatAsUpstream(message) {
        let strResult = '';
        const messageDict = Formatter.renameKeysInDictStandard(message);
        for (const key in messageDict) {
            strResult += key + ': ' + JSON.stringify(messageDict[key]) + ', ';
        }
        strResult = strResult.substring(0, strResult.length-1);
        return Formatter.replaceWithPythonType(strResult);
    }

    /**
     * @function FormatError
     * @description format error message
     * @param {string} errMsg - error message
     * @return {string} formated err as string
     * @memberof formatter
     */
    static formatError(errMsg) {
        return '{\'cause\': \'%s\'}'.replace('%s', errMsg);
    }

    /**
     * @method FormatStats
     * @static
     * @description format stats message
     * @param {string} errMsg - stats message
     * @return {string} formated stats as string
     * @memberof formatter
     */
    static formatStats(message) {
        return 'STATS \'%s\''.replace('%s', Formatter.replaceWithPythonType(message));
    }
}


/////////////////////////////////////////////////////////////////////
/**
 * @module formatter
 * @description Provides slacc for formatting message on stdout or stderr
 */

exports.Formatter = Formatter;
