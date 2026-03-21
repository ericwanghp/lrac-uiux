export interface HumanRoutingMessage {
  ticketId: string;
  sessionId: string;
  eventId: string;
  assignee: string;
  channel: string;
  message: string;
  createdAt: string;
}

export interface HumanRoutingDeliveryResult {
  success: boolean;
  externalId: string | null;
  error: string | null;
}

export interface HumanRoutingAdapter {
  name: string;
  send(message: HumanRoutingMessage): Promise<HumanRoutingDeliveryResult>;
}

export class NoopHumanRoutingAdapter implements HumanRoutingAdapter {
  name = "noop";

  async send(message: HumanRoutingMessage): Promise<HumanRoutingDeliveryResult> {
    return {
      success: true,
      externalId: `noop-${message.ticketId}`,
      error: null,
    };
  }
}

export function createHumanRoutingAdapter(): HumanRoutingAdapter {
  return new NoopHumanRoutingAdapter();
}
