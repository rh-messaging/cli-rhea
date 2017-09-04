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
var formatter = require('./formatter.js');
var fs = require('fs');

/**
* @function PrintMessage
* @description call print method by format type
* @param {object} message - message dict
* @param {string} format - format type of message out
* @memberof Utils
*/
var PrintMessage = function (message, format) {
    if(format === 'body') {
        console.log(formatter.FormatBody(message));
    }else if (format === 'dict') {
        console.log(formatter.FormatAsDict(message));
    }else if (format === 'upstream') {
        console.log(formatter.FormatAsUpstream(message));
    }else if (format === 'interop') {
        console.log(formatter.FormatAsInteropDict(message));
    }
};

/**
* @function ReadContentFromFile
* @description read content from file
* @param {string} path - path to file to read
* @return {string} content from file
* @memberof Utils
*/
var ReadContentFromFile = function (path) {
    try{
        var data = fs.readFileSync(path, 'utf8');
        return data;
    }catch(err) {
        throw new ErrorHandler(err);
    }
};

/**
* @function GetTime
* @description get curent time in ms
* @return {integer} time in ms
* @memberof Utils
*/
var GetTime = function () {
    return (0.001 * new Date().getTime());
};

/**
* @function CalculateDelay
* @description calculate delay between messages
* @param {integer} count - count of message
* @param {integer} duration - duration in ms
* @return {integer} delay time in ms
* @memberof Utils
*/
var CalculateDelay = function(count, duration) {
    if((duration > 0) && (count > 0)) {
        return 1.0 * duration / count;
    }
    return 0;
};

/**
* @function SetUpClientLogging
* @description setup client logging
* @param {string} logLevel - type to logging
* @memberof Utils
*/
var SetUpClientLogging = function (logLevel) {
    if (!logLevel) {
        return;
    }

    if (logLevel.toUpperCase() === 'TRANSPORT_DRV') {
        // proton: Log driver related events, e.g. initialization, end of stream, etc.
        process.env['DEBUG'] = 'rhea:events';
    } else if (logLevel.toUpperCase() === 'TRANSPORT_FRM') {
        // proton: Log frames into/out of the transport.
        process.env['DEBUG'] = 'rhea:frames';
    } else if (logLevel.toUpperCase() === 'TRANSPORT_RAW') {
        // proton: Log raw binary data into/out of the transport.
        process.env['DEBUG'] = 'rhea:raw';
    }
};

/**
* @function PrintError
* @description print error on stderr
* @param {string} errMsg - error message
* @memberof Utils
*/
var PrintError = function (errMsg) {
    console.error(formatter.FormatError(errMsg));
};

/**
* @function PrintStatistic
* @description print statistic of client
* @param {object} context - event context
* @memberof Utils
*/
var PrintStatistic = function (context) {
    console.log(formatter.FormatStats(StringifyStatObject(context)));
};

/**
* @function StringifyStatObject
* @description help function ro remove circuit reference in stats object
* @param {object} statistics - object with statistics
* @return {object} dict
* @memberof Utils
*/
var StringifyStatObject = function(statistics) {
    var cache = [];
    var str = JSON.stringify(statistics,
        //filter
        function(key, value) {
            if (typeof value === 'object' && value !== null) {
                if (cache.indexOf(value) !== -1) {
                    // Circular reference found or value is function, discard key
                    return;
                }
                // Store value in collection
                cache.push(value);
            }
            if ( key.toString().charAt(0) === '_') {
                return;
            }
            /* eslint-disable consistent-return */
            return value;
        });
    cache = null;
    return str;
};


/**
* @function ErrorHandler
* @description custom print error on output
* @param {object} message - string error message
* @memberof Utils
*/
var ErrorHandler = function (message) {
    this.name = 'ERROR';
    this.message = formatter.FormatError(message);
};

/////////////////////////////////////////////////////////////////
/**
 * @module Utils
 * @description Module with utils functions
 */

/** function for print message */
exports.PrintMessage = PrintMessage;
/** function for read content from file*/
exports.ReadContentFromFile = ReadContentFromFile;
/** function for calculate delay */
exports.CalculateDelay = CalculateDelay;
/** function for get time in ms */
exports.GetTime = GetTime;
/** function for setup lib logging */
exports.SetUpClientLogging = SetUpClientLogging;
/** function for print err */
exports.PrintError = PrintError;
/** function fot print statistics */
exports.PrintStatistic = PrintStatistic;
/** Custom error handler */
exports.ErrorHandler = ErrorHandler;
