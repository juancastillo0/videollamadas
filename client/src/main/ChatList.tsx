import React from "react";
import { observer } from "mobx-react-lite";
import { StoreContext } from "../services/store";
import styled from "styled-components";
import useInputText from "../hooks/useInputText";
import NewContactForm from "./NewContactForm";

const StyledDiv = styled.div`
  justify-content: space-between;
  #chats-list {
    header {
      padding: 0.6em 0.4em 0.5em;
      margin-bottom: 0.6em;
      display: flex;
      justify-content: space-between;
      border-bottom: 3px solid var(--aux-color);
      h3 {
        margin: 0;
        margin-bottom: 0.2em;
      }
      button {
        border-radius: 10px;
      }
    }

    .chat-item:first-of-type {
      border-top: 1px solid var(--aux-color);
    }
    .chat-item {
      width: 100%;
      background: white;
      padding: 1em 0.7em;
      border: 0;
      border-bottom: 1px solid var(--aux-color);
      border-right: 15px solid transparent;
      display: flex;
      justify-content: space-between;

      &.opened {
        border-right: 15px solid #d9f1ff;
      }

      .chat-item-name {
        margin-right: 9px;
      }
      .chat-item-state {
        min-width: 0.8em;
        height: 0.8em;
        border-radius: 50%;
        background: grey;
        align-self: center;
        &.active {
          background: green;
        }
        &.calling {
          background: blue;
        }
      }
    }
  }
  #search-div {
    display: flex;
    padding: 0.4em 1.2em;
    label {
      padding-right: 10px;
      display: flex;
      align-items: center;
      margin-bottom: 4px;
    }
    input {
      border-radius: 5px;
      flex: 1;
    }
  }

  .info-div {
    padding: 0.5em 1em;
  }
`;

const ChatList: React.FC = observer(() => {
  const [formOpened, setFormOpened] = React.useState(false);
  const store = React.useContext(StoreContext);
  const search = useInputText();
  const toggleForm = React.useCallback(() => {
    if (!formOpened) {
      store.focus = "NEW_CONTACT_INPUT";
    }
    setFormOpened(!formOpened);
  }, [formOpened]);

  let contacts;

  if (store.chats.size > 0) {
    const filteredContacts: React.ReactElement[] = [];
    for (let [key, chat] of store.chats.entries()) {
      if (
        !chat.peer.name.toLowerCase().includes(search.value.toLowerCase()) &&
        !chat.peer.email.toLowerCase().includes(search.value.toLowerCase())
      ) {
        continue;
      }
      const calling = store.activeCallPeer && store.activeCallPeer.uid === key;

      filteredContacts.push(
        <button
          key={key}
          className={"chat-item" + (store.openedChat === key ? " opened" : "")}
          onClick={() => {
            store.openedChat = key;
            store.focus = "CHAT_INPUT";
          }}
        >
          <div className="chat-item-name one-line-text">{`${chat.peer.name} (${chat.peer.email})`}</div>
          <div
            className={
              "chat-item-state" +
              (chat.state === "connected"
                ? calling
                  ? " calling"
                  : " active"
                : "")
            }
          />
        </button>
      );
    }

    const searchInput = (
      <div id="search-div">
        <label htmlFor="search-input">&#128269; Buscar</label>
        <input
          {...search.input}
          id="search-input"
          placeholder="nombre o email"
        />
      </div>
    );

    contacts = (
      <>
        {searchInput}
        {filteredContacts.length > 0 ? (
          filteredContacts
        ) : (
          <div className="info-div">
            No tienes contactos con la búsqueda especificada.
          </div>
        )}
      </>
    );
  } else {
    contacts = <div className="info-div">No tienes contactos</div>;
  }

  return (
    <StyledDiv className="col">
      <div id="chats-list" className="col">
        <header>
          <h3>Contactos</h3>
          <button onClick={toggleForm}>
            {formOpened ? <>&#x2715; Cerrar</> : <>&#65291; Nuevo</>}
          </button>
        </header>
        <NewContactForm style={{ display: formOpened ? "" : "none" }} />
        {contacts}
      </div>
    </StyledDiv>
  );
});

export default ChatList;
