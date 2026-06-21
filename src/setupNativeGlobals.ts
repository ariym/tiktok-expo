import { Platform } from 'react-native';

type NativeDomElement = {
  childNodes: NativeDomElement[];
  dataset: Record<string, string>;
  firstChild: NativeDomElement | null;
  parentNode: NativeDomElement | null;
  style: Record<string, unknown>;
  appendChild: (child: NativeDomElement) => NativeDomElement;
  getAttribute: (name: string) => string | null;
  getBoundingClientRect: () => {
    bottom: number;
    height: number;
    left: number;
    right: number;
    top: number;
    width: number;
  };
  insertBefore: (child: NativeDomElement) => NativeDomElement;
  querySelectorAll: () => NativeDomElement[];
  removeAttribute: (name: string) => void;
  removeChild: (child: NativeDomElement) => NativeDomElement;
  setAttribute: (name: string, value: string) => void;
};

const createNativeDomElement = (): NativeDomElement => {
  const attributes: Record<string, string> = {};

  const element: NativeDomElement = {
    childNodes: [],
    dataset: {},
    firstChild: null,
    parentNode: null,
    style: {},
    appendChild: child => {
      child.parentNode = element;
      element.childNodes.push(child);
      element.firstChild = element.childNodes[0] ?? null;
      return child;
    },
    getAttribute: name => attributes[name] ?? null,
    getBoundingClientRect: () => ({
      bottom: 0,
      height: 0,
      left: 0,
      right: 0,
      top: 0,
      width: 0,
    }),
    insertBefore: child => element.appendChild(child),
    querySelectorAll: () => [],
    removeAttribute: name => {
      delete attributes[name];
    },
    removeChild: child => {
      element.childNodes = element.childNodes.filter(item => item !== child);
      element.firstChild = element.childNodes[0] ?? null;
      child.parentNode = null;
      return child;
    },
    setAttribute: (name, value) => {
      attributes[name] = value;
    },
  };

  return element;
};

if (Platform.OS !== 'web') {
  const nativeDocument = {
    addEventListener: () => undefined,
    body: createNativeDomElement(),
    createElement: () => createNativeDomElement(),
    createTextNode: () => createNativeDomElement(),
    documentElement: createNativeDomElement(),
    getElementById: () => null,
    head: createNativeDomElement(),
    querySelectorAll: () => [],
    removeEventListener: () => undefined,
    title: '',
  };

  const currentDocument = (globalThis as { document?: unknown }).document;

  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value:
      currentDocument && typeof currentDocument === 'object'
        ? {
            ...nativeDocument,
            ...currentDocument,
          }
        : nativeDocument,
  });

  const currentWindow = (globalThis as unknown as {
    window?: { document?: unknown };
  }).window;

  if (currentWindow && !currentWindow.document) {
    currentWindow.document = (globalThis as { document: unknown }).document;
  }
}
