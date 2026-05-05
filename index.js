import 'dotenv/config';
import { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder } from 'discord.js';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, runTransaction } from 'firebase/database';

// Firebase
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
    GatewayIntentBits.Guilds
  ]
});

const commands = [
  new SlashCommandBuilder()
    .setName('balance')
    .setDescription('我要查詢餘額')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('查詢其他人（客服限定）')
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('add')
    .setDescription('儲值(客服限定)')
    .addUserOption(o =>
      o.setName('user').setDescription('選取闆闆').setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName('amount').setDescription('輸入金額').setRequired(true)
    )
    .addStringOption(o =>
      o.setName('date').setDescription('工單日期').setRequired(true)
    )
    .addStringOption(o =>
      o.setName('type').setDescription('遊戲單別').setRequired(true)
    )
    .addStringOption(o =>
      o.setName('boss').setDescription('老闆名字').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('charge')
    .setDescription('扣款(客服限定)')
    .addUserOption(o =>
      o.setName('user').setDescription('選取闆闆').setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName('amount').setDescription('輸入扣款金額').setRequired(true)
    )
];

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
  const snapshot = await get(ref(db, `balances/${userId}`));
  if (!snapshot.exists()) {
    await set(ref(db, `balances/${userId}`), 0);
    return 0;
  }
  return snapshot.val();
}

async function updateBalance(userId, delta) {
  const userRef = ref(db, `balances/${userId}`);
  await runTransaction(userRef, (current) => (current || 0) + delta);
}

async function addTotal(userId, amount) {
  const totalRef = ref(db, `total/${userId}`);
  await runTransaction(totalRef, (current) => (current || 0) + amount);
}

async function getTotal(userId) {
  const snapshot = await get(ref(db, `total/${userId}`));
  return snapshot.exists() ? snapshot.val() : 0;
}

client.on(Events.InteractionCreate, async (i) => {
  if (!i.isChatInputCommand()) return;

  const isAdmin = i.member.roles.cache.some(r => r.name === ADMIN_ROLE);

  if (i.commandName === "balance") {

    const target = i.options.getUser("user") || i.user;

    if (target.id !== i.user.id && !isAdmin) {
      return i.reply({
        content: "闆闆您好，您只能查自己的餘額!",
        ephemeral: true
      });
    }

    const balance = await getBalance(target.id);
    const total = await getTotal(target.id);

    return i.reply({
		content:
		`目前闆闆資訊如下 :
	闆闆ID： ${target.username}\n
	總累積儲值： ${total} 元\n
	目前剩餘： ${balance} 元`,
      ephemeral: true
    });
  }

  // ======================
  // add
  // ======================
  if (i.commandName === "add") {

    if (!isAdmin) {
      return i.reply({ content: "您不是客服，無法使用!", ephemeral: true });
    }

    const target = i.options.getUser("user");
    const amount = i.options.getInteger("amount");

    if (!amount || amount <= 0) {
      return i.reply({ content: "金額錯誤", ephemeral: true });
    }

    await updateBalance(target.id, amount);
    await addTotal(target.id, amount);

    return i.reply({
		content:
		`儲值完成！
	闆闆ID： ${target.username}\n
	儲值金額： ${amount} 元`
    });
  }

  if (i.commandName === "charge") {

    if (!isAdmin) {
      return i.reply({ content: "您不是客服，無法使用!", ephemeral: true });
    }

    const target = i.options.getUser("user");
    const amount = i.options.getInteger("amount");

    if (!amount || amount <= 0) {
      return i.reply({ content: "金額錯誤", ephemeral: true });
    }

    const balance = await getBalance(target.id);

    if (balance < amount) {
      return i.reply({ content: "目前餘額不足", ephemeral: true });
    }

    await updateBalance(target.id, -amount);

    return i.reply({
		content: `扣款成功！
	闆闆ID： ${target.username}\n
	扣款： ${amount} 元\n
	當前剩餘金額： ${balance - amount} 元`
    });
  }
});

// ======================
if (!process.env.TOKEN) {
  console.error("TOKEN 未設定");
  process.exit(1);
}
client.login(process.env.TOKEN);
