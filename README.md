# Channel Info Slack Bot

This bot posts to BYU/OIT Slack whenever a channel is created, updated, or deleted. It uses sockets to connect to [Slack's Real Time Messaging API](https://api.slack.com/rtm). It uses a modified version of the [SlackBot](https://www.npmjs.com/package/slackbots) Node module to do most of the work. The modified Slackbot code is located in `slackbot.js`. The rest of the code is located in `server.js`. There is a config file with a Slack token used to authenticate with the Slack RTM API. In Slack there is a bot configured in order to authenticate. The bot is called the Channel-Info bot in slack.

# Set up in Docker on AWS
`docker build -t byu-slack-channel-info . && docker run -d --name slack-channel-info byu-slack-channel-info`

# Disclaimer
I, [Jesse Millar](https://github.com/jessemillar), do not claim responsibility for this Slackbot in its current rendition. I've merely performed housecleaning and uploaded the code to GitHub.
