import React, { useRef, useContext, useEffect } from "react";
import { StoreContext } from "../services/store";
import { observer } from "mobx-react-lite";
import styled from "styled-components";
import Resizer from "../components/Resizer";

const DefaultDiv = styled.div`
  position: relative;
  width: 100%;
  #local-video {
    position: absolute;
    bottom: 0;
    right: 0;
    max-height: 30%;
  }
  #remote-video {
    object-fit: scale-down;
    max-height: 100%;
    width: auto;
  }
`;

const FullscreenCol = styled.div`
  display: flex;
  height: 100%;
  width: 100%;
  flex-direction: column;

  #remote-video {
    object-fit: scale-down;
    max-width: 100%;
    height: auto;
    align-self: center;
  }
  #local-video {
    align-self: center;
    max-width: 100%;
  }
`;
const FullscreenRow = styled.div`
  display: flex;
  height: 100%;
  width: 100%;
  #remote-video {
    object-fit: scale-down;
    max-height: 100%;
    width: 70%;
    align-self: center;
  }
  #local-video {
    width: 30%;
    align-self: center;
    max-height: 100%;
  }
`; 

const Videos: React.FC<{ className?: string }> = observer(({ className }) => {
  const [localVideo, setLocalVideo] = React.useState<HTMLVideoElement | null>(
    null
  );
  const [remoteVideo, setRemoteVideo] = React.useState<HTMLVideoElement | null>(
    null
  );
  const store = useContext(StoreContext);

  useEffect(() => {
    if (localVideo !== null) {
      localVideo.srcObject = store.localStream;
    }
    if (remoteVideo !== null) {
      remoteVideo.srcObject = store.remoteStream;
    }
  }, [localVideo, remoteVideo, store.localStream, store.remoteStream]);

  const videosFragment = (
    <>
      <video autoPlay playsInline ref={setRemoteVideo} id="remote-video" />
      <video autoPlay playsInline muted ref={setLocalVideo} id="local-video" />
    </>
  );

  const StyledDiv = className
    ? className == "row"
      ? FullscreenRow
      : FullscreenCol
    : DefaultDiv;
  return <StyledDiv>{videosFragment}</StyledDiv>;
});

export default Videos;
