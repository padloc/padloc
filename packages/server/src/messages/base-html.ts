export const fontFamily = "sans-serif";

export const fontSizeSmall = "12px";
export const fontSize = "14px";
export const fontSizeBig = "16px";

export const colorText = "#444444";
export const colorHighlight = "#3498db";
export const colorHover = "#3498db";
export const colorBackground = "#f6f6f6";
export const colorFooter = "#999999";

const address = "MaKleSoft UG, Meisenstr. 5, 91522 Ansbach, Germany";

export function paragraph(content: string, styles = "") {
    return `
<p style="font-family: ${fontFamily}; font-size: ${fontSize}; font-weight: normal; margin: 0; Margin-bottom: 15px; ${styles}">${content}</p>
    `;
}

export function button(content: string, url: string) {
    return `
<table border="0" cellpadding="0" cellspacing="0" class="btn btn-primary" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; box-sizing: border-box;">
  <tbody>
    <tr>
      <td align="left" style="font-family: ${fontFamily}; font-size: ${fontSize}; vertical-align: top; padding-bottom: 15px;">
        <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: auto;">
          <tbody>
            <tr>
              <td style="font-family: ${fontFamily}; font-size: ${fontSize}; vertical-align: top; background-color: ${colorHighlight}; border-radius: 5px; text-align: center;"> <a href="${url}" target="_blank" style="display: inline-block; color: #ffffff; background-color: ${colorHighlight}; border: solid 1px ${colorHighlight}; border-radius: 5px; box-sizing: border-box; cursor: pointer; text-decoration: none; font-size: ${fontSize}; font-weight: bold; margin: 0; padding: 12px 25px; text-transform: capitalize; border-color: ${colorHighlight};">${content}</a> </td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  </tbody>
</table>
`;
}

export function base(content: string, preview = "", title = "") {
    return `
<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>${title}</title>
    <style>
    /* -------------------------------------
        RESPONSIVE AND MOBILE FRIENDLY STYLES
    ------------------------------------- */
    @media only screen and (max-width: 620px) {
      table[class=body] h1 {
        font-size: 28px !important;
        margin-bottom: 10px !important;
      }
      table[class=body] p,
            table[class=body] ul,
            table[class=body] ol,
            table[class=body] td,
            table[class=body] span,
            table[class=body] a {
        font-size: ${fontSizeBig} !important;
      }
      table[class=body] .wrapper,
            table[class=body] .article {
        padding: 10px !important;
      }
      table[class=body] .content {
        padding: 0 !important;
      }
      table[class=body] .container {
        padding: 0 !important;
        width: 100% !important;
      }
      table[class=body] .main {
        border-left-width: 0 !important;
        border-radius: 0 !important;
        border-right-width: 0 !important;
      }
      table[class=body] .btn table {
        width: 100% !important;
      }
      table[class=body] .btn a {
        width: 100% !important;
      }
      table[class=body] .img-responsive {
        height: auto !important;
        max-width: 100% !important;
        width: auto !important;
      }
    }

    /* -------------------------------------
        PRESERVE THESE STYLES IN THE HEAD
    ------------------------------------- */
    @media all {
      .ExternalClass {
        width: 100%;
      }
      .ExternalClass,
            .ExternalClass p,
            .ExternalClass span,
            .ExternalClass font,
            .ExternalClass td,
            .ExternalClass div {
        line-height: 100%;
      }
      .apple-link a {
        color: inherit !important;
        font-family: inherit !important;
        font-size: inherit !important;
        font-weight: inherit !important;
        line-height: inherit !important;
        text-decoration: none !important;
      }
      .btn-primary table td:hover {
        background-color: ${colorHover} !important;
      }
      .btn-primary a:hover {
        background-color: ${colorHover} !important;
        border-color: ${colorHover} !important;
      }
    }
    </style>
  </head>
  <body class="" style="background-color: ${colorBackground}; font-family: ${fontFamily}; -webkit-font-smoothing: antialiased; font-size: ${fontSize}; line-height: 1.4; margin: 0; padding: 0; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;">
    <table border="0" cellpadding="0" cellspacing="0" class="body" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; background-color: ${colorBackground};">
      <tr>
        <td style="font-family: ${fontFamily}; font-size: ${fontSize}; vertical-align: top;">&nbsp;</td>
        <td class="container" style="font-family: ${fontFamily}; font-size: ${fontSize}; vertical-align: top; display: block; Margin: 0 auto; max-width: 580px; padding: 10px; width: 580px;">
          <div class="content" style="box-sizing: border-box; display: block; Margin: 0 auto; max-width: 580px; padding: 10px;">

            <!-- START CENTERED WHITE CONTAINER -->
            <span class="preheader" style="color: transparent; display: none; height: 0; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; mso-hide: all; visibility: hidden; width: 0;">${preview}</span>
            <table class="main" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; background: #ffffff; border-radius: 5px;">

              <!-- START MAIN CONTENT AREA -->
              <tr>
                <td class="wrapper" style="font-family: ${fontFamily}; font-size: ${fontSize}; vertical-align: top; box-sizing: border-box; padding: 20px;">
                  <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%;">
                    <tr>
                      <td style="font-family: ${fontFamily}; font-size: ${fontSize}; vertical-align: top;">
                        ${content}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

            <!-- END MAIN CONTENT AREA -->
            </table>

            <!-- START FOOTER -->
            <div class="footer" style="clear: both; Margin-top: 10px; text-align: center; width: 100%;">
              <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%;">
                <tr>
                  <td class="content-block" style="font-family: ${fontFamily}; vertical-align: top; padding-bottom: 10px; padding-top: 10px; font-size: ${fontSizeSmall}; color: ${colorFooter}; text-align: center;">
                    <span class="apple-link" style="color: ${colorFooter}; font-size: ${fontSizeSmall}; text-align: center;">${address}</span>
                    <!--<br> Don't like these emails? <a href="" style="text-decoration: underline; color: ${colorFooter}; font-size: ${fontSizeSmall}; text-align: center;">Unsubscribe</a>.-->
                  </td>
                </tr>
              </table>
            </div>
            <!-- END FOOTER -->

          <!-- END CENTERED WHITE CONTAINER -->
          </div>
        </td>
        <td style="font-family: ${fontFamily}; font-size: ${fontSize}; vertical-align: top;">&nbsp;</td>
      </tr>
    </table>
  </body>
</html>
    `;
}
