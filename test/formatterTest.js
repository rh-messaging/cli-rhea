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

var Formatter = require('../lib/formatter.js').Formatter;
var expect = require('chai').expect;

describe('Formatter tests', function() {
    var message = {};
    message['body'] = 'test string';
    message['application_properties'] = {};
    message['message_annotations'] = {};

    //properties
    message['message_id'] = 'Msg id';
    message['user_id'] = 'User ID';
    message['group_id'] = 'group ID';
    message['group_sequence'] = 'ABCD';
    message['reply_to_group_id'] = 'group ID';
    message['subject'] = 'test subject';
    message['correlation_id'] = 'correlation id';
    message['content_type'] = 'string';
    message['reply_to'] = 'reply_to_queue';
    message['delivery_count'] = 0;

    message['to'] = 'queue';

    //message header
    message['durable'] = true;
    message['priority'] = 6;
    message['ttl'] = 2000;

    //application properties
    message.application_properties = {
        'test_property': 1,
        'test_property_2': 'test string value'
    };

    //message annotation
    message.message_annotations = {};

    describe('"Format interop"', function() {
        it('should be same string', function() {
            expect(Formatter.formatAsInteropDict(message)).is.equal('{"durable":True,"priority":6,"ttl":2000,"first-acquirer":None,"delivery-count":0,"id":"Msg id","user-id":"User ID","address":"queue","subject":"test subject","reply-to":"reply_to_queue","correlation-id":"correlation id","content-type":"string","content-encoding":None,"absolute-expiry-time":None,"creation-time":None,"group-id":"group ID","group-sequence":"ABCD","reply-to-group-id":"group ID","properties":{"test_property":1,"test_property_2":"test string value"},"content":"test string"}');
        });
    });
    describe('"Format dict"', function() {
        it('should be same string', function() {
            expect(Formatter.formatAsDict(message)).is.equal('{"durable":True,"priority":6,"ttl":2000,"first_acquirer":None,"delivery_count":0,"id":"Msg id","user-id":"User ID","to":"queue","subject":"test subject","reply-to":"reply_to_queue","correlation-id":"correlation id","content-type":"string","content-encoding":None,"absolute-expiry-time":None,"creation-time":None,"group-id":"group ID","group-sequence":"ABCD","reply-to-group-id":"group ID","properties":{"test_property":1,"test_property_2":"test string value"},"content":"test string","message-annotations":None}');
        });
    });
});