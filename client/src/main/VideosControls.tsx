import React from "react";
import styled from "styled-components";
import { observer } from "mobx-react-lite";

import { StoreContext } from "../services/store";

const StyledDiv = styled.div`
  display: flex;
  justify-content: space-around;
  align-items: center;
  flex-flow: wrap;
  button {
    margin: 0.4em 0.4em;
  }
  .selector-div {
    display: flex;
    flex-direction: column;
    label {
      font-size: 0.85em;
    }
    select {
      min-height: 2em;
    }
  }
`;

const VideosControls = observer(() => {
  const store = React.useContext(StoreContext);
  const videosStyle =
    store.remoteStream === null ? { display: "none" } : undefined;

  return (
    <StyledDiv style={videosStyle}>
      <button onClick={() => store.endCall(true)}>Terminar Llamada</button>
      {store.mediaDevices && (
        <div className="selector-div">
          <label htmlFor="video-input-select">Cambiar Cámara</label>
          <select
            id="video-input-select"
            onChange={event => {
              store.changeCamera(event.target.value);
            }}
          >
            {store.mediaDevices.videoinput.map((device, index) => {
              return (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Cámara ${index}`}
                </option>
              );
            })}
          </select>
        </div>
      )}
      {/*<button onClick={() => store.endCall(true)}>Cambiar Cámara</button>*/}
      <button onClick={() => (store.fullscreen = !store.fullscreen)}>
        Ventana Completa
      </button>
    </StyledDiv>
  );
});

export default VideosControls;
