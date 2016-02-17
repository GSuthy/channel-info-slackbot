var SlackBot = require('./slackbot');
var config = require('./config');

// create a Bot
var settings = {
    token: config.slack.apiToken,
    name: 'Channel-Info'
};

var bot = new SlackBot(settings);

// get the channels when the app starts
var channels = [];
var getChannels = function() {
    bot.getChannels().then(function(data) {
        if (data.hasOwnProperty('channels') && data.channels.length > 0) {
            channels = data.channels;
        }
    });
};

bot.on('start', function() {
    console.log('--- Starting Channel Info Slack Bot ---');
    getChannels();
});

// post channel info when they are created, updated, deleted, archived, or unarchived
bot.on('message', function(data) {
    var params = {
        icon_emoji: ':oit:'
    };
    var channelModified = false;
    var message = '';
    if (data.type === 'channel_created') {
        message = '<#' + data.channel.id + '|' + data.channel.name + '> has been created.';
        channelModified = true;
    } else if (data.type === 'channel_deleted') {
        var deletedChannel;
        for (var i = 0; i < channels.length; i++) {
            if (channels[i].id === data.channel) {
                deletedChannel = channels[i];
                break;
            }
        }
        message = '#' + deletedChannel.name + ' has been deleted.';
        channelModified = true;
    } else if (data.type === 'channel_rename') {
        var renamedChannel;
        for (var i = 0; i < channels.length; i++) {
            if (channels[i].id === data.channel.id) {
                renamedChannel = channels[i];
                break;
            }
        }
        message = '#' + renamedChannel.name + ' has been renamed to <#' + data.channel.id + '|' + data.channel.name + '>.';
        channelModified = true;
    } else if (data.type === 'channel_archive') {
        var archivedChannel;
        for (var i = 0; i < channels.length; i++) {
            if (channels[i].id === data.channel) {
                archivedChannel = channels[i];
                break;
            }
        }
        message = '<#' + archivedChannel.id + '|' + archivedChannel.name + '> has been archived.';
        channelModified = true;
    } else if (data.type === 'channel_unarchive') {
        var unarchivedChannel;
        for (var i = 0; i < channels.length; i++) {
            if (channels[i].id === data.channel) {
                unarchivedChannel = channels[i];
                break;
            }
        }
        message = '<#' + unarchivedChannel.id + '|' + unarchivedChannel.name + '> has been unarchived.';
        channelModified = true;
    }

    // only post a message if one of the above if conditions was met
    if (channelModified) {
        // send message to slack
        bot.postMessageToChannel('howtoslack', message, params);
        // get the updated channel list
        getChannels();
    }
});
