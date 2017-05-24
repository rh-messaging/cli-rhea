# Rhea nodejs client
Rhea client is javascript client built on [RHEA](https://www.npmjs.com/package/rhea) amqp library.


### Installation

Dillinger requires [Node.js](https://nodejs.org/) v0.10+ to run.

Install to global env, if you would like use client as cmd program.

```sh
$ npm install rhea-nodejs-client -g
```

For standart using install to local env.

```sh
$ npm install rhea-nodejs-client
```

### Using

Using cmd client part

```sh
$ rhea-sender-client --broker "username:password@localhost:5672" --address "queue_test" --count 2 --msg-content "text message" --log-msgs dict
$ rhea-receiver-client --broker "username:password@localhost:5672" --address "queue_test" --count 2 --log-msgs dict
```

Using in script or node

```js
var rhea_client = require('rhea-nodejs-client');
var opts = rhea_client.Options;
var sender = rhea_client.SenderClient;

opts.broker('username:password@localhost:5672');
opts.address = 'queue_test';
opts.count = 2;
opts.content = 'text message';

sender.Run(opts);
```

### Docker
rhea-nodejs-client is very easy to install and deploy in a Docker container.


License
----

Apache v2


**Free Software, Hell Yeah!**
