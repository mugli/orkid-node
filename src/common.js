function delay(time) {
  return new Promise(res => setTimeout(() => res(), time));
}

async function waitUntilInitialized(isInitialized) {
  let counter = 0;
  while (!isInitialized) {
    counter++;
    await delay(50);

    if (counter > 5) {
      throw new Error('Initialization is taking too long. Aborting.');
    }
  }
}

module.exports = {
  delay,
  waitUntilInitialized
};
