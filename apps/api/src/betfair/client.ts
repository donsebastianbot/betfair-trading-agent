import axios from 'axios';
import fs from 'node:fs';
import https from 'node:https';

const identityUrl = 'https://identitysso-cert.betfair.com/api/certlogin';
const bettingUrl = 'https://api.betfair.com/exchange/betting/rest/v1.0';

export class BetfairClient {
  private appKey = process.env.BETFAIR_APP_KEY || '';
  private sessionToken: string | null = process.env.BETFAIR_SESSION_TOKEN || null;

  private assertReady() {
    if (!this.appKey) throw new Error('BETFAIR_APP_KEY missing');
    if (!this.sessionToken) throw new Error('Betfair session token missing (login required)');
  }

  private buildCertAgent() {
    const certPath = process.env.BETFAIR_CERT_PATH;
    const keyPath = process.env.BETFAIR_KEY_PATH;
    const passphrase = process.env.BETFAIR_KEY_PASSPHRASE;

    if (!certPath || !keyPath) {
      throw new Error('BETFAIR_CERT_PATH / BETFAIR_KEY_PATH missing');
    }

    return new https.Agent({
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
      passphrase,
      keepAlive: true,
      minVersion: 'TLSv1.2',
    });
  }

  headers() {
    this.assertReady();
    return {
      'X-Application': this.appKey,
      'X-Authentication': this.sessionToken as string,
      'Content-Type': 'application/json',
    };
  }

  getSessionToken() {
    return this.sessionToken;
  }

  async loginWithSessionToken() {
    if (!this.sessionToken) throw new Error('BETFAIR_SESSION_TOKEN missing');
    return true;
  }

  /**
   * Official Betfair certificate login.
   * Requires:
   * - BETFAIR_APP_KEY
   * - BETFAIR_USERNAME / BETFAIR_PASSWORD (or args)
   * - BETFAIR_CERT_PATH / BETFAIR_KEY_PATH
   */
  async certLogin(usernameArg?: string, passwordArg?: string) {
    const username = usernameArg || process.env.BETFAIR_USERNAME;
    const password = passwordArg || process.env.BETFAIR_PASSWORD;

    if (!this.appKey) throw new Error('BETFAIR_APP_KEY missing');
    if (!username || !password) throw new Error('BETFAIR_USERNAME / BETFAIR_PASSWORD missing');

    const params = new URLSearchParams({ username, password });
    const httpsAgent = this.buildCertAgent();

    const res = await axios.post(identityUrl, params.toString(), {
      headers: {
        'X-Application': this.appKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      httpsAgent,
      timeout: 15_000,
      validateStatus: () => true,
    });

    if (res.status !== 200 || res.data?.loginStatus !== 'SUCCESS' || !res.data?.sessionToken) {
      throw new Error(`Betfair certLogin failed: status=${res.status} loginStatus=${res.data?.loginStatus || 'unknown'}`);
    }

    this.sessionToken = res.data.sessionToken;
    return this.sessionToken;
  }

  async ensureAuthenticated() {
    if (this.sessionToken) return this.sessionToken;
    return this.certLogin();
  }

  async listEventTypes() {
    const r = await axios.post(`${bettingUrl}/listEventTypes/`, {}, { headers: this.headers() });
    return r.data;
  }

  async listMarketCatalogue(filter: object, maxResults = 50) {
    const body = {
      filter,
      maxResults: String(maxResults),
      marketProjection: ['RUNNER_DESCRIPTION', 'EVENT', 'COMPETITION', 'MARKET_START_TIME'],
      sort: 'FIRST_TO_START',
    };
    const r = await axios.post(`${bettingUrl}/listMarketCatalogue/`, body, { headers: this.headers() });
    return r.data;
  }

  async listMarketBook(marketIds: string[]) {
    const body = {
      marketIds,
      priceProjection: { priceData: ['EX_BEST_OFFERS', 'EX_TRADED'] },
      orderProjection: 'ALL',
      matchProjection: 'ROLLED_UP_BY_PRICE',
    };
    const r = await axios.post(`${bettingUrl}/listMarketBook/`, body, { headers: this.headers() });
    return r.data;
  }

  async placeOrders(params: object) {
    const r = await axios.post(`${bettingUrl}/placeOrders/`, params, { headers: this.headers() });
    return r.data;
  }

  async cancelOrders(params: object) {
    const r = await axios.post(`${bettingUrl}/cancelOrders/`, params, { headers: this.headers() });
    return r.data;
  }

  async listCurrentOrders(params: object = {}) {
    const r = await axios.post(`${bettingUrl}/listCurrentOrders/`, params, { headers: this.headers() });
    return r.data;
  }
}