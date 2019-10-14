import store from "./store";
import io from "socket.io-client";
import {
  UserDatabase,
  Chat,
  databaseToChatMessage,
  ChatDatabase,
  Peer,
  ChatMessage,
  chatMessageToDatabase,
  EmitCallErrors,
  ChatMessageDatabase
} from "./api-types";

// const app: firebase.app.App | null = null; 
export const socket = io();

// let database: firebase.database.Reference;
const pcConfig = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
      credential: null
    }
  ]
};

// Set up audio and video regardless of what devices are present.
const sdpConstraints = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true
};

async function fetchChat(chat: ChatDatabase) {
  if (!store.user || !chat.uid) return;
  for (let [peerId, peerValue] of Object.entries(chat.peers)) {
    if (peerId !== store.user.uid) {
      const peer = { ...peerValue, uid: peerId };
      const messagesDb = chat.messages
        ? Array.isArray(chat.messages)
          ? (chat.messages as ChatMessageDatabase[])
          : Object.values(chat.messages)
        : [];
      const messages = messagesDb.map(databaseToChatMessage);
      const newChat = new Chat(chat.uid, peer, null, messages);
      store.chats.set(peerId, newChat);
      startConnectionIfActive(newChat);
      break;
    }
  }
}

async function fetchChats(user: UserDatabase) {
  if (!user.chats) {
    return;
  }
  for (let chatId of Object.keys(user.chats)) {
    socket.emit("fetchChat", chatId, fetchChat);
  }
}

// Login & Logout

export function login(user: UserDatabase) {
  fetchChats(user);
  assignDatabaseListeners();
}

function endAll() {
  if (store.activeCallPeer) {
    endCall(store.activeCallPeer.uid);
  }
  store.chats.forEach(chat => {
    if (chat.dataChannel) {
      chat.dataChannel.send(JSON.stringify({ type: MessageTypes.RESET }));
    }
  });
}

export function logout() {
  endAll();
}

window.onbeforeunload = function() {
  console.log("Client sending bye");
  endAll();
};

// Calls
function getPeerDatabaseRef(peerId: string, userId: string) {
  return {
    set: (message: any) => {
      socket.emit("signal", { ...message, peerId });
    }
  };
}

async function startConnectionIfActive(chat: Chat) {
  const peer = chat.peer;
  if (false) {
    // const peerActiveRef = app.database().ref(`signals/${peer.uid}/active`);
    // const snapchot = await peerActiveRef.once("value");
    // console.log(snapchot, snapchot.val());
    // if (store.user) {
    //   const activeVal = snapchot.val();
    //   if (activeVal) {
    //     startConnection(chat, store.user, true);
    //   }
    // }
  } else {
    socket.emit("active", peer.uid, (isActive: boolean) => {
      if (isActive && store.user) {
        startConnection(chat, store.user, true);
      }
    });
  }
}

// Signaling

type MessageCandidate = {
  type: string;
  label: any;
  id: any;
  candidate: any;
};

async function handleSignal(message: any) {
  let peerId = message.peerId;
  delete message.peerId;

  console.log("Client received message:", message, peerId);
  if (store.user === null || peerId === null) {
    console.log("error");
    return;
  }
  const user = store.user;
  let chat = store.chats.get(peerId);
  let pc = chat ? chat.peerConnection : undefined;

  console.log("peerconnection", pc, chat);
  if (message.type === "offer") {
    if (!chat) {
      const peer = message.user as Peer;
      peerId = peer.uid;
      const chatId = message.chatId;
      chat = new Chat(chatId, peer);
      store.chats.set(peer.uid, chat);
    }

    pc = pc || startConnection(chat, user, false);
    if (!pc) return;

    if (pc.signalingState === "have-local-offer") {
      if (peerId > user.uid) {
        console.log("greater");
        return;
      } else {
        console.log("lower");
        chat.peerConnection = null;
        pc = startConnection(chat, user, false);
        if (!pc) return;
        chat.peerConnection = pc;
        chat.receivedOffer = true;
      }
    }

    delete message.user;
    delete message.chatId;

    await pc.setRemoteDescription(message as RTCSessionDescriptionInit);

    console.log("Sending answer to peer.");
    pc.createAnswer().then(setLocalAndSendMessage(pc, peerId, user), error => {
      console.log("Failed to create session description: " + error.toString());
    });
  } else if (message.type === "answer" && pc && chat &&!chat.receivedOffer) {
    pc.setRemoteDescription(message as RTCSessionDescriptionInit);
  } else if (message.type === "candidate" && pc) {
    const messageC = message as MessageCandidate;
    var candidate = new RTCIceCandidate({
      sdpMLineIndex: messageC.label,
      candidate: messageC.candidate
    });
    pc.addIceCandidate(candidate);
  }
}
function assignDatabaseListeners() {
  if (false) {
    // const _handleSignal = (snapshot: firebase.database.DataSnapshot) => {
    //   const message = snapshot.val();
    //   let peerId = snapshot.key;
    //   handleSignal({ ...message, peerId });
    // };
    // database.on("child_added", _handleSignal);
    // database.on("child_changed", _handleSignal);
  } else {
    socket.on("signal", handleSignal);
  }
}

if (window.location.hostname !== "localhost") {
  requestTurn(
    "https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913"
  );
}

function startConnection(chat: Chat, user: Peer, isInitiator: boolean) {
  const peer = chat.peer;
  const peerId = peer.uid;

  if (!chat.peerConnection) {
    console.log(">>>>>> creating peer connection");

    let pc;
    try {
      pc = createPeerConnection(chat, user);
    } catch (error) {
      console.log(
        "Failed to create PeerConnection, exception: " + error.message
      );
      alert("Cannot create RTCPeerConnection object.");
      return;
    }

    console.log("isInitiator", isInitiator);
    if (isInitiator) {
      const dataChannel = pc.createDataChannel("data");
      chat.dataChannel = dataChannel;
      onDataChannelCreated(dataChannel, peer);

      console.log("Sending offer to peer");
      pc.createOffer(
        setLocalAndSendMessage(pc, peerId, user, chat.uid),
        (error: any) => {
          console.log("createOffer() error: ", error);
        }
      );
    } else {
      pc.ondatachannel = function(event) {
        const dataChannel = event.channel;
        chat.dataChannel = dataChannel;
        onDataChannelCreated(dataChannel, peer);
      };
    }
    return pc;
  }
}

// DataChannel Messages

export enum MessageTypes {
  RESET = "RESET",
  CHAT = "CHAT",
  CALL = "CALL",
  CALL_ACCEPTED = "CALL_ACCEPTED",
  FULL = "FULL",
  CALL_REJECTED = "CALL_REJECTED",
  UNAVAILABLE = "UNAVAILABLE",
  CALL_ENDED = "CALL_ENDED",
  NEGOTIATION = "NEGOTIATION"
}

function sendCallMessage(peerId: string, type: MessageTypes) {
  console.log(peerId, type);
  const chat = store.chats.get(peerId);
  if (chat) {
    const dataChannel = chat.dataChannel;
    if (dataChannel) {
      return dataChannel.send(JSON.stringify({ type }));
    }
  }
  console.log("error sendCallMessage", type, peerId);
}
export function acceptCall(peerId: string) {
  sendCallMessage(peerId, MessageTypes.CALL_ACCEPTED);
}
export function rejectCall(peerId: string) {
  sendCallMessage(peerId, MessageTypes.CALL_REJECTED);
}
export function emitCall(peerId: string) {
  sendCallMessage(peerId, MessageTypes.CALL);
}
export function endCall(peerId: string) {
  sendCallMessage(peerId, MessageTypes.CALL_ENDED);
}

export function emitChat(chat: Chat, message: ChatMessage) {
  const dataChannel = chat.dataChannel;
  if (dataChannel) {
    dataChannel.send(JSON.stringify(message));
  }
  if (false) {
    // const chatRef = app.database().ref(`/chats/${chat.uid}/messages`);
    // chatRef.push(chatMessageToDatabase(message));
  } else {
    socket.emit("chat", {
      ...chatMessageToDatabase(message),
      chatId: chat.uid
    });
  }
}

const callErrorMessages = {
  [MessageTypes.FULL]: (email: string) =>
    `El usuario con correo ${email} está recibiendo otra llamada.`,
  [MessageTypes.CALL_REJECTED]: (email: string) =>
    `El usuario con correo ${email} no está disponible.`,
  [MessageTypes.UNAVAILABLE]: (email: string) =>
    `El usuario con correo ${email} no existe o no está disponible.`
};

function onDataChannelMessage(peer: Peer) {
  return function(event: MessageEvent) {
    if (!store.user) return;

    const data = event.data;
    console.log(event, data);
    switch (typeof data) {
      case "string":
        const message = JSON.parse(data);
        if (!(message.type in MessageTypes)) {
          return;
        }
        const messageType = message.type as MessageTypes;

        switch (messageType) {
          case MessageTypes.CALL_ENDED:
            if (store.activeCallPeer && store.activeCallPeer.uid === peer.uid) {
              store.endCall(false);
            } else if (peer.uid in store.peersCalling) {
              delete store.peersCalling[peer.uid];
            } else {
              console.log("onDataChannel MessageError", message);
            }
            break;
          case MessageTypes.CHAT:
            const chatMessage = message as ChatMessage;
            chatMessage.timestamp = new Date(chatMessage.timestamp);
            store.receiveChat(chatMessage);
            break;

          case MessageTypes.CALL: {
            if (store.canReceive) {
              store.receiveCall(peer);
            } else {
              const chat = store.chats.get(peer.uid);
              if (!chat) return;
              const dataChannel = chat.dataChannel;
              if (dataChannel) {
                dataChannel.send(JSON.stringify({ type: MessageTypes.FULL }));
              }
            }
            break;
          }
          case MessageTypes.CALL_ACCEPTED: {
            console.log("Another peer joined");
            if (store.isPeerInActiveCall(peer.uid)) {
              const chat = store.chats.get(peer.uid);
              if (!chat) return;
              const pc = chat.peerConnection;
              const dataChannel = chat.dataChannel;
              if (!pc || !dataChannel) {
                return console.log("error");
              }
              addTracksToPeerConnection(pc);
              renegotiateDescriptions(pc, dataChannel);
            }
            break;
          }
          case MessageTypes.FULL:
          case MessageTypes.CALL_REJECTED:
          case MessageTypes.UNAVAILABLE:
            if (store.callState === "REQUESTING" && store.activeCallPeer) {
              store.endCall(false);
              const callErrorFunction = callErrorMessages[messageType];
              store.error = callErrorFunction(peer.email);
            }
            break;
          case MessageTypes.NEGOTIATION:
            if (store.activeCallPeer && store.activeCallPeer.uid === peer.uid) {
              const chat = store.chats.get(peer.uid);
              if (!chat) return;
              const pc = chat.peerConnection;
              const dataChannel = chat.dataChannel;
              if (!pc || !dataChannel) {
                return console.log("error");
              }

              if (message.offer) {
                pc.setRemoteDescription(
                  message.offer as RTCSessionDescriptionInit
                );
                pc.createAnswer().then(
                  setLocalAndSendMessageDataChannel(pc, dataChannel)
                );
              } else if (message.answer) {
                pc.setRemoteDescription(
                  message.answer as RTCSessionDescriptionInit
                );
              } else if (message.candidate) {
                const candidate = new RTCIceCandidate(message.candidate);
                pc.addIceCandidate(candidate);
              }
            }
            break;
          case MessageTypes.RESET:
            const chat = store.chats.get(peer.uid);
            if (chat) {
              chat.state = "closed";
              chat.peerConnection = null;
              chat.dataChannel = null;
            }
            break;
        }
    }
  };
}

function onDataChannelCreated(channel: RTCDataChannel, peer: Peer) {
  console.log("onDataChannelCreated:", channel);
  channel.onopen = function() {
    console.log("CHANNEL opened!!!");
  };
  channel.onclose = function() {
    console.log("Channel closed.");
  };
  channel.onmessage = onDataChannelMessage(peer);
}

/////////////////////////////////////////////////////////
// export function removeTracksFromPeerConnection(pc: RTCPeerConnection) {
//   if (store.localStream) {
//     console.log(store.localStream.getTracks());
//     for (const track of store.localStream.getTracks()) {

//       pc.addTrack(track, store.localStream);
//       pc.getSenders()[0].
//       pc.removeTrack()
//     }
//   }
// }
export function addTracksToPeerConnection(pc: RTCPeerConnection) {
  if (store.localStream) {
    console.log(store.localStream.getTracks());
    for (const track of store.localStream.getTracks()) {
      pc.addTrack(track, store.localStream);
    }
  }
}

function createPeerConnection(chat: Chat, user: Peer) {
  const peer = chat.peer;
  const peerId = peer.uid;
  const pc = new RTCPeerConnection(undefined);
  pc.onicecandidate = handleIceCandidate(chat, peerId, user.uid);
  pc.onconnectionstatechange = () => {
    chat.state = pc.connectionState;
  };
  pc.ontrack = event => {
    console.log("ontrack", event);
    if (!store.isPeerInActiveCall(peerId)) return;

    if (event.streams && event.streams[0]) {
      console.log("Remote stream added.");
      store.remoteStream = event.streams[0];
    } else {
      console.log("New media stream added.");
      const inboundStream = new MediaStream();
      inboundStream.addTrack(event.track);
      store.remoteStream = inboundStream;
    }
  };
  pc.onnegotiationneeded = function() {
    console.log("onnegotiationneeded");
  };
  if (store.isPeerInActiveCall(peerId)) {
    addTracksToPeerConnection(pc);
  }

  // Assign peer connection to Chat
  chat.peerConnection = pc;

  return pc;
}

// Signaling Utils =======================================================================

function handleIceCandidate(chat: Chat, peerId: string, userId: string) {
  const peerDatabase = getPeerDatabaseRef(peerId, userId);
  return function(event: RTCPeerConnectionIceEvent) {
    console.log("icecandidate event: ", event);
    if (event.candidate) {
      const candidate = {
        type: "candidate",
        label: event.candidate.sdpMLineIndex,
        id: event.candidate.sdpMid,
        candidate: event.candidate.candidate
      };
      console.log("Client sending candidate: ", candidate);
      const dataChannel = chat.dataChannel;
      if (dataChannel && dataChannel.readyState === "open") {
        dataChannel.send(
          JSON.stringify({
            type: MessageTypes.NEGOTIATION,
            candidate: event.candidate
          })
        );
      } else {
        peerDatabase.set(candidate);
      }
    } else {
      console.log("End of candidates.");
    }
  };
}

export function renegotiateDescriptions(
  pc: RTCPeerConnection,
  dataChannel: RTCDataChannel
) {
  pc.createOffer().then(setLocalAndSendMessageDataChannel(pc, dataChannel));
}

function setLocalAndSendMessageDataChannel(
  pc: RTCPeerConnection,
  dataChannel: RTCDataChannel
) {
  return function(sessionDescription: RTCSessionDescriptionInit) {
    console.log(
      "setLocalAndSendMessageDataChannel sending message",
      sessionDescription
    );
    pc.setLocalDescription(sessionDescription)
      .then(() => {
        dataChannel.send(
          JSON.stringify({
            type: MessageTypes.NEGOTIATION,
            [sessionDescription.type]: {
              type: sessionDescription.type,
              sdp: sessionDescription.sdp
            }
          })
        );
      })
      .catch(error =>
        console.log("Error setLocalAndSendMessageDataChannel: ", error)
      );
  };
}

function setLocalAndSendMessage(
  pc: RTCPeerConnection,
  peerId: string,
  user: Peer,
  chatId?: string
) {
  const peerDatabase = getPeerDatabaseRef(peerId, user.uid);
  return function(sessionDescription: RTCSessionDescriptionInit) {
    console.log("setLocalAndSendMessage sending message", sessionDescription);
    pc.setLocalDescription(sessionDescription);
    if (sessionDescription.type === "offer") {
      peerDatabase.set({
        type: sessionDescription.type,
        sdp: sessionDescription.sdp,
        chatId,
        user
      });
    } else {
      peerDatabase.set({
        type: sessionDescription.type,
        sdp: sessionDescription.sdp
      });
    }
  };
}

// Other Utils =======================================================================

function requestTurn(turnURL: string) {
  let turnExists = false;
  for (let i in pcConfig.iceServers) {
    if (pcConfig.iceServers[i].urls.substr(0, 5) === "turn:") {
      turnExists = true;
      break;
    }
  }
  if (!turnExists) {
    console.log("Getting TURN server from ", turnURL);
    // No TURN server. Get one from computeengineondemand.appspot.com:
    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        const turnServer = JSON.parse(xhr.responseText);
        console.log("Got TURN server: ", turnServer);
        pcConfig.iceServers.push({
          urls: "turn:" + turnServer.username + "@" + turnServer.turn,
          credential: turnServer.password
        });
      }
    };
    xhr.open("GET", turnURL, true);
    xhr.send();
  }
}

async function createContact(email: string) {
  return new Promise<Chat | EmitCallErrors>(resolve => {
    socket.emit(
      "createContact",
      email,
      (ans: { error: EmitCallErrors | null; chatId: string; peer: Peer }) => {
        console.log(ans);
        if (ans.error) {
          resolve(ans.error);
        } else {
          const chat = new Chat(ans.chatId, ans.peer);
          resolve(chat);
        }
      }
    );
  });
}

export default {
  acceptCall,
  rejectCall,
  emitCall,
  endCall,
  emitChat,
  createContact,
  login,
  logout
};

// export function rejectCall(peerId: string) {
//   if (store.user) {
//     const peerDatabase = getPeerDatabaseRef(peerId, store.user.uid);
//     peerDatabase.set({ type: "callRejected" });
//   }
// }
