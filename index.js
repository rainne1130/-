import { Client, GatewayIntentBits, Events } from 'discord.js';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set } from 'firebase/database';

// Firebase 設定（等等你要填）
const firebaseConfig = {
  apiKey: "填你的",
  authDomain: "填你的",
  databaseURL: "填你的",
  projectId: "填你的",
  storageBucket: "填你的",
  messagingSenderId: "填你的",
  appId: "填你的"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const ADMIN_ROLE = "奈奈客服☃";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once(Events.ClientReady, () => {
  console.log(`已上線：${client.user.tag}`);
});

// 取得餘額
async function getBalance(userId) {
  const snapshot = await get(ref(db, `balances/${userId}`));
  if (!snapshot.exists()) {
    await set(ref(db, `balances/${userId}`), 0);
    return 0;
  }
  return snapshot.val();
}

// 設定餘額
async function setBalance(userId, amount) {
  await set(ref(db, `balances/${userId}`), amount);
}

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  const isAdmin = message.member.roles.cache.some(r => r.name === ADMIN_ROLE);

  // =====================
  // 查自己餘額
  // =====================
  if (message.content === "!balance") {
    const balance = await getBalance(message.author.id);
    return message.reply(`你的餘額：${balance}`);
  }

  // =====================
  // 管理員查別人
  // =====================
  if (message.content.startsWith("!balance @")) {
    if (!isAdmin) return message.reply("你不是客服");

    const user = message.mentions.users.first();
    if (!user) return message.reply("請標記使用者");

    const balance = await getBalance(user.id);
    return message.reply(`${user.username} 的餘額：${balance}`);
  }

  // =====================
  // 儲值
  // =====================
  if (message.content.startsWith("!add ")) {
    if (!isAdmin) return message.reply("你不是客服");

    const args = message.content.split(" ");
    const user = message.mentions.users.first();
    const amount = parseInt(args[2]);

    if (!user || isNaN(amount)) {
      return message.reply("用法：!add @使用者 金額");
    }

    const balance = await getBalance(user.id);
    await setBalance(user.id, balance + amount);

    return message.reply(`已幫 ${user.username} 儲值 ${amount}，目前 ${balance + amount}`);
  }

  // =====================
  // 扣款（工單用）
  // =====================
  if (message.content.startsWith("!charge ")) {
    if (!isAdmin) return message.reply("你不是客服");

    const args = message.content.split(" ");
    const user = message.mentions.users.first();
    const amount = parseInt(args[2]);

    if (!user || isNaN(amount)) {
      return message.reply("用法：!charge @使用者 金額");
    }

    const balance = await getBalance(user.id);

    if (balance < amount) {
      return message.reply("餘額不足");
    }

    await setBalance(user.id, balance - amount);

    return message.reply(`已扣 ${amount}，剩餘 ${balance - amount}`);
  }
});

client.login(process.env.TOKEN);
