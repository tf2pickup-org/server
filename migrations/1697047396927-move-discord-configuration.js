/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

const { config } = require('dotenv');
const { MongoClient } = require('mongodb');
const { Client } = require('discord.js');

module.exports.up = async function (next) {
  config();

  const mongo = await MongoClient.connect(process.env.MONGODB_URI);
  const discordConfig = await mongo
    .db()
    .collection('configuration')
    .findOne({ key: 'discord.guilds' });

  if (!discordConfig && process.env.DISCORD_BOT_TOKEN) {
    const client = new Client({
      intents: [1, 8, 512],
    });

    await client.login(process.env.DISCORD_BOT_TOKEN);

    if (process.env.DISCORD_GUILD) {
      await client.guilds.fetch();
      const guild = client.guilds.cache.find(
        (g) => g.name === process.env.DISCORD_GUILD,
      );
      console.log(`guild ${process.env.DISCORD_GUILD} resolved to ${guild.id}`);
      const channels = await guild.channels.fetch();
      const queueNotificationsChannel = channels.find(
        (c) => c.name === process.env.DISCORD_QUEUE_NOTIFICATIONS_CHANNEL,
      );
      console.log(
        `channel ${process.env.DISCORD_QUEUE_NOTIFICATIONS_CHANNEL} resolved to ${queueNotificationsChannel.id}`,
      );
      const adminNotificationsChannel = channels.find(
        (c) => c.name === process.env.DISCORD_ADMIN_NOTIFICATIONS_CHANNEL,
      );
      console.log(
        `channel ${process.env.DISCORD_ADMIN_NOTIFICATIONS_CHANNEL} resolved to ${adminNotificationsChannel.id}`,
      );

      const roles = await guild.roles.fetch();
      const queueNotificationsMentionRole = roles.find(
        (r) => r.name === process.env.DISCORD_QUEUE_NOTIFICATIONS_MENTION_ROLE,
      );
      console.log(
        `role ${process.env.DISCORD_QUEUE_NOTIFICATIONS_MENTION_ROLE} resolved to ${queueNotificationsMentionRole.id}`,
      );

      const config = {
        id: guild.id,
        substituteNotifications: {
          channel: queueNotificationsChannel.id,
          role: queueNotificationsMentionRole.id,
        },
        queuePrompts: {
          channel: queueNotificationsChannel.id,
          bumpPlayerThresholdRatio: 0.5,
        },
        adminNotifications: {
          channel: adminNotificationsChannel.id,
        },
      };
      await mongo
        .db()
        .collection('configuration')
        .insertOne({ key: 'discord.guilds', value: [config] });
    }
  } else {
    console.log('not migrating discord configuration');
    return next();
  }
};
