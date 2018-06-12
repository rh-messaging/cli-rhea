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
const formatter = require('./formatter.js');
const fs = require('fs');

class Utils {
    /**
    * @method PrintMessage
    * @static
    * @description call print method by format type
    * @param {object} message - message dict
    * @param {string} format - format type of message out
    * @memberof Utils
    */
    static printMessage(message, format) {
        let printFunction = console.log;
        if(typeof window !== 'undefined') {
            printFunction = Utils.appendHtmlData;
        }
        if(format === 'body') {
            printFunction(formatter.FormatBody(message));
        }else if (format === 'dict') {
            printFunction(formatter.FormatAsDict(message));
        }else if (format === 'upstream') {
            printFunction(formatter.FormatAsUpstream(message));
        }else if (format === 'interop') {
            printFunction(formatter.FormatAsInteropDict(message));
        }else if (format === 'json') {
            printFunction(formatter.FormatAsJson(message));
        }
    }

    /**
    * @method AppendHtmlData
    * @static
    * @description append formatted message as div into html page
    * @param {string} message - message dict
    * @memberof Utils
    */
    static appendHtmlData(message) {
        var node = document.createTextNode(message);
        var div = document.createElement('div');
        div.appendChild(node);
        document.body.appendChild(div);
    }

    /**
    * @method ReadContentFromFile
    * @static
    * @description read content from file
    * @param {string} path - path to file to read
    * @return {string} content from file
    * @memberof Utils
    */
    static readContentFromFile(path) {
        try{
            const data = fs.readFileSync(path, 'utf8');
            return data;
        }catch(err) {
            throw new Utils.errorHandler(err);
        }
    }

    /**
    * @method GetTime
    * @static
    * @description get curent time in ms
    * @return {integer} time in ms
    * @memberof Utils
    */
    static getTime() {
        return (0.001 * new Date().getTime());
    }

    /**
    * @method CalculateDelay
    * @static
    * @description calculate delay between messages
    * @param {integer} count - count of message
    * @param {integer} duration - duration in ms
    * @return {integer} delay time in ms
    * @memberof Utils
    */
    static calculateDelay(count, duration) {
        if((duration > 0) && (count > 0)) {
            return 1.0 * duration / count;
        }
        return 0;
    }

    /**
    * @method SetUpClientLogging
    * @static
    * @description setup client logging
    * @param {string} logLevel - type to logging
    * @memberof Utils
    */
    static setUpClientLogging(logLevel) {
        if (!logLevel) {
            return;
        }

        if (logLevel.toUpperCase() === 'TRANSPORT_DRV') {
            // proton: Log driver related events, e.g. initialization, end of stream, etc.
            process.env.DEBUG = 'rhea:events';
        } else if (logLevel.toUpperCase() === 'TRANSPORT_FRM') {
            // proton: Log frames into/out of the transport.
            process.env.DEBUG = 'rhea:frames';
        } else if (logLevel.toUpperCase() === 'TRANSPORT_RAW') {
            // proton: Log raw binary data into/out of the transport.
            process.env.DEBUG = 'rhea:raw';
        }
    }

    /**
    * @method PrintStatistic
    * @static
    * @description print statistic of client
    * @param {object} context - event context
    * @memberof Utils
    */
    static printStatistic(context) {
        console.log(formatter.FormatStats(Utils.stringifyStatObject(context)));
    }

    /**
    * @method StringifyStatObject
    * @static
    * @description help function ro remove circuit reference in stats object
    * @param {object} statistics - object with statistics
    * @return {object} dict
    * @memberof Utils
    */
    static stringifyStatObject(statistics) {
        let cache = [];
        const str = JSON.stringify(statistics,
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
    }


    /**
    * @method ErrorHandler
    * @static
    * @description custom print error on output
    * @param {object} message - string error message
    * @memberof Utils
    */
    static errorHandler(message) {
        let m = message;
        if (typeof message === 'object') {
            m = JSON.stringify(message);
        }
        this.name = 'ERROR';
        this.message = m;
    }
}

/////////////////////////////////////////////////////////////////
/**
 * @module Utils
 * @description Module with utils functions
 */

/** function for print message */
module.exports = {
    Utils: Utils
};
