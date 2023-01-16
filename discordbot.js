const Client = require('@notionhq/client').Client
const Discord = require('discord.js');
const { GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const { createClient }= require('@supabase/supabase-js');
require('dotenv').config();

//Temp Notion stuff
const notion = new Client({ auth: process.env.NOTION_KEY })
const db = process.env.NOTION_DB;

//supabase stuff
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const client = new Discord.Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
  });

//Log inyo discord bot
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

//when message is sent in any server/channel the bot can see
client.on('messageCreate', message => {
    let name;
    let channel;

    if (message.guild.name.includes('News.Bond')) {
        //this is an announcement that we subscribe to in News.Bond
        //message.author.tag from followed announcements is {SERVER NAME}#{CHANNEL}#0000
      const hashIndex = message.author.tag.indexOf('#');
      name = message.author.tag.substring(0, hashIndex - 1);
      channel = message.author.tag.substring(hashIndex + 1, message.author.tag.length - 5);
    } else {
        //this is the bot reading from a separate server
      name = message.guild.name;
      channel = message.channel.name;
    }
    //only process messages from announcement channels
    //TODO: process messages from announcment typoe channels (e.g. #🗞|news-stand from Doodles) This is only needed for when the bot is in the other server
    if (message.channel.name.includes('announcements')) {
      console.log(`${name}: ${message.content}, ${message.id}, ${channel}`);
      let msg = {
        "id": message.id,
        "server": name,
        "message": message.content,
        "date": new Date(Date.now()),
        "channel": channel
      };
      //filter out the subscription messages
      if(channel != "#")
      {
        checkDB(msg);
      }

    }
  });

  //Temp function for adding announcements to the Notion db
  async function checkDB(msg){
    let subId = null;
    const { data, error } = await supabase
  .from('Subscription')
  .select(`id, name`)
  //console.log(data, error);

  data.forEach(datum => {
    console.log(datum.name)
  if(datum.name == msg.server)
  {
    subId = datum.id;
  }
  })

  console.log(subId);
  if(subId != null)
  {
    const { error } = await supabase
  .from('Post')
  .insert({ subscriptionId: subId, text: msg.message, id: msg.id, postedAt: msg.date})
    console.log(error);
  }
  }

  //temp notion stuff
  async function addItem(msg) {
    console.log("adding to notion");
    try {
      const response = await notion.pages.create({
        parent: { database_id: db },
        properties: {
          title: { 
            title:[
              {
                "text": {
                  "content": msg.server
                }
              }
            ]
          },
          "channel": {
            "rich_text": [{
              "text": 
              {
                "content": msg.channel
              }
            }]
          },
          "message": {
            "rich_text": [{
               "text": {
                "content": msg.message
              }}]
          },
          "id": {
            "rich_text": [{
              "text": {
                "content": msg.id
              }
            }]
          },
          "timestamp": {
            "date": {
              "start": msg.date
            }
          }
        
      }})
      console.log(response)
      console.log("Success! Entry added.")
    } catch (error) {
      console.error("error: " + error)
    }
  }

client.login(process.env.DISCORD_API_KEY);