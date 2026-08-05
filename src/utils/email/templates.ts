import config from '../../config/config';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const BASE_STYLE = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f0f4ff;
  margin: 0;
  padding: 0;
`;

const CARD_STYLE = `
  background: #ffffff;
  border-radius: 16px;
  padding: 40px;
  max-width: 560px;
  margin: 40px auto;
  box-shadow: 0 4px 24px rgba(61, 90, 254, 0.08);
  border: 1px solid #e3e8f1;
`;

const HEADER_STYLE = `
  text-align: center;
  margin-bottom: 32px;
`;

const LOGO_STYLE = `
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #3D5AFE, #10B7BE);
  border-radius: 12px;
  font-size: 24px;
  margin-bottom: 12px;
`;

const H1_STYLE = `
  font-size: 22px;
  font-weight: 700;
  color: #0B1220;
  margin: 0 0 8px;
`;

const BODY_STYLE = `
  font-size: 15px;
  color: #4B5563;
  line-height: 1.7;
  margin: 0 0 20px;
`;

const BUTTON_STYLE = `
  display: inline-block;
  background: linear-gradient(135deg, #3D5AFE, #5B7CFF);
  color: #ffffff;
  text-decoration: none;
  padding: 12px 28px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 15px;
  margin: 8px 0 24px;
`;

const INFO_BOX_STYLE = `
  background: #f0f4ff;
  border: 1px solid #c7d2ff;
  border-radius: 10px;
  padding: 16px 20px;
  margin: 20px 0;
`;

const INFO_ROW_STYLE = `
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  margin: 6px 0;
`;

const LABEL_STYLE = `color: #6B7280; font-weight: 500;`;
const VALUE_STYLE = `color: #0B1220; font-weight: 600;`;

const FOOTER_STYLE = `
  text-align: center;
  font-size: 12px;
  color: #9CA3AF;
  margin-top: 32px;
  border-top: 1px solid #E3E8F1;
  padding-top: 20px;
`;

const wrap = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="${BASE_STYLE}">
  <div style="${CARD_STYLE}">
    <div style="${HEADER_STYLE}">
      <div style="${LOGO_STYLE}">🏢</div>
      <p style="font-size:13px;color:#6B7280;margin:0;">Inventory System</p>
    </div>
    ${content}
    <div style="${FOOTER_STYLE}">
      <p>This email was sent by Inventory Management System.</p>
      <p>Please do not reply to this email. If you have questions, contact your admin.</p>
    </div>
  </div>
</body>
</html>
`;

export const templates = {
  welcomeEmployee: ({
    name,
    email,
    password,
    loginUrl,
  }: {
    name: string;
    email: string;
    password: string;
    loginUrl?: string;
  }) =>
    wrap(`
      <h1 style="${H1_STYLE}">Welcome! 👋</h1>
      <p style="${BODY_STYLE}">Hello <strong>${name || 'there'}</strong>,</p>
      <p style="${BODY_STYLE}">
        Your employee account has been created. You can now log in to the Inventory
        Management System using the credentials below.
      </p>
      <div style="${INFO_BOX_STYLE}">
        <div style="${INFO_ROW_STYLE}">
          <span style="${LABEL_STYLE}">Email address</span>
          <span style="${VALUE_STYLE}">${email}</span>
        </div>
        <div style="${INFO_ROW_STYLE}">
          <span style="${LABEL_STYLE}">Temporary password: </span>
          <span style="${VALUE_STYLE}">${password}</span>
        </div>
      </div>
      <p style="${BODY_STYLE}">Please log in and change your password immediately.</p>
      <div style="text-align:center;">
        <a href="${loginUrl || FRONTEND_URL + '/login'}" style="${BUTTON_STYLE}">Log in now →</a>
      </div>
      <p style="${BODY_STYLE}">If you did not expect this email, please contact your administrator.</p>
    `),

  welcomeSignup: ({ name, email, loginUrl }: { name: string; email: string; loginUrl?: string }) =>
    wrap(`
      <h1 style="${H1_STYLE}">Welcome! 👋</h1>
      <p style="${BODY_STYLE}">Hello <strong>${name || 'there'}</strong>,</p>
      <p style="${BODY_STYLE}">
        Thank you for signing up to the Inventory Management System. Your employee account is now active.
      </p>
      <div style="${INFO_BOX_STYLE}">
        <div style="${INFO_ROW_STYLE}">
          <span style="${LABEL_STYLE}">Email address</span>
          <span style="${VALUE_STYLE}">${email}</span>
        </div>
      </div>
      <div style="text-align:center;">
        <a href="${loginUrl || FRONTEND_URL + '/login'}" style="${BUTTON_STYLE}">Go to Dashboard →</a>
      </div>
    `),

  forgotPassword: ({ name, resetUrl }: { name: string; resetUrl: string }) =>
    wrap(`
      <h1 style="${H1_STYLE}">Reset your password 🔐</h1>
      <p style="${BODY_STYLE}">Hello <strong>${name || 'there'}</strong>,</p>
      <p style="${BODY_STYLE}">
        We received a request to reset your password. Click the button below to set a new password.
        This link will expire in <strong>30 minutes</strong>.
      </p>
      <div style="text-align:center;">
        <a href="${resetUrl}" style="${BUTTON_STYLE}">Reset password →</a>
      </div>
      <p style="${BODY_STYLE}">
        If you did not request a password reset, you can safely ignore this email. Your password will not change.
      </p>
    `),

  lowStockAlert: ({
    products,
  }: {
    products: { name: string; sku?: string | null; currentStock: number; lowStockThreshold: number }[];
  }) =>
    wrap(`
      <h1 style="${H1_STYLE}">⚠️ Low Stock Alert</h1>
      <p style="${BODY_STYLE}">
        The following products have dropped below their low stock threshold and may need to be restocked soon.
      </p>
      <div style="${INFO_BOX_STYLE}">
        ${products
          .map(
            (p) => `
          <div style="border-bottom:1px solid #e3e8f1;padding:10px 0;">
            <div style="${INFO_ROW_STYLE}">
              <span style="${LABEL_STYLE}">Product</span>
              <span style="${VALUE_STYLE}">${p.name}</span>
            </div>
            ${p.sku ? `<div style="${INFO_ROW_STYLE}"><span style="${LABEL_STYLE}">SKU</span><span style="${VALUE_STYLE}">${p.sku}</span></div>` : ''}
            <div style="${INFO_ROW_STYLE}">
              <span style="${LABEL_STYLE}">Current Stock</span>
              <span style="color:#F0475F;font-weight:700;">${p.currentStock}</span>
            </div>
            <div style="${INFO_ROW_STYLE}">
              <span style="${LABEL_STYLE}">Threshold</span>
              <span style="${LABEL_STYLE}">${p.lowStockThreshold}</span>
            </div>
          </div>
        `,
          )
          .join('')}
      </div>
      <p style="${BODY_STYLE}">Please restock these items at your earliest convenience.</p>
    `),
};
