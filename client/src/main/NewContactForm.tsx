import React from "react";
import { observer } from "mobx-react-lite";
import { StoreContext } from "../services/store";
import styled from "styled-components";
import useInputText from "../hooks/useInputText";
import useFocus from "../hooks/useFocus";

const StyledForm = styled.form`
  padding: 0 1em 1em;
  margin-bottom: 0.7em;
  display: flex;
  flex-direction: column;
  label {
    margin-bottom: 0.3em;
  }
  .input-row-with-button {
    display: flex;
    input {
      flex: 1;
      padding: 5px 10px;
    }
  }
  #error-div {
    font-size: 0.8em;
  }
`;

const NewContactForm: React.FC<{ style: any }> = observer(({ ...rest }) => {
  const inputElem = React.useRef<HTMLInputElement>(null);
  useFocus(inputElem.current, "NEW_CONTACT_INPUT");

  const store = React.useContext(StoreContext);
  const email = useInputText({
    type: "email",
    onInput: () => {
      store.createContactState.error = null;
    }
  });

  const onSubmit = (event: React.FormEvent) => {
    event.stopPropagation();
    event.preventDefault();

    if (email.value && !store.createContactState.fetching) {
      store.createContact(email.value).then(() => {
        if (store.createContactState.error === null){
          email.reset();
        }
      });
    } else {
      store.error = "Debes ingresar un email para llamar.";
    }
  };

  return (
    <StyledForm onSubmit={onSubmit} {...rest}>
      <label htmlFor="new-contact-input">Nuevo Contacto</label>
      <div className="input-row-with-button">
        <input
          {...email.input}
          placeholder="Email"
          id="new-contact-input"
          ref={inputElem}
        />
        <button type="submit" disabled={store.createContactState.fetching}>
          Agregar
        </button>
      </div>
      <div id="error-div">{store.createContactState.error}</div>
    </StyledForm>
  );
});

export default NewContactForm;
