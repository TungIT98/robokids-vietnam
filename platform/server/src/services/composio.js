import { Composio } from '@composio/core';
import dotenv from 'dotenv';

dotenv.config();

const COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY;
const COMPOSIO_WORKSPACE_ID = process.env.COMPOSIO_WORKSPACE_ID;

// Initialize Composio client
let composioClient = null;

function getClient() {
  if (!composioClient && COMPOSIO_API_KEY) {
    composioClient = new Composio({
      apiKey: COMPOSIO_API_KEY,
      workspaceId: COMPOSIO_WORKSPACE_ID,
    });
  }
  return composioClient;
}

// Available tools/apps for RoboKids automation
const SUPPORTED_APPS = [
  'gmail',
  'googlcalendar',
  'slack',
  'zalo',
  'discord',
  'zoom',
  'notion',
  'salesforce',
  'hubspot',
  'jira',
  'linear',
  'trello',
  'asana',
  'github',
  'gitlab',
  'bitbucket',
  'sendgrid',
  'mailchimp',
  'intercom',
  'zendesk',
];

/**
 * Get available actions for a specific app
 */
export async function getAppActions(appName) {
  const client = getClient();
  if (!client) {
    throw new Error('Composio client not initialized. Set COMPOSIO_API_KEY environment variable.');
  }

  try {
    const app = await client.getApp(appName);
    const actions = await app.listActions();
    return actions;
  } catch (error) {
    console.error(`Error getting actions for app ${appName}:`, error.message);
    throw error;
  }
}

/**
 * Get connected accounts
 */
export async function getConnectedAccounts() {
  const client = getClient();
  if (!client) {
    throw new Error('Composio client not initialized. Set COMPOSIO_API_KEY environment variable.');
  }

  try {
    const accounts = await client.getConnectedAccounts();
    return accounts;
  } catch (error) {
    console.error('Error getting connected accounts:', error.message);
    throw error;
  }
}

/**
 * Connect a new account for an app
 */
export async function connectAccount(appName, connectionParams = {}) {
  const client = getClient();
  if (!client) {
    throw new Error('Composio client not initialized. Set COMPOSIO_API_KEY environment variable.');
  }

  try {
    const connection = await client.connectApp(appName, connectionParams);
    return connection;
  } catch (error) {
    console.error(`Error connecting account for ${appName}:`, error.message);
    throw error;
  }
}

/**
 * Execute a Composio action
 */
export async function executeAction(actionName, params = {}) {
  const client = getClient();
  if (!client) {
    throw new Error('Composio client not initialized. Set COMPOSIO_API_KEY environment variable.');
  }

  try {
    const result = await client.executeAction(actionName, params);
    return result;
  } catch (error) {
    console.error(`Error executing action ${actionName}:`, error.message);
    throw error;
  }
}

/**
 * Get trigger webhooks for event-based automation
 */
export async function getTriggers(appName) {
  const client = getClient();
  if (!client) {
    throw new Error('Composio client not initialized. Set COMPOSIO_API_KEY environment variable.');
  }

  try {
    const triggers = await client.getTriggers(appName);
    return triggers;
  } catch (error) {
    console.error(`Error getting triggers for ${appName}:`, error.message);
    throw error;
  }
}

/**
 * Register a webhook for a trigger
 */
export async function registerWebhook(triggerId, webhookUrl) {
  const client = getClient();
  if (!client) {
    throw new Error('Composio client not initialized. Set COMPOSIO_API_KEY environment variable.');
  }

  try {
    const registration = await client.registerWebhook(triggerId, { webhookUrl });
    return registration;
  } catch (error) {
    console.error(`Error registering webhook for trigger ${triggerId}:`, error.message);
    throw error;
  }
}

/**
 * List available apps
 */
export async function listAvailableApps() {
  const client = getClient();
  if (!client) {
    return SUPPORTED_APPS; // Return static list if not initialized
  }

  try {
    const apps = await client.listApps();
    return apps;
  } catch (error) {
    console.error('Error listing apps:', error.message);
    return SUPPORTED_APPS;
  }
}

/**
 * Check if Composio is configured
 */
export function isConfigured() {
  return !!COMPOSIO_API_KEY;
}

export default {
  getClient,
  getAppActions,
  getConnectedAccounts,
  connectAccount,
  executeAction,
  getTriggers,
  registerWebhook,
  listAvailableApps,
  isConfigured,
  SUPPORTED_APPS,
};