import { Storage } from "@padloc/core/src/storage";
import { Account } from "@padloc/core/src/account";
import { Org } from "@padloc/core/src/org";
import { PlanType, SubscriptionStatus } from "@padloc/core/src/billing";
// @ts-ignore
import vantage from "vantage";
import { prompt } from "enquirer";
import * as colors from "ansi-colors";
import { formatDistanceToNow, format } from "date-fns";

function planColor(plan: PlanType | undefined) {
    switch (plan) {
        case PlanType.Free:
            return "gray";
        case PlanType.Premium:
            return "red";
        case PlanType.Family:
            return "yellow";
        case PlanType.Team:
            return "green";
        case PlanType.Business:
            return "blue";
        default:
            return "white";
    }
}

function subStatusColor(status: SubscriptionStatus | "unknown") {
    switch (status) {
        case SubscriptionStatus.Trialing:
            return "yellow";
        case SubscriptionStatus.Active:
            return "green";
        case SubscriptionStatus.Inactive:
            return "red";
        case SubscriptionStatus.Canceled:
            return "dim";
        default:
            return "white";
    }
}

function col(val: any, width = 30) {
    let str = val.toString();
    if (str.length > width) {
        str = str.slice(0, width - 3) + "...";
    }
    return str.padEnd(width, " ");
}

// function cols(c: any[], width?: number) {
//     return c.map(c => col(c, width)).join(" ");
// }

function displayAccountItem(account: Account) {
    const sub = account.billing && account.billing.subscription;
    const subStatus = sub ? sub.status : "unknown";
    const planName = sub ? sub.plan.name : "none";
    const planType = sub ? sub.plan.type : undefined;
    const lastActive = formatDistanceToNow(new Date(Math.max(...account.sessions.map(s => s.lastUsed.getTime()))));
    return [
        colors.bold(col(account.email, 30)),
        col(account.name, 20),
        col(format(account.created, "yyyy-MM-dd"), 12),
        col(lastActive, 15),
        colors.bold[planColor(planType)](col(planName, 15)),
        colors.bold[subStatusColor(subStatus)](col(subStatus, 10)),
        col(account.orgs.length.toString(), 5)
    ].join(" ");
}

function displayOrgItem(org: Org, owner: Account) {
    const sub = org.billing && org.billing.subscription;
    const subStatus = sub ? sub.status : "unknown";
    const planName = sub ? sub.plan.name : "none";
    const planType = sub ? sub.plan.type : undefined;
    return [
        colors.bold(col(org.name, 20)),
        col(owner.email, 30),
        col(org.members.length, 10),
        col(org.groups.length, 10),
        col(org.vaults.length, 10),
        colors.bold[planColor(planType)](col(planName, 15)),
        colors.bold[subStatusColor(subStatus)](col(subStatus, 10))
    ].join(" ");
}

export class Manage {
    private _vantage: any;

    constructor(public storage: Storage) {
        const cli = (this._vantage = vantage());

        cli.command("accounts")
            .description("Lists all accounts.")
            .action(async (_args: any) => {
                const accounts = await storage.list(Account);
                const choice = await prompt({
                    type: "autocomplete",
                    name: "selected",
                    // @ts-ignore
                    limit: 20,
                    message:
                        `${colors.bold(accounts.length.toString())} accounts found\n\n` +
                        [
                            col("Email", 30),
                            col("Name", 20),
                            col("Created", 12),
                            col("Last Active", 15),
                            col("Plan", 15),
                            col("Status", 10),
                            col("Orgs", 5)
                        ]
                            .map(c => colors.bold.underline(c))
                            .join(" ") +
                        "\n",
                    //            Free      Premium
                    // Trialing   ${"1000".padEnd(10, " ")}${"10".padEnd(10, " ")}
                    // Active     10        10`,
                    choices: [
                        ...accounts.map(acc => ({
                            name: displayAccountItem(acc),
                            value: acc.id
                        })),
                        {
                            role: "separator"
                        }
                    ]
                });
                console.log(choice);
            });

        cli.command("orgs")
            .description("Lists all organizations.")
            .action(async (_args: any) => {
                const orgs = await storage.list(Org);
                const choice = await prompt({
                    type: "autocomplete",
                    name: "selected",
                    // @ts-ignore
                    limit: 20,
                    message:
                        `${colors.bold(orgs.length.toString())} orgs found\n\n` +
                        [
                            col("Name", 20),
                            col("Owner", 30),
                            col("Members", 10),
                            col("Groups", 10),
                            col("Vaults", 10),
                            col("Plan", 15),
                            col("Status", 10)
                        ]
                            .map(c => colors.bold.underline(c))
                            .join(" ") +
                        "\n",
                    choices: [
                        ...(await Promise.all(
                            orgs.map(async org => {
                                const account = await storage.get(Account, org.owner);
                                return {
                                    name: displayOrgItem(org, account),
                                    value: org.id
                                };
                            })
                        )),
                        {
                            role: "separator"
                        }
                    ]
                });
                console.log(choice);
            });
    }

    init() {
        this._vantage
            .delimiter("padloc")
            .listen(5000)
            .show();
    }
}
