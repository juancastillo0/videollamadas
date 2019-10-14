import React from "react";
import Main from "./main/Main";
import { BrowserRouter, Route } from "react-router-dom";
import Login from "./auth/Login";
import Signup from "./auth/SignUp";
import {observer} from "mobx-react-lite";
import { StoreContext } from "./services/store";
// import Modal from "./components/Modal"; 

const App: React.FC = observer(() => {
  const store = React.useContext(StoreContext);
  return (
    <div style={{ height: store.windowSize.h, width: store.windowSize.w }}>
      <BrowserRouter>
        <Route exact path="/" component={Main}/>
        <Route exact path="/login" component={Login}/>
        <Route exact path="/signup" component={Signup}/>
          {/*<Modal/> */}
      </BrowserRouter>
    </div>
  );
});

export default App;
