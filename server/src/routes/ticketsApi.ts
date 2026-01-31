import { Router, Request, Response } from 'express';
import { sendTicketEmail } from '../services/emailService.js';

const router = Router();

// POST send ticket email to support
router.post('/send-ticket-email', async (req: Request, res: Response) => {
  try {
    const {
      to,
      subject,
      ticketNumber,
      orderId,
      priority,
      message,
      customerInfo,
    } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Send email to support
    const emailResult = await sendTicketEmail(
      to,
      subject,
      ticketNumber,
      orderId,
      priority,
      message,
      customerInfo
    );

    res.json({
      success: emailResult.success,
      message: emailResult.message,
    });
  } catch (error) {
    console.error('Error sending ticket email:', error);
    res.status(500).json({ error: 'Failed to send ticket email' });
  }
});

export default router;
