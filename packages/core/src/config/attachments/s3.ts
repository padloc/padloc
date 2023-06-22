import { Config, ConfigParam } from "../../config";

export class S3AttachmentStorageConfig extends Config {
    @ConfigParam()
    region!: string;

    @ConfigParam()
    bucket!: string;

    @ConfigParam()
    endpoint!: string;

    @ConfigParam()
    accessKeyId!: string;

    @ConfigParam("string", { secret: true })
    secretAccessKey!: string;
}
