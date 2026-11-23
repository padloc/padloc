import { Org, OrgMember, OrgMemberStatus, Group } from "@padloc/core/src/org";
import { Controller } from "@padloc/core/src/server";
import { getIdFromEmail, uuid } from "@padloc/core/src/util";
import { Auth } from "@padloc/core/src/auth";
import { Err, ErrorCode } from "@padloc/core/src/error";

import { DirectorySubscriber, DirectoryUser, DirectoryGroup, DirectoryProvider } from "@padloc/core/src/directory";

export class DirectorySync implements DirectorySubscriber {
    constructor(public readonly controller: Controller, providers: DirectoryProvider[] = []) {
        for (const provider of providers) {
            provider.subscribe(this);
        }
    }

    async userCreated(user: DirectoryUser, orgId: string) {
        const org = (orgId && (await this.controller.storage.get(Org, orgId))) || null;
        if (org && org.directory.syncMembers) {
            const memberExists = org.members.some((member) => member.email === user.email);

            if (memberExists) {
                return;
            }

            const newOrgMember = new OrgMember({
                id: await uuid(),
                name: user.name,
                email: user.email,
                status: OrgMemberStatus.Provisioned,
                updated: new Date(),
            });

            org.members.push(newOrgMember);

            await this.controller.updateMetaData(org);
            await this.controller.storage.save(org);
        }
    }

    async userUpdated(user: DirectoryUser, orgId: string, previousEmail?: string) {
        const org = (orgId && (await this.controller.storage.get(Org, orgId))) || null;
        if (org && org.directory.syncMembers) {
            // The existence of the `previousEmail` argument indicates that the member's
            // email has changed, so we'll have to look up the member using the previous email
            const existingMember = org.getMember({ email: previousEmail || user.email });

            if (!existingMember) {
                return;
            }

            // Changing the email address of a user is a little more
            // involved than that. Let's disable it for now.

            if (previousEmail && previousEmail !== user.email) {
                throw new Err(ErrorCode.NOT_SUPPORTED, "Updating user emails is not supported at this time");
            }
            // if (user.email) {
            //     existingMember.email = user.email;
            // }

            if (user.name) {
                existingMember.name = user.name;
            }

            existingMember.updated = new Date();

            await this.controller.updateMetaData(org);
            await this.controller.storage.save(org);
        }
    }

    async userDeleted(user: DirectoryUser, orgId: string) {
        const org = (orgId && (await this.controller.storage.get(Org, orgId))) || null;
        if (org && org.directory.syncMembers) {
            const existingMember = org.getMember({ email: user.email });

            if (!existingMember) {
                return;
            }

            await org.removeMember(existingMember, false);

            // Remove any existing invites
            const existingInvite = org.invites.find((invite) => invite.email === existingMember!.email);
            if (existingInvite) {
                org.removeInvite(existingInvite);

                try {
                    const auth = await this._getAuthForEmail(existingMember.email);
                    auth.invites = auth.invites.filter((invite) => invite.id !== existingInvite.id);
                    await this.controller.storage.save(auth);
                } catch (_error) {
                    // Ignore
                }
            }

            await this.controller.updateMetaData(org);
            await this.controller.storage.save(org);
        }
    }

    async groupCreated(group: DirectoryGroup, orgId: string) {
        const org = (orgId && (await this.controller.storage.get(Org, orgId))) || null;
        if (org && org.directory.syncGroups) {
            const groupExists = org.groups.some((orgGroup) => orgGroup.name === group.name);

            if (groupExists) {
                return;
            }

            let members = [];
            for (const { email } of group.members) {
                const member = org.getMember({ email });
                if (!member) {
                    continue;
                }
                members.push(member);
            }

            const newGroup = new Group({
                name: group.name,
                members,
            });

            org.groups.push(newGroup);

            await this.controller.updateMetaData(org);
            await this.controller.storage.save(org);
        }
    }

    async groupUpdated(group: DirectoryGroup, orgId: string, previousName?: string) {
        const org = (orgId && (await this.controller.storage.get(Org, orgId))) || null;
        if (org && org.directory.syncGroups) {
            // If the name has changed we have to look for the group using the previous name
            const existingGroup = org.groups.find((g) => g.name === (previousName || group.name));

            if (!existingGroup) {
                return;
            }

            existingGroup.name = group.name;

            let members = [];
            for (const { email } of group.members) {
                const member = org.getMember({ email });
                if (!member) {
                    continue;
                }
                members.push({
                    email,
                    accountId: member.accountId,
                });
            }

            existingGroup.members = members;

            await this.controller.updateMetaData(org);
            await this.controller.storage.save(org);
        }
    }

    async groupDeleted(group: DirectoryGroup, orgId: string) {
        const org = (orgId && (await this.controller.storage.get(Org, orgId))) || null;
        if (org && org.directory.syncGroups) {
            const existingGroupIndex = org.groups.findIndex((orgGroup) => orgGroup.name === group.name);
            if (existingGroupIndex === -1) {
                return;
            }
            org.groups.splice(existingGroupIndex, 1);

            await this.controller.updateMetaData(org);
            await this.controller.storage.save(org);
        }
    }

    private async _getAuthForEmail(email: string) {
        const auth = await this.controller.storage.get(Auth, await getIdFromEmail(email));
        return auth;
    }
}
