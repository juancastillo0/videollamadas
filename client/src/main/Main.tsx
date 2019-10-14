import React, { useRef, useEffect, FormEvent, useContext } from "react";
import { StoreContext } from "../services/store";
import ChatList from "./ChatList";
import styled from "styled-components";
import { observer } from "mobx-react-lite";
import Chat from "./Chat";
import Videos from "./Videos";
import Resizer from "../components/Resizer";
import { Redirect } from "react-router-dom";
import VideosControls from "./VideosControls";

const StyledDiv = styled.div`
  max-height: 100%;
  height: 100%;
  justify-content: center;
  font-size: 1.2em;

  #chat-list-col {
    flex: 1;
    max-width: 100%;
  }
  #chat-col {
    flex: 2;
    padding: 7px;
  }
  #error-div {
    font-size: 0.8em;
    color: red;
  }
  #login-div {
    text-align: center;
    padding: 0.5em 1.4em 0.7em;
    button {
      margin-top: 0.3em;
      border-radius: 10px;
    }
  }
  #answer-call-div {
    display: flex;
    flex-direction: column;
    border-radius: 12px;
    margin: 0.5em;
    border: 1px solid var(--aux-color);
    header {
      background: hsla(119, 54%, 77%, 0.51);
      border-bottom: 1px solid hsla(119, 54%, 77%, 1);
      border-radius: 12px 12px 0 0;
      padding: 0.3em 0.5em;
      font-weight: bolder;
    }
    .one-line-text {
      text-align: center;
      padding: 0.5em;
    }
    #answer-call-buttons {
      padding: 0.5em;
      display: flex;
      justify-content: space-between;
      button {
        border-radius: 7px;
      }
    }
  }
`;

const Main: React.FC = observer(() => {
  const store = useContext(StoreContext);

  if (!store.user) {
    return <Redirect to="/login" />;
  }
  const isSmall = store.windowSize.device <= 1;

  if (store.remoteStream && store.fullscreen) {
    return (
      <div className={store.windowSize.h*1.8 > store.windowSize.w ? "col" : "row"}>
        <Videos className={store.windowSize.h*1.8 > store.windowSize.w ? "col" : "row"} />
        <VideosControls />
      </div>
    );
  }

  const displayNone = { display: "none" };
  const videosStyle = store.remoteStream === null ? displayNone : undefined;
  const chat = store.openedChat ? store.chats.get(store.openedChat) : undefined;

  return (
    <StyledDiv className="row">
      <Resizer
        style={
          isSmall
            ? store.openedChat
              ? { display: "none" }
              : { flex: 1 }
            : { minWidth: 250 }
        }
        showResizer={!isSmall}
        id="chat-list-col"
      >
        <div id="login-div">
          <div className="one-line-text">{store.user.name}</div>
          <div className="one-line-text">{store.user.email}</div>
          <button onClick={() => store.logOut()}>Cerrar Sesión</button>
        </div>
        <ChatList />

        {Object.entries(store.peersCalling).map(([uid, peer]) => {
          return (
            <div id="answer-call-div" key={uid}>
              <header>Llamada</header>
              <div className="one-line-text">
                {peer.name} ({peer.email})
              </div>
              <div id="answer-call-buttons">
                <button onClick={() => store.rejectCall(uid)}>Rechazar</button>
                <button onClick={() => store.acceptCall(uid)}>Aceptar</button>
              </div>
            </div>
          );
        })}
      </Resizer>

      <div
        className="col"
        id="chat-col"
        style={
          isSmall
            ? store.openedChat
              ? { flex: 1 }
              : { display: "none" }
            : undefined
        }
      >
        <Resizer vertical style={videosStyle}>
          <Videos />
        </Resizer>
        <VideosControls />

        {store.error && (
          <div id="error-div">
            {store.error}{" "}
            <button
              onClick={() => {
                store.error = null;
              }}
            >
              X
            </button>
          </div>
        )}

        {chat && (
          <Chat
            user={store.user}
            chat={chat}
            emitChat={(content: string) => store.emitChat(content)}
          />
        )}
      </div>
    </StyledDiv>
  );
});

export default Main;
