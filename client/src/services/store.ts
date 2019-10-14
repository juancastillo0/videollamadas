import { observable, action, computed } from "mobx";
import React from "react";
import api, { addTracksToPeerConnection } from "./api";
import AuthStore from "../auth/AuthStore";
import { Peer, Chat, ChatMessage, EmitCallErrors } from "./api-types";

type MediaDevicesType = {
  audioinput: MediaDeviceInfo[];
  audiooutput: MediaDeviceInfo[];
  videoinput: MediaDeviceInfo[];
};
async function getMediaDevices() {
  const mediaDevicesArray = await navigator.mediaDevices.enumerateDevices();
  const mediaDevices: MediaDevicesType = {
    audioinput: [],
    audiooutput: [],
    videoinput: []
  };

  for (let device of mediaDevicesArray) {
    mediaDevices[device.kind].push(device);
  }
  return mediaDevices;
}

function getDefaultVideoContraints(
  mediaDevices: MediaDevicesType,
  video: boolean
) {
  let videoContraints;
  if (video) {
    let videoDevice;
    for (let device of mediaDevices.videoinput) {
      const label = device.label.toLowerCase();
      if (
        label.includes("world") ||
        label.includes("enviroment") ||
        label.includes("back")
      ) {
        continue;
      }
      videoDevice = device;
      break;
    }

    if (videoDevice) {
      videoContraints = {
        video: {
          deviceId: videoDevice.deviceId
        }
      };
    } else {
      videoContraints = { video: true };
    }
  } else {
    videoContraints = { video: false };
  }
  return videoContraints;
}

async function getMediaStreams(
  videoContraints: { video: any },
  mediaDevices?: MediaDevicesType
) {
  try {
    if (!mediaDevices) {
      mediaDevices = await getMediaDevices();
    }

    const mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      ...videoContraints
    });
    (window as any).mediaStream = mediaStream;
    return mediaStream;
  } catch (error) {
    console.log(error);
  }
}

type ActionState = {
  fetching: boolean;
  error: string | null;
};
export type CallState =
  | "INACTIVE"
  | "REQUESTING"
  | "RECEIVING"
  | "CONFIRMED"
  | "ACTIVE";

export type FocusedElements = "CHAT_INPUT" | "NEW_CONTACT_INPUT";

enum DeviceSizes {
  "xs",
  "sm",
  "md",
  "lg",
  "xl"
}

function getWindowSize() {
  const size = {
    h: Math.min(window.outerHeight, window.innerHeight),
    w: Math.min(window.outerWidth, window.innerWidth),
    device: 0
  };

  if (size.w < 576) {
    size.device = DeviceSizes.xs;
  } else if (size.w < 768) {
    size.device = DeviceSizes.sm;
  } else if (size.w < 992) {
    size.device = DeviceSizes.md;
  } else if (size.w < 1200) {
    size.device = DeviceSizes.lg;
  } else {
    size.device = DeviceSizes.xl;
  }
  return size;
}

class Store extends AuthStore {
  constructor() {
    super();
    this.windowSize = getWindowSize();
    window.onresize = () => {
      this.windowSize = getWindowSize();
    };
  }

  @observable fullscreen: boolean = false;
  @observable mediaDevices: {
    audioinput: MediaDeviceInfo[];
    audiooutput: MediaDeviceInfo[];
    videoinput: MediaDeviceInfo[];
  } | null = null;
  @observable windowSize: { w: number; h: number; device: DeviceSizes };
  @observable focus: FocusedElements | null = null;

  @observable callState: CallState = "INACTIVE";
  @observable peersCalling: { [key: string]: Peer } = {};
  @observable activeCallPeer: Peer | null = null;

  @observable localStream: MediaStream | null = null;
  @observable remoteStream: MediaStream | null = null;

  @observable error: string | null = null;

  @observable openedChat: string | null = null;
  @observable chats = observable.map<string, Chat>({});

  @observable isBusy: boolean = false;
  @computed get canReceive() {
    return (
      !this.isBusy &&
      (this.callState === "INACTIVE" || this.callState === "RECEIVING")
    );
  }
  @computed get isOpenedChatConnected() {
    if (store.openedChat) {
      const chat = store.chats.get(store.openedChat);
      if (chat) return chat.state === "connected";
    }
    return false;
  }

  isPeerInActiveCall(peerId: string) {
    return this.activeCallPeer && this.activeCallPeer.uid === peerId;
  }

  @action rejectAllCalls() {
    Object.keys(this.peersCalling).forEach(id => {
      this.rejectCall(id);
    });
  }
  @action receiveCall(peer: Peer) {
    if (this.canReceive) {
      this.callState = "RECEIVING";
      this.peersCalling[peer.uid] = peer;
    }
  }
  @action async acceptCall(peerId: string) {
    const chat = this.chats.get(peerId);
    if (!chat) return console.log("error");
    const pc = chat.peerConnection;
    if (!pc) return console.log("error");

    if (!this.mediaDevices) {
      this.mediaDevices = await getMediaDevices();
    }
    const videoConstraints = getDefaultVideoContraints(this.mediaDevices, true);
    const mediaStream = await getMediaStreams(videoConstraints);

    if (mediaStream) {
      console.log("mediaStream", mediaStream);
      this.localStream = mediaStream;

      this.callState = "CONFIRMED";
      this.activeCallPeer = this.peersCalling[peerId];
      delete this.peersCalling[peerId];

      addTracksToPeerConnection(pc);

      api.acceptCall(peerId);
      this.rejectAllCalls();
    } else {
      this.error =
        "Debes aceptar el acceso al micrófono o video para realizar llamadas.";
    }
  }
  @action rejectCall(peerId: string) {
    api.rejectCall(peerId);

    delete this.peersCalling[peerId];
    const keys = Object.keys(this.peersCalling);
    this.callState =
      keys.length > 0 || this.callState !== "RECEIVING"
        ? this.callState
        : "INACTIVE";
  }
  @action endCall(sendMessage: boolean) {
    this.callState = "INACTIVE";
    this.localStream = null;
    if (this.activeCallPeer) {
      const chat = this.chats.get(this.activeCallPeer.uid);
      if (chat && chat.peerConnection) {
        for (let sender of chat.peerConnection.getSenders()) {
          chat.peerConnection.removeTrack(sender);
        }
      }
      if (sendMessage) {
        api.endCall(this.activeCallPeer.uid);
      }
    }

    this.activeCallPeer = null;
    this.remoteStream = null;
  }
  @action peerJoined(peerId: string) {
    if (this.activeCallPeer && this.isPeerInActiveCall(peerId)) {
      this.callState = "ACTIVE";
      return this.chats.get(this.activeCallPeer.uid);
    } else if (peerId in this.chats) {
      return this.chats.get(peerId);
    }
  }
  @action emitChat(content: string) {
    if (this.user && this.openedChat && this.chats.get(this.openedChat)) {
      const chat = this.chats.get(this.openedChat);
      if (!chat) return;
      const message = {
        content,
        type: "CHAT",
        timestamp: new Date(),
        senderId: this.user.uid
      } as ChatMessage;

      chat.messages.push(message);
      return api.emitChat(chat, message);
    } else {
      console.log("emitChat error", this);
    }
  }
  @action async emitCall(video = true) {
    if (this.openedChat && this.chats.get(this.openedChat)) {
      const peerId = this.openedChat;
      const chat = this.chats.get(this.openedChat);
      if (!chat) return;

      if (!this.mediaDevices) {
        this.mediaDevices = await getMediaDevices();
      }
      const videoConstraints = getDefaultVideoContraints(
        this.mediaDevices,
        video
      );
      const mediaStream = await getMediaStreams(videoConstraints);

      if (mediaStream) {
        this.callState = "REQUESTING";
        this.activeCallPeer = chat.peer;

        console.log("mediaStream", mediaStream);
        this.localStream = mediaStream;
        api.emitCall(peerId);
      } else {
        this.error =
          "Debes aceptar el acceso al micrófono o video para realizar llamadas.";
      }
    } else {
      console.log("error emitcall", this);
    }
  }
  @action async changeCamera(deviceId: string) {
    if (this.activeCallPeer) {
      const chat = this.chats.get(this.activeCallPeer.uid);
      if (chat && chat.peerConnection && chat.dataChannel && this.localStream) {
        const mediaStream = await getMediaStreams({ video: { deviceId } });
        if (mediaStream) {
          this.localStream = mediaStream;

          const pc = chat.peerConnection;
          this.localStream.getVideoTracks().forEach(function(track) {
            const sender = pc.getSenders().find(function(s) {
              return s.track && s.track.kind === track.kind;
            });
            if (sender) {
              sender.replaceTrack(track);
            } else {
              console.log("error", track);
            }
          });

          // addTracksToPeerConnection(chat.peerConnection);
          // renegotiateDescriptions(chat.peerConnection, chat.dataChannel);
        }
      }
    }
  }
  @action receiveChat(message: ChatMessage) {
    const chat = this.chats.get(message.senderId);
    if (chat) {
      chat.messages.push(message);
      chat.messages = chat.messages;
    }
  }
  @observable createContactState: ActionState = {
    fetching: false,
    error: null
  };
  @action async createContact(email: string) {
    if (!this.user) return;
    if (!navigator.onLine) {
      this.createContactState.error = `No tienes conexión a internet, por favor intenta de nueva más tarde.`;
    }

    if (this.user.email === email) {
      return (this.createContactState.error = `No te puedes agregar a ti mismo.`);
    }
    for (let v of this.chats.values()) {
      if (v.peer.email === email) {
        this.openedChat = v.peer.uid;
        this.focus = "CHAT_INPUT";
        return;
      }
    }
    const ans = await api.createContact(email);

    if (ans instanceof Chat) {
      this.chats.set(ans.peer.uid, ans);
      this.openedChat = ans.peer.uid;
      this.focus = "CHAT_INPUT";
      return;
    } else {
      switch (ans) {
        case EmitCallErrors.NOT_EXISTS:
          this.createContactState.error = `No hay usuario registrado con el email '${email}'.`;
          break;
        case EmitCallErrors.CALLED_SELF:
          this.createContactState.error = `No te puedes agregar a ti mismo.`;
          break;
        case EmitCallErrors.BACKEND_ERROR:
          this.createContactState.error = `Hubo un error en el servidor, por favor intenta de nuevo más tarde.`;
          break;
      }
    }
  }
}

const store = new Store();
export const StoreContext = React.createContext(store);
(window as any).store = store;
export default store;
