import React, { FormEvent, useRef, useState, useEffect } from "react";
import useInputText from "../hooks/useInputText";
import styled from "styled-components";
import { ChatMessage, Chat, UserDatabase } from "../services/api-types";
import { observer } from "mobx-react-lite";
// import { User } from "firebase";
import { StoreContext } from "../services/store";
import useFocus from "../hooks/useFocus";

const StyledDiv = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  #chat-div {
    background: white;
    overflow-y: auto;
    padding: 10px 7px;
    .message {
      width: 230px;
      font-size: 0.9em;
      border: 1px solid rgb(248, 248, 248);
      padding: 4px 12px;
      margin: 2px 0;
      border-radius: 7px;
      &.mine {
        background: #f9fcff;
        align-self: flex-end;
      }
      &.friend {
        background: #f8f8f8;
        align-self: flex-start;
      }
    }
  }
  form {
    width: 100%;
    display: flex;
    input {
      padding: 8px 10px;
      flex: 1;
    }
  }
  header {
    display: flex;
    justify-content: space-between;
    flex-flow: wrap;
    padding: 0.3em 0.3em 0.5em;
    border-bottom: 3px solid var(--aux-color);
    margin-bottom: 0.3em;
    #close-chat-button {
      width: 2em;
      height: 2em;
      border-radius: 50%;
      font-weight: bolder;
      margin: 0.4em 0;

      align-self: center;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }
    .one-line-text {
      margin: 0 1em;
      flex: 1;
      font-weight: bolder;
      align-self: center;
      margin-bottom: 0.3em;
    }
    #call-buttons-div {
      flex: auto;
      display: flex;
      justify-content: space-around;
      button {
        border-radius: 10px;
        max-height: 2.2em;
        align-self: center;
        @media (max-width: 768px) {
          font-size: 1.2em;
        }
      }
    }
  }
`;
function readableDate(date: Date) {
  return `${date.getHours()}:${date.getMinutes()}`;
}
function Message({ message, uid }: { message: ChatMessage; uid: string }) {
  const sender = message.senderId === uid ? "mine" : "friend";
  return (
    <div className={"message " + sender}>
      <div>{message.content}</div>
      <div>{readableDate(message.timestamp)}</div>
    </div>
  );
}

export default observer(function({
  emitChat,
  chat,
  user
}: {
  emitChat: (n: string) => void;
  chat: Chat;
  user: UserDatabase;
}) {
  const store = React.useContext(StoreContext);
  const [scrolledBottom, setScrolledBottom] = useState(true);
  const [chatInputRef, setChatInputRef] = useState<HTMLInputElement | null>(
    null
  );
  useFocus(chatInputRef, "CHAT_INPUT");

  const chatRef = useRef<HTMLDivElement>(null);
  const message = useInputText();
  function onSubmit(event: FormEvent) {
    event.stopPropagation();
    event.preventDefault();

    if (message.value) {
      emitChat(message.value);
      message.reset();
    }
  }
  useEffect(() => {
    if (scrolledBottom && chatRef.current) {
      chatRef.current.scrollTo(0, chatRef.current.scrollHeight);
    }
  }, [chat.messages.length, scrolledBottom]);

  useEffect(() => {
    if (chatRef.current) {
      const div = chatRef.current;
      const handleScroll = () => {
        const { height: divHeight } = div.getBoundingClientRect();
        const inBottom = divHeight + div.scrollTop + 5 >= div.scrollHeight;
        if (scrolledBottom && !inBottom) {
          setScrolledBottom(false);
        } else if (!scrolledBottom && inBottom) {
          setScrolledBottom(true);
        }
      };
      div.addEventListener("scroll", handleScroll);
      return () => {
        div.removeEventListener("scroll", handleScroll);
      };
    }
  }, [chatRef.current, scrolledBottom]);

  const displayNone = { display: "none" };
  const callButtonsStyle =
    store.isOpenedChatConnected &&
    (!store.activeCallPeer || store.openedChat !== store.activeCallPeer.uid)
      ? undefined
      : displayNone;
  const isBig = store.windowSize.device >= 1;

  return (
    <StyledDiv>
      <header>
        <button
          onClick={() => (store.openedChat = null)}
          id="close-chat-button"
        >
          &#x2715;
        </button>
        <div className="one-line-text">{chat.peer.name}</div>
        <div id="call-buttons-div" style={callButtonsStyle}>
          <button onClick={() => store.emitCall()}>
            &#9742; {isBig && "Llamada"}
          </button>
          <button onClick={() => store.emitCall()}>
            &#128250; {isBig && "Videollamada"}
          </button>
        </div>
      </header>

      <div id="chat-div" className="col" ref={chatRef}>
        {chat.messages.map((m, index) => (
          <Message key={index} message={m} uid={user.uid} />
        ))}
      </div>
      <form onSubmit={onSubmit}>
        <input
          {...message.input}
          ref={setChatInputRef}
          placeholder="Escribe un mensaje..."
        />
        <button type="submit">Enviar</button>
      </form>
    </StyledDiv>
  );
});
