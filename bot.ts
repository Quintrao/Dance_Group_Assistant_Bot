import { Context, Markup } from "telegraf";
import { airtableService } from "./airtable.service";
const { Telegraf } = require("telegraf");
require("dotenv").config();

const debugOnlyError = "This command works only in debug mode";
const notReadyError = "Sorry, this feature is still not ready.";
const testModeWarn =
  "\n ----------- \n This bot is currently working in test mode. \n If you noticed some strange behavior (f.e. undefined or null in replies, odd messages or smth else) please contact admin";
const help = `It's too dangerous to go alone. Take this. 
 \n Here's the list of main commands:
 \n /register - adds you to the list of dancers. To run other commands you have to be registered
 \n /dance - adds you to today's class 
 \n /info - shows info related to upcoming class
 \n /remove - removes you from today's class
 \n /whoami - info about your account
 
 \n Also see /admin_help and /debug_help if you're curious`;

const helpAdmin = `Powerful you have become. The dark side I sense in you.
 \n Here's the list of admin commands:
 \n /create_event - creates a dance class for today 18:30. Attention: only one dance class could be active at the moment
 \n /complete_event - removes the dance class from shedule and prepare withdrawal
 \n /deny_event - in progress, designed to deny event without any withdrawal

 Other changes is better to be done from the database for now. 
 `;

const helpDebug = `Oh, I see, you're something of a programmer yourself.
 \n Here's the list of debug commands:
 \n /debug_withdrawal - test withdrawal after completing events, requires a at user id
 `;

const debugMode = true;

const isUserAdmin = (id: string | undefined): Boolean => {
  if (!id) return false;
  return id === process.env.SUPER_ADMIN_ID || id === process.env.ADMIN_ID;
};

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.start((ctx: Context) =>
  ctx
    .reply("Welcome")
);

//ADMIN
bot.command("create_event", async (ctx: Context) => {
  if (!isUserAdmin(String(ctx.from?.id))) {
    ctx.reply("You don't have power here");
    return;
  }
  try {
    const message = await airtableService.createEvent();
    ctx.reply(message);
  } catch (e) {
    ctx.reply((e as Error).message + (debugMode ? testModeWarn : ""));
  }
});
bot.command("complete_event", async (ctx: Context) => {
  if (!isUserAdmin(String(ctx.from?.id))) {
    ctx.reply("You don't have power here");
    return;
  }
  try {
    await airtableService.completeEvent();
    ctx.reply("Event completed");
  } catch (e) {
    ctx.reply((e as Error).message);
  }
});
bot.command("deny_event", async (ctx: Context) => {
  if (!isUserAdmin(String(ctx.from?.id))) {
    ctx.reply("You don't have power here");
    return;
  }
  ctx.reply(notReadyError);
  //   try {
  //     await airtableService.completeEvent();
  //     ctx.reply("Event completed");
  //   } catch (e) {
  //     ctx.reply((e as Error).message);
  //   }
});

//USER
bot.command("register", async (ctx: Context) => {
  const user = ctx.from;
  if (!user) {
    ctx.reply("User not found");
    return;
  }
  try {
    await airtableService.register(user);
    ctx.reply("Successfully registered");
  } catch (e) {
    ctx.reply((e as Error).message);
  }
});
bot.command("dance", async (ctx: Context) => {
  if (!ctx.from) return;
  try {
    const message = await airtableService.addDancer(ctx.from);
    ctx.reply(message + (debugMode ? testModeWarn : ""));
  } catch (e) {
    ctx.reply((e as Error).message + (debugMode ? testModeWarn : ""));
  }
});
bot.command("remove", async (ctx: Context) => {
  if (!ctx.from) return;
  try {
    const message = await airtableService.removeDancer(ctx.from);
    ctx.reply(message + (debugMode ? testModeWarn : ""));
  } catch (e) {
    ctx.reply((e as Error).message + (debugMode ? testModeWarn : ""));
  }
});
bot.command("info", async (ctx: Context) => {
  try {
    const message = await airtableService.getInfo();
    ctx.reply(message + (debugMode ? testModeWarn : ""));
  } catch (e) {
    ctx.reply((e as Error).message + (debugMode ? testModeWarn : ""));
  }
});
bot.command("whoami", async (ctx: Context) => {
  if (!ctx.from) return;
  try {
    const message = await airtableService.getUserInfo(ctx.from);
    ctx.reply(message + (debugMode ? testModeWarn : ""));
  } catch (e) {
    ctx.reply((e as Error).message + (debugMode ? testModeWarn : ""));
  }
});

// DEBUG
bot.command("debug_withdrawal", async (ctx: Context) => {
  if (!debugMode) {
    ctx.reply(debugOnlyError);
    return;
  }
  try {
    await airtableService.withdrawal("recE0MOn6nNslxS0g");
    ctx.reply("Success " + (debugMode ? testModeWarn : ""));
  } catch (e) {
    ctx.reply(
      "Error " + (e as Error).message + (debugMode ? testModeWarn : "")
    );
  }
});
bot.command("find_faggot", (ctx: Context) => {
  console.log(ctx.from, "from");
  ctx.reply(ctx.from?.first_name ?? "no user");
});

//HELP
bot.command("debug_help", (ctx: Context) => {
  ctx.reply(helpDebug);
});
bot.command("admin_help", (ctx: Context) => {
  ctx.reply(helpAdmin);
});
bot.help((ctx: Context) => ctx.reply(help));
bot.on("sticker", (ctx: Context) => ctx.reply("👍"));
bot.hears("hi", (ctx: Context) => ctx.reply("Hey there"));
bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
