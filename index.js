import { Client, GatewayIntentBits, Events } from 'discord.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// 假資料（之後會換資料庫）
const balances = new Map();

client.once(Events.ClientReady, () => {
  console.log(`已上線：${client.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  // 只在 ticket 頻道運作
  if (!message.channel.name.includes("ticket")) return;

  // 自動顯示餘額
  const userId = message.author.id;
  if (!balances.has(userId)) balances.set(userId, 100); // 預設100

  message.reply(`目前餘額：${balances.get(userId)} 點數`);

  // 收費功能（管理員用）
  if (message.content.startsWith("收費")) {
    if (!message.member.roles.cache.some(r => r.name === "管理員")) {
      return message.reply("你不是管理員");
    }

    const price = parseInt(message.content.split(" ")[1]);
    if (isNaN(price)) return;

    let balance = balances.get(userId) || 0;

    if (balance < price) {
      return message.reply("餘額不足");
    }

    balances.set(userId, balance - price);

    message.reply(`已扣款 ${price} 點數，剩餘 ${balances.get(userId)}`);
  }
});

client.login(process.env.TOKEN);