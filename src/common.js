function delay(ms) {
  return new Promise(res => setTimeout(() => res(), ms));
}

async function waitUntilInitialized(thisObj, initializeVarName) {
  let counter = 0;
  while (!thisObj[initializeVarName]) {
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
