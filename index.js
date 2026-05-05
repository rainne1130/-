require('dotenv').config();
const {
  Client, GatewayIntentBits, Events, REST, Routes,
  SlashCommandBuilder, ChannelType, PermissionFlagsBits,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle,
  StringSelectMenuBuilder,EmbedBuilder
} = require('discord.js');

const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get, set, runTransaction } = require('firebase/database');
const TICKET_CATEGORY_ID = "1491428115258282205"; //開工單的主類別id
const VOICE_CATEGORY_ID = "1493237762168721458"; //建立語音頻道的主類別id

// ===== Firebase =====
const firebaseConfig = {
  apiKey: "AIzaSyDEwE6j0n1xAwWkNf9UiJPfR5bpuL1Bf2k",
  authDomain: "nainai-point.firebaseapp.com",
  databaseURL: "https://nainai-point-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "nainai-point",
  storageBucket: "nainai-point.firebasestorage.app",
  messagingSenderId: "379893018033",
  appId: "1:379893018033:web:5c0edfb03825ec314a6190"
};
const giftImages = { //禮物金額(原價)+圖片連結
	"33": "https://cdn.discordapp.com/attachments/1492442980320022638/1492442980571807784/103.png?ex=69fa5496&is=69f90316&hm=404f1a8e425ce40cbf39224230e61d361f314e64defac34207b62f1b8374c8dd",
	"100": "https://cdn.discordapp.com/attachments/1492444674567311491/1492444674835611679/1f62b65266fca8b6.png?ex=69fa562a&is=69f904aa&hm=dee765f9b0d78ec4313cc105ea552b1c578824127d2ffcb0defd12907896d5fb",
	"250": "https://cdn.discordapp.com/attachments/1492795335138086963/1492795335418974218/d9cf7bd08fa66d0d.png?ex=69fa4b3e&is=69f8f9be&hm=6f638f55db95392ec2671510f8aa47ab2ccf7b14d84eaddb180cd4399cf2db01",
	"365": "https://cdn.discordapp.com/attachments/1493647304849232084/1493647305533030683/598bd4342f6472a6.png?ex=69fa18f4&is=69f8c774&hm=361f6bf49e4691b7f0a5d54cf1f58ca73d6a3bff7aa3c5b81ff45b9823620d2f",
	"499": "https://cdn.discordapp.com/attachments/1495751697438478466/1495751698050842655/177.png?ex=69fa8092&is=69f92f12&hm=10223b4400595d89a68b864a5fd69ad0d439f0f34c16a0d73746b16722d00c2f",
	"888": "https://cdn.discordapp.com/attachments/1495751982642892962/1495751983984935082/189.png?ex=69fa80d6&is=69f92f56&hm=899e22bb39f4ed05856880268263ca0a0d49f0ea32ae6d76c0bdb1932a682097",
	"1314": "https://cdn.discordapp.com/attachments/1497475411771265084/1497475412006277241/197.png?ex=69fa2e67&is=69f8dce7&hm=a5999ccb146d9f4c034cceaad0160d4cb0335074429fb476a1a2d2ad45650089"
};
const giftMessages = { //禮物金額(原價)+文案
  "33": "今天的你甜度超標♡\n像布丁一樣軟軟嫩嫩又療癒\n\n陪陪再累也要記得微笑哦(๑˃ᴗ˂)ﻭ",
  "100": "今天走一個軟萌路線♡\n像棉花糖一樣輕飄飄又可愛讓人忍不住想靠近一點點☁️",
  "250": "閃閃發光的就是你✨\n像仙女棒一樣照亮整個夜晚 每一刻都在發光發熱(๑•̀ㅂ•́)و✧",
  "365": "努力工作也要補充快樂😋\n鹹酥雞就是今天的幸福來源\n陪玩結束一起吃最對味🍗",
  "499": "今天表現超優秀✔️\n乖乖上班還這麼可愛💖\n直接蓋一個好寶寶認證章！",
  "888": "今天財運直接拉滿💰\n不管做什麼都順順順！\n陪玩也能一路發發發✨",
  "1314": "今天被寵愛的就是你💖\n像鑽戒一樣閃耀又珍貴\n每一分努力都值得被看見✨"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ===== 設定 =====
const GUILD_ID = "1488912636040052869"; //機器人操作的伺服器id
const RATING_CHANNEL_ID = "1491428115258282205";//初始工單頻道
const GIFT_LOG_CHANNEL_ID = "1492207255808901331";//禮物播報頻道ID
const FEEDBACK_CHANNEL_ID = "1489186836579356702";//評價回饋頻道id
const OWNER_ROLE_ID = "1490589268685361263";//店長ID
const STAFF_ROLE_ID = "1490342166910996510";//客服ID
const COMPANION_ROLE_ID = "1491411801026330634";//陪陪ID
const CUSTOMER_ROLE_ID = "1489177896605061161";//闆闆ID

const client = new Client({ intents: [GatewayIntentBits.Guilds,GatewayIntentBits.GuildMembers] });

// ===== 指令 =====
const commands = [
  new SlashCommandBuilder()
  .setName('panel')
  .setNameLocalizations({ 'zh-TW': '菜單目錄' })
  .setDescription('發送工單面板'),
  new SlashCommandBuilder()
  .setName('balance')
  .setNameLocalizations({ 'zh-TW': '目前q幣' })
  .setDescription('查詢餘額')
  .addUserOption(o =>
    o.setName('user')
     .setDescription('查詢玩家餘額q幣（管理員功能）')
     .setRequired(false)
  ),
  new SlashCommandBuilder()
    .setName('total')
	.setNameLocalizations({ 'zh-TW': '累積q幣' })
    .setDescription('查詢累積儲值')
    .addUserOption(o =>
      o.setName('user')
       .setDescription('查詢玩家累積q幣（管理員功能）')
       .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('add')
	.setNameLocalizations({ 'zh-TW': '儲值q幣' })
    .setDescription('儲值')
    .addUserOption(o => o.setName('user').setDescription('老闆名稱').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('q幣金額').setRequired(true)),

  new SlashCommandBuilder()
    .setName('charge')
	.setNameLocalizations({ 'zh-TW': '扣款q幣' })
    .setDescription('扣款')
    .addUserOption(o => o.setName('user').setDescription('老闆名稱').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('q幣金額').setRequired(true)),
	
	new SlashCommandBuilder()
	  .setName('gift')
	  .setNameLocalizations({ 'zh-TW': '送禮物' })
	  .setDescription('送禮給陪陪')
	  .addUserOption(o =>
		o.setName('user')
		 .setDescription('選擇陪陪')
		 .setRequired(true)
	  )
	  .addStringOption(o =>
		o.setName('gift')
		 .setDescription('禮物名稱')
		 .setRequired(true)
	  ),
	new SlashCommandBuilder()
	  .setName('reset_total')
	  .setNameLocalizations({ 'zh-TW': '清除總金額' })
	  .setDescription('清除累積儲值')
	  .addUserOption(o =>
		o.setName('user')
		 .setDescription('指定玩家')
		 .setRequired(false)
	  )
	  .addRoleOption(o =>
		o.setName('role')
		 .setDescription('指定身分組')
		 .setRequired(false)
	  ),
	new SlashCommandBuilder()
	  .setName('total_rank')
	  .setNameLocalizations({ 'zh-TW': '總金額排行榜' })
	  .setDescription('累積儲值排行榜')
	  .addRoleOption(o =>
		o.setName('role')
		 .setDescription('選擇身分組')
		 .setRequired(true)
	  ),
];

// ===== 註冊 =====
client.once(Events.ClientReady, async () => {
  console.log(`已上線：${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(client.user.id, GUILD_ID),
    { body: commands }
  );
});

// ===== 工具 =====
function hasRole(member, roleIds) {
  return member.roles.cache.some(r => roleIds.includes(r.id));
}
async function updateBalance(userId, delta) {
  const result = await runTransaction(ref(db, `balances/${userId}`), v => {
    const newVal = (v || 0) + delta;
    if (newVal < 0) return v;
    return newVal;
  });

  return result.snapshot.val();
}

async function getBalance(userId) {
  const snap = await get(ref(db, `balances/${userId}`));
  return snap.exists() ? snap.val() : 0;
}
async function addRechargeTotal(userId, amount) {
  await runTransaction(ref(db, `totalRecharge/${userId}`), v => {
    return (v || 0) + amount;
  });
}

async function getRechargeTotal(userId) {
  const snap = await get(ref(db, `totalRecharge/${userId}`));
  return snap.exists() ? snap.val() : 0;
}

async function getNextTicketId() {
  const counterRef = ref(db, "ticketCounter");

  const result = await runTransaction(counterRef, (current) => {
    return (current || 0) + 1;
  });

  return String(result.snapshot.val()).padStart(4, '0');
}
async function handleGift(i, sender, targetId, giftName) {

  const targetMember = await i.guild.members.fetch(targetId).catch(() => null);

  if (!targetMember || !hasRole(targetMember, [STAFF_ROLE_ID, COMPANION_ROLE_ID])) {
    return {
      error: "❌ 只能送禮給客服或陪陪"
    };
  }

  return {
    success: true,
    target: `<@${targetId}>`,
    giftName
  };
}

// ===== 主事件 =====
client.on(Events.InteractionCreate, async (i) => {
  try {

    // ===== Slash 指令 =====
    if (i.isChatInputCommand()) {

      if (i.commandName === "panel") {

		  // 🔒 權限：店長 / 客服 / 陪陪 才能使用
		  if (!hasRole(i.member, [OWNER_ROLE_ID, STAFF_ROLE_ID, COMPANION_ROLE_ID])) {
			return i.reply({
			  content: "❌ 沒有權限",
			  ephemeral: true
			});
		  }

		  // 🎯 按鈕區
		  const row = new ActionRowBuilder().addComponents(
			new ButtonBuilder()
			  .setCustomId('game')
			  .setLabel('🎮 遊戲訂單')
			  .setStyle(ButtonStyle.Primary),

			new ButtonBuilder()
			  .setCustomId('voice')
			  .setLabel('🎤 語音訂單')
			  .setStyle(ButtonStyle.Success),

			new ButtonBuilder()
			  .setCustomId('boost')
			  .setLabel('💻 代打訂單')
			  .setStyle(ButtonStyle.Secondary),

			new ButtonBuilder()
			  .setCustomId('gift')
			  .setLabel('🎁 送禮物')
			  .setStyle(ButtonStyle.Danger)
		  );

		  //UI
		  const embed = new EmbedBuilder()
			.setTitle("💖 歡迎光臨奈奈客服中心!")
			.setDescription("請選擇您要的服務類型~")
			.setColor(0xFFD700)
			.setThumbnail(i.guild.iconURL({ dynamic: true }))
			.setFooter({ text: "奈奈客服系統" })
			.setTimestamp();

		  //發送
		  return i.reply({
			embeds: [embed],
			components: [row]
		  });
		}

      if (i.commandName === "balance") {

		  const target = i.options.getUser("user");

		  // 🎯 查別人
		  if (target) {

			// ❗只有 店長 / 客服 可以查他人
			if (!hasRole(i.member, [OWNER_ROLE_ID, STAFF_ROLE_ID])) {
			  return i.reply({
				content: "❌ 你沒有權限查詢他人餘額",
				ephemeral: true
			  });
			}

			const balance = await getBalance(target.id);

			const embed = new EmbedBuilder()
			  .setTitle("💰 餘額查詢")
			  .setDescription(`👤 對象：${target}\n💎 目前餘額：${balance} 元`)
			  .setColor(0xFFD700)
			  .setTimestamp();

			return i.reply({
			  embeds: [embed],
			  ephemeral: true
			});
		  }

		  // 🎯 查自己（全部人都可以）
		  const balance = await getBalance(i.user.id);

		  const embed = new EmbedBuilder()
			.setTitle("💰 餘額查詢")
			.setDescription(`👤 對象：${i.user}\n💎 目前餘額：${balance} 元`)
			.setColor(0xFFD700)
			.setTimestamp();

		  return i.reply({
			embeds: [embed],
			ephemeral: true
		  });
		}

      if (i.commandName === "total") {

		  const target = i.options.getUser("user");

		  // 🎯 查別人
		  if (target) {

			// ❗只有 店長 / 客服 可以查他人
			if (!hasRole(i.member, [OWNER_ROLE_ID, STAFF_ROLE_ID])) {
			  return i.reply({
				content: "❌ 您沒有權限查詢他人累積",
				ephemeral: true
			  });
			}

			// ❗限制：只能查「闆闆」
			const member = await i.guild.members.fetch(target.id);

			if (!hasRole(member, [CUSTOMER_ROLE_ID])) {
			  return i.reply({
				content: "❌ 只能查詢闆闆的累積儲值",
				ephemeral: true
			  });
			}

			const total = await getRechargeTotal(target.id);

			const embed = new EmbedBuilder()
			  .setTitle("💎 累積儲值查詢")
			  .setDescription(`👤 對象：${target}\n💰 累積儲值：${total} 元`)
			  .setColor(0xFFD700)
			  .setTimestamp();

			return i.reply({
			  embeds: [embed],
			  ephemeral: true
			});
		  }

		  // 🎯 查自己（全部人可用）
		  const total = await getRechargeTotal(i.user.id);

		  const embed = new EmbedBuilder()
			.setTitle("💎 累積儲值查詢")
			.setDescription(`👤 對象：${i.user}\n💰 累積儲值：${total} 元`)
			.setColor(0xFFD700)
			.setTimestamp();

		  return i.reply({
			embeds: [embed],
			ephemeral: true
		  });
		}

      if (i.commandName === "add") {

		  const user = i.options.getUser("user");
		  const amount = i.options.getInteger("amount");

		  if (!user)
			return i.reply({ content: "❌ 玩家不存在", ephemeral: true });

		  if (amount == null || amount <= 0)
			return i.reply({ content: "❌ 金額必須大於 0", ephemeral: true });

		  // 🔒 權限：店長 / 客服
		  if (!hasRole(i.member, [OWNER_ROLE_ID, STAFF_ROLE_ID])) {
			return i.reply({ content: "❌ 您沒有權限", ephemeral: true });
		  }

		  // ❗限制：只能對「闆闆」儲值
		  const member = await i.guild.members.fetch(user.id);

		  if (!hasRole(member, [CUSTOMER_ROLE_ID])) {
			return i.reply({
			  content: "❌ 只能對闆闆進行儲值",
			  ephemeral: true
			});
		  }

		  // 💰 執行儲值
		  const newBalance = await updateBalance(user.id, amount);

		  // 💎 累積儲值
		  await addRechargeTotal(user.id, amount);
		  const total = await getRechargeTotal(user.id);

		  // 🎨 UI
		  const embed = new EmbedBuilder()
			.setTitle("💰 恭喜您加值成功！")
			.setDescription(
		`👤 玩家名稱：${user.username}
		💰 本次加值金額：${amount} 元
		💵 總計剩餘金額：${newBalance} 元
		💎 累積儲值金額：${total} 元`
			)
			.setColor(0xFF69B4)
			.setTimestamp();

		  return i.reply({ embeds: [embed] });
		}

      if (i.commandName === "charge") {

		  const user = i.options.getUser("user");
		  const amount = i.options.getInteger("amount");

		  if (!user)
			return i.reply({ content: "❌ 玩家不存在", ephemeral: true });

		  if (amount == null || amount <= 0)
			return i.reply({ content: "❌ 金額必須大於 0", ephemeral: true });

		  // 🔒 權限：店長 / 客服
		  if (!hasRole(i.member, [OWNER_ROLE_ID, STAFF_ROLE_ID])) {
			return i.reply({ content: "❌ 您目前沒有權限", ephemeral: true });
		  }

		  // ❗限制：只能對「闆闆」扣款
		  const member = await i.guild.members.fetch(user.id);

		  if (!hasRole(member, [CUSTOMER_ROLE_ID])) {
			return i.reply({
			  content: "❌ 只能對闆闆進行扣款",
			  ephemeral: true
			});
		  }

		  // 💰 取得餘額
		  const balance = await getBalance(user.id);

		  if (balance < amount)
			return i.reply({ content: "❌ 您目前餘額不足", ephemeral: true });

		  // 💸 扣款
		  const newBalance = await updateBalance(user.id, -amount);

		  // 💎 累積儲值（不變）
		  const total = await getRechargeTotal(user.id);

		  // 🎨 UI
		  const embed = new EmbedBuilder()
			.setTitle("💸 扣款成功！")
			.setDescription(
		`👤 玩家名稱：${user.username}
		💰 本次扣款金額：${amount} 元
		💵 總計剩餘金額：${newBalance} 元
		💎 累積儲值金額：${total} 元`
			)
			.setColor(0xFF69B4)
			.setTimestamp();

		  return i.reply({ embeds: [embed] });
		}
		if (i.commandName === "gift") {

		  const target = i.options.getUser("user");
		  const giftName = i.options.getString("gift");

		  if (!target)
			return i.reply({ content: "❌ 對象不存在", ephemeral: true });

		  if (!giftName)
			return i.reply({ content: "❌ 請輸入禮物名稱", ephemeral: true });

		  // 🎯 抓目標成員（用來判斷身分）
		  const member = await i.guild.members.fetch(target.id);

		  // ❗限制：只能送給「客服 / 陪陪」
		  if (!hasRole(member, [STAFF_ROLE_ID, COMPANION_ROLE_ID])) {
			return i.reply({
			  content: "❌ 只能送禮給客服或陪陪",
			  ephemeral: true
			});
		  }

		  // 🎁 執行送禮邏輯
		  const result = await handleGift(i, i.user, target.id, giftName);

		  if (result.error) {
			return i.reply({ content: result.error, ephemeral: true });
		  }

		  // 🎨 UI
		  const embed = new EmbedBuilder()
			.setTitle("🎁 送禮成功！")
			.setDescription(
		`👤 接收對象：${result.target}
		🎁 禮物名稱：${result.giftName}`
			)
			.setColor(0xFF69B4)
			.setThumbnail(i.user.displayAvatarURL({ dynamic: true }))
			.setTimestamp();

		  return i.reply({
			embeds: [embed],
			ephemeral: true
		  });
		}
		if (i.commandName === "reset_total") {

		  // 🔒 權限：僅店長
		  if (!hasRole(i.member, [OWNER_ROLE_ID])) {
			return i.reply({
			  content: "❌ 僅限店長使用",
			  ephemeral: true
			});
		  }

		  const user = i.options.getUser("user");
		  const role = i.options.getRole("role");

		  // ❗防呆：必須選一個
		  if (!user && !role) {
			return i.reply({
			  content: "❌ 請指定玩家或身分組",
			  ephemeral: true
			});
		  }

		  // ❗防呆：不能同時選
		  if (user && role) {
			return i.reply({
			  content: "❌ 只能選一個（玩家 / 身分組）",
			  ephemeral: true
			});
		  }

		  // ===== 單一玩家 =====
		  if (user) {

			await set(ref(db, `totalRecharge/${user.id}`), 0);

			return i.reply({
			  content: `✅ 已清除 ${user} 的累積儲值`,
			  ephemeral: true
			});
		  }

		  // ===== 身分組批量 =====
		  if (role) {

			await i.guild.members.fetch();

			const members = i.guild.members.cache.filter(m =>
			  m.roles.cache.has(role.id)
			);

			// 🔥 優化：批量寫入（避免逐筆 await 卡住）
			await Promise.all(
			  members.map(member =>
				set(ref(db, `totalRecharge/${member.id}`), 0)
			  )
			);

			return i.reply({
			  content: `✅ 已清除身分組 ${role} 共 ${members.size} 人的累積儲值`,
			  ephemeral: true
			});
		  }
		}
		
		if (i.commandName === "total_rank") {

		  // 🔒 權限：僅店長
		  if (!hasRole(i.member, [OWNER_ROLE_ID])) {
			return i.reply({
			  content: "❌ 僅限店長使用",
			  ephemeral: true
			});
		  }

		  const role = i.options.getRole("role");

		  if (!role) {
			return i.reply({
			  content: "❌ 請選擇身分組",
			  ephemeral: true
			});
		  }

		  // 📌 抓全部成員
		  await i.guild.members.fetch();

		  const members = i.guild.members.cache.filter(m =>
			m.roles.cache.has(role.id)
		  );

		  if (members.size === 0) {
			return i.reply({
			  content: "❌ 該身分組沒有成員",
			  ephemeral: true
			});
		  }

		  // 🔥 效能優化（批量抓資料）
		  const data = await Promise.all(
			members.map(async (member) => {
			  const total = await getRechargeTotal(member.id);
			  return {
				id: member.id,
				name: member.displayName,
				total
			  };
			})
		  );

		  // 排序
		  data.sort((a, b) => b.total - a.total);

		  // 取前10
		  const top10 = data.slice(0, 10);

		  // 📊 組字串（加排名圖示）
		  let desc = "";

		  top10.forEach((u, index) => {
			let icon = "🔹";
			if (index === 0) icon = "🥇";
			else if (index === 1) icon = "🥈";
			else if (index === 2) icon = "🥉";

			desc += `${icon} #${index + 1} 👤 <@${u.id}> - 💎 ${u.total} 元\n`;
		  });

		  if (!desc) desc = "目前沒有資料";

		  // 🎨 UI
		  const embed = new EmbedBuilder()
			.setTitle(`🏆 ${role.name} 累積總金額排行榜 TOP 10`)
			.setDescription(desc)
			.setColor(0xFFD700)
			.setTimestamp();

		  return i.reply({ embeds: [embed] });
		}
    }

    // ===== Button =====
    if (i.isButton()) {
      if (i.customId.startsWith("rate_")) {

		  const snap = await get(ref(db, `ratingTarget/${i.channel.id}`));
		  const allowedUserId = snap.exists() ? snap.val() : null;

		  if (!allowedUserId || i.user.id !== allowedUserId) {
			return i.reply({
			  content: "❌ 只有開單玩家可以評價",
			  ephemeral: true
			});
		  }

		  const ratedRef = ref(db, `rated/${i.channel.id}/${i.user.id}`);

		  const result = await runTransaction(ratedRef, (current) => {
			if (current) return;
			return true;
		  });

		  if (!result.committed) {
			return i.reply({
			  content: "❌ 你已經評價過了",
			  ephemeral: true
			});
		  }

		  const score = i.customId.split("_")[1];

		  const modal = new ModalBuilder()
			.setCustomId(`rate_modal_${score}`)
			.setTitle("填寫評價");

		  modal.addComponents(
			new ActionRowBuilder().addComponents(
			  new TextInputBuilder()
				.setCustomId("target")
				.setLabel("給予評價對象")
				.setRequired(true)
				.setStyle(TextInputStyle.Short)
			),
			new ActionRowBuilder().addComponents(
			  new TextInputBuilder()
				.setCustomId("content")
				.setLabel("你覺得本次陪玩體驗怎麼樣？")
				.setRequired(true)
				.setStyle(TextInputStyle.Paragraph)
			),
			new ActionRowBuilder().addComponents(
			  new TextInputBuilder()
				.setCustomId("anonymous")
				.setLabel("是否需要匿名評價？(是/否)")
				.setRequired(true)
				.setStyle(TextInputStyle.Short)
			)
		  );

		  return i.showModal(modal);
		}
      if (i.customId === "close") {

		  // 🔒 只有 客服 / 陪陪 可以結單
		  if (!hasRole(i.member, [STAFF_ROLE_ID, COMPANION_ROLE_ID])) {
			return i.reply({
			  content: "❌ 僅客服或陪陪可以結單",
			  ephemeral: true
			});
		  }

		  // 🎯 找開單玩家
		  const customerId = i.channel.permissionOverwrites.cache.find(p =>
			p.allow.has(PermissionFlagsBits.ViewChannel) &&
			p.id !== STAFF_ROLE_ID &&
			p.id !== COMPANION_ROLE_ID &&
			p.id !== OWNER_ROLE_ID &&
			p.id !== client.user.id
		  )?.id;

		  if (!customerId) {
			return i.reply({
			  content: "❌ 無法識別闆闆",
			  ephemeral: true
			});
		  }

		  // ⭐ 記錄評價對象
		  await set(ref(db, `ratingTarget/${i.channel.id}`), customerId);

		  const row = new ActionRowBuilder().addComponents(
			new ButtonBuilder().setCustomId('rate_1').setLabel('⭐').setStyle(ButtonStyle.Secondary),
			new ButtonBuilder().setCustomId('rate_2').setLabel('⭐⭐').setStyle(ButtonStyle.Secondary),
			new ButtonBuilder().setCustomId('rate_3').setLabel('⭐⭐⭐').setStyle(ButtonStyle.Secondary),
			new ButtonBuilder().setCustomId('rate_4').setLabel('⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary),
			new ButtonBuilder().setCustomId('rate_5').setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Success)
		  );

		  return i.reply({
			content: `⭐ 請 <@${customerId}> 為本次服務評價`,
			components: [row]
		  });
		}

      // === 開單按鈕 ===
      const makeInput = (id, label, style) =>
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId(id).setLabel(label).setRequired(true).setStyle(style)
        );

      if (i.customId === "game") {
        const modal = new ModalBuilder().setCustomId("game_modal").setTitle("遊戲需求");
        modal.addComponents(
          makeInput("companion", "選擇陪陪", TextInputStyle.Short),
          makeInput("game", "遊戲名稱", TextInputStyle.Short),
          makeInput("type", "遊戲類型", TextInputStyle.Short),
          makeInput("time", "遊玩時間", TextInputStyle.Short)
        );
        return i.showModal(modal);
      }

      if (i.customId === "voice") {

		  // 🔒 只有 客服 / 陪陪 可以開語音
		  if (!hasRole(i.member, [STAFF_ROLE_ID, COMPANION_ROLE_ID])) {
			return i.reply({
			  content: "❌ 僅客服或陪陪可建立語音頻道",
			  ephemeral: true
			});
		  }

		  const voiceChannel = await i.guild.channels.create({
			name: `語音-${i.channel.name}`,
			type: ChannelType.GuildVoice,
			parent: VOICE_CATEGORY_ID,
			permissionOverwrites: [
			  { id: i.guild.id, deny: [PermissionFlagsBits.ViewChannel] },

			  { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] },

			  { id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] },

			  { id: COMPANION_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] },

			  { id: OWNER_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] }
			]
		  });

		  return i.reply({
			content: `🔊 已建立語音頻道：${voiceChannel}`,
			ephemeral: true
		  });
		}

      if (i.customId === "boost") {
        const modal = new ModalBuilder().setCustomId("boost_modal").setTitle("代打需求");
        modal.addComponents(
          makeInput("rank", "段位需求", TextInputStyle.Short)
        );
        return i.showModal(modal);
      }
	  
	  if (i.customId === "gift") {
		  
		  const safeName = i.user.username
			.replace(/[^\w\-]/g, "_")
			.toLowerCase();

		  await i.guild.channels.fetch();
		  
		  const existing = i.guild.channels.cache.find(c =>
			  c.parentId === TICKET_CATEGORY_ID &&
			  c.name === safeName
			);

			if (existing) {
			  return i.reply({
				content: `❌ 你已經有禮物工單：${existing}`,
				ephemeral: true
			  });
			}

		  const channel = await i.guild.channels.create({
			name: safeName,
			type: ChannelType.GuildText,
			parent: TICKET_CATEGORY_ID,
			permissionOverwrites: [
			  { id: i.guild.id, deny: [PermissionFlagsBits.ViewChannel] },

			  // 闆闆（開單者）
			  { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },

			  // 客服
			  { id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },

			  // 陪陪
			  { id: COMPANION_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },

			  // 店長（可看即可，是否可發言你自己決定）
			  { id: OWNER_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel] },

			  // Bot
			  { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
			]
		  });
		  
		  const giftMenu = new ActionRowBuilder().addComponents(
			  new StringSelectMenuBuilder()
				.setCustomId("gift_select_item")
				.setPlaceholder("🎁 選擇想要送的禮物")
				.addOptions([
				  { label: "33", value: "布丁【33元】" },
				  { label: "100", value: "棉花糖【100元】" },
				  { label: "250", value: "仙女棒【250元】" },
				  { label: "365", value: "鹹酥雞【365元】" },
				  { label: "499", value: "好寶寶印章【499元】" },
				  { label: "888", value: "麻將發大財【888元】" },
				  { label: "1314", value: "鑽戒【1314元】" }
				])
			);
			await i.guild.members.fetch();
			const bossMembers = i.guild.members.cache.filter(m =>
			  hasRole(m, [STAFF_ROLE_ID, COMPANION_ROLE_ID])
			);

			const bossMenu = new ActionRowBuilder().addComponents(
			  new StringSelectMenuBuilder()
				.setCustomId("gift_select_boss")
				.setPlaceholder("👤 選擇要送的陪陪")
				.addOptions(
				  bossMembers.map(m => ({
					label: m.displayName,
					value: m.id
				  }))
				)
			);
			const confirmBtn = new ActionRowBuilder().addComponents(
			  new ButtonBuilder()
				.setCustomId("gift_confirm")
				.setLabel("🎁 確認送出")
				.setStyle(ButtonStyle.Success)
			);

			await channel.send({
content: `🎁 禮物工單
👤 玩家：${i.user}
📌 請選擇禮物與陪陪`,
			  components: [giftMenu, bossMenu, confirmBtn]
			});
		  return i.reply({
			content: `✅ 已建立禮物工單：${channel}`,
			ephemeral: true
		  });
		}
		if (i.customId === "gift_confirm") {

		  const snap = await get(ref(db, `giftTemp/${i.channel.id}`));

		  if (!snap.exists()) {
			return i.reply({ content: "❌ 尚未選擇禮物或陪陪", ephemeral: true });
		  }

		  const { price, boss } = snap.val();

		  if (!price || !boss) {
			return i.reply({ content: "❌ 請先選擇完整", ephemeral: true });
		  }

		  const customerId = i.channel.permissionOverwrites.cache.find(p =>
			p.allow.has(PermissionFlagsBits.ViewChannel) &&
			p.id !== STAFF_ROLE_ID &&
			p.id !== COMPANION_ROLE_ID &&
			p.id !== OWNER_ROLE_ID &&
			p.id !== client.user.id
		  )?.id;

		  if (!customerId) {
			return i.reply({ content: "❌ 無法識別玩家", ephemeral: true });
		  }
		  if (i.user.id !== customerId) {
		  return i.reply({ content: "❌ 只有玩家本人可以送禮", ephemeral: true });
		}

		  const priceNum = parseInt(price);
			if (isNaN(priceNum)) {
			  return i.reply({ content: "❌ 禮物金額錯誤", ephemeral: true });
			}

		  const balance = await getBalance(customerId);

		  if (balance < priceNum) {
			return i.reply({ content: "❌ 餘額不足", ephemeral: true });
		  }


		  const newUserBalance = await updateBalance(customerId, -priceNum);

		  const bossIncome = Math.floor(priceNum * 0.9);
		  await updateBalance(boss, bossIncome);

		  const senderUser = await i.client.users.fetch(customerId);
		  
		  const giftText = giftMessages[String(price)] || "🎁 神秘禮物！";
			const embed = new EmbedBuilder()
			  .setTitle("✨ 快來看看是誰送禮啦!")
			  .setDescription(
`🎉 特別感謝 <@${customerId}> 送給 <@${boss}> 一份高貴的禮物!

${giftText}`
			  )
			  .setThumbnail(senderUser.displayAvatarURL({ dynamic: true }))
			  .setImage(giftImages[String(price)])
			  .setColor(0xFF69B4)
			  .setTimestamp();
			  
		  await set(ref(db, `giftTemp/${i.channel.id}`), null);

			await i.channel.send({
			  embeds: [embed]
			});

			try {
			  const logChannel = await client.channels.fetch(GIFT_LOG_CHANNEL_ID);

			  if (logChannel) {
				await logChannel.send({
				  embeds: [embed]
				});
			  }
			} catch (e) {
			  console.error("送禮公告發送失敗：", e);
			}

			return i.reply({ content: "✅ 已完成送禮", ephemeral: true });
		}
    }
	if (i.isStringSelectMenu()) {

	  if (i.customId === "gift_select_item") {
		  
		  const customerId = i.channel.permissionOverwrites.cache.find(p =>
			  p.allow.has(PermissionFlagsBits.ViewChannel) &&
			  p.id !== STAFF_ROLE_ID &&
			  p.id !== COMPANION_ROLE_ID &&
			  p.id !== OWNER_ROLE_ID &&
			  p.id !== client.user.id
			)?.id;

			if (i.user.id !== customerId) {
			  return i.reply({ content: "❌ 只有玩家本人可以操作", ephemeral: true });
			}
		await set(ref(db, `giftTemp/${i.channel.id}/price`), i.values[0]);
		return i.reply({
		  content: `✅ 已選擇禮物（${i.values[0]} 元）`,
		  ephemeral: true
		});
	  }

	  if (i.customId === "gift_select_boss") {
		  
		  const customerId = i.channel.permissionOverwrites.cache.find(p =>
			  p.allow.has(PermissionFlagsBits.ViewChannel) &&
			  p.id !== STAFF_ROLE_ID &&
			  p.id !== COMPANION_ROLE_ID &&
			  p.id !== OWNER_ROLE_ID &&
			  p.id !== client.user.id
			)?.id;

			if (i.user.id !== customerId) {
			  return i.reply({ content: "❌ 只有玩家本人可以操作", ephemeral: true });
			}
		await set(ref(db, `giftTemp/${i.channel.id}/boss`), i.values[0]);
		return i.reply({
		  content: `✅ 已選擇陪陪`,
		  ephemeral: true
		});
	  }
	}
    // ===== Modal =====
    if (i.isModalSubmit()) {
		const { getDatabase, ref, get, set, runTransaction, push } = require('firebase/database');

      if (i.customId.startsWith("rate_modal_")) {
		  await i.deferReply({ ephemeral: true });

		  // ⭐ 限制：只有開單玩家能評
		  const snap = await get(ref(db, `ratingTarget/${i.channel.id}`));
		  const allowedUserId = snap.exists() ? snap.val() : null;

		  if (!allowedUserId || i.user.id !== allowedUserId) {
			return i.editReply({ content: "❌ 只有開單玩家可以評價" });
		  }

		  // ⭐ 防重複評價
		  const ratedRef = ref(db, `rated/${i.channel.id}/${i.user.id}`);
		  const tx = await runTransaction(ratedRef, (cur) => {
			if (cur) return;
			return true;
		  });

		  if (!tx.committed) {
			return i.editReply({ content: "❌ 你已經評價過了" });
		  }

		  // ⭐ 取得資料
		  const score = i.customId.split("_").pop();
		  const target = i.fields.getTextInputValue("target");
		  const content = i.fields.getTextInputValue("content");
		  const anonymous = i.fields.getTextInputValue("anonymous");

		  const isAnon = ["是", "yes", "y", "true"].includes(anonymous.toLowerCase());
		  const name = isAnon ? "匿名闆闆" : `${i.user}`;

		  // ⭐ 發送評價
		  const channel = await client.channels.fetch(RATING_CHANNEL_ID);

		  const embed = new EmbedBuilder()
			.setTitle("💎 客戶滿意好評")
			.setDescription(
		`👤 闆闆名稱：${name}
		🎯 獲得評分陪陪：${target}
		⭐ 評分：${"⭐".repeat(score)}

		📝 闆闆的評價：
		${content}

		📌 來自工單：${i.channel?.name || "未知"}`
			)
			.setColor(0xFFD700)
			.setTimestamp();
			await push(ref(db, `ratings/${target}`), {
			  score: parseInt(score),
			  from: i.user.id,
			  time: Date.now()
			});
			await channel.send({ embeds: [embed] });

			// 新增：發送到回饋頻道
			try {
			  const feedbackChannel = await client.channels.fetch(FEEDBACK_CHANNEL_ID);

			  if (feedbackChannel) {
				await feedbackChannel.send({
				  embeds: [embed]
				});
			  }
			} catch (e) {
			  console.error("評價回饋發送失敗：", e);
			}

		  // ⭐ 清理資料（很重要）
		  await set(ref(db, `ratingTarget/${i.channel.id}`), null);

		  // ⭐ 刪語音
		  try {
			const voice = i.guild.channels.cache.find(c =>
			  c.type === ChannelType.GuildVoice &&
			  c.name === `語音-${i.channel.name}`
			);
			if (voice) await voice.delete().catch(() => {});
		  } catch {}

		  return i.editReply({ content: "✅ 評價完成" });
		}

      const ticketId = await getNextTicketId();

      const channel = await i.guild.channels.create({
        name: `奈奈電競-${ticketId}`,
        type: ChannelType.GuildText,
        parent: TICKET_CATEGORY_ID,
        permissionOverwrites: [
			  { id: i.guild.id, deny: [PermissionFlagsBits.ViewChannel] },

			  // 闆闆（開單者）
			  { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },

			  // 客服
			  { id: STAFF_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },

			  // 陪陪
			  { id: COMPANION_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },

			  // 店長（可看即可，是否可發言你自己決定）
			  { id: OWNER_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel] },

			  // Bot
			  { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
			]
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('voice').setLabel('🔊 建立語音頻道').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('gift').setLabel('🎁 我要送禮').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('close').setLabel('🔒 我要結單').setStyle(ButtonStyle.Danger)
      );

      let content = "";

      if (i.customId === "game_modal") {
        content = `🎮 遊戲單
陪陪：${i.fields.getTextInputValue("companion")}
遊戲：${i.fields.getTextInputValue("game")}
類型：${i.fields.getTextInputValue("type")}
時間：${i.fields.getTextInputValue("time")}`;
      }

      if (i.customId === "voice_modal") {
        content = `🎤 語音單
陪陪：${i.fields.getTextInputValue("companion")}
類型：${i.fields.getTextInputValue("type")}
時間：${i.fields.getTextInputValue("time")}`;
      }

      if (i.customId === "boost_modal") {
        content = `💻 代打單
段位：${i.fields.getTextInputValue("rank")}`;
      }
	  
      const embed = new EmbedBuilder()
		  .setTitle(`📌 遊戲工單 #${ticketId}`)
		  .setDescription(
		`👤 闆闆名稱：${i.user}\n\n${content}`)
		  .setColor(0xFFD700);

		await channel.send({
		  content: `<@&${STAFF_ROLE_ID}> <@&${COMPANION_ROLE_ID}>`,
		  embeds: [embed],
		  components: [row]
		});

      return i.reply({ content: `✅ 已建立工單，請點擊右方連結：${channel}`, ephemeral: true });
    }

  } catch (e) {
    console.error(e);
    if (i.replied || i.deferred) {
      i.followUp({ content: "❌ 系統錯誤", ephemeral: true });
    } else {
      i.reply({ content: "❌ 系統錯誤", ephemeral: true });
    }
  }
});

client.login(process.env.TOKEN);
