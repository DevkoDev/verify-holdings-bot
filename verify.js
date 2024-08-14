const fs = require("fs");
const moment = require("moment");
const config = require("./config.json");
const Captcha = require("@haileybot/captcha-generator");
const { Client, Intents, MessageActionRow, MessageButton, MessageSelectMenu, MessageAttachment } = require("discord.js");

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MEMBERS],
});
let servers_installed = JSON.parse(fs.readFileSync("database.json"));

function shuffle(array) {
  let currentIndex = array.length,
    randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex != 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }

  return array;
}

String.prototype.shuffle = function () {
  var a = this.split(""),
    n = a.length;

  for (var i = n - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a.join("");
};

function makeid(length) {
  var result = "";
  var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

client.login(config.bot_token);

client.on("ready", () => {
  console.log("ready");
});
client.on("messageCreate", async (message) => {
  if (message.content.startsWith("!install") && message.inGuild() && message.author.id == "688384839023329291") {
    if (message.mentions.roles.size == 1) {
      servers_installed[message.guild.id] = {
        users: {},
        role: message.mentions.roles.first().id,
      };
      const row = new MessageActionRow().addComponents(new MessageButton().setCustomId("VERIFY").setLabel("Verify").setStyle("PRIMARY"));

      await message.channel.send({
        content: "To access the server, you need to pass the verification.",
        components: [row],
      });
    }
  }
});

setInterval(function () {
  Object.keys(servers_installed).forEach((serverId) => {
    if (servers_installed[serverId].users !== undefined) {
      Object.keys(servers_installed[serverId].users).forEach((userId) => {
        if (servers_installed[serverId].users[userId] !== undefined) {
          if (servers_installed[serverId].users[userId].passed == false) {
            servers_installed[serverId].users[userId].passed = undefined;
          }
          if (moment().unix() > servers_installed[serverId].users[userId].timestamp + config.timeout * 60) {
            servers_installed[serverId].users[userId].passed = undefined;
          }
        }
      });
    }
  });
  fs.writeFileSync("database.json", JSON.stringify(servers_installed));
}, 2 * 60 * 1000);
client.on("interactionCreate", async (interaction) => {
  if (interaction.customId == "VERIFY_ANSWER" && interaction.isSelectMenu()) {
    if (interaction.values.includes(servers_installed[interaction.guild.id].users[interaction.user.id].correctAnswerId) && moment().unix() < servers_installed[interaction.guild.id].users[interaction.user.id].timestamp + config.timeout * 60 && servers_installed[interaction.guild.id].users[interaction.user.id].passed == undefined) {
      servers_installed[interaction.guild.id].users[interaction.user.id].passed = true;
      interaction.member.roles.add(servers_installed[interaction.guild.id].role);
      await interaction.reply({
        content: "The role has been added.",
        ephemeral: true,
      });
    } else {
      if (interaction.values.includes(servers_installed[interaction.guild.id].users[interaction.user.id].correctAnswerId) == false) {
        servers_installed[interaction.guild.id].users[interaction.user.id].passed = false;
        await interaction.reply({
          content: "Not the correct answer.",
          ephemeral: true,
        });
      }
      if (moment().unix() < servers_installed[interaction.guild.id].users[interaction.user.id].timestamp + config.timeout * 60 == false) {
        servers_installed[interaction.guild.id].users[interaction.user.id].passed = false;
        await interaction.reply({
          content: "Too late to submit the answer.",
          ephemeral: true,
        });
      }

      if (servers_installed[interaction.guild.id].users[interaction.user.id].passed !== undefined) {
        servers_installed[interaction.guild.id].users[interaction.user.id].passed = false;
        await interaction.reply({
          content: "Try a new capctha after 2 minutes.",
          ephemeral: true,
        });
      }
    }
  }

  if (interaction.customId == "VERIFY" && interaction.isButton()) {
    if (servers_installed[interaction.guild.id] == undefined) {
      await interaction.reply({
        content: "Server not yet installed contact <@688384839023329291>.",
        ephemeral: true,
      });
      return;
    }
    if (servers_installed[interaction.guild.id].users[interaction.user.id] !== undefined) {
      if (servers_installed[interaction.guild.id].users[interaction.user.id].passed == false || servers_installed[interaction.guild.id].users[interaction.user.id].passed == true) {
        return;
      }
    }

    let captcha = new Captcha();
    let correctAnswerId = makeid(10);

    servers_installed[interaction.guild.id].users[interaction.user.id] = {
      correctAnswerId: correctAnswerId,
      timestamp: moment().unix(),
    };

    let answers = [];

    answers.push({
      label: captcha.value,
      description: "",
      value: correctAnswerId,
    });

    for (let index = 1; index <= 9; index++) {
      let wA = captcha.value.shuffle();
      if (wA !== captcha.value) {
        answers.push({
          label: wA,
          description: "",
          value: makeid(10),
        });
      }
    }

    const row = new MessageActionRow().addComponents(new MessageSelectMenu().setCustomId("VERIFY_ANSWER").setPlaceholder("Nothing selected").setMinValues(1).setMaxValues(1).addOptions(shuffle(answers)));

    interaction.reply({
      content: "Please select the correct answer! ``Note: u can only try once per 2 minutes``",
      components: [row],
      files: [new MessageAttachment(captcha.JPEGStream, "captcha.jpeg")],
      ephemeral: true,
    });
  }
});
