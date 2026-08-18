const crypto = require('crypto');
const logger = require('./logger');

class WebhookService {
  static async dispatchWithdrawalEvent(eventType, payload) {
    const webhookUrl = process.env.WITHDRAWAL_WEBHOOK_URL;
    if (!webhookUrl) {
      logger.info(`[Webhook] No WEBHOOK_URL configured. Event ${eventType} logged locally:`, payload);
      return;
    }

    const eventPayload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      data: payload,
    };

    const signature = crypto
      .createHmac('sha256', process.env.WEBHOOK_SECRET || 'ss_webhook_secret_key')
      .update(JSON.stringify(eventPayload))
      .digest('hex');

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Fintech-Signature': signature,
        },
        body: JSON.stringify(eventPayload),
      });

      logger.info(`[Webhook] Dispatched ${eventType} to ${webhookUrl} - Status: ${response.status}`);
    } catch (error) {
      logger.error(`[Webhook] Failed to dispatch ${eventType}: ${error.message}`);
    }
  }
}

module.exports = WebhookService;
