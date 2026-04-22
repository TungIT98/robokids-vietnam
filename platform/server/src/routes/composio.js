import express from 'express';
import composioService from '../services/composio.js';

const router = express.Router();

// Middleware to check if Composio is configured
const requireComposioConfig = (req, res, next) => {
  if (!composioService.isConfigured()) {
    return res.status(503).json({
      error: 'Composio not configured',
      message: 'COMPOSIO_API_KEY environment variable is not set',
    });
  }
  next();
};

// GET /api/composio/status - Check Composio configuration status
router.get('/status', (req, res) => {
  const configured = composioService.isConfigured();
  res.json({
    configured,
    supportedApps: configured ? composioService.SUPPORTED_APPS : [],
    message: configured
      ? 'Composio is configured and ready'
      : 'Composio is not configured. Set COMPOSIO_API_KEY to enable.',
  });
});

// GET /api/composio/apps - List available apps
router.get('/apps', requireComposioConfig, async (req, res) => {
  try {
    const apps = await composioService.listAvailableApps();
    res.json({ apps });
  } catch (error) {
    console.error('Error listing apps:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/composio/apps/:appName/actions - Get actions for a specific app
router.get('/apps/:appName/actions', requireComposioConfig, async (req, res) => {
  try {
    const { appName } = req.params;
    const actions = await composioService.getAppActions(appName);
    res.json({ app: appName, actions });
  } catch (error) {
    console.error(`Error getting actions for ${req.params.appName}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/composio/accounts - Get connected accounts
router.get('/accounts', requireComposioConfig, async (req, res) => {
  try {
    const accounts = await composioService.getConnectedAccounts();
    res.json({ accounts });
  } catch (error) {
    console.error('Error getting connected accounts:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/composio/accounts - Connect a new account
router.post('/accounts', requireComposioConfig, async (req, res) => {
  try {
    const { appName, ...connectionParams } = req.body;
    if (!appName) {
      return res.status(400).json({ error: 'appName is required' });
    }
    const connection = await composioService.connectAccount(appName, connectionParams);
    res.json({ success: true, connection });
  } catch (error) {
    console.error('Error connecting account:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/composio/execute - Execute a Composio action
router.post('/execute', requireComposioConfig, async (req, res) => {
  try {
    const { actionName, params } = req.body;
    if (!actionName) {
      return res.status(400).json({ error: 'actionName is required' });
    }
    const result = await composioService.executeAction(actionName, params || {});
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error executing action:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/composio/triggers/:appName - Get triggers for an app
router.get('/triggers/:appName', requireComposioConfig, async (req, res) => {
  try {
    const { appName } = req.params;
    const triggers = await composioService.getTriggers(appName);
    res.json({ app: appName, triggers });
  } catch (error) {
    console.error(`Error getting triggers for ${appName}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/composio/webhooks - Register a webhook
router.post('/webhooks', requireComposioConfig, async (req, res) => {
  try {
    const { triggerId, webhookUrl } = req.body;
    if (!triggerId || !webhookUrl) {
      return res.status(400).json({ error: 'triggerId and webhookUrl are required' });
    }
    const registration = await composioService.registerWebhook(triggerId, webhookUrl);
    res.json({ success: true, registration });
  } catch (error) {
    console.error('Error registering webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;