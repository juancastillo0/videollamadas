import { useEffect, useContext } from "react";
import { FocusedElements, StoreContext } from "../services/store";

export default function(elem: HTMLElement | null, focusId: FocusedElements) {
  const store = useContext(StoreContext);
  useEffect(() => {
    if (elem && store.focus === focusId) {
      elem.focus();
      store.focus = null;
    }
  }, [elem, store.focus]);
}
