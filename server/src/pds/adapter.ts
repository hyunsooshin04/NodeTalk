import AtprotoApi from "@atproto/api";
const BskyAgent = (AtprotoApi as any).default?.BskyAgent || (AtprotoApi as any).BskyAgent;
type BskyAgentType = InstanceType<typeof BskyAgent>;
import type { PDSConfig } from "@nodetalk/shared";

/**
 * PDS Adapter - AT Protocol PDS와 통신
 */
export class PDSAdapter {
  private agent: BskyAgentType;
  private config: PDSConfig;

  constructor(config: PDSConfig) {
    this.config = config;
    this.agent = new BskyAgent({
      service: config.endpoint,
    });
  }

  /**
   * DID로 PDS endpoint resolve
   */
  static async resolveDID(did: string): Promise<string> {
    // AT Protocol DID resolution
    const response = await fetch(`https://plc.directory/${did}`);
    if (!response.ok) {
      throw new Error(`Failed to resolve DID: ${did}`);
    }
    const doc = await response.json() as any;
    return doc.service?.[0]?.serviceEndpoint || `https://bsky.social`;
  }

  /**
   * Agent 초기화 (인증)
   */
  async login(identifier: string, password: string) {
    await this.agent.login({ identifier, password });
    return this.agent;
  }

  /**
   * 레코드 생성
   */
  async createRecord(collection: string, record: any) {
    const result = await this.agent.com.atproto.repo.createRecord({
      repo: this.config.did,
      collection,
      record,
    });
    return result;
  }

  /**
   * 레코드 목록 조회
   */
  async listRecords(collection: string, options?: {
    limit?: number;
    cursor?: string;
  }) {
    const result = await this.agent.com.atproto.repo.listRecords({
      repo: this.config.did,
      collection,
      limit: options?.limit || 50,
      cursor: options?.cursor,
    });
    return result;
  }

  /**
   * 특정 레코드 조회
   */
  async getRecord(collection: string, rkey: string) {
    const result = await this.agent.com.atproto.repo.getRecord({
      repo: this.config.did,
      collection,
      rkey,
    });
    return result;
  }

  getAgent() {
    return this.agent;
  }
}

