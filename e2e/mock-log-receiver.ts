import { EventEmitter } from 'events';

export class MockLogReceiver extends EventEmitter {
  constructor(public opts: { address: string, port: number }) {
    super();
  }
}
