import { OrgProvisioning, ProvisioningStatus, AccountProvisioning, Feature } from "@padloc/core/src/provisioning";
import { $l } from "@padloc/locale/src/translate";
import { html } from "lit";
import { alert } from "./dialog";
import "../elements/rich-content";
import { app, router } from "../globals";
import { openExternalUrl } from "@padloc/core/src/platform";

export function checkFeatureDisabled(feature: Feature) {
    if (feature.disabled) {
        alertDisabledFeature(feature);
    }
    return feature.disabled;
}

export async function alertDisabledFeature(feature: Feature) {
    await alert(
        !feature.message
            ? $l("You don't have access to this feature!")
            : typeof feature.message === "string"
            ? feature.message
            : html`<pl-rich-content
                  .content=${(feature.message as { content: string }).content}
                  .type=${(feature.message as { type: "plain" | "html" | "markdown" }).type}
              ></pl-rich-content>`,
        {
            icon: null,
            width: "auto",
            maxWidth: "100%",
            options: [$l("Dismiss")],
            type: "choice",
        }
    );
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

    const choice = await alert(html`<pl-rich-content .content=${statusMessage}></pl-rich-content>`, {
        icon: null,
        options: options.map((o) => o.label),
        preventDismiss: true,
        title: statusLabel,
    });

    options[choice]?.action();
}
