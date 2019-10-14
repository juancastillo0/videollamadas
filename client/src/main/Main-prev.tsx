export {};
// import React, { useRef, useEffect, FormEvent, useContext } from "react";
// import { StoreContext } from "../services/store";
// import { login } from "../services/api";
// import useInputText from "../hooks/useInputText";
// import styled from "styled-components";
// import { observer } from "mobx-react-lite";
// import Chat from "./Chat";

// let emailPrompt: string | null = null; 
// while (emailPrompt === null) {
//   emailPrompt = prompt("Enter email:");
// }
// login(emailPrompt);

// const StyledDiv = styled.div`
//   max-height: 100%;
//   justify-content: center;
//   font-size: 1.2em;

//   > div {
//     flex: 1;
//     margin: 0 auto 10px;
//   }
//   #videos-div {
//     video {
//       max-height: 300px;
//     }
//   }
//   #form-div {
//     input {
//       margin-left: 15px;
//     }
//   }
// `;

// const mediaStreamConstraints = {
//   audio: false,
//   video: true
// };

// const Main: React.FC = observer(() => {
//   const localVideo = useRef<HTMLVideoElement>(null);
//   const remoteVideo = useRef<HTMLVideoElement>(null);
//   const store = useContext(StoreContext);
//   const email = useInputText(store);
//   console.log(store);

//   useEffect(() => {
//     console.log(store, localVideo, remoteVideo);
//     if (localVideo.current !== null) {
//       if (store.localStream === null) {
//         navigator.mediaDevices
//           .getUserMedia(mediaStreamConstraints)
//           .then(mediaStream => {
//             if (localVideo.current) {
//               store.localStream = mediaStream;
//               localVideo.current.srcObject = mediaStream;
//               (window as any).mediaStream = mediaStream;
//             }
//           })
//           .catch((error: Error) => {
//             store.error = error.message;
//           });
//       } else {
//         localVideo.current.srcObject = store.localStream;
//       }
//     }

//     if (remoteVideo.current !== null) {
//       remoteVideo.current.srcObject = store.remoteStream;
//     }
//   }, [localVideo, remoteVideo, store.localStream, store.remoteStream]);

//   const onSubmit = (event: FormEvent) => {
//     event.stopPropagation();
//     event.preventDefault();

//     if (email.value) {
//       store.emitCall(email.value);
//       email.reset();
//     } else {
//       store.error = "Debes ingresar un email para llamar.";
//     }
//   };

//   return (
//     <StyledDiv className="col">
//       <div id="videos-div">
//         <video autoPlay playsInline muted ref={localVideo} />
//         <video autoPlay playsInline ref={remoteVideo} />
//       </div>

//       {store.email && <div id="login-div">logged in as {store.email}</div>}

//       <div id="form-div">
//         <form onSubmit={onSubmit}>
//           <label>
//             Email:
//             <input {...email.input}/> 
//           </label>
//           <button type="submit">Call</button>
//         </form>
//       </div>
      
//       {store.callState === "RECEIVING" && (
//         <div id="call-div">
//           Llamada de {store.peerEmail}
//           <button onClick={() => store.acceptCall()}>Aceptar</button>
//           <button onClick={() => store.rejectCall()}>Rechazar</button>
//         </div>
//       )}
//       {store.callState === "ACTIVE" && (
//         <div id="call-div">
//           <button onClick={() => store.endCall(true)}>Terminar Llamada</button>
//         </div>
//       )}
//       {store.error && (
//         <div id="error-div">
//           {store.error}{" "}
//           <button
//             onClick={() => {
//               store.error = null;
//             }}
//           >
//             X
//           </button>
//         </div>
//       )}

//       {store.email && (
//         <Chat
//           email={store.email}
//           messages={store.messages}
//           emitChat={(content: string) => store.emitChat(content)}
//         />
//       )}
//     </StyledDiv>
//   );
// });

// export default Main;
