/*
 * Copyright 2023 Red Hat Inc.
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

let expect = require('chai').expect;
let optionsParser = require('../lib/optionsParser');

describe('options parser', () => {
    describe('parsing --conn-use-config-file', () => {
        let options = new optionsParser.SenderOptions()
        it('parse true value', () => {
            options.parseConnectionOptions(["--conn-use-config-file", "true"]);
            expect(options.useConfigFile).is.true
        });
        it('parse false value', () => {
            options.parseConnectionOptions(["--conn-use-config-file", "false"]);
            expect(options.useConfigFile).is.false
        });
        it('default to true with no value', () => {
            options.parseConnectionOptions(["--conn-use-config-file"]);
            expect(options.useConfigFile).is.true
        });
        it('default to false', () => {
            options.parseConnectionOptions([]);
            expect(options.useConfigFile).is.false
        });
    });
    describe('parsing --conn-reconnect', () => {
        let options = new optionsParser.SenderOptions()
        it('default to true with no value', () => {
            options.parseConnectionOptions(["--conn-ssl"]);
            expect(options.reconnect).is.true
        });
        it('default to true', () => {
            options.parseConnectionOptions([]);
            expect(options.reconnect).is.true
        });
    });
});
