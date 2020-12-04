import { css } from "lit-element";

export const responsive = css`
    @media (min-width: 701px) {
        .menu-button {
            visibility: hidden;
        }

        .narrow {
            display: none !important;
        }
    }

    @media (max-width: 700px) {
        .wide {
            display: none;
        }
    }
`;
