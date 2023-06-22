import { Config, ConfigParam } from "../../config";

export class LevelDBStorageConfig extends Config {
    @ConfigParam("string", { required: true }, "The directory where to store the database files.")
    dir: string = "./data";
}
