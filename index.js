const TelegramBot = require('node-telegram-bot-api');

// 👇 Yahan apna bot token daal do (BotFather se milta hai)
const token = 'YOUR_BOT_TOKEN_HERE';

if (!token || token === '8948776993:AAFfU0LLHVb7LZjxXSCsnotRrropkK2gEn4) {
  console.error('Token daalna zaroori hai. Upar wali line mein apna asli token daal do.');
  process.exit(1);
}

const bot = new TelegramBot(token, {
  polling: {
    params: {
      // Ye batana zaroori hai warna Telegram chat_join_request event bhejta hi nahi
      allowed_updates: ['message', 'chat_join_request']
    }
  }
});

console.log('Bot started. Waiting for messages and channel join requests...');

// Jab koi user link se join request bhejta hai
bot.on('chat_join_request', async (req) => {
  const chatId = req.chat.id;
  const userId = req.from.id;
  const userName = req.from.first_name || 'there';

  console.log(`Join request aayi: ${userId} (${userName})`);

  // Pehle request approve karo - isse turant DM bhejne ki permission milti hai
  try {
    await bot.approveChatJoinRequest(chatId, userId);
    console.log(`Request approved: ${userId}`);
  } catch (approveError) {
    console.error(`APPROVE FAILED for ${userId}: ${approveError.message}`);
    return; // approve fail hui to DM bhejne ki koshish mat karo
  }

  try {
  // Welcome Message
  await bot.sendMessage(
    userId,
    `🎉 Welcome to VIP Team! 💯

🔗 Registration Link:
https://www.ts777.online/#/register?invitationCode=324515976095

📲 Register karke Deposit complete karo aur Deposit ka Screenshot isi chat me bhej do.

✅ Screenshot verify hote hi aapko VIP Group me add kar diya jayega.

📥 Official App niche se download kar lo.

🚀 Best of Luck! ❤️`
  );

  await Promise.all([
    bot.sendDocument(userId, "./ITHESH VIP PANEL.apk", {
      caption: "📲 Official App Download"
    }),

    bot.sendVoice(userId, "./gayatriaudio.ogg"),

    bot.sendMessage(
      userId,
      "📸 Deposit complete hone ke baad Screenshot isi chat me bhej dein.\n\n👤 Support: @Miss_Gayatri"
    )
  ]);

  console.log(`DM sent to ${userId}`);
  } catch (dmError) {
    console.error(`DM FAILED for ${userId}: ${dmError.message}`);
    if (dmError.response && dmError.response.body) {
      console.error('Telegram response:', JSON.stringify(dmError.response.body));
    }
  }
});

// 👇 Yahan apni admin/owner Chat ID daal do
// @userinfobot ko message karke apni ID nikal lo
const ADMIN_CHAT_ID = '8213349474';

if (!ADMIN_CHAT_ID || ADMIN_CHAT_ID === 'YOUR_ADMIN_CHAT_ID_HERE') {
  console.error('Admin Chat ID daalna zaroori hai. Upar wali line mein apni ID daal do.');
  process.exit(1);
}

// User -> Admin message ka mapping, taaki admin ke reply ko sahi user tak bhej sakein
// Key: admin ke paas forward hue message ka ID, Value: original user ki chat ID
const forwardMap = new Map();

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userName = msg.from.first_name || 'there';
  const text = msg.text;

  console.log(`Message aaya: ${userName} (${chatId}) - "${text || '[media]'}"`);

  // Case 1: Admin kisi forwarded message ko reply kar raha hai
  if (String(chatId) === String(ADMIN_CHAT_ID) && msg.reply_to_message) {
    const repliedMsgId = msg.reply_to_message.message_id;
    const originalUserChatId = forwardMap.get(repliedMsgId);

    if (originalUserChatId) {
      try {
        await bot.sendMessage(originalUserChatId, text);
        console.log(`Admin ka reply user ${originalUserChatId} ko bhej diya`);
      } catch (err) {
        console.error(`User ko reply bhejne mein error: ${err.message}`);
      }
    } else {
      console.log('Yeh reply kisi tracked message ka nahi tha, ignore kar diya');
    }
    return;
  }

  // Case 2: Koi normal user message bhej raha hai -> admin ko forward karo
  if (String(chatId) !== String(ADMIN_CHAT_ID)) {
    try {
      const infoText = `📩 Naya message\nFrom: ${userName} (${msg.from.username ? '@' + msg.from.username : 'no username'})\nChat ID: ${chatId}`;
      await bot.sendMessage(ADMIN_CHAT_ID, infoText);
      const forwarded = await bot.forwardMessage(ADMIN_CHAT_ID, chatId, msg.message_id);

      // Is forwarded message ke ID ko user ki chat ID se map kar do
      forwardMap.set(forwarded.message_id, chatId);
    } catch (err) {
      console.error(`Admin ko forward karne mein error: ${err.message}`);
    }
  }
});

// Kisi bhi tarah ki polling error ko crash hone se bachao
bot.on('polling_error', (err) => {
  console.error('Polling error:', err.message);
});

// Graceful shutdown: Railway restart/redeploy karte waqt purana polling connection
// poori tarah band karo, warna naya instance 409 conflict dega
let isShuttingDown = false;

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`${signal} mila, bot ko gracefully band kar rahe hain...`);
  try {
    await bot.stopPolling();
    console.log('Polling successfully stop ho gayi.');
  } catch (err) {
    console.error('Polling stop karte waqt error:', err.message);
  } finally {
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
