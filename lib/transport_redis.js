/**
 * Redis transport
 */

var redis = require('redis');

var count = 0;
var createClient = function (url) {
    var id = count++;
    var client = redis.createClient(url.port, url.hostname);
    if (url.auth) {
        var idx = url.auth.indexOf(':');
        client.auth((idx < 0) ? url.auth : url.auth.slice(idx + 1));
    }
    client.id = id;
    g_debug('Created client #' + id);
    client.on('end', function () {
        g_debug('Client disconnected #' + id);
    });
    client.on('error', function (err) {
        g_error(err);
    });
    return client;
};

var global_client;


/**
 * PUB/SUB object
 */

module.exports.pubSub = pubSub;

function pubSub(options) {
    this._options = options;
    this._prefix = 'stackio_pubsub_';
    global_client = createClient(this._options.transport_url);
    this._response = new pushPull(options);
    this._listeners = {};
    this._clients = {};
    return this;
}

pubSub.prototype.on = function (channel, callback) {
    channel = this._prefix + channel;
    var client = this._clients[channel];
    var self = this;
    if (!client) {
        client = createClient(this._options.transport_url);
        this._listeners[channel] = [];
        this._clients[channel] = client;
        if (client.closing === false) {
            client.subscribe(channel);
            g_debug('#' + client.id + ' SUBSCRIBE ' + channel);
        }
        client.on('message', function(chan, message) {
            var list = self._listeners[channel];
            message = JSON.parse(message);
            if (message.data !== null) {
                for (var i = list.length - 1; i >= 0; i--) {
                    list[i].apply(undefined, message.data);
                }
            }
        });
    }    
    this._listeners[channel].push(callback);
};

pubSub.prototype.addListener = pubSub.prototype.on;

pubSub.prototype.emit = function (channel /*, data... */) {
    var message = g_createMessage(g_objValues(arguments).slice(1));
    channel = this._prefix + channel;
    global_client.publish(channel, JSON.stringify(message));
    g_debug('#' + global_client.id + ' PUBLISH ' + channel);
};

pubSub.prototype.removeListener = function(channel, listener) {
    channel = this._prefix + channel;
    var list = this._listeners[channel];
    if (!list) {
        return;
    }
    var i = list.indexOf(listener);
    if (i > 0) {
        list.splice(i, 1);
        if (list.length == 0) {
            this.removeAllListeners(channel);
        }
    }
}

pubSub.prototype.removeAllListeners = function (channel) {
    channel = this._prefix + channel;
    if (this._clients[channel]) {
        delete this._listeners[channel];
        this._clients[channel].end();
        delete this._clients[channel];
    }
};


/**
 * PUSH/PULL object
 */

module.exports.pushPull = pushPull;

function pushPull(options) {
    this._options = options;
    this._emitCounters = {};
    global_client = createClient(this._options.transport_url);
    this._prefix = 'stackio_pushpull_';
    this._listeners = {};
    this._clients = {};
    return this;
}

pushPull.prototype.on = function (channel, callback) {
    channel = this._prefix + channel;
    var client = this._clients[channel];
    var self = this;
    if (!client) {
        client = createClient(this._options.transport_url);
        this._clients[channel] = client;
        this._listeners[channel] = [];
        var popCallback = function (err, data) {
            message = JSON.parse(data[1]);
            var list = self._listeners[channel];
            if (message.data !== null) {
                for (var i = list.length - 1; i >= 0; i--) {
                    list[i].apply(undefined, message.data);
                }
            }
            if (client.closing === false) {
                client.blpop(channel, 0, popCallback);
                g_debug('#' + client.id + ' BLPOP ' + channel);
            }
        }
        if (client.closing === false) {
            client.blpop(channel, 0, popCallback);
            g_debug('#' + client.id + ' BLPOP ' + channel);
        }
    }
    this._listeners[channel].push(callback);
};

pushPull.prototype.addListener = pushPull.prototype.on;

pushPull.prototype.emit = function (channel /*, data... */) {
    var orig_channel = channel;
    var data = g_objValues(arguments).slice(1);
    channel = this._prefix + channel;
    if (this._emitCounters[channel] === undefined)
        this._emitCounters[channel] = 0;
    // Checking the size of the queue every 10 messages
    if (this._emitCounters[channel] > 10) {
        var _this = this, args = data;
        args.unshift(orig_channel);
        global_client.llen(channel, function (err, len) {
            // If the length of the queue reaches 100 messages, ignoring
            // further pushes
            if (len > 100)
                g_debug('Warning: message queue is full, cannot push');
            else {
                _this._emitCounters[channel] = 0;
                _this.emit.apply(_this, args);
            }
        });
        return;
    }
    var message = g_createMessage(data);
    global_client.rpush(channel, JSON.stringify(message));
    // Destroying the queue after 30 sec of inactivity
    global_client.expire(channel, 30);
    this._emitCounters[channel] += 1;
    g_debug('#' + global_client.id + ' RPUSH ' + channel);
};

pushPull.prototype.removeListener = function(channel, listener) {
    channel = this._prefix + channel;
    var list = this._listeners[channel];
    if (!list) {
        return;
    }
    var i = list.indexOf(listener);
    if (i > 0) {
        list.splice(i, 1);
        if (list.length == 0) {
            this.removeAllListeners(channel);
        }
    }    
};

pushPull.prototype.removeAllListeners = function (channel) {
    channel = this._prefix + channel;
    if (this._clients[channel]) {
        // In case of push/pull, we can have a list that left
        global_client.del(this._prefix + channel);
        delete this._listeners[channel];
        this._clients[channel].end();
        delete this._clients[channel];
    }
};
