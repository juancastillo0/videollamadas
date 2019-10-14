import { observable, action } from "mobx";
import React from "react";

export type ModalType = "LOGIN" | "SIGNUP";

class ModalStore {
    @observable modal: ModalType | null = null;
}

const modalStore = new ModalStore();
export const ModalStoreContext = React.createContext(modalStore);
(window as any).modalStore = modalStore;
export default modalStore;