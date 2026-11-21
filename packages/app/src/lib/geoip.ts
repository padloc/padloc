import { html } from "lit";

export const geoipConfig = {
    enabled: (process.env.PL_GEOIP_ENABLED || "true").toLowerCase() !== "false",
    attributionText: process.env.PL_GEOIP_ATTRIBUTION_TEXT || "",
    attributionUrl: process.env.PL_GEOIP_ATTRIBUTION_URL || "",
};

const attribution =
    geoipConfig.enabled && geoipConfig.attributionText.trim()
        ? { text: geoipConfig.attributionText.trim(), url: geoipConfig.attributionUrl }
        : undefined;

export const geoipAttribution = attribution
    ? html`
          <div class="small subtle padded text-right-aligning">
              ${attribution.url
                  ? html`<a href=${attribution.url} target="_blank" rel="noopener noreferrer">${attribution.text}</a>`
                  : attribution.text}.
              IP-based locations are approximate and may be inaccurate.
          </div>
      `
    : html``;
