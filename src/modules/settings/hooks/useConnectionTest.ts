import { useState, useCallback } from 'react';
import {
  testWebflowConnection,
  testBeehiivConnection,
  testDataForSeoConnection,
  testSlackWebhook,
} from '../services/settingsService';
import type { ConnectionProvider, ConnectionResult } from '../types';

export function useConnectionTest(provider: ConnectionProvider) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<ConnectionResult | null>(null);

  const test = useCallback(async () => {
    setTesting(true);
    setResult(null);

    try {
      let connectionResult: ConnectionResult;

      switch (provider) {
        case 'webflow':
          connectionResult = await testWebflowConnection();
          break;
        case 'beehiiv':
          connectionResult = await testBeehiivConnection();
          break;
        case 'dataforseo':
          connectionResult = await testDataForSeoConnection();
          break;
        case 'slack':
          connectionResult = await testSlackWebhook();
          break;
      }

      setResult(connectionResult);
      return connectionResult;
    } catch (err) {
      const errorResult: ConnectionResult = {
        status: 'error',
        message: err instanceof Error ? err.message : 'Connection test failed',
        details: {},
      };
      setResult(errorResult);
      return errorResult;
    } finally {
      setTesting(false);
    }
  }, [provider]);

  return { test, testing, result };
}
