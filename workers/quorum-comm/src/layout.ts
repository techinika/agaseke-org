export const DEFAULT_BRAND_COLOR = '#FF0000';
const BG_LIGHT = '#f4f4f5';
const BG_WHITE = '#ffffff';
const TEXT_SECONDARY = '#71717a';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(str: string): string {
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function sanitizeBrandColor(color: string): string {
  if (/^#[0-9a-fA-F]{3,8}$/.test(color)) return color;
  return DEFAULT_BRAND_COLOR;
}

export function emailLayout(
  contentHtml: string,
  options: {
    previewText?: string;
    orgName?: string;
    orgLogoURL?: string;
    brandColor?: string;
    websiteUrl?: string;
    contactEmail?: string;
    contactPhone?: string;
    footerText?: string;
  } = {}
): string {
  const previewText = options.previewText || '';
  const brand = sanitizeBrandColor(options.brandColor || DEFAULT_BRAND_COLOR);
  const orgName = options.orgName ? escapeHtml(options.orgName) : 'Quorum';
  const websiteUrl = options.websiteUrl ? escapeHtml(options.websiteUrl) : '';
  const contactEmail = options.contactEmail ? escapeHtml(options.contactEmail) : '';
  const contactPhone = options.contactPhone ? escapeHtml(options.contactPhone) : '';
  const footerText = options.footerText ? escapeHtml(options.footerText) : '';

  const orgContactParts: string[] = [];
  if (websiteUrl) orgContactParts.push(`<a href="${escapeAttr(options.websiteUrl || '')}" style="color: ${brand}; text-decoration: underline;">${websiteUrl}</a>`);
  if (contactEmail) orgContactParts.push(`<a href="mailto:${escapeAttr(options.contactEmail || '')}" style="color: ${brand}; text-decoration: underline;">${contactEmail}</a>`);
  if (contactPhone) orgContactParts.push(contactPhone);

  const orgFooterHtml = orgContactParts.length > 0
    ? `<p style="margin: 0 0 8px; font-size: 12px; color: ${TEXT_SECONDARY}; line-height: 1.5;">${orgContactParts.join(' &middot; ')}</p>`
    : '';

  const customFooterHtml = footerText
    ? `<p style="margin: 0 0 8px; font-size: 12px; color: ${TEXT_SECONDARY}; line-height: 1.5; font-style: italic;">${footerText}</p>`
    : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  ${previewText ? `<meta name="description" content="${escapeAttr(previewText)}">` : ''}
  <!--[if !mso]><!-->
  <style>
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .email-padding { padding: 16px !important; }
      .email-content { padding: 24px 16px !important; }
    }
  </style>
  <!--<![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: ${BG_LIGHT}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  ${previewText ? `<div style="display: none; font-size: 1px; color: ${BG_LIGHT}; line-height: 1px; max-height: 0; max-width: 0;">${escapeHtml(previewText)}</div>` : ''}
  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: ${BG_LIGHT};">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" class="email-container" style="max-width: 560px; width: 100%;">
          <!-- Header -->
          <tr>
            <td style="padding: 0 0 24px 0; text-align: center;">
              ${options.orgLogoURL
                ? `<img src="${escapeAttr(options.orgLogoURL)}" alt="${orgName}" style="height: 40px; width: auto; border: 0; display: inline-block; outline: none;" />`
                : `<div style="font-size: 20px; font-weight: 700; color: ${brand}; letter-spacing: -0.02em;">${orgName}</div>`
              }
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="background-color: ${BG_WHITE}; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
              <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
                <tr>
                  <td class="email-content" style="padding: 32px 32px;">
                    ${contentHtml}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 16px 0; text-align: center;">
              ${customFooterHtml}
              ${orgFooterHtml}
              <p style="margin: 0 0 4px; font-size: 12px; color: ${TEXT_SECONDARY}; line-height: 1.5;">
                Powered by <a href="https://quorum-org-app.vercel.app/" style="color: ${brand}; text-decoration: underline;">Quorum</a>
              </p>
              <p style="margin: 0; font-size: 11px; color: ${TEXT_SECONDARY}; line-height: 1.5;">
                &copy; ${new Date().getFullYear()} ${orgName}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}
