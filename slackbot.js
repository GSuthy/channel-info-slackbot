var request = require('request');
var Vow = require('vow');
var qs = require('querystring');
var extend = require('extend');
var WebSocket = require('ws');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

// helper function for finding
function find(arr, params) {
    var result = {};

    arr.forEach(function(item) {
        if (Object.keys(params).every(function(key) {
                return item[key] === params[key];
            })) {
            result = item;
        }
    });

    return result;
}

// helper function for testing data validity
function assert(condition, error) {
    if (!condition) {
        throw new Error('[Slack Bot Error] ' + error);
    }
}

/**
 * @param {object} params
 * @constructor
 */
function Bot(params) {
    this.token = params.token;
    this.name = params.name;

    assert(params.token, 'token must be defined');
    this.login();
}

util.inherits(Bot, EventEmitter);

/**
 * Starts a Real Time Messaging API session
 */
Bot.prototype.login = function() {
    this._api('rtm.start').then(function(data) {
        this.wsUrl = data.url;
        this.channels = data.channels;
        this.users = data.users;
        this.ims = data.ims;
        this.groups = data.groups;

        this.emit('start');

        this.connect();
    }.bind(this));
};

/**
 * Establish a WebSocket connection
 */
Bot.prototype.connect = function() {
    this.ws = new WebSocket(this.wsUrl);

    this.ws.on('open', function(data) {
        this.emit('open', data);
    }.bind(this));

    this.ws.on('close', function(data) {
        this.emit('close', data);
    }.bind(this));

    this.ws.on('message', function(data) {
        try {
            this.emit('message', JSON.parse(data));
        } catch ( e ) {
            console.log(e);
        }
    }.bind(this));
};

/**
 * Get channels
 * @returns {vow.Promise}
 */
Bot.prototype.getChannels = function() {
    return this._api('channels.list');
};

/**
 * Get users
 * @returns {vow.Promise}
 */
Bot.prototype.getUsers = function() {
    return this._api('users.list');
};

/**
 * Get groups
 * @returns {vow.Promise}
 */
Bot.prototype.getGroups = function() {
    return this._api('groups.list');
};

/**
 * Get user by name
 * @param {string} name
 * @returns {object}
 */
Bot.prototype.getUser = function(name) {
    return this.getUsers().then(function(data) {
        return find(data.members, {
            name: name
        });
    });
};

/**
 * Get channel by name
 * @param {string} name
 * @returns {object}
 */
Bot.prototype.getChannel = function(name) {
    return this.getChannels().then(function(data) {
        return find(data.channels, {
            name: name
        });
    });
};

/**
 * Get group by name
 * @param {string} name
 * @returns {object}
 */
Bot.prototype.getGroup = function(name) {
    return this.getGroups().then(function(data) {
        return find(data.groups, {
            name: name
        });
    });
};

/**
 * Get channel ID
 * @param {string} name
 * @returns {string}
 */
Bot.prototype.getChannelId = function(name) {
    return this.getChannel(name).then(function(channel) {
        return channel.id;
    });
};

/**
 * Get group ID
 * @param {string} name
 * @returns {string}
 */
Bot.prototype.getGroupId = function(name) {
    return this.getGroup(name).then(function(group) {
        return group.id;
    });
};

/**
 * Get "direct message" channel ID
 * @param {string} name
 * @returns {vow.Promise}
 */
Bot.prototype.getChatId = function(name) {
    return this.getUser(name).then(function(data) {

        var chatId = find(this.ims, {
            user: data.id
        }).id;

        return chatId || this.openIm(data.id);
    }.bind(this)).then(function(data) {
        return typeof data === 'string' ? data : data.channel.id;
    });
};

/**
 * Opens a "direct message" channel with another member of your Slack team
 * @param {string} userId
 * @returns {vow.Promise}
 */
Bot.prototype.openIm = function(userId) {
    return this._api('im.open', {
        user: userId
    });
};

/**
 * Posts a message to a channel by ID
 * @param {string} id - channel ID
 * @param {string} text
 * @param {object} params
 * @returns {vow.Promise}
 */
Bot.prototype.postMessage = function(id, text, params) {
    params = extend({
        text: text,
        channel: id,
        username: this.name
    }, params || {});

    return this._api('chat.postMessage', params);
};

/**
 * Posts a message to user by name
 * @param {string} name
 * @param {string} text
 * @param {object} params
 * @param {function} cb
 * @returns {vow.Promise}
 */
Bot.prototype.postMessageToUser = function(name, text, params, cb) {
    return this._post('user', name, text, params, cb);
};

/**
 * Posts a message to channel by name
 * @param {string} name
 * @param {string} text
 * @param {object} params
 * @param {function} cb
 * @returns {vow.Promise}
 */
Bot.prototype.postMessageToChannel = function(name, text, params, cb) {
    return this._post('channel', name, text, params, cb);
};

/**
 * Posts a message to group by name
 * @param {string} name
 * @param {string} text
 * @param {object} params
 * @param {function} cb
 * @returns {vow.Promise}
 */
Bot.prototype.postMessageToGroup = function(name, text, params, cb) {
    return this._post('group', name, text, params, cb);
};

/**
 * Common method for posting messages
 * @param {string} type
 * @param {string} name
 * @param {string} text
 * @param {object} params
 * @param {function} cb
 * @returns {vow.Promise}
 * @private
 */
Bot.prototype._post = function(type, name, text, params, cb) {
    var method = ({
        'group': 'getGroupId',
        'channel': 'getChannelId',
        'user': 'getChatId'
    })[type];

    if (typeof params === 'function') {
        cb = params;
        params = null;
    }

    return this[method](name).then(function(itemId) {
        return this.postMessage(itemId, text, params);
    }.bind(this)).always(function(data) {
        if (cb) {
            cb(data._value);
        }
    });
};

/**
 * Posts a message to group | channel | user
 * @param {string} name
 * @param {string} text
 * @param {object} params
 * @param {function} cb
 * @returns {vow.Promise}
 */
Bot.prototype.postTo = function(name, text, params, cb) {
    return Vow.all([this.getChannels(), this.getUsers(), this.getGroups()]).then(function(data) {

        var all = [].concat(data[0].channels, data[1].members, data[2].groups);
        var result = find(all, {
            name: name
        });

        assert(Object.keys(result).length, 'wrong name');

        if (result.is_channel) {
            return this.postMessageToChannel(name, text, params, cb);
        } else if (result.is_group) {
            return this.postMessageToGroup(name, text, params, cb);
        } else {
            return this.postMessageToUser(name, text, params, cb);
        }
    }.bind(this));
};

/**
 * Send request to API method
 * @param {string} methodName
 * @param {object} params
 * @returns {vow.Promise}
 * @private
 */
Bot.prototype._api = function(methodName, params) {
    params = extend(params || {}, {
        token: this.token
    });

    var path = methodName + '?' + qs.stringify(params);

    var data = {
        url: 'https://slack.com/api/' + path
    };

    return new Vow.Promise(function(resolve, reject) {

        request.get(data, function(err, request, body) {
            if (err) {
                reject(err);

                return false;
            }

            try {
                body = JSON.parse(body);

                // Response always contain a top-level boolean property ok,
                // indicating success or failure
                if (body.ok) {
                    resolve(body);
                } else {
                    reject(body);
                }

            } catch ( e ) {
                reject(e);
            }
        });
    });
};

module.exports = Bot;
