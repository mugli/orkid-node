/*
  Source: https://github.com/luin/ioredis/issues/747#issuecomment-500735545
*/

function parseObjectResponse(reply: Array<any>) {
  if (!Array.isArray(reply)) {
    return reply;
  }
  const data: Record<string, any> = {};
  for (let i = 0; i < reply.length; i += 2) {
    data[reply[i]] = reply[i + 1];
  }
  return data;
}

function parseMessageResponse(reply: Array<any>): StreamValue[] {
  if (!Array.isArray(reply)) {
    return [];
  }

  return reply.map(message => {
    return {
      id: message[0],
      data: parseObjectResponse(message[1])
    };
  });
}

export interface StreamValue {
  id: string;
  data: any;
}

function parseStreamResponse(reply: Array<any>) {
  if (!Array.isArray(reply)) {
    return reply;
  }
  const object: Record<string, StreamValue[]> = {};
  for (const stream of reply) {
    object[stream[0]] = parseMessageResponse(stream[1]);
  }

  return object;
}

const parseXPendingResponse = (reply: Array<any>) => {
  if (!reply || reply.length === 0) {
    return [];
  }

  const consumers: Array<Record<string, any>> = (reply[3] || []).map((consumer: Array<any>) => {
    return {
      name: consumer[0],
      count: parseInt(consumer[1])
    };
  });

  if (reply.length === 4 && !Number.isNaN(reply[0])) {
    return {
      count: parseInt(reply[0]),
      minId: reply[1],
      maxId: reply[2],
      consumers
    };
  }

  return reply.map(message => {
    return {
      id: <string>message[0],
      consumerName: <string>message[1],
      elapsedMilliseconds: <number>parseInt(message[2]),
      deliveryCount: <number>parseInt(message[3])
    };
  });
};

export { parseStreamResponse, parseMessageResponse, parseXPendingResponse };
