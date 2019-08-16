export function delay(ms: number) {
  return new Promise(res => setTimeout(() => res(), ms));
}

interface LooseObject {
  [key: string]: boolean;
}

export async function waitUntilInitialized(thisObj: LooseObject, initializeVarName: string) {
  let counter = 0;
  while (!thisObj[initializeVarName]) {
    counter++;
    await delay(50);

    if (counter > 5) {
      throw new Error('Initialization is taking too long. Aborting.');
    }
  }
}
