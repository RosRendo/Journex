import https from "https";
import { EventEmitter } from "events";
const { HttpsProxyAgent } = require("https-proxy-agent");

export function toOandaInstrument(symbol: string): string {
  const s = symbol.toUpperCase().replace("/", "");
  if (s.includes("_")) return s;
  if (s.length === 6) return `${s.slice(0, 3)}_${s.slice(3)}`;
  return s;
}

export function fromOandaInstrument(inst: string): string {
  return inst.replace("_", "");
}

export class OandaPricingStream extends EventEmitter {
  private token: string;
  private accountId: string;
  private baseUrl: string;
  private instruments: string[];
  private req: any = null;

  constructor(token: string, accountId: string, baseUrl: string, instruments: string[]) {
    super();
    this.token = token;
    this.accountId = accountId;
    this.baseUrl = baseUrl;
    this.instruments = instruments;
  }

  start() {
    const streamUrl = this.baseUrl.replace("api-", "stream-");
    const instStr = this.instruments.map(toOandaInstrument).join(",");
    const url = `${streamUrl}/v3/accounts/${this.accountId}/pricing/stream?instruments=${instStr}`;

    const parsedUrl = new URL(url);
    const proxyUrl = "http://fvtpyskr:atzg4nqjzpp0@23.95.150.145:6114";
    const agent = new HttpsProxyAgent(proxyUrl);

    const options: any = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: "GET",
      agent: agent,
      headers: {
        "Authorization": `Bearer ${this.token}`,
        "Accept-Datetime-Format": "RFC3339",
      },
    };

    console.log(`[OANDA STREAM] Connecting to ${url}...`);

    this.req = https.get(options, (res) => {
      if (res.statusCode !== 200) {
        let body = "";
        res.on("data", (chunk) => body += chunk);
        res.on("end", () => {
          this.emit("error", new Error(`OANDA stream error ${res.statusCode}: ${body.slice(0, 160)}`));
        });
        return;
      }

      let buffer = "";
      res.setEncoding("utf8");

      res.on("data", (chunk) => {
        buffer += chunk;
        const lines = buffer.split("\n");
        // Keep the last part as it may be incomplete
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const obj = JSON.parse(trimmed);
            if (obj.type !== "PRICE") continue;

            const inst = fromOandaInstrument(obj.instrument || "");
            const bids = obj.bids || [{}];
            const asks = obj.asks || [{}];
            const bid = parseFloat(bids[0].price || "0");
            const ask = parseFloat(asks[0].price || "0");
            const mid = bid && ask ? (bid + ask) / 2 : 0.0;

            const tick = {
              type: "tick",
              symbol: inst,
              bid,
              ask,
              mid,
              time: obj.time,
              source: "oanda",
            };
            this.emit("tick", tick);
          } catch (err) {
            // Ignored, bad chunk
          }
        }
      });

      res.on("end", () => {
        this.emit("end");
      });

      res.on("error", (err) => {
        this.emit("error", err);
      });
    });

    this.req.on("error", (err: any) => {
      this.emit("error", err);
    });
  }

  stop() {
    if (this.req) {
      this.req.destroy();
      this.req = null;
      console.log(`[OANDA STREAM] Disconnected.`);
    }
  }
}
