import { observable, action } from "mobx";
import api, { socket } from "../services/api";
import { UserDatabase } from "../services/api-types";

const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json"
};
console.log(socket);

type UserLogin = { email: string; password: string };
type UserSignUp = { email: string; password: string; name: string };
type LoginType = {
  user: UserDatabase;
  error: string | undefined;
};

export default class AuthStore {
  constructor() {
    socket.on("connect", async () => {
      const ans = await fetch("/api/profile", {
        method: "POST",
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({ socketId: socket.id })
      });
      if (ans.ok) {
        const user = await ans.json();
        this.user = user as UserDatabase;
        api.login(this.user);
      }
    });
  }
  @observable user: UserDatabase | null = null;
  @observable fetchingLogin: boolean = false;
  @observable fetchingSignUp: boolean = false;

  @action async login(userLogin: UserLogin) {
    this.fetchingLogin = true;
    try {
      const ans = await fetch("/api/login", {
        headers: DEFAULT_HEADERS,
        method: "POST",
        body: JSON.stringify({...userLogin, socketId:socket.id})
      });
      if (ans.ok) {
        const ansJson = await ans.json();
        this.user = ansJson.user as UserDatabase;
        api.login(this.user);
      }
    } catch (error) {
      alert(error);
    }
    this.fetchingLogin = false;
  }

  @action async logOut() {
    const ans = await fetch("/api/logout", {
      headers: DEFAULT_HEADERS,
      method: "POST"
    });
    if (ans.ok){
      this.user = null;
      api.logout();
    }
  }

  @action async signUp(userSignUp: UserSignUp) {
    this.fetchingSignUp = true;
    const ans = await fetch("/api/signup", {
      headers: DEFAULT_HEADERS,
      method: "POST",
      body: JSON.stringify({...userSignUp, socketId:socket.id})
    });
    if (ans.ok) {
      const ansJson = await ans.json();
      this.user = ansJson.user as UserDatabase;
      api.login(this.user);
    }
  }
}

// this.fetchingSignUp = true;
//     socket.emit("signup", userSignUp, ({ user, error }: LoginType) => {
//       if (!error) {
//         this.user = user;
//         api.login(user);
//       } else {
//         console.log(error);
//       }
//       this.fetchingSignUp = false;
//     });

// this.fetchingLogin = true;
//     console.log(socket);
//     socket.emit("login", userLogin, ({ user, error }: LoginType) => {
//       console.log(user, error);
//       if (!error) {
//         this.user = user;
//         api.login(user);
//       } else {
//         console.log(error);
//       }
//       this.fetchingLogin = false;
//     });
