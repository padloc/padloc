import { writableStreamFromWriter } from "https://deno.land/std@0.143.0/streams/mod.ts";

const indexFileName = "index.html";

const html = await Deno.readTextFile(`./${indexFileName}`);

const regExp = /(?:<meta http-equiv="Content-Security-Policy" content=")([^">]+)">/gi;

const matches = regExp.exec(html);

if (!matches || !matches[1]) {
    console.error("Could not find CSP meta tag. Please make sure you've downloaded a correct index.html file.");
    Deno.exit(1);
}

console.log("Found CSP meta tag. Parsing rules...");

const cspString = matches[1];

const filesInCsp = new Set<string>();

const cspRuleStrings = cspString.split(";").map((cspRule) => cspRule.trim());

// Parse all rules appropriately, with the files per rule
for (const cspRuleString of cspRuleStrings) {
    const cspParts = cspRuleString.split(" ");

    if (cspParts.length === 0) {
        console.error("Found invalid CSP rule. Please make sure you've downloaded a correct index.html file.");
        Deno.exit(1);
    }

    // Skip empty set (we get one at the end)
    if (cspParts.length === 1 && cspParts[0] === "") {
        continue;
    }

    // Remove the rule name
    cspParts.shift();

    for (const cspPart of cspParts) {
        if (cspPart.startsWith("https://")) {
            // Confirm we're downloading a file and not a server URL, for example
            const urlParts = cspPart.split("/");
            const fileName = urlParts.pop() || "";
            const fileExtension = fileName.split(".").pop();

            if (urlParts.length > 2 && fileName && fileExtension) {
                filesInCsp.add(cspPart);
            }
        }
    }
}

console.log("Parsed all the rules. Downloading files...");

// Download all files, in parallel
await Promise.all(
    Array.from(filesInCsp).map(async (fileUrl) => {
        try {
            const fileName = fileUrl.split("/").pop() || "";
            const response = await fetch(fileUrl);
            // Stream instead of waiting for the response to finish before saving, as it's faster, even if the files should be small
            if (response.body) {
                const file = await Deno.open(`./${fileName}`, { write: true, create: true });
                const writableStream = writableStreamFromWriter(file);
                await response.body.pipeTo(writableStream);
            } else {
                throw new Error("Failed to fetch file");
            }
        } catch (error) {
            console.error(`Failed to download "${fileUrl}": ${error}`);
        }
    })
);

console.log(
    "Finished downloading files. You can now download the latest checksum and run the sha256sum command to verify them."
);
