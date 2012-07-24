# Stack.io #

Stack.io is a distributed communication framework for web apps and server-side
processes.

Communication among processes on the server-side is efficient because there is
no intermediate broker. From the client-side, requests come into a node.js
process via socket.io. Express-like middleware then processes these requests
to add things like authentication and authorization.

To run:

    npm install -g stack.io
    stackio

Or, to run the tests:

    git clone https://github.com/dotcloud/stack.io.git
    cd stack.io
    make
    ./test_runner

...then navigate to `http://localhost:8000`.

A number of stack.io examples are available in
[the examples directory](https://github.com/dotcloud/stack.io/tree/master/examples).

## Clients ##

### Webapps ###

To use stack.io from a webapp, include the script in `./bin/client/stack.io.js`
in your webapp. Then instantiate a new client:

    stack.io({}, function(error, client) {
        ...
    });

From there, you can start using a service, e.g.:

    client.use("test-service", function(error, context) {
        context.sayHello("World", function(error, response, more) {
            console.log(error, response, more);
        });
    });

If you have authentication setup, you'll want to login before using a service.

An example login using normal (username+password) authentication:

    client.login("username", "password", function(error, permissions) {
        ...
    });

You can also do OAuth, if you run the server with OAuth authentication
middleware. See `./apps/oauth` for an example.

To logout, simply call `client.logout(callback)`.

Stack.io clients also have a couple of utility methods. To list available
services, call `client.services()`. To introspect on the methods of a
specific service, call `client.introspect("service_name", callback)`.

Here's a full example:

    stack.io({host: "http://localhost:8080"}, function(error, client) {
        client.login("demo", "demo-password", function(error) {
            client.use("example-node", function(error, context) {
                context.add42(20, function(error, response) {
                    console.log(response); //=> prints 62
                });
            });
        });
    });

[See the full API for webapps](https://github.com/dotcloud/stack.io/blob/master/doc/api/client-webapps.md).

### Node.js ###

To use stack.io from node.js, require the module and instantiate a new client:

    var stack = require("stack.io");

    stack.io({}, function(error, client) {
        ...
    });

From there, you can start using a service, e.g.:

    client.use("test-service", function(error, context) {
        context.sayHello("World", function(error, response, more) {
            console.log(error, response, more);
        });
    });

The node.js client can also expose services, e.g.:

    client.expose("test-service", {
        sayHello: function(name, reply) {
            reply("Hello, " + name + "!");
        }
    });

Stack.io clients also have a couple of utility methods. To list available
services, call `client.services()`. To introspect on the methods of a
specific service, call `client.introspect("service_name", callback)`.

Here's a full example:

    var stack = require("stack.io");

    stack.io(null, function(error, client) {
        client.expose("example-node", {
            addMan: function(sentence, reply) {
                reply(null, sentence + ", man!", false);
            },

            add42: function(n, reply) {
                reply(null, n + 42, false);
            },

            iter: function(from, to, step, reply) {
                for(i=from; i<to; i+=step) {
                    reply(null, i, true);
                }

                reply(null, undefined, false);
            },

            simpleError: function(reply) {
                reply("This is an error, man!", undefined, false);
            },

            objectError: function(reply) {
                reply(new Error("This is an error object, man!"), undefined, false);
            },

            streamError: function(reply) {
                reply("This is a stream error, man!", undefined, true);

                var error = false;
                
                try {
                    reply(null, "Should not happen", false);
                } catch(e) {
                    error = true;
                }

                if(!error) {
                    throw new Error("An error should have been thrown");
                }
            },

            quiet: function(reply) {
                setTimeout(function() {
                    reply(null, "Should not happen", false);
                }, 31 * 1000);
            },

            notAuthorized: function(reply) {
                reply(null, "Should not happen", false);
            }
        });
    });

[See the full API for node.js](https://github.com/dotcloud/stack.io/blob/master/doc/api/client-node.md).

## Server ##

The stack.io server proxies requests that come from webapps and make the
appropriate backend calls. It also handles things like authentication and
authorization.

Servers have pluggable connectors and middleware. Connectors expose new methods
for browser-side users to make requests; currently our only connector uses
[socket.io](http://socket.io/). Middleware takes requests and conducts
transformations, or provides a response for the connector to send back.
Stack.io has a number of built-in middleware to handle debugging,
authentication, request proxying, etc.

You can create a new server programmatically, but for most use cases, the CLI
tool should fulfill your needs. To run it with normal authentication:

    stackio --auth normalauth --config <normal auth config file>

([an example config file is available at examples/src/normal.json](https://github.com/dotcloud/stack.io/blob/master/examples/src/normal.json)).

Or if you want to use OAuth:

    stackio --auth oauth --config <oauth config file>

([an example config file is available at examples/src/oauth.json](https://github.com/dotcloud/stack.io/blob/master/examples/src/oauth.json)).

This will run stack.io on port 8080.

If you want to run a server programmatically, e.g. to add custom middleware,
require the module and instantiate a new server:

    var stack = require("stack.io");
    var server = new stack.ioServer();
    ...

Here's a full example:

    var stack = require("stack.io"),
        express = require("express");

    //Create the express app
    var expressApp = express.createServer();

    expressApp.configure(function() {
        expressApp.use(express.bodyParser());
    });

    //Create the stack.io server
    var server = new stack.ioServer();

    //Print all request for debugging
    server.middleware(/.+/, /.+/, /.+/, stack.printMiddleware);

    //Use the socket.io connector
    server.connector(new stack.SocketIOConnector(expressApp));

    //Use normal authentication with an initial configuration that has a user
    //'demo' with the password 'demo-password'. It is a member of the group
    //'root' which can run any method on any service.
    stack.useNormalAuth(server, /.+/, {
        users: {
            demo: {
                password: "demo-password",
                groups: ["root"]
            }
        },

        groups: {
            root: {
                ".+": [".+"]
            }
        }
    });

    //Add middleware necessary for making ZeroRPC calls
    server.middleware(/.+/, /_stackio/, /.+/, stack.builtinsMiddleware);
    server.middleware(/.+/, /.+/, /.+/, stack.zerorpcMiddleware("tcp://127.0.0.1:27615"));

    //Start!
    expressApp.listen(8080);
    server.listen();

[See the full server API for more details](https://github.com/dotcloud/stack.io/blob/master/doc/api/server.md).
