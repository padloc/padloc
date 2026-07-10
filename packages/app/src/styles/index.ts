import { css } from "lit";
import { animation } from "./animation";
import { base } from "./base";
import * as config from "./config";
import { content } from "./content";
import { layout } from "./layout";
import { misc } from "./misc";
import * as mixins from "./mixins";
import { reset } from "./reset";
import { responsive } from "./responsive";

export const shared = css`
    ${reset}
    ${base}
    ${layout}
    ${animation}
    ${responsive}
    ${misc}
`;

export { animation, base, config, content, layout, misc, mixins, reset, responsive };
