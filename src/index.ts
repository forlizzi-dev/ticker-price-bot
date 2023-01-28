import { loadConfig } from './config';
import fetch from 'node-fetch-commonjs';
import TelegramBot from 'node-telegram-bot-api';
import { ServiceAccount, initializeApp } from 'firebase-admin/app';
import admin from 'firebase-admin';
import { BinancePrice, Variation } from './types';

loadConfig();

const tickerLabel = String(process.env.TICKER);
const ticker = tickerLabel.replace(':', '');

initializeApp({
  credential: admin.credential.cert(
    JSON.parse(String(process.env.FIREBASE_SERVICE_ACCOUNT)) as ServiceAccount
  ),
  databaseURL: process.env.DATABASE_URL,
});
const db = admin.database();

const exitApp = (): void => {
  try {
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

process.on('uncaughtException', (err) => {
  console.error(err);
  process.exit(1);
});
process.on('uncaughtException', (err) => {
  console.error(err);
  process.exit(1);
});

const sendMessage = async (price: number, variation: Variation) => {
  const variations = { equal: '', up: '🟢 🟢 🟢', down: '🔻 🔻 🔻' };
  const message = `${tickerLabel}   ${price}   ${variations[variation]}`;
  const bot = new TelegramBot(String(process.env.TELEGRAM_BOT));
  const result = await bot.sendMessage(
    String(process.env.TELEGRAM_CHAT_ID),
    message,
    {
      allow_sending_without_reply: true,
    }
  );
  console.log(result);
  await db.ref('binance/USDTBRL').update({
    last_message: Date.now(),
  });
  bot.close();
};

const checkPrice = async () => {
  const data = (
    await db.ref(`binance/${ticker}`).get()
  ).toJSON() as BinancePrice;
  const url = `https://api.binance.com/api/v3/ticker/price?symbol=${ticker}`;
  const urlProxy = String(process.env.PROXY).replace(
    '{URL}',
    encodeURIComponent(url)
  );
  let price = 0;
  try {
    const result = await fetch(urlProxy);
    const json = (await result.json()) as BinancePrice;
    if (!json || !json.price) {
      console.error('ERROR proxy URL');
      exitApp();
    }
    price = Number(json.price);
  } catch (err) {
    console.error('ERROR proxy URL');
    exitApp();
  }

  if (!price || isNaN(price)) {
    console.error(`ERROR price ${price}`);
    exitApp();
  }

  await db.ref(`binance/${ticker}`).update({
    price: price,
    timestamp: Date.now(),
  });
  const sinceLastMessage =
    Math.abs((Number(data.last_message) || 0) - Date.now().valueOf()) /
    (1000 * 60);

  const variation: Variation =
    price === data.price ? 'equal' : price > data.price ? 'up' : 'down';

  if (sinceLastMessage > Number(process.env.FORCE_MESSAGE_MINUTES)) {
    await sendMessage(price, variation);
  } else if (
    (variation === 'up' &&
      data.price <= data.threshold.max &&
      price >= data.threshold.max) ||
    (variation === 'down' &&
      data.price >= data.threshold.min &&
      price <= data.threshold.min)
  ) {
    await sendMessage(price, variation);
  }

  exitApp();
};

checkPrice();
