import amqp, {
  type ChannelModel,
  type ConfirmChannel,
} from 'amqplib';

export type PublishMessage = {
  eventId: string;
  eventType: string;
  payload: Record<string, unknown>;
};

export class RabbitPublisher {
  private connection: ChannelModel | undefined;
  private channel: ConfirmChannel | undefined;

  public constructor(
    private readonly url: string,
    private readonly exchange: string = 'powergrid.events',
  ) {}

  public async connect(): Promise<void> {
    const connection = await amqp.connect(this.url);
    const channel = await connection.createConfirmChannel();

    await channel.assertExchange(this.exchange, 'topic', {
      durable: true,
    });

    this.connection = connection;
    this.channel = channel;
  }

  public async publish(message: PublishMessage): Promise<void> {
    const channel = this.channel;

    if (channel === undefined) {
      throw new Error('RabbitPublisher não está conectado.');
    }

    const accepted = channel.publish(
      this.exchange,
      message.eventType,
      Buffer.from(JSON.stringify(message.payload)),
      {
        persistent: true,
        contentType: 'application/json',
        messageId: message.eventId,
        type: message.eventType,
      },
    );

    if (!accepted) {
      await new Promise<void>((resolve) => {
        channel.once('drain', resolve);
      });
    }

    await channel.waitForConfirms();
  }

  public async close(): Promise<void> {
    const channel = this.channel;
    const connection = this.connection;

    this.channel = undefined;
    this.connection = undefined;

    await channel?.close();
    await connection?.close();
  }
}
