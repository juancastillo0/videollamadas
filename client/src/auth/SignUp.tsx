import React, { useContext } from "react";
import useInputText from "../hooks/useInputText";
import StyledForm from "./StyledForm";
import { observer } from "mobx-react-lite";
import { Redirect, Link } from "react-router-dom";
import { StoreContext } from "../services/store";

const Signup: React.FC = observer(() => {
  const name = useInputText();
  const email = useInputText();
  const password = useInputText();

  const store = useContext(StoreContext);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (
      name.value.length !== 0 &&
      email.value.length !== 0 &&
      password.value.length !== 0
    ) {
      store.signUp({
        name: name.value,
        email: email.value,
        password: password.value
      });
    }
  };
  if (store.user !== null) return <Redirect to="/" />;

  return (
    <StyledForm onSubmit={onSubmit}>
      <h1>Regístrate</h1>
      <section>
        <label>Nombre</label> 
        <input {...name.input} />
      </section>
      <section>
        <label>Correo Electrónico</label>
        <input {...email.input} />
      </section>
      <section>
        <label>Contraseña</label>
        <input {...password.input} type="password" />
      </section>
      <div id="button-div">
        <button type="submit">Registrarse</button>
      </div>
      <hr/>
      <footer>
        ¿Ya tienes cuenta? <Link to="/login"> Ingresa </Link>
      </footer>
    </StyledForm>
  ); 
});

export default Signup;
