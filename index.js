import {
  Client,
  GatewayIntentBits,
  Events,
  REST,
  Routes,
  SlashCommandBuilder
} from 'discord.js';

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

// Firebase 設定（自己填）
const firebaseConfig = {
  apiKey: "你的apiKey",
  authDomain: "xxx.firebaseapp.com",
  projectId: "你的projectId"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const ADMIN_ROLE = "奈奈客服☃";

// ======================
// Slash 指令（已修正 description）
// ======================
const commands = [
  new SlashCommandBuilder()
    .setName('balance')
    .setDescription('查詢餘額')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('查詢其他人（客服限定）')
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('add')
    .setDescription('儲值（客服用）')
    .addUserOption(o =>
      o.setName('user')
        .setDescription('目標玩家')
        .setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName('amount')
        .setDescription('儲值金額')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('charge')
    .setDescription('扣款（客服用）')
    .addUserOption(o =>
      o.setName('user')
        .setDescription('目標玩家')
        .setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName('amount')
        .setDescription('扣款金額')
        .setRequired(true)
    )
];

// ======================
// 上線
// ======================
client.once(Events.ClientReady, async () => {
  console.log(`已上線：${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

  await rest.put(
    Routes.applicationCommands(client.user.id),
    { body: commands }
  );

  console.log("Slash 指令已註冊");
});

// ======================
// Slash 指令處理
// ======================
client.on(Events.InteractionCreate, async (i) => {
  if (!i.isChatInputCommand()) return;

  const isAdmin = i.member.roles.cache.some(r => r.name === ADMIN_ROLE);

  const target = i.options.getUser("user") || i.user;
  const amount = i.options.getInteger("amount");

  const ref = doc(db, "users", target.id);
  const snap = await getDoc(ref);

  let balance = snap.exists() ? snap.data().balance : 100;

  if (!snap.exists()) {
    await setDoc(ref, { balance: 100 });
  }

  // ======================
  // 查餘額
  // ======================
  if (i.commandName === "balance") {

    if (target.id !== i.user.id && !isAdmin) {
      return i.reply({
        content: "你只能查自己的餘額",
        ephemeral: true
      });
    }

    return i.reply({
      content: `${target.username} 的餘額：${balance}`,
      ephemeral: true
    });
  }

  // ======================
  // 儲值
  // ======================
  if (i.commandName === "add") {
    if (!isAdmin) {
      return i.reply({ content: "無權限", ephemeral: true });
    }

    await updateDoc(ref, { balance: balance + amount });

    return i.reply({
      content: `已幫 ${target.username} 加 ${amount} 點數`,
      ephemeral: true
    });
  }

  // ======================
  // 扣款
  // ======================
  if (i.commandName === "charge") {
    if (!isAdmin) {
      return i.reply({ content: "無權限", ephemeral: true });
    }

    if (balance < amount) {
      return i.reply({ content: "餘額不足", ephemeral: true });
    }

    await updateDoc(ref, { balance: balance - amount });

    return i.reply({
      content: `已扣 ${amount}，剩 ${balance - amount}`,
      ephemeral: true
    });
  }
});

// ======================
// 工單自動扣款
// ======================
client.on(Events.MessageCreate, async (msg) => {
  if (msg.author.bot) return;

  // 只在 ticket 頻道
  if (!msg.channel.name.includes("ticket")) return;

  const isAdmin = msg.member.roles.cache.some(r => r.name === ADMIN_ROLE);
  if (!isAdmin) return;

  // 指令格式：收費 50
  if (msg.content.startsWith("收費 ")) {
    const amount = parseInt(msg.content.split(" ")[1]);
    if (isNaN(amount)) return;

    const userId = msg.channel.topic; // 必須設定

    if (!userId) return msg.reply("找不到使用者ID");

    const ref = doc(db, "users", userId);
    const snap = await getDoc(ref);

    let balance = snap.exists() ? snap.data().balance : 100;

    if (balance < amount) {
      return msg.reply("餘額不足");
    }

    await updateDoc(ref, { balance: balance - amount });

    msg.reply(`已扣 ${amount}，剩 ${balance - amount}`);
  }
});

client.login(process.env.TOKEN);
