import {
    OrgProvisioning,
    ProvisioningStatus,
    AccountProvisioning,
    Feature,
    OrgFeature,
} from "@padloc/core/src/provisioning";
import { $l } from "@padloc/locale/src/translate";
import { html } from "lit";
import { alert } from "./dialog";
import "../elements/rich-content";
import { app, router } from "../globals";
import { openExternalUrl } from "@padloc/core/src/platform";

export function checkFeatureDisabled(feature: Feature): boolean;
export function checkFeatureDisabled(feature: OrgFeature, isOwner: boolean): boolean;
export function checkFeatureDisabled(feature: Feature | OrgFeature, isOwner?: boolean) {
    if (feature.disabled) {
        alertDisabledFeature(feature, isOwner as boolean);
    }
    return feature.disabled;
}

export function alertDisabledFeature(feature: Feature): Promise<void>;
export function alertDisabledFeature(feature: OrgFeature, isOwner: boolean): Promise<void>;
export async function alertDisabledFeature(feature: Feature | OrgFeature, isOwner?: boolean) {
    const hasAction = feature.actionLabel && feature.actionUrl;
    const message =
        feature instanceof OrgFeature && isOwner ? feature.messageOwner || feature.message : feature.message;
    const choice = await alert(
        !message
            ? $l("You don't have access to this feature!")
            : typeof message === "string"
            ? message
            : html`<pl-rich-content
                  .content=${(message as { content: string }).content}
                  .type=${(message as { type: "plain" | "html" | "markdown" }).type}
              ></pl-rich-content>`,
        {
            icon: null,
            width: "auto",
            maxWidth: message?.type === "html" ? "100%" : "",
            options: hasAction ? [feature.actionLabel!, $l("Dismiss")] : [$l("Dismiss")],
            type: !hasAction ? "choice" : "info",
        }
    );
    if (hasAction && choice === 0) {
        openExternalUrl(feature.actionUrl!);
    }
}

export async function displayProvisioning({
    status,
    statusLabel,
    statusMessage,
    actionUrl,
    actionLabel,
}: AccountProvisioning | OrgProvisioning) {
    const options: { action: () => void; label: string }[] = [];
    if (actionUrl) {
        options.push({
            action: () => openExternalUrl(actionUrl),
            label: actionLabel || $l("Learn More"),
        });
    }

    if (!!app.session) {
        options.push({
            action: async () => {
                await app.logout();
                router.go("start");
            },
            label: $l("Log Out"),
        });
    }

    if (![ProvisioningStatus.Unprovisioned, ProvisioningStatus.Suspended].includes(status) || !app.account) {
        options.push({ label: $l("Dismiss"), action: () => {} });
    }

    const choice = await alert(
        html`<pl-rich-content
            .content=${typeof statusMessage === "string" ? statusMessage : statusMessage.content}
            type=${typeof statusMessage === "string" ? "markdown" : statusMessage.type}
        ></pl-rich-content>`,
        {
            icon: null,
            options: options.map((o) => o.label),
            preventDismiss: true,
            title: statusLabel,
        }
    );

    options[choice]?.action();
}
