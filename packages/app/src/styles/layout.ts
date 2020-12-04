import { css } from "lit-element";
import { fullbleed } from "./mixins";

export const layout = css`
    .fullbleed {
        ${fullbleed()}
    }

    /** FLEX LAYOUT */

    .layout {
        display: flex;
    }

    .layout.vertical {
        flex-direction: column;
    }

    .layout.horizontal {
        display: flex;
        flex-direction: row;
    }

    .layout.center-aligning {
        align-items: center;
    }

    .layout.start-aligning {
        align-items: start;
    }

    .layout.end-aligning {
        align-items: end;
    }

    .layout.center-justifying {
        justify-content: center;
    }

    .layout.start-justifying {
        justify-content: start;
    }

    .layout.end-justifying {
        justify-content: end;
    }

    .layout.centering {
        align-items: center;
        justify-content: center;
    }

    .layout > .stretch,
    .layout > .stretch {
        flex-grow: 1;
    }

    .layout > :not(.stretch),
    .layout > :not(.stretch) {
        flex: none;
    }

    .layout.horizontal > .collapse {
        width: 0;
    }

    .layout.vertical > .collapse {
        height: 0;
    }

    .relative {
        position: relative;
    }
`;
