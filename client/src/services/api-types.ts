import { observable } from "mobx";

export type Peer = {
  email: string;
  name: string;
  uid: string;
  counter?: number;
};

export type UserDatabase = Peer & {
  chats: { [key: string]: boolean } | null;
};

export function chatMessageToDatabase(message: ChatMessage) {
  return {
    ...message,
    timestamp: message.timestamp.getTime()
  } as ChatMessageDatabase;
}
export function databaseToChatMessage(message: ChatMessageDatabase) {
  return { ...message, timestamp: new Date(message.timestamp) } as ChatMessage;
}
export type ChatMessage = {
  senderId: string;
  type: "CHAT";
  content: string;
  timestamp: Date;
};
export type ChatMessageDatabase = {
  senderId: string;
  type: "CHAT";
  content: string;
  timestamp: number;
};

export class Chat {
  constructor(
    uid: string,
    peer: Peer,
    peerConnection: RTCPeerConnection | null = null,
    messages: ChatMessage[] = []
  ) {
    this.uid = uid;
    this.peer = peer;
    this.peerConnection = peerConnection;
    this.messages = messages;
  }
  @observable state: RTCPeerConnectionState = "closed";
  uid: string;
  @observable messages: ChatMessage[];
  @observable peer: Peer;
  dataChannel: RTCDataChannel | null = null;
  peerConnection: RTCPeerConnection | null;
  receivedOffer?:boolean;
}

export type ChatDatabase = {
  messages: { [key: string]: ChatMessageDatabase } | null;
  peers: { [key: string]: Peer };
  uid?: string;
};

export enum EmitCallErrors {
  BACKEND_ERROR,
  NOT_LOGGED_IN,
  NOT_EXISTS,
  CALLED_SELF
}
