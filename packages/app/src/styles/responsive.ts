import { css } from "lit-element";

export const responsive = css`
    @media (min-width: 701px) {
        .narrow-only {
            display: none !important;
        }
    }

    @media (max-width: 700px) {
        .wide-only {
            display: none;
        }
    }
`;
