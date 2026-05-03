import {
  Client,
  GatewayIntentBits,
  Events,
  REST,
  Routes,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const balances = new Map();
const logs = new Map();

// 你的客服角色名稱
const ADMIN_ROLE = "奈奈客服☃";

// ======================
// 註冊 Slash 指令
// ======================
const commands = [
  new SlashCommandBuilder()
    .setName('balance')
    .setDescription('查詢餘額')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('查詢其他人（管理員限定）')
    ),

  new SlashCommandBuilder()
    .setName('add')
    .setDescription('加點數')
    .addUserOption(o => o.setName('user').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setRequired(true)),

  new SlashCommandBuilder()
    .setName('charge')
    .setDescription('扣點數')
    .addUserOption(o => o.setName('user').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setRequired(true))
];

// ======================
// 上線時註冊指令
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
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const user = interaction.user;
  const member = interaction.member;

  const isAdmin = member.roles.cache.some(r => r.name === ADMIN_ROLE);

  const targetUser = interaction.options.getUser('user') || user;
  const targetId = targetUser.id;

  if (!balances.has(targetId)) balances.set(targetId, 0);

  // ======================
  // 查餘額
  // ======================
  if (interaction.commandName === "balance") {

    if (targetUser.id !== user.id && !isAdmin) {
      return interaction.reply({
        content: "你只能查自己的餘額",
        ephemeral: true
      });
    }

    return interaction.reply({
      content: `${targetUser.username} 的餘額：${balances.get(targetId)}`,
      ephemeral: true
    });
  }

  // ======================
  // 加點數
  // ======================
  if (interaction.commandName === "add") {
    if (!isAdmin) {
      return interaction.reply({ content: "你不是客服", ephemeral: true });
    }

    const amount = interaction.options.getInteger('amount');

    balances.set(targetId, balances.get(targetId) + amount);

    return interaction.reply({
      content: `已幫 ${targetUser.username} 加 ${amount}`,
      ephemeral: true
    });
  }

  // ======================
  // 扣點數 + 按鈕確認
  // ======================
  if (interaction.commandName === "charge") {
    if (!isAdmin) {
      return interaction.reply({ content: "你不是客服", ephemeral: true });
    }

    const amount = interaction.options.getInteger('amount');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`confirm_${targetId}_${amount}`)
        .setLabel("確認扣款")
        .setStyle(ButtonStyle.Danger)
    );

    return interaction.reply({
      content: `確認要扣 ${targetUser.username} ${amount} 點數？`,
      components: [row],
      ephemeral: true
    });
  }
});

// ======================
// 按鈕處理
// ======================
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  const [_, userId, amountStr] = interaction.customId.split("_");
  const amount = parseInt(amountStr);

  let balance = balances.get(userId) || 0;

  if (balance < amount) {
    return interaction.reply({
      content: "餘額不足",
      ephemeral: true
    });
  }

  balances.set(userId, balance - amount);

  return interaction.reply({
    content: `扣款成功，剩餘 ${balances.get(userId)}`,
    ephemeral: true
  });
});

client.login(process.env.TOKEN);
