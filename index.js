import { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder } from 'discord.js';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, runTransaction } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDEwE6j0n1xAwWkNf9UiJPfR5bpuL1Bf2k",
  authDomain: "nainai-point.firebaseapp.com",
  databaseURL: "https://nainai-point-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "nainai-point",
  storageBucket: "nainai-point.firebasestorage.app",
  messagingSenderId: "379893018033",
  appId: "1:379893018033:web:5c0edfb03825ec314a6190"
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

const commands = [
  new SlashCommandBuilder()
    .setName('balance')
    .setDescription('查詢餘額')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('查詢其他人（客服限定）')
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('add')
    .setDescription('儲值(客服限定)')
    .addUserOption(o =>
      o.setName('user')
        .setDescription('目標玩家')
        .setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName('amount')
        .setDescription('金額')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('charge')
    .setDescription('扣款(客服限定)')
    .addUserOption(o =>
      o.setName('user')
        .setDescription('目標玩家')
        .setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName('amount')
        .setDescription('金額')
        .setRequired(true)
    )
];

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

async function getBalance(userId) {
  try {
    const snapshot = await get(ref(db, `balances/${userId}`));
    if (!snapshot.exists()) {
      await set(ref(db, `balances/${userId}`), 0);
      return 0;
    }
    return snapshot.val();
  } catch (err) {
    console.error(err);
    return 0;
  }
}

async function setBalance(userId, amount) {
  try {
    await set(ref(db, `balances/${userId}`), amount);
  } catch (err) {
    console.error(err);
  }
}

async function updateBalance(userId, delta) {
  const userRef = ref(db, `balances/${userId}`);
  try {
    await runTransaction(userRef, (current) => {
      return (current || 0) + delta;
    });
  } catch (err) {
    console.error(err);
  }
}

client.on(Events.InteractionCreate, async (i) => {
  if (!i.isChatInputCommand()) return;

  const isAdmin = i.member.roles.cache.some(r => r.name === ADMIN_ROLE);

  const target = i.options.getUser("user") || i.user;
  const amount = i.options.getInteger("amount");

  const balance = await getBalance(target.id);

  // 查餘額
  if (i.commandName === "balance") {

    if (target.id !== i.user.id && !isAdmin) {
      return i.reply({
        content: "闆闆您好，您只能查自己的餘額!",
        ephemeral: true
      });
    }

    return i.reply({
      content: `${target.username} 的餘額為： ${balance} 元`,
      ephemeral: true
    });
  }

  // 儲值
  if (i.commandName === "add") {
    if (!isAdmin) {
      return i.reply({ content: "您不是客服，無法使用!", ephemeral: true });
    }

    await updateBalance(target.id, amount);

    return i.reply({
      content: `已幫 ${target.username}闆闆儲值 ${amount} 元!`,
    });
  }

  // 扣款
  if (i.commandName === "charge") {
    if (!isAdmin) {
      return i.reply({ content: "您不是客服，無法使用!", ephemeral: true });
    }

    if (balance < amount) {
      return i.reply({ content: "目前餘額不足", ephemeral: true });
    }

    await updateBalance(target.id, -amount);

    return i.reply({
      content: `已幫闆闆 ${target.username} 扣款 ${amount} 元，剩餘金額: ${balance - amount} 元`,
    });
  }
});

// TOKEN 檢查
if (!process.env.TOKEN) {
  console.error("TOKEN 未設定");
  process.exit(1);
}

client.login(process.env.TOKEN);
