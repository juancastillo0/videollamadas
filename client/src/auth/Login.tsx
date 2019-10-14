import React, { useContext } from "react";
import useInputText from "../hooks/useInputText";
import StyledForm from "./StyledForm";
import { StoreContext } from "../services/store";
import { Redirect, Link } from "react-router-dom";
import { observer } from "mobx-react-lite";

const Login: React.FC = observer(() => {
  const email = useInputText();
  const password = useInputText();

  const store = useContext(StoreContext);
  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (email.value.length > 0 && password.value.length > 0) {
      store.login({ email: email.value, password: password.value });
    }
  };

  if (store.user !== null) return <Redirect to="/" />;
  return (
    <StyledForm onSubmit={onSubmit}>
      <h1>Ingresa</h1>
      <section>
        <label htmlFor="email-input">Correo Electrónico</label>
        <input {...email.input} id="email-input"/>
      </section>

      <section>
        <label htmlFor="password-input">Contraseña</label>
        <input {...password.input} type="password" id="password-input" />
      </section>

      <div id="button-div">
        <button type="submit">Ingresar</button>
      </div>
      <hr />
      <footer>
        ¿No tienes cuenta? <Link to="/signup"> Regístrate </Link>
      </footer>
    </StyledForm>
  );
});

export default Login;
