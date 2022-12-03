import { Error } from "airtable";
import Record from "airtable/lib/record";
import { User } from "telegraf/typings/core/types/typegram";
require("dotenv").config();

const Airtable = require("airtable");
Airtable.configure({
  endpointUrl: process.env.AT_ENDPOINT_URL,
  apiKey: process.env.AT_API_KEY,
});
const base = Airtable.base(process.env.AT_BASE);

const unknownErrorMessage =
  "Ooops... Something goes wrong. Please try again later or contact a support team. Just kidding, we do not have a support team";
const unregisteredErrorMessage =
  "Seems like you don't have a linked account, try to /register or contact admin";

const getCurrentDate = (): string => {
  return new Date().toLocaleDateString("ru").replaceAll(".", "-");
};

const getCurrentDateReversed = (): string => {
  return getCurrentDate().split("-").reverse().join("-");
};

export const airtableService = {
  register(user: User): Promise<void> {
    return new Promise((resolve, reject) => {
      base("Dancers")
        .select({
          view: "Grid view",
        })
        .firstPage(function (err: any, records: any[]) {
          if (err) {
            console.error(err);
            console.log("Error when querying users", err);
            reject({ message: unknownErrorMessage });
            return;
          }
          if (records.some((el) => el.get("Id") === user.id)) {
            reject({ message: `User ${user.username} already exists` });
            return;
          }
          base("Dancers").create(
            [
              {
                fields: {
                  Id: user.id,
                  Name: user.username,
                  Montly_pass: false,
                  Subscription_Ends: getCurrentDateReversed(),
                  Balance: 0,
                  Status: "Active",
                },
              },
            ],
            function (err: Error, records: any) {
              if (err) {
                console.log("Error when creating user", err);
                reject({ message: unknownErrorMessage });
                return;
              }
              resolve();
            }
          );
        });
    });
  },
  createEvent(): Promise<void> {
    return new Promise((resolve, reject) => {
      const date = getCurrentDateReversed();
      const time = "18:30:00";
      const eventDate = new Date(`${date}T${time}`);
      base("Classes").create(
        [
          {
            fields: {
              Name: `Class ${date}`,
              Dancers: [],
              Date: eventDate,
              Completed: false,
            },
          },
        ],
        function (err: any, records: any) {
          if (err) {
            console.error("Error when creating event", err);
            reject({ message: unknownErrorMessage });
            return;
          }
          resolve();
        }
      );
    });
  },
  completeEvent(): Promise<void> {
    return new Promise((resolve, reject) => {
      base("Classes")
        .select({
          view: "Current",
        })
        .firstPage(function (err: any, records: any) {
          if (err) {
            console.error("Error when querying events", err);
            reject({ message: unknownErrorMessage });
            return;
          }
          const id = records[0].getId();
          base("Classes").update(
            [
              {
                id: id,
                fields: {
                  Completed: true,
                },
              },
            ],
            function (err: any, records: any) {
              if (err) {
                console.error("Error when updating event", err);
                reject({ message: unknownErrorMessage });
                return;
              }
              resolve();
            }
          );
        });
    });
  },
  getInfo(): Promise<string> {
    return new Promise((resolve, reject) => {
      base("Classes")
        .select({
          view: "Current",
        })
        .firstPage(function (err: any, records: any[]) {
          if (err) {
            console.error("Error when querying classes", err);
            reject({ message: unknownErrorMessage });
            return;
          }
          const dancers: string[] = records[0].fields.DancersNames;
          const name: string = records[0].fields.Name;
          if (!dancers || !dancers.length) {
            reject({message: "No one registered."});
            return
          }
          const message = dancers?.reduce(
            (msg, dancer, idx) => msg + `${idx + 1}. ${dancer} \n `,
            `Participants of ${name} \n \n `
          );
          resolve(message);
        });
    });
  },
  addDancer(user: User): Promise<string> {
    return new Promise((resolve, reject) => {
      base("Classes")
        .select({
          view: "Current",
        })
        .firstPage(async (err: any, records: any) => {
          if (err) {
            console.error("Error when querying classes", err);
            reject({ message: unknownErrorMessage });
            return;
          }
          const dancers: string[] = records[0].fields.Dancers ?? [];
          const dancersNames: string[] = records[0].fields.DancersNames;
          const index = dancers.length || 1;
          const id = records[0].getId();
          const name: string = records[0].fields.Name;
          const message = dancers.length
            ? dancersNames?.reduce(
                (msg, dancer, idx) => msg + `${idx + 1}. ${dancer} \n `,
                `Participants of ${name} \n \n `
              )
            : "Well done, you are first \n";
          base("Dancers")
            .select({
              view: "Grid view",
            })
            .firstPage(function (err: any, records: any) {
              if (err) {
                console.error("Error when querying dancers", err);
                reject({ message: unknownErrorMessage });
                return;
              }
              records.forEach(function (record: any) {
                if (record.fields.Id === user.id) {
                  if (dancers.includes(record.getId())) {
                    reject({ message: `User already registered /n/n ${message}` });
                    return;
                  }
                  base("Classes").update(
                    [
                      {
                        id: id,
                        fields: {
                          Dancers: [...dancers, record.getId()],
                        },
                      },
                    ],
                    function (err: any, records: any) {
                      if (err) {
                        console.error("Error when adding dancer", err);
                        reject({ message: unknownErrorMessage });
                        return;
                      }
                      resolve(
                        `Let's dance together! \n\n` +
                          message +
                          `${index}. ${user.username} \n`
                      );
                    }
                  );
                }
              });
            });
        });
    });
  },
  removeDancer(user: User): Promise<string> {
    return new Promise((resolve, reject) => {
      base("Classes")
        .select({
          view: "Current",
        })
        .firstPage(function (err: any[], records: Record<any>[]) {
          if (err) {
            console.error("Error when querying classes", err);
            reject({ message: unknownErrorMessage });
            return;
          }
          const dancers: string[] = records[0].fields.Dancers;
          const dancersNames: string[] = records[0].fields.DancersNames;
          const name: string = records[0].fields.Name;
          const message = dancers.length
          ? dancersNames?.reduce(
              (msg, dancer, idx) => msg + `${idx + 1}. ${dancer} \n `,
              `Participants of ${name} \n \n `
            )
          : "Well done, you are first \n";
          if (!dancers || !dancers.length) {
            reject({ message: "No one registered." });
            return;
          }
          const id = records[0].getId();
          base("Dancers")
            .select({
              view: "Grid view",
            })
            .firstPage((err: Error, records: Record<any>[]) => {
              if (err) {
                console.error("Error when querying dancers", err);
                reject({ message: unknownErrorMessage });
                return;
              }
              const currentUser = records.find(
                (record) => record.get("Id") === user.id
              );
              if (!currentUser) {
                reject({ message: unregisteredErrorMessage });
                return;
              }
              const currentUserIndexInEvent = dancers.findIndex(
                (dancer) => dancer === currentUser.getId()
              );
              if (currentUserIndexInEvent < 0) {
                reject({ message: `You do not take part in this event \n\n ${message}` });
                return;
              }
              dancers.splice(currentUserIndexInEvent, 1);
              base("Classes").update(
                [
                  {
                    id: id,
                    fields: {
                      Dancers: [...dancers],
                    },
                  },
                ],
                function (err: any, records: any) {
                  if (err) {
                    console.error("Error when adding dancer", err);
                    reject({ message: unknownErrorMessage });
                    return;
                  }
                  resolve(`You are removed from event`);
                }
              );
            });
        });
    });
  },
  getUserInfo(user: User) {
    return new Promise((resolve, reject) => {
        base("Dancers")
        .select({
          view: "Grid view",
        }).firstPage((err: Error, records: Record<any>[]) => {
            if (err) {
                console.error(err)
                reject({message: unknownErrorMessage})
                return
            }
            const currentUser = records.find(rec => rec.get("Id") === user.id)
            if (!currentUser) {
                reject({message: 'This user is not registered'})
                return
            }
            const heading = `${user.username} Info: \n\n`
            if (currentUser.fields.Montly_pass) {
                resolve(heading + `Subscription ends ${currentUser.fields?.Subscription_Ends}`)
            }
            resolve(heading + `Current Balance: ${currentUser.fields?.Balance}`)
        })
    })
  }
};
