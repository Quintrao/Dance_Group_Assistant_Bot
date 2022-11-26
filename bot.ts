import { Context } from "telegraf"
import { User } from "telegraf/typings/core/types/typegram";
const { Telegraf } = require('telegraf')
require('dotenv').config()
const Airtable = require('airtable');

const isUserAdmin = (id: string | undefined): Boolean => {
    if (!id) return false
    return id === process.env.SUPER_ADMIN_ID || id === process.env.ADMIN_ID
}

Airtable.configure({
    endpointUrl: process.env.AT_ENDPOINT_URL,
    apiKey: process.env.AT_API_KEY
});
const base = Airtable.base(process.env.AT_BASE);

const getCurrentDate = ():string => {
    return new Date().toLocaleDateString('ru').replaceAll('.','-')
}

const getCurrentDateReversed = ():string => {
    return getCurrentDate().split('-').reverse().join('-')
}

const register = async (answer: (s: string) => void, user: User): Promise<void> => {

    return new Promise((resolve, reject) => {
        base('Dancers').select({
            view: 'Grid view'
        }).firstPage(function(err: any, records: any) {
            if (err) { console.error(err); return; }
            records.forEach(function(record: any) {
                if (record.get('Id') === user.id) {
                    answer(`User ${user.username} already exists`)
                    reject()
                }
                }
                ) 
                base('Dancers').create([
                    {
                      "fields": {
                        "Id": user.id,
                        "Name": user.username,
                        "Montly_pass": false,
                        "Subscription_Ends": getCurrentDateReversed(),
                        "Balance": 0,
                        "Status": "Active"
                      }
                    },
                  ], function(err: Error, records: any) {
                    if (err) {
                      reject({message: 'Ooops... Something goes wrong. Please try again later or contact a support team. Just kidding, we do not have a support team'})
                      return
                    }
                    records.forEach(function (record: any) {
                      console.log(record, 'record');
                      resolve()
                    });
                  });
            });
        });
}

const createEvent = () => {
    const date = getCurrentDateReversed()
    const time = "18:30:00"
    const eventDate = new Date(`${date}T${time}`)

    base('Classes').create([
        {
          "fields": {
            "Name": `Class ${date}`,
            "Dancers": [],
            "Date": eventDate,
            "Completed": false
          }
        }
      ], function(err: any, records: any) {
        if (err) {
          console.error(err);
          return;
        }
        records.forEach(function (record: any) {
          console.log(record);
        });
      });     
}

const completeEvent = () => {
    base('Classes').select({
        view: 'Current'
    }).firstPage(function(err: any, records: any) {
        if (err) { console.error(err); return; }
        const id = records[0].getId()
        base('Classes').update([
            {
              "id": id,
              "fields": {
                "Completed": true
              }
            }
          ], function(err: any, records: any) {
            if (err) {
              console.error(err);
              return;
            }
            records.forEach(function(record: any) {
              console.log(record);
            })
        })
    });
}

const getInfo = (answer: (s: string) => void): void => {
    base('Classes').select({
        view: 'Current'
    }).firstPage(function(err: any[], records: any) {
        if (err) { console.error(err); return; }
        const dancers: string[] = records[0].fields.DancersNames
        const name: string = records[0].fields.Name
        if (!dancers || !dancers.length) {
            answer('No one registered.')
        }
        console.log(records[0].fields, 'records')
        const message = dancers?.reduce((msg, dancer, idx) => msg + `${idx+1}. ${dancer} \n `, `Participants of ${name} \n \n `)
        answer(message)
    });
}

const addDancer = (answer: (s: string) => void, user: User): void => {
    base('Classes').select({
        view: 'Current'
    }).firstPage(async (err: any[], records: any) => {
        if (err) { console.error(err); return; }
        const dancers: number[] = records[0].fields.Dancers
        const dancersNames: string[] = records[0].fields.DancersNames
        const index = dancers.length
        const id = records[0].getId()
        const name: string = records[0].fields.Name
        if (!dancers || !dancers.length) {
            answer('No one registered.')
        }
        const message = dancersNames?.reduce((msg, dancer, idx) => msg + `${idx+1}. ${dancer} \n `, `Participants of ${name} \n \n `)
        base('Dancers').select({
            view: 'Grid view'
        }).firstPage(function(err: any, records: any) {
            if (err) { console.error(err); return; }
            records.forEach(function(record: any) {
                if (record.fields.Id === user.id) {
                    if (dancers.includes(record.getId())) {
                        answer('User already registered')
                        answer(message)
                        return
                    }
                    base('Classes').update([
                        {
                          "id": id,
                          "fields": {
                            "Dancers": [
                                ...dancers,
                                record.getId()
                            ]
                          }
                        }
                      ], function(err: any, records: any) {
                        if (err) {
                          console.error(err);
                          return;
                        }
                        records.forEach(function(record: any) {
                          console.log(record);
                        })
                        answer(`Let's dance together! \n\n` + message + `${index}. ${user.username} \n`)
                    })
                }
            });
        });
    });
}

const bot = new Telegraf(process.env.BOT_TOKEN)
bot.start((ctx: Context) => ctx.reply('Welcome'))
bot.command('find_faggot', (ctx: Context) => {
    console.log(ctx.from, 'from')
    ctx.reply(ctx.from?.first_name ?? 'no user')
})
bot.command('register', async (ctx: Context) => {
    const user = ctx.from
    if (!user) {
        ctx.reply('User not found') 
        return
    }
    try {
        const answer = (msg: string): void => {
            ctx.reply(msg)
        }
        await register(answer, user)
        ctx.reply('Successfully registered')
    }
    catch (e) {
        ctx.reply((e as Error).message)
    }
})
bot.command('create_event', (ctx: Context) => {
    if (!isUserAdmin(String(ctx.from?.id))) {
        ctx.reply("You don't have power here")
        return
    }

    try {
        createEvent()
        ctx.reply('Event created')
    }
    catch (e) {
        ctx.reply((e as Error).message)
    }
})
bot.command('complete_event', (ctx: Context) => {
    if (!isUserAdmin(String(ctx.from?.id))) {
        ctx.reply("You don't have power here")
        return
    }
    try {
        completeEvent()
        ctx.reply('Event completed')
    }
    catch (e) {
        ctx.reply((e as Error).message)
    }
})
bot.command('dance', (ctx: Context) => {
    if (!ctx.from) return
    try {
        const answer = (msg: string): void => {
            ctx.reply(msg)
        }
        addDancer(answer, ctx.from)
    }
    catch (e) {
        ctx.reply((e as Error).message)
    }
})
bot.command('info', (ctx: Context) => {
    try {
        const answer = (msg: string): void => {
            ctx.reply(msg)
        }
        getInfo(answer)
    }
    catch (e) {
        ctx.reply((e as Error).message)
    }
})
bot.help((ctx: Context) => ctx.reply('Send me a sticker'))
bot.on('sticker', (ctx: Context) => ctx.reply('👍'))
bot.hears('hi', (ctx: Context) => ctx.reply('Hey there'))
bot.launch()