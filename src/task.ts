import * as Joi from '@hapi/joi';

const schema = Joi.object().keys({
  data: Joi.string()
    .required()
    .allow(''),
  dedupKey: Joi.string()
    .required()
    .allow(''),
  retryCount: Joi.number()
    .integer()
    .min(0)
    .required()
});

const validationOptions = {
  abortEarly: true,
  convert: true,
  allowUnknown: false
};

export interface RawData {
  data: string;
  dedupKey: string;
  retryCount: number;
}

export class Task {
  id: string;
  dataString: string;
  dataObj: unknown;
  dedupKey: string;
  retryCount: number;

  constructor(id: string, rawData: RawData) {
    if (!id) {
      throw new Error('Task requires an ID');
    }

    const { value, error } = Joi.validate(rawData, schema, validationOptions);

    if (error) {
      throw new Error(`Invalid rawData for task: ${error}`);
    }

    this.id = id;
    this.dataString = value.data;
    this.dataObj = JSON.parse(value.data);
    this.dedupKey = value.dedupKey;
    this.retryCount = value.retryCount;
  }

  incrRetry() {
    this.retryCount++;
  }
}
