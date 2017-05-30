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

//enum with return codes
var ReturnCodes = {
    OK: 0,
    Error: 1,
    Error_ARGS: 2,
    properties: {
        0: {description: 'results is ok'},
        1: {description: 'result isn\'t ok'},
        2: {description: 'wrong parsed arguments'}
    }
};

//formating and printing message
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

//reading content from file
var ReadContentFromFile = function (path) {
    try{
        var data = fs.readFileSync(path, 'utf8');
        return data;
    }catch(err) {
        PrintError(err);
        process.exit(ReturnCodes.Error);
    }
};

//function return current time in seconds
var GetTime = function () {
    return (0.001 * new Date().getTime());
};

var CalculateDelay = function(count, duration) {
    if((duration > 0) && (count > 0)) {
        return 1.0 * duration / count;
    }
};

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

var PrintError = function (errMsg) {
    console.error(formatter.FormatError(errMsg));
};

var PrintStatistic = function (context) {
    console.log(formatter.FormatStats(StringifyStatObject(context)));
};

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
            return value;
        });
    cache = null;
    return str;
};

/////////////////////////////////////////////////////////////////
exports.ReturnCodes = ReturnCodes;
exports.PrintMessage = PrintMessage;
exports.ReadContentFromFile = ReadContentFromFile;
exports.CalculateDelay = CalculateDelay;
exports.GetTime = GetTime;
exports.SetUpClientLogging = SetUpClientLogging;
exports.PrintError = PrintError;
exports.PrintStatistic = PrintStatistic;
