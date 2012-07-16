# Python API #

To instantiate a new client:

    client = StackIO()

The argument is a callback when the initialization is complete, which will
include either a fatal `error` message, or the `client` object.

Methods:
 * `expose(service_name, endpoint, context)` - Exposes a new stack.io service,
   where `service_name` is the name of the service, `endpoint` is the ZeroMQ
   endpoint to expose to, and `context` is the object to expose.
 * `use(service_name)` - Prepares a service to be used, returning back an
   object that you can make RPC calls against. `service_name` is the name of a
   service.
 * `services()` - Returns a list of services available.
 * `introspect(service_name)` - Introspects on the methods available
   for the given `service_name`.