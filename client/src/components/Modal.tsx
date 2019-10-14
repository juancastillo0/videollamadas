import React from "react";
import styled from "styled-components";

const StyledDiv = styled.div`
  position: fixed;
  width: 100%;
  height: 100%;
  background: rgba(240, 240, 240, 0.5);
`;
const Modal: React.FC = ({ children }) => {
  return <StyledDiv>{children}</StyledDiv>;
};

export default Modal;
