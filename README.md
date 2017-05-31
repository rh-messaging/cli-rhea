# Rhea nodejs client
Rhea testing client is javascript client built on [RHEA](https://www.npmjs.com/package/rhea) amqp library.

[![Build status](https://ci.appveyor.com/api/projects/status/08ivt2jny85oon8o?svg=true)](https://ci.appveyor.com/project/dkornel/rhea-nodejs-client)

### Installation

rhea-nodejs-client requires [Node.js](https://nodejs.org/) v0.10+ to run.

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
$ cli-rhea-sender --broker "username:password@localhost:5672" --address "queue_test" --count 2 --msg-content "text message" --log-msgs dict
$ cli-rhea-receiver --broker "username:password@localhost:5672" --address "queue_test" --count 2 --log-msgs dict
```

Using in script or node

```js
var rhea_client = require('cli-rhea');
var opts = rhea_client.Options;
var sender = rhea_client.SenderClient;

opts.broker('username:password@localhost:5672');
opts.address = 'queue_test';
opts.count = 2;
opts.msgContent = 'text message';

sender.Run(opts);
```

### Docker
To build image with CENTOS7 and rhea-nodejs-client use Dockerfile in project lib:
```sh
docker build -t cli-rhea-image
```

Or you can use [image from dockerhub](https://hub.docker.com/r/kornysd/rhea-nodejs-client/)
```sh
docker pull kornysd/cli-rhea
```



License
----

Apache v2
