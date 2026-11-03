const { Groq } = require('groq-sdk');
require('dotenv').config();

let client = null;
let isConfigured = false;

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn('GROQ_API_KEY is not set. AI features will be disabled.');
    if (!client) {
      client = {
        chat: {
          completions: {
            create: async () => {
              throw new Error('GROQ_API_KEY is not configured. Please set it in your .env file to enable AI features.');
            }
          }
        }
      };
    }
    return client;
  }
  if (!isConfigured) {
    client = new Groq({ apiKey });
    isConfigured = true;
  }
  return client;
}

function isGroqConfigured() {
  return !!process.env.GROQ_API_KEY;
}

module.exports = { getGroqClient, isGroqConfigured };
