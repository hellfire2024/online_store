import { Router, Request, Response } from 'express';
import { pool } from '../db/connection.js';
import { RowDataPacket } from 'mysql2';
import { encryptData, decryptData } from '../utils/encryption.js';

const router = Router();

interface EmailConfigRow extends RowDataPacket {
  id: number;
  provider: string;
  from_email: string;
  from_name: string;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_secure: boolean | null;
  smtp_username: string | null;
  smtp_password: string | null;
  sendgrid_api_key: string | null;
  mailgun_domain: string | null;
  mailgun_api_key: string | null;
}

/**
 * Get email configuration
 * Note: Sensitive fields (passwords, API keys) are decrypted but returned to admin only
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<EmailConfigRow[]>(
      'SELECT * FROM email_config WHERE id = 1'
    );

    if (rows.length === 0) {
      // Return default empty config
      return res.json({
        provider: 'none',
        fromEmail: '',
        fromName: '',
        smtpHost: '',
        smtpPort: 587,
        smtpSecure: false,
        smtpUsername: '',
        sendgridApiKey: '',
        mailgunDomain: '',
        mailgunApiKey: '',
      });
    }

    const config = rows[0];

    return res.json({
      provider: config.provider,
      fromEmail: config.from_email,
      fromName: config.from_name,
      smtpHost: config.smtp_host || '',
      smtpPort: config.smtp_port || 587,
      smtpSecure: config.smtp_secure || false,
      smtpUsername: config.smtp_username || '',
      // Only include decrypted password if it exists, never expose raw value
      hasSmtpPassword: !!config.smtp_password,
      hasSendgridApiKey: !!config.sendgrid_api_key,
      hasMailgunApiKey: !!config.mailgun_api_key,
      // Return decrypted values for editing (admin only)
      smtpPassword: config.smtp_password ? decryptData(config.smtp_password) : '',
      sendgridApiKey: config.sendgrid_api_key ? decryptData(config.sendgrid_api_key) : '',
      mailgunDomain: config.mailgun_domain || '',
      mailgunApiKey: config.mailgun_api_key ? decryptData(config.mailgun_api_key) : '',
    });
  } catch (error) {
    console.error('Error fetching email config:', error);
    return res.status(500).json({ error: 'Failed to fetch email configuration' });
  }
});

/**
 * Update email configuration
 * Encrypts sensitive fields before storage
 */
router.put('/', async (req: Request, res: Response) => {
  try {
    const {
      provider,
      fromEmail,
      fromName,
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUsername,
      smtpPassword,
      sendgridApiKey,
      mailgunDomain,
      mailgunApiKey,
    } = req.body;

    // Validate required fields
    if (!provider || !fromEmail || !fromName) {
      return res.status(400).json({
        error: 'provider, fromEmail, and fromName are required',
      });
    }

    // Validate provider-specific required fields
    if (provider === 'smtp') {
      if (!smtpHost || !smtpPort || !smtpUsername) {
        return res.status(400).json({
          error: 'SMTP provider requires host, port, and username',
        });
      }
    } else if (provider === 'sendgrid') {
      if (!sendgridApiKey) {
        return res.status(400).json({
          error: 'SendGrid provider requires API key',
        });
      }
    } else if (provider === 'mailgun') {
      if (!mailgunDomain || !mailgunApiKey) {
        return res.status(400).json({
          error: 'Mailgun provider requires domain and API key',
        });
      }
    }

    // Encrypt sensitive fields
    const encryptedSmtpPassword = smtpPassword ? encryptData(smtpPassword) : null;
    const encryptedSendgridKey = sendgridApiKey ? encryptData(sendgridApiKey) : null;
    const encryptedMailgunKey = mailgunApiKey ? encryptData(mailgunApiKey) : null;

    await pool.query(
      `INSERT INTO email_config (
        id, provider, from_email, from_name, 
        smtp_host, smtp_port, smtp_secure, smtp_username, smtp_password,
        sendgrid_api_key, mailgun_domain, mailgun_api_key
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        provider = VALUES(provider),
        from_email = VALUES(from_email),
        from_name = VALUES(from_name),
        smtp_host = VALUES(smtp_host),
        smtp_port = VALUES(smtp_port),
        smtp_secure = VALUES(smtp_secure),
        smtp_username = VALUES(smtp_username),
        smtp_password = VALUES(smtp_password),
        sendgrid_api_key = VALUES(sendgrid_api_key),
        mailgun_domain = VALUES(mailgun_domain),
        mailgun_api_key = VALUES(mailgun_api_key),
        updated_at = CURRENT_TIMESTAMP`,
      [
        provider,
        fromEmail,
        fromName,
        smtpHost || null,
        smtpPort || null,
        smtpSecure || false,
        smtpUsername || null,
        encryptedSmtpPassword,
        encryptedSendgridKey,
        mailgunDomain || null,
        encryptedMailgunKey,
      ]
    );

    // Return success response (don't return encrypted values)
    return res.json({
      success: true,
      message: 'Email configuration saved successfully',
      provider,
      fromEmail,
      fromName,
    });
  } catch (error) {
    console.error('Error updating email config:', error);
    return res.status(500).json({ error: 'Failed to update email configuration' });
  }
});

/**
 * Test email configuration
 * Validates that the email config is working
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    const testEmail = req.body.testEmail;

    if (!testEmail) {
      return res.status(400).json({ error: 'testEmail is required' });
    }

    // Fetch current config
    const [rows] = await pool.query<EmailConfigRow[]>(
      'SELECT * FROM email_config WHERE id = 1'
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Email configuration not set up' });
    }

    const config = rows[0];

    // Validate config exists
    if (config.provider === 'none') {
      return res.status(400).json({
        error: 'Email provider is set to "none". Please configure a provider.',
      });
    }

    // In production, you would actually attempt to send an email here
    // For now, we'll just validate the configuration
    let isValid = true;
    let message = '';

    if (config.provider === 'smtp') {
      if (!config.smtp_host || !config.smtp_port || !config.smtp_username || !config.smtp_password) {
        isValid = false;
        message = 'SMTP configuration is incomplete';
      } else {
        message = 'SMTP configuration appears valid';
      }
    } else if (config.provider === 'sendgrid') {
      if (!config.sendgrid_api_key) {
        isValid = false;
        message = 'SendGrid API key is missing';
      } else {
        message = 'SendGrid configuration appears valid';
      }
    } else if (config.provider === 'mailgun') {
      if (!config.mailgun_domain || !config.mailgun_api_key) {
        isValid = false;
        message = 'Mailgun configuration is incomplete';
      } else {
        message = 'Mailgun configuration appears valid';
      }
    }

    return res.json({
      success: isValid,
      message,
      testEmail,
    });
  } catch (error) {
    console.error('Error testing email config:', error);
    return res.status(500).json({ error: 'Failed to test email configuration' });
  }
});

export default router;
