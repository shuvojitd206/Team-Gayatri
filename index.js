const TelegramBot = require('node-telegram-bot-api');

// Token env variable se lo, ya seedha yahan daal do (sirf testing ke liye)
const token = process.env.BOT_TOKEN || '8948776993:AAFZnP2Hr52tZzB7VY9HStp-YiB2TF5ra7w';

if (!token || token === 'YOUR BOT TOKEN') {
  console.error('BOT_TOKEN set nahi hai. Env variable set karo ya upar wali line mein token daalo.');
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

// Jab koi user group/channel join request bhejta hai
bot.on('chat_join_request', async (req) => {
  const chatId = req.chat.id;
  const userId = req.from.id;
  const userName = req.from.first_name || 'there';

  console.log(`Join request aayi: ${userId} (${userName}) chat ${chatId} se`);

try {
  await Promise.all([
  bot.sendMessage(
    userId,
    `🎉 Welcome to Team Gayatri! 💯

🔗 Registration Link:
https://www.ts777.online/#/register?invitationCode=324515976095

🤩 Register karke deposit karo aur Screenshot bhej do. Screenshot verify hote hi tumhe VIP Group me add kar diya jayega. 🔥`
  ),

  bot.sendDocument(userId, "./ITHESH VIP PANEL.apk", {
    caption: "📲 Download App"
  }),

  bot.sendVoice(userId, "./gayatriaudio.ogg"),

  bot.sendMessage(
    userId,
    "💸 Deposit karke Screenshot Send Kardo @Miss_Gayatri 👍"
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

// Yahan apni admin/owner Chat ID daalo (jaha messages forward honge)
// @userinfobot ko message karke apni ID nikal lo
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || '8213349474';

// User -> Admin message ka mapping, taaki admin ke reply ko sahi user tak bhej sakein
// Key: admin ke paas forward hue message ka ID, Value: original user ki chat ID
const forwardMap = new Map();

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userName = msg.from.first_name || 'there';
  const text = msg.text;

  console.log(`Message aaya: ${userName} (${chatId}) - "${text}"`);

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
