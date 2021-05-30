import { css } from "lit";
import * as mixins from "./mixins";
import * as config from "./config";
import { reset } from "./reset";
import { base } from "./base";
import { layout } from "./layout";
import { animation } from "./animation";
import { responsive } from "./responsive";
import { misc } from "./misc";

export const shared = css`
    ${reset}
    ${base}
    ${layout}
    ${animation}
    ${responsive}
    ${misc}
`;

export { mixins, config, reset, base, layout, animation, responsive, misc };
