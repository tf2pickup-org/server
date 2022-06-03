import { WebsocketEvent } from '@/websocket-event';
import { Serializable } from './serializable';

export interface WebsocketEventEmitter<T> {
  emit(event: WebsocketEvent, payload: Serializable<T>): void;
}
