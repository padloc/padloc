import { Config, ConfigParam } from "../../config";

export class FSAttachmentStorageConfig extends Config {
    @ConfigParam()
    dir: string = "./attachments";
}
