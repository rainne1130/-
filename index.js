import { Client, GatewayIntentBits, Events } from 'discord.js';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, runTransaction } from 'firebase/database';

// Firebase 設定（等等你要填）
const firebaseConfig = {
  apiKey: "https://nainai-point-default-rtdb.asia-southeast1.firebasedatabase.app/",
  authDomain: "https://nainai-point-default-rtdb.asia-southeast1.firebasedatabase.app/",
  databaseURL: "https://nainai-point-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "https://nainai-point-default-rtdb.asia-southeast1.firebasedatabase.app/",
  storageBucket: "https://nainai-point-default-rtdb.asia-southeast1.firebasedatabase.app/",
  messagingSenderId: "https://nainai-point-default-rtdb.asia-southeast1.firebasedatabase.app/",
  appId: "https://nainai-point-default-rtdb.asia-southeast1.firebasedatabase.app/"
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
  console.log(已上線：${client.user.tag});
});

// 取得餘額
async function getBalance(userId) {
  try {
    const snapshot = await get(ref(db, balances/${userId}));
    if (!snapshot.exists()) {
      await set(ref(db, balances/${userId}), 0);
      return 0;
    }
    return snapshot.val();
  } catch (err) {
    console.error(err);
    return 0;
  }
}

// 設定餘額
async function setBalance(userId, amount) {
  try {
    await set(ref(db, balances/${userId}), amount);
  } catch (err) {
    console.error(err);
  }
}
// 安全加減（transaction）
async function updateBalance(userId, delta) {
  const userRef = ref(db, balances/${userId});
  try {
    await runTransaction(userRef, (current) => {
      return (current  0) + delta;
    });
  } catch (err) {
    console.error(err);
  }
}

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return; // 防 DM 崩潰

  const isAdmin = message.member.roles.cache.some(r => r.name === ADMIN_ROLE);

  const args = message.content.trim().split(/\s+/);

  // =====================
  // 查自己餘額
  // =====================
  if (message.content === "!balance") {
    const balance = await getBalance(message.author.id);
    return message.reply(你的餘額：${balance});
  }

  // =====================
  // 管理員查別人
  // =====================
  if (message.content.startsWith("!balance") && message.mentions.users.size > 0) {
    if (!isAdmin) return message.reply("你不是客服");

    const user = message.mentions.users.first();
    if (!user) return message.reply("請標記使用者");

    const balance = await getBalance(user.id);
    return message.reply(${user.username} 的餘額：${balance});
  }

  // =====================
  // 儲值
  // =====================
  if (message.content.startsWith("!add")) {
    if (!isAdmin) return message.reply("你不是客服");

    const user = message.mentions.users.first();
    const amount = parseInt(args[2]);

    if (!user  isNaN(amount)) {
      return message.reply("用法：!add @使用者 金額");
    }

    if (amount <= 0) {
      return message.reply("金額必須大於 0");
    }

    await updateBalance(user.id, amount);
    const newBalance = await getBalance(user.id);

    return message.reply(已幫 ${user.username} 儲值 ${amount}，目前 ${newBalance});
  }
// =====================
  // 扣款（工單用）
  // =====================
  if (message.content.startsWith("!charge")) {
    if (!isAdmin) return message.reply("你不是客服");

    const user = message.mentions.users.first();
    const amount = parseInt(args[2]);

    if (!user || isNaN(amount)) {
      return message.reply("用法：!charge @使用者 金額");
    }

    if (amount <= 0) {
      return message.reply("金額必須大於 0");
    }

    const balance = await getBalance(user.id);

    if (balance < amount) {
      return message.reply("餘額不足");
    }

    await updateBalance(user.id, -amount);
    const newBalance = await getBalance(user.id);

    return message.reply(已扣 ${amount}，剩餘 ${newBalance});
  }
});

// TOKEN 檢查
if (!process.env.TOKEN) {
  console.error("TOKEN 未設定");
  process.exit(1);
}

client.login(process.env.TOKEN);
