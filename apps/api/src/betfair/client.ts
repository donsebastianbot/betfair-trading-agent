import axios from 'axios';

const identityUrl = 'https://identitysso-cert.betfair.com/api/certlogin';
const bettingUrl = 'https://api.betfair.com/exchange/betting/rest/v1.0';

export class BetfairClient {
  private appKey = process.env.BETFAIR_APP_KEY || '';
  private sessionToken: string | null = process.env.BETFAIR_SESSION_TOKEN || null;

  headers() {
    return {
      'X-Application': this.appKey,
      'X-Authentication': this.sessionToken || '',
      'Content-Type': 'application/json',
    };
  }

  async loginWithSessionToken() {
    if (!this.sessionToken) throw new Error('BETFAIR_SESSION_TOKEN missing');
    return true;
  }

  // NOTE: cert login flow structure, cert wiring depends on runtime mount
  async certLogin(username: string, password: string) {
    const params = new URLSearchParams({ username, password });
    const res = await axios.post(identityUrl, params.toString(), {
      headers: {
        'X-Application': this.appKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    this.sessionToken = res.data?.sessionToken || null;
    return this.sessionToken;
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