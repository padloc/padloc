import { Server } from "@padloc/core/src/server";
import { Account } from "@padloc/core/src/account";
import { Session } from "@padloc/core/src/session";
import { Org } from "@padloc/core/src/org";
import { PlanType, Subscription, SubscriptionStatus, UpdateBillingParams } from "@padloc/core/src/billing";
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

function subColor(sub: Subscription | undefined | null) {
    const status = sub && sub.status;
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

function subLabel(sub: Subscription | undefined | null) {
    const status = sub && sub.status;
    switch (status) {
        case SubscriptionStatus.Trialing:
            const daysLeft = Math.ceil((sub!.trialEnd!.getTime() - Date.now()) / 1000 / 60 / 60 / 24);
            return `${status} (${daysLeft}d)`;
        case SubscriptionStatus.Active:
        case SubscriptionStatus.Inactive:
        case SubscriptionStatus.Canceled:
            return status;
        default:
            return "N/A";
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
    const planName = sub ? sub.plan.name : "none";
    const planType = sub ? sub.plan.type : undefined;
    const lastActive = account.sessions.length
        ? formatDistanceToNow(new Date(Math.max(...account.sessions.map(s => s.lastUsed.getTime()))))
        : "N/A";
    return [
        colors.bold(col(account.email, 30)),
        col(account.name, 20),
        col(format(account.created, "yyyy-MM-dd"), 12),
        col(lastActive, 15),
        colors.bold[planColor(planType)](col(planName, 15)),
        colors.bold[subColor(sub)](col(subLabel(sub), 20)),
        col(account.orgs.length.toString(), 5)
    ].join(" ");
}

function displayObject(obj: { [prop: string]: any }) {
    const w = Math.max(...Object.keys(obj).map(k => k.length));
    return Object.entries(obj)
        .map(([prop, value]) => `${colors.bold(col(prop, w))} ${value}`)
        .join("\n");
}

function displayAccount(account: Account) {
    const sub = account.billing && account.billing.subscription;
    const planName = sub ? sub.plan.name : "none";
    const planType = sub ? sub.plan.type : undefined;
    const lastActive = account.sessions.length
        ? formatDistanceToNow(new Date(Math.max(...account.sessions.map(s => s.lastUsed.getTime()))))
        : "N/A";

    return displayObject({
        Email: account.email,
        Name: account.name,
        "Last Active": lastActive,
        Plan: `${colors.bold[planColor(planType)](planName)} ${colors.bold[subColor(sub)](subLabel(sub))}`,
        Orgs: account.orgs.join(", ")
    });
}

function displayOrgItem(org: Org, owner: Account) {
    const sub = org.billing && org.billing.subscription;
    const planName = sub ? sub.plan.name : "none";
    const planType = sub ? sub.plan.type : undefined;
    return [
        colors.bold(col(org.name, 20)),
        col(owner.email, 30),
        col(org.members.length, 10),
        col(org.groups.length, 10),
        col(org.vaults.length, 10),
        colors.bold[planColor(planType)](col(planName, 15)),
        colors.bold[subColor(sub)](col(subLabel(sub), 20))
    ].join(" ");
}

export class Manage {
    private _vantage: any;

    get storage() {
        return this.server.storage;
    }

    async listAccounts(accounts: Account[]) {
        const { index } = await prompt({
            type: "autocomplete",
            name: "index",
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
                    col("Status", 20),
                    col("Orgs", 5)
                ]
                    .map(c => colors.bold.underline(c))
                    .join(" ") +
                "\n",
            choices: [
                ...accounts.map((acc, index) => ({
                    name: displayAccountItem(acc),
                    value: index
                })),
                {
                    role: "separator"
                }
            ]
        });

        await this.accountSelected(accounts[index]);
    }

    async accountSelected(account: Account) {
        const { action } = await prompt({
            type: "select",
            name: "action",
            message: "\n" + displayAccount(account) + "\n",
            choices: ["Sync Billing", "Delete", "Cancel"]
        });

        switch (action) {
            case "Sync Billing":
                return this.syncBilling(account);
            case "Delete":
                return this.deleteAccount(account);
            case "Cancel":
                return;
        }
    }

    async deleteAccount(account: Account) {
        const { confirmed } = await prompt({
            type: "confirm",
            name: "confirmed",
            message: `Are you sure you want to delete this account? > ${account.email}`
        });

        if (!confirmed) {
            return;
        }

        const ctlr = this.server.makeController({ session: new Session(), account });
        await ctlr.deleteAccount();
        console.log(colors.bold(`${colors.green("✓")} account deleted successfully`));
    }

    async syncBilling(acc: Account | Org) {
        await this.server.billingProvider!.update(
            new UpdateBillingParams(acc instanceof Account ? { account: acc.id } : { org: acc.id })
        );
        console.log(colors.bold(`${colors.green("✓")} billing synced successfully`));
    }

    async listOrgs(orgs: Org[]) {
        const { index } = await prompt({
            type: "autocomplete",
            name: "index",
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
                    col("Status", 20)
                ]
                    .map(c => colors.bold.underline(c))
                    .join(" ") +
                "\n",
            choices: [
                ...(await Promise.all(
                    orgs.map(async (org, index) => {
                        const account = await this.storage.get(Account, org.owner);
                        return {
                            name: displayOrgItem(org, account),
                            value: index
                        };
                    })
                )),
                {
                    role: "separator"
                }
            ]
        });

        this.orgSelected(orgs[index]);
    }

    orgSelected(org: Org) {
        console.log("org selected: ", org.id);
    }

    constructor(public server: Server) {
        const cli = (this._vantage = vantage());

        cli.command("accounts")
            .description("Lists all accounts.")
            .action(async (_args: any) => {
                const accounts = await this.storage.list(Account);
                await this.listAccounts(accounts);
            });

        cli.command("orgs")
            .description("Lists all organizations.")
            .action(async (_args: any) => {
                const orgs = await this.storage.list(Org);
                await this.listOrgs(orgs);
            });
    }

    init() {
        this._vantage
            .delimiter("padloc > ")
            .listen(5000)
            .show();
    }
}
