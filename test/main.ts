declare var mocha: any;

mocha.setup("tdd");

import "./util.ts";
import "./crypto.ts";
import "./source.ts";
import "./data.ts";
import "./import.ts";
import "./export.ts";

mocha.run();
