class Task {
  constructor(id, rawData) {
    this.id = id;
    this.dataString = rawData.data;
    this.dataObj = JSON.parse(rawData.data);
    this.dedupKey = rawData.dedupKey;
    this.retryCount = JSON.parse(rawData.retryCount || 0);
  }

  incrRetry() {
    this.retryCount++;
  }
}

module.exports = Task;
