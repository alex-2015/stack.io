# Webapp API #

To create a new client, include the script in `./bin/client/stack.io.js` in your
webapp. Then instantiate a new client:

    stack.io(options, function(error, client) {
        ...
    });

Allowable `options`:

 * `host` (string) - The stack.io host.
 * `timeout` (number) - The timeout for function calls in seconds.

The callback is executed when initialization is complete, and will include
either a fatal `error` message, or the `client` object.

Methods:
 * `use(serviceName, callback)` - Prepares a service to be used. `serviceName`
   is the name of a service and `callback` is a function to call when the
   service is ready. `callback` should be of the form
   `function(error, context)` where `context` is the service's object on which
   you can make calls.
 * `login(credentials..., callback)` - Logs a user in. Credentials vary
   depending on the authentication middleware used. The default authenticator
   middleware requires a username and password. In the background, this acts
   like a normal service method call on the magic service `_stackio`.
 * `logout(callback)` - Logs the user out. `callback` is called when logout
   completes. In the background, this acts like a normal service method call
   on the magic service `_stackio`.
 * `services()` - Returns a list of services available.
 * `introspect(service, callback)` - Introspects on the methods available
   for a given `service`. `callback` is called when introspection is complete,
   and must be of the form `function(error, res)` where `res` is the result.