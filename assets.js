const config = require("./config.json");
let database = require("./database.json");
const moment = require("moment");
const fs = require("fs");
const ethers = require("ethers");
const { Client, Intents, MessageActionRow, MessageButton } = require("discord.js");

const provider = new ethers.providers.InfuraProvider("mainnet", config.infura_apikey);
const contract = new ethers.Contract(
  config.contract_address,
  [
    {
      inputs: [
        {
          internalType: "address",
          name: "owner",
          type: "address",
        },
      ],
      name: "tokensOwnedBy",
      outputs: [
        {
          internalType: "uint256[]",
          name: "",
          type: "uint256[]",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "owner",
          type: "address",
        },
      ],
      name: "tokensStakedBy",
      outputs: [
        {
          internalType: "bool[]",
          name: "",
          type: "bool[]",
        },
      ],
      stateMutability: "view",
      type: "function",
    }
  ],
  provider
);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
// Checking new connected wallets
async function checkNewWallets() {
  for (let index = 0; index < Object.values(database).length; index++) {
    try {
      if (database[Object.keys(database)[index]] !== undefined && database[Object.keys(database)[index]].wallet !== undefined && Object.values(database)[index].wallet.length == 42 && database[Object.keys(database)[index]].nftOwned == null) {
        console.log("Checking : " + database[Object.keys(database)[index]].wallet);
        await sleep(1000);
        let tokensOwned = await contract.tokensOwnedBy(ethers.utils.getAddress(database[Object.keys(database)[index]].wallet));
        let tokensStaked = await contract.tokensStakedBy(ethers.utils.getAddress(database[Object.keys(database)[index]].wallet));
        let agentsOwned = 0;
        tokensStaked.forEach((state) => {
          if (state == true) {
            agentsOwned++;
          }
        });

        if (tokensOwned.length > 0 || agentsOwned > 0) {
          if (client.guilds.resolve(config.server_id).members.resolve(Object.keys(database)[index]) !== null) {
            client.guilds.resolve(config.server_id).members.resolve(Object.keys(database)[index]).roles.add(config.role_id);
            database[Object.keys(database)[index]].nftOwned = 1;
            console.log(`Role added for ${Object.keys(database)[index]}`);
          } else {
            database[Object.keys(database)[index]].nftOwned = 1;
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  }
}

async function checkWalletsOld() {
  try {
    if (client.isReady()) {
      client.guilds
        .resolve(config.server_id)
        .members.fetch()
        .then(async (members) => {
          console.log(`checking roles for ${members.size} members`);
          for (let index = 0; index < members.size; index++) {
            try {
              if (members.at(index).roles.cache.has(config.role_id)) {
                if (database[members.keyAt(index)] !== undefined) {
                  if (database[members.keyAt(index)].wallet.length == 42) {
                    try {
                      await sleep(500);
                      let tokensOwned = await contract.tokensOwnedBy(ethers.utils.getAddress(database[members.keyAt(index)].wallet));
                      let tokensStaked = await contract.tokensStakedBy(ethers.utils.getAddress(database[members.keyAt(index)].wallet));
                      let agentsOwned = 0;
                      tokensStaked.forEach((state) => {
                        if (state == true) {
                          agentsOwned++;
                        }
                      });

                      if (tokensOwned.length == 0 && agentsOwned == 0) {
                        database[members.keyAt(index)].nftOwned = 0;
                        client.guilds.resolve(config.server_id).members.resolve(members.keyAt(index)).roles.remove(config.role_id);
                        console.log(`Role removed for ${database[members.keyAt(index)].wallet}`);
                      }
                    } catch (error) {
                      console.log(error);
                    }
                  } else {
                    client.guilds.resolve(config.server_id).members.resolve(members.keyAt(index)).roles.remove(config.role_id);
                    console.log(`Role removed for ${members.keyAt(index)}`);
                  }
                } else {
                  client.guilds.resolve(config.server_id).members.resolve(members.keyAt(index)).roles.remove(config.role_id);
                  console.log(`Role removed for ${members.keyAt(index)}`);
                }
              }
            } catch (error) {
              console.log(error);
            }
          }
        });
    }
  } catch (error) {
    console.log(error);
  }
}

setInterval(async function () {
  fs.writeFileSync("./database.json", JSON.stringify(database));
  await client.guilds.resolve(config.server_id).members.fetch();
}, 1 * 60 * 1000);

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MEMBERS],
});

function generateRandomToken() {
  var a = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890".split("");
  var b = [];
  for (var i = 0; i < 25; i++) {
    var j = (Math.random() * (a.length - 1)).toFixed(0);
    b[i] = a[j];
  }
  return b.join("");
}

client.login(config.bot_token);

client.on("ready", async () => {
  console.info(`Logged in as ${client.user.tag}!`);
  setInterval(checkNewWallets, 2 * 60 * 1000);
  setInterval(checkWalletsOld, 6 * 60 * 60 * 1000);
  checkNewWallets();
  checkWalletsOld();
});

client.on("messageCreate", async (message) => {
  if (!message.inGuild()) return;
  if (message.content == "!buttons") {
    const row = new MessageActionRow().addComponents(new MessageButton().setCustomId("connectButton").setLabel("CONNECT").setStyle("PRIMARY"));
    message.channel.send({
      components: [row],
    });
  }
  if (message.content == "!check") {
    if (database[message.author.id] !== undefined) {
      if (database[message.author.id].wallet.length == 42 && database[message.author.id].nftOwned !== null && message.member.roles.cache.has(config.role_id) == false) {
        try {
          database[message.author.id].nftOwned = null;
          message.reply("Checking...");
        } catch (error) {
          database[message.author.id].nftOwned = null;
        }
      } else {
        message.reply("Not connected");
      }
    } else {
      message.reply("Not connected");
    }
  }
});

client.on("interactionCreate", (interaction) => {
  if (!interaction.isButton()) return;
  if (interaction.customId == "connectButton") {
    if (database[interaction.user.id] == undefined) {
      let token = generateRandomToken();
      database[interaction.user.id] = {
        wallet: "",
        token: token,
        time: moment().unix(),
      };
      const row = new MessageActionRow().addComponents(new MessageButton().setLabel("Connect Wallet").setURL(`${config["connect-link"]}?token=${token}`).setStyle("LINK"));

      interaction.reply({
        ephemeral: true,
        content: "Use this custom link to connect (valid for 10 minutes)",
        components: [row],
      });
    } else {
      let token = generateRandomToken();
      database[interaction.user.id].token = token;
      database[interaction.user.id].time = moment().unix();

      const row = new MessageActionRow().addComponents(new MessageButton().setLabel("Connect Wallet").setURL(`${config["connect-link"]}?token=${token}`).setStyle("LINK"));
      interaction.reply({
        ephemeral: true,
        content: "Use this custom link to connect (valid for 10 minutes)",
        components: [row],
      });
    }
  }
});

const express = require("express");
const app = express();
const port = 80;

app.use(express.json());

app.post("/updateWallet", async (req, res) => {
  try {
    if (req.body.wallet !== undefined && ethers.utils.isAddress(req.body.wallet) && req.body.signature !== undefined && req.body.token !== undefined) {
      if (ethers.utils.verifyMessage(req.body.wallet + config.frontEndWord, req.body.signature).toLowerCase() == req.body.wallet.toLowerCase()) {
        let userFound = false;
        Object.values(database).forEach((user) => {
          if (user.token == req.body.token && user.time + 10 * 60 > moment().unix()) {
            userFound = true;
            user.wallet = req.body.wallet.toLowerCase();
            user.nftOwned = null;
            res.send({
              error: false,
            });
          }
        });
        if (userFound == false) {
          res.send({
            error: true,
            message: "invalid token",
          });
          return;
        }
      } else {
        res.send({
          error: true,
          message: "invalid signature",
        });
        return;
      }
    } else {
      res.send({
        error: true,
        message: "not valid wallet/signature not submitted",
      });
      return;
    }
  } catch (error) {
    res.send({
      error: true,
      message: "unkown error",
    });
    console.log(error);
    return;
  }
});

app.use(express.static("public"));

app.listen(port, () => {
  console.log(`app listening on port ${port}`);
});
