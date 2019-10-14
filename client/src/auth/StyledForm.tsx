import styled from "styled-components";

export default styled.form`
  max-width: 600px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  font-size: 120%;
  padding: 0 40px;
  @media (max-width: 550px) {
    padding: 0 25px;
  }
  section {
    width: 100%;
    display: flex;
    justify-content: space-between;
    margin-bottom: 20px;
    @media (max-width: 550px) {
      flex-direction: column;
    }
    label {
      display: flex;
      flex: 2;
      margin-bottom: 10px;
      align-items: center;
    }
    input {
      flex: 3;
      padding: 10px 15px;
      font-size: inherit;
    }
  }

  #button-div {
    width: 100%;
    display: flex;
    justify-content: flex-end;
    button {
      padding: 12px 17px;
      font-size: inherit;
      border-radius: 7px;
      background: #1460df;
      color: white;
      border: 0;
      :hover {
        box-shadow: 0 1px 1px 1px var(--aux-color);
      }
      :focus {
        outline: 0;
      }
    }
  }
`;
