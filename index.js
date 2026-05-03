import { Client, GatewayIntentBits, Events } from 'discord.js';

console.log("TOKEN:", process.env.TOKEN);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// 餘額 & 紀錄
const balances = new Map();
const logs = new Map();

client.once(Events.ClientReady, () => {
  console.log(`已上線：${client.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim();
  const userId = message.author.id;

  // 初始化自己
  if (!balances.has(userId)) balances.set(userId, 100);

  // ======================
  // 抓目標（@某人）
  // ======================
  const targetUser = message.mentions.users.first();
  const targetId = targetUser ? targetUser.id : userId;

  if (!balances.has(targetId)) balances.set(targetId, 100);

  // ======================
  // 查餘額
  // ======================
  if (content.startsWith("!balance")) {
    return message.reply(
      `${targetUser ? targetUser.username : message.author.username} 的餘額：${balances.get(targetId)} 點數`
    );
  }

  // ======================
  // 管理員判斷
  // ======================
  const isAdmin = message.member?.roles.cache.some(r => r.name === "管理員");

  // ======================
  // 加點數
  // ======================
  if (content.startsWith("!add ")) {
    if (!isAdmin) return message.reply("你不是管理員");

    if (!targetUser) return message.reply("請標記一個人");

    const amount = parseInt(content.split(" ")[2]);
    if (isNaN(amount)) return message.reply("金額錯誤");

    balances.set(targetId, balances.get(targetId) + amount);

    addLog(targetId, `+${amount}`);

    return message.reply(`已幫 ${targetUser.username} 加 ${amount} 點數`);
  }

  // ======================
  // 扣點數
  // ======================
  if (content.startsWith("!charge ")) {
    if (!isAdmin) return message.reply("你不是管理員");

    if (!targetUser) return message.reply("請標記一個人");

    const amount = parseInt(content.split(" ")[2]);
    if (isNaN(amount)) return message.reply("金額錯誤");

    let balance = balances.get(targetId);

    if (balance < amount) {
      return message.reply("餘額不足");
    }

    balances.set(targetId, balance - amount);

    addLog(targetId, `-${amount}`);

    return message.reply(
      `已從 ${targetUser.username} 扣 ${amount} 點數，剩餘 ${balances.get(targetId)}`
    );
  }

  // ======================
  // 查紀錄
  // ======================
  if (content.startsWith("!log")) {
    const userLogs = logs.get(targetId) || [];

    if (userLogs.length === 0) {
      return message.reply("沒有紀錄");
    }

    return message.reply(
      `${targetUser ? targetUser.username : message.author.username} 的紀錄：\n` +
      userLogs.slice(-5).join("\n")
    );
  }
});

// ======================
//  記錄系統
// ======================
function addLog(userId, text) {
  if (!logs.has(userId)) logs.set(userId, []);

  logs.get(userId).push(
    `${new Date().toLocaleString()} ${text}`
  );
}

client.login(process.env.TOKEN);
